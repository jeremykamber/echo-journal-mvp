import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { addDocuments, similaritySearch } from '@/services/persistentVectorStore';
// import { makeOpenRouterEmbedder } from '@/clients/openaiClient'; // removed unused import
import { formatDocumentsAsString } from '@/lib/formatDocumentsAsString';
import journalStore, { JournalEntry } from '@/store/journalStore';
import conversationStore from '@/store/conversationStore';
import { Document } from 'langchain/document';
import { IterableReadableStreamInterface } from '@langchain/core/utils/stream';
import { trackCompletedReflection } from "@/services/analyticsService";
import makeMemoryService from '@/features/memory/services/memoryService';
import { getNudgeService } from '@/services/nudgeServiceRegistry';
import { getGlobalLLMProvider } from '@/services/llmProviders/adapterService';
import { ChatMessage } from '@/services/llmProviders/interface';

// Define types for reflection responses
export interface RealtimeReflectionResponse {
  reflection: IterableReadableStreamInterface<string>;
  relatedEntries: JournalEntry[];
}

// const embedder = makeOpenRouterEmbedder(); // Removed unused embedder

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });

/**
 * System prompt for Echo AI companion
 */
const ECHO_SYSTEM_PROMPT = `You are Echo, an AI journaling companion that provides thoughtful, context-aware responses.

You are also the user's friend and advisor. Talk with them and respond to them conversationally, but still with depth and insight.

GUIDELINES:
1. Your reflection should be thought-provoking and sharp. Support them emotionally, but also ensure you give them the brutal honest truth because it's for their best interests, don't sugarcoat things.
2. Focus on one of these aspects based on what's most relevant:
   - Patterns or themes you notice across MULTIPLE journal entries and conversations.
   - Contradictions or evolution in their thinking over time.
   - Questions that might deepen their self-reflection.
   - Gentle prompts for areas they could explore further in their writing.
3. Be warm, empathetic and insightful - like a thoughtful friend. Your tone should not be super sophisticated, but simple and friendly, like a therapist.
4. DO NOT summarize their current entry back to them.
5. Avoid being overly positive/cheerleading or negative/critical.
6. IMPORTANT: Always EXPLICITLY cite past journal entries OR conversation messages when referring to them.
7. Citations should use the format: [cite:ID] where you put the entry id or message id after the colon.
   If citing multiple items, have separate brackets for each, like this: [cite:entry-123] [cite:uuid-456].
   FOLLOW THIS FORMAT EXACTLY.
8. Use natural language to introduce citations, such as:
   - "In a past entry [cite:entry-id], you mentioned..."
   - "In our previous chat [cite:msg-id], we discussed..."
   - "I notice a connection to when you wrote about... [cite:entry-id]"
   - "This reminds me of your thoughts on... [cite:msg-id]"
9. Make sure citations are inline and integrated naturally into your reflection.
10. Try your best to connect the dots across MULTIPLE journal entries and conversations, not just one.
11. Use the CONTEXT provided to connect current events to the past.
12. Each document in the context has a [SOURCE: ...] and [CITATION_ID: ...]. Use the [CITATION_ID] for the citation.
Provide ONLY the reflection text with no preamble or explanation. Ensure your output is beautiful and easy to read, written EXCLUSIVELY in markdown. Don't add the code block for markdown, just write your output in markdown. NO HTML IN YOUR OUTPUT!!!`;

/**
 * Prompt for the "Deep Reflection" synthesis step.
 */
const PATTERN_ANALYSIS_PROMPT = `You are an expert analyst of personal journals and conversations. Your goal is to identify deep patterns, contradictions, and growth trajectories.

Review the provided user history (journal entries and chats) and the user's latest message.
Analyze for:
1. Recurring themes or emotional cycles (e.g. loops of anxiety followed by relief).
2. Contradictions between what they say now vs. what they said in the past.
3. Hidden connections between seemingly unrelated events.
4. Suggestions for what they might be avoiding or not seeing.

Provide a concise "Analyst Synthesis" that summarizes these insights. This synthesis will be used by another AI to generate a response.
Focus on the "Why" and "How", not just the "What".
Do not address the user directly. Write for the other AI.`;

/**
 * Realtime system prompt (shorter for faster responses)
 */
const REALTIME_SYSTEM_PROMPT = `You are Echo, an AI journaling companion that provides real-time reflections as users write in their journal. You help users understand their patterns and growth over time by connecting their current writing to their past entries.

GUIDELINES:
1. Your reflection should be concise (2-4 sentences) and thought-provoking. NO HTML IN YOUR OUTPUTS.
2. Focus on patterns, growth, questions for self-reflection, or prompts for further exploration.
3. Be warm, empathetic and insightful - like a thoughtful friend
4. DO NOT summarize their current entry back to them
5. Avoid being overly positive/cheerleading or negative/critical
6. Always cite past journal entries or conversations using format: [cite:ID]
7. Make sure citations are inline and integrated naturally.
8. Try to connect dots across MULTIPLE sources (journals and chats).
9. Use the [CITATION_ID] from the provided context.
Provide ONLY the reflection text in markdown format, no preamble.`;

/**
 * Streams a real-time reflection for a journal entry as tokens arrive.
 * Uses configured LLM provider (local WebLLM or cloud OpenAI).
 * Yields each token as it arrives, and returns related entries as well.
 */
export async function* streamRealtimeReflection(
  content: string,
  entryId: string
): AsyncGenerator<{ token: string; done: boolean; relatedEntries: JournalEntry[] }, void, unknown> {
  try {
    if (content.trim().length < 30 || !content.endsWith('.')) {
      return;
    }

    // Prefer mem0 for context; fall back to summarized journal snippet when empty
    // Use persistent vector store for context; fallback to memory service if empty
    let similarDocs = await similaritySearch(content, 4);
    let contextBundle: string | undefined;
    let relatedEntries: any[] = [];
    if (similarDocs.length > 0) {
      contextBundle = formatDocumentsAsString(similarDocs);
      // Extract entry IDs from metadata for analytics (if present)
      relatedEntries = similarDocs.map(d => ({ id: d.metadata?.entryId ?? 'unknown' } as any));
    } else {
      const memoryService = makeMemoryService();
      const result = await memoryService.getPromptContext(content, { userId: undefined, n: 4 });
      contextBundle = result.contextBundle;
      relatedEntries = result.relatedEntries;
      if (!contextBundle || relatedEntries.length === 0) {
        return;
      }
    }

    const provider = getGlobalLLMProvider();
    if (!provider) {
      yield {
        token: '⚠️ AI provider not initialized. Please check your settings.',
        done: true,
        relatedEntries,
      };
      return;
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: REALTIME_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `The user is currently writing this journal entry (with id ${entryId}):\n\n${content}\n\nRelevant past journal entries:\n\n${contextBundle}`,
      },
    ];

    console.log('[AI Service] Realtime reflection messages:', messages);

    for await (const token of provider.streamChatCompletion({ messages })) {
      yield { token, done: false, relatedEntries };
    }
    yield { token: '', done: true, relatedEntries };
  } catch (error) {
    console.error('Error streaming realtime reflection:', error);
    return;
  }
}

/**
 * Streams a reflection for the user's question using RAG over stored journal entries.
 * Yields each token as it arrives.
 *
 * @param question The user's question or message
 * @param entryId Optional journal entry ID if this is from a specific entry
 * @param conversationId The conversation ID for retrieving chat history
 * @param isDeepReflection Whether to perform a multi-step deep analysis
 */
export async function* streamReflectionTokens(question: string, conversationId: string, entryId: string = '', isDeepReflection: boolean = false) {
  // Get current journal entry content if entryId is provided
  let currentEntryContent = '';
  if (entryId) {
    currentEntryContent = journalStore.getState().getEntryById(entryId)?.content || '';
  }

  // Get chat history for context from the appropriate store
  let chatHistory = '';
  console.log("Conversation ID:", conversationId);
  if (conversationId.startsWith('entry-')) {
    // This is a journal entry thread
    const previousMessages = journalStore.getState()
      .messages
      .filter(m => m.threadId === conversationId)
      .slice(0, -1)
      .slice(-10);
    chatHistory = previousMessages.map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
  } else {
    // This is a conversation from the conversation store
    const previousMessages = conversationStore.getState()
      .messages
      .filter(m => m.conversationId === conversationId)
      .slice(0, -1)
      .slice(-10);
    chatHistory = previousMessages.map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
  }

  console.log('Chat history:', chatHistory);

  // Load entries from Zustand store
  const entries = journalStore.getState().entries;
  if (entries.length === 0) {
    yield "I don't have any journal entries to reference yet. Feel free to add some journal entries, and I can provide more insightful responses.";
    return;
  }

  // Prepare documents with metadata
  const docs = entries.map(e => new Document({
    pageContent: e.content,
    metadata: { entryId: e.id }
  }));
  let formattedDocs: string;
  let validSplits: Document[] = []; // Declare validSplits here

  // Try to retrieve relevant docs from persistent Chroma store
  let similarDocs = await similaritySearch(question, 4);
  if (similarDocs.length > 0) {
    formattedDocs = formatDocumentsAsString(similarDocs);
  } else {
    // Fallback: split all entries and add to vector store for future queries
    const splits = await splitter.splitDocuments(docs);
    validSplits = splits.filter(s => typeof s.pageContent === 'string' && s.pageContent.trim().length > 0);
    await addDocuments(validSplits); // This uses the global addDocuments
    formattedDocs = formatDocumentsAsString(validSplits);
  }

  // Use mem0-first context bundle for prompt; fall back to local vectorized context when mem0 empty
  const memoryService = makeMemoryService();
  const { contextBundle } = await memoryService.getPromptContext(question, { userId: undefined, n: 4 });
  formattedDocs = contextBundle || formattedDocs; // Use the already determined formattedDocs as fallback

  const provider = getGlobalLLMProvider();
  if (!provider) {
    yield "⚠️ AI provider not initialized. Please check your settings.";
    return;
  }

  // Build the user message with all context
  const contextBlock = `The user is currently writing this journal entry${entryId ? ` (with id ${entryId})` : ''}:
${currentEntryContent || '(No current entry content)'}

Recent chat history:
${chatHistory || '(No previous messages)'}

Here are some relevant past journal entries:
${formattedDocs}`;

  let finalSystemPrompt = ECHO_SYSTEM_PROMPT;
  let finalUserMessage = `Here is the user's question/prompt: ${question}\n\n${contextBlock}\n\nRespond to the user's message in a way that is empathetic, insightful, and references past entries where appropriate.`;

  // Deep Reflection Step: Run analysis first if enabled
  if (isDeepReflection) {
    console.log('[AI Service] Starting Deep Reflection analysis...');
    yield "*Thinking deeply...* 🧠\n\n";

    const analysisMessages: ChatMessage[] = [
      { role: 'system', content: PATTERN_ANALYSIS_PROMPT },
      { role: 'user', content: `Analyze the following user history and current question:\n\nUser Question: ${question}\n\nCONTEXT:\n${contextBlock}` }
    ];

    let analysisText = "";
    try {
      // Collect the full analysis response (non-streaming for internal step)
      // Note: provider.chatCompletion is not exposed in the interface, we can reuse stream but just buffer it.
      // Or if we have a non-streaming method, use that. The adapter usually exposes stream.
      // We'll just consume the stream.
      for await (const chunk of provider.streamChatCompletion({ messages: analysisMessages })) {
        analysisText += chunk;
      }
      console.log('[AI Service] Deep Reflection Analysis:', analysisText);

      // Inject the analysis into the final prompt
      finalUserMessage = `Here is the user's question/prompt: ${question}\n\n${contextBlock}\n\nI have performed a deep analysis of the user's patterns. Use this insight to guide your response:\n${analysisText}\n\nRespond to the user's message in a way that is empathetic, insightful, and references past entries where appropriate. INTEGRATE the pattern analysis provided above.`;

    } catch (err) {
      console.error("Deep reflection analysis failed:", err);
      yield "\n*(Deep analysis failed, responding normally...)*\n\n";
    }
  }

  const messages: ChatMessage[] = [
    { role: 'system', content: finalSystemPrompt },
    { role: 'user', content: finalUserMessage },
  ];

  console.log('[AI Service] Reflection messages:', messages);

  for await (const chunk of provider.streamChatCompletion({ messages })) {
    yield chunk;
  }
}

export async function streamReflectionToStore({
  question,
  targetType,
  targetId,
  entryId = '',
  aiMessageId = undefined,
}: {
  question: string;
  targetType: 'conversation' | 'journal';
  targetId: string;
  entryId?: string;
  aiMessageId?: string;
  isDeepReflection?: boolean;
}): Promise<void> {
  if (targetType === 'conversation') {
    const addAIMessage = conversationStore.getState().addMessage;
    const updateAIMessage = conversationStore.getState().updateMessageById;
    const aiMsgId = aiMessageId || addAIMessage('ai', '', targetId);
    let accumulatedText = '';
    let lastUpdate = Date.now();
    const THROTTLE_MS = 50;
    console.log(`Starting streaming for conversation ${targetId}`);
    console.log(`Initial AI Message ID: ${aiMsgId} `);
    const { isDeepReflection = false } = arguments[0]; // Access destructured arg if needed or passed down

    for await (const token of streamReflectionTokens(question, targetId, entryId, isDeepReflection)) {
      accumulatedText += token;
      if (Date.now() - lastUpdate > THROTTLE_MS) {
        updateAIMessage(aiMsgId, accumulatedText);
        lastUpdate = Date.now();
      }
    }
    // Final update to ensure all text is saved
    updateAIMessage(aiMsgId, accumulatedText);
    try {
      // Auto-save the completed reflection text to mem0 (client-side testing)
      // Provide entryId/aiMessageId so it can be referenced later
      void (await import('@/services/memoryAutoSave')).autoSaveReflection(accumulatedText, { entryId, aiMessageId: aiMsgId });
    } catch (err) {
      console.warn('autoSaveReflection failed:', err);
    }
    console.log(`Completed streaming for conversation ${targetId}`);

    // Track completion of reflection
    trackCompletedReflection('Conversation');
    try {
      const showNudges = (await import('@/store/settingsStore')).useSettingsStore.getState().autoReflect;
      if (showNudges) {
        const nudgeService = getNudgeService();
        const nudges = await nudgeService.generateNudgesForReflection(accumulatedText, undefined, undefined);
        if (nudges && nudges.length > 0) {
          const nudgeStore = (await import('@/store/nudgeStore'));
          nudgeStore.useNudgeStore.getState().showNudge(nudges[0]);
        }
      }
    } catch (err) {
      console.warn('nudge generate/dispatch failed', err);
    }
  } else {
    const addAIMessage = journalStore.getState().addMessage;
    const updateAIMessage = journalStore.getState().updateMessageById;
    const aiMsgId = addAIMessage('ai', '', targetId, entryId);
    let accumulatedText = '';
    let lastUpdate = Date.now();
    const THROTTLE_MS = 50;
    console.log(`Starting streaming for journal entry ${entryId} and target ${targetId} `);
    console.log(`Initial AI Message ID: ${aiMsgId} `);
    const { isDeepReflection = false } = arguments[0];

    for await (const token of streamReflectionTokens(question, targetId, entryId, isDeepReflection)) {
      accumulatedText += token;
      if (Date.now() - lastUpdate > THROTTLE_MS) {
        updateAIMessage(aiMsgId, accumulatedText);
        lastUpdate = Date.now();
      }
    }
    // Final update to ensure all text is saved
    updateAIMessage(aiMsgId, accumulatedText);
    try {
      void (await import('@/services/memoryAutoSave')).autoSaveReflection(accumulatedText, { entryId, aiMessageId: aiMsgId });
    } catch (err) {
      console.warn('autoSaveReflection failed:', err);
    }
    console.log(`Completed streaming for journal entry ${entryId} and target ${targetId} `);

    // Track completion of reflection
    trackCompletedReflection('Journal');
    try {
      const showNudges = (await import('@/store/settingsStore')).useSettingsStore.getState().autoReflect;
      if (showNudges) {
        const nudgeService = getNudgeService();
        const nudges = await nudgeService.generateNudgesForReflection(accumulatedText, entryId, undefined);
        if (nudges && nudges.length > 0) {
          const nudgeStore = (await import('@/store/nudgeStore'));
          nudgeStore.useNudgeStore.getState().showNudge(nudges[0]);
        }
      }
    } catch (err) {
      console.warn('nudge generate/dispatch failed', err);
    }
  }
}
