import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
// import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { makeChatClient, makeRealtimeChatClient, makeEmbedder } from '@/clients/openaiClient';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { formatDocumentsAsString } from '@/lib/formatDocumentsAsString';
import journalStore, { JournalEntry } from '@/store/journalStore';
import conversationStore from '@/store/conversationStore';
import { Document } from 'langchain/document';
import { IterableReadableStreamInterface } from '@langchain/core/utils/stream';
import { trackCompletedReflection } from "@/services/analyticsService";
import makeMemoryService from '@/features/memory/services/memoryService';
import { getNudgeService } from '@/services/nudgeServiceRegistry';

// Define types for reflection responses
export interface RealtimeReflectionResponse {
  reflection: IterableReadableStreamInterface<string>;
  relatedEntries: JournalEntry[];
}

const llm = makeChatClient({ model: 'gpt-4.1-mini' });
const realtimeLlm = makeRealtimeChatClient({ model: 'gpt-4.1-nano' });
const embedder = makeEmbedder();

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
/**
 * Streams a real-time reflection for a journal entry as tokens arrive.
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
    const memoryService = makeMemoryService();
    const { contextBundle, relatedEntries } = await memoryService.getPromptContext(content, { userId: undefined, n: 4 });
    if (!contextBundle || relatedEntries.length === 0) {
      // Nothing useful to reference
      return;
    }

    const prompt = ChatPromptTemplate.fromTemplate(
      `You are Echo, an AI journaling companion that provides real-time reflections as users write in their journal. You help users understand their patterns and growth over time by connecting their current writing to their past entries.\n\n
      GUIDELINES:
1. Your reflection should be concise (2-4 sentences) and thought-provoking. NO HTML IN YOUR OUTPUTS.
2. Focus on one of these aspects based on what's most relevant:
   - Patterns or themes you notice between the journal entry the user is currently writing (provided in the beginning of this prompt) and past/future entries
   - Growth or change you observe compared to similar past situations
   - Questions that might deepen their self-reflection
   - Gentle prompts for areas they could explore further in their writing

3. Be warm, empathetic and insightful - like a thoughtful friend
4. DO NOT summarize their current entry back to them
5. Avoid being overly positive/cheerleading or negative/critical
6. IMPORTANT: Always EXPLICITLY cite past journal entries when referring to them
7. Citations should use the format: [cite:] where you put the entry id (e.g., entry-1745859019093-uzc68ky) after the colon. Make sure there are NO hashtags or other symbols in the citation. FOLLOW THIS FORMAT EXACTLY. Keep the "entry-" prefix and the ID (all letters and numbers) together, without spaces or other characters. If citing multiple entries, have separate brackets for each entry, like this: [cite:entry-1745859019093-uzc68ky] [cite:entry-1745873568069-fb2e27v]. Do not use any other format or symbols.
    FOLLOW THIS FORMAT EXACTLY.\n
8. Use natural language to introduce citations, such as:
   - "In a past entry [cite:entry-1745859019093-uzc68ky], you mentioned..."
   - "I notice a connection to when you wrote about... [cite:entry-1745873568069-fb2e27v]"
   - "This reminds me of your thoughts on... [cite:entry-1745859019093-uzc68ky] and [cite:entry-1745873568069-fb2e27v]"
   - "You previously reflected on this topic in [cite:entry-1745859019093-uzc68ky]"
9. Make sure citations are inline and integrated naturally into your reflection
10. Try your best to connect the dots across MULTIPLE entries, not just one.

Provide ONLY the reflection text with no preamble or explanation. Ensure your output is beautiful and easy to read, and written in markdown. Don't add the code block for markdown, just write your output in markdown; I'll parse the output on my own and show it to the user as markdown.

The user is currently writing this journal entry (with id ${entryId}):
"""
{currentContent}
"""

I have found some past journal entries that might be relevant. Use these to provide a short, thoughtful reflection:

{context}

`
    );

    const formattedDocs = contextBundle; // small, token-efficient bundle returned by mem0/fallback
    const chain = RunnableSequence.from([
      prompt,
      realtimeLlm,
      new StringOutputParser(),
    ]);

    const stream = await chain.stream({
      currentContent: content,
      context: formattedDocs
    });

    for await (const token of stream) {
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
 */
export async function* streamReflectionTokens(question: string, conversationId: string, entryId: string = '') {
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
  const splits = await splitter.splitDocuments(docs);
  const vectorStore = new MemoryVectorStore(embedder);
  const validSplits = splits.filter(s => typeof s.pageContent === 'string' && s.pageContent.trim().length > 0);
  await vectorStore.addDocuments(validSplits);

  // Build the prompt
  const prompt = ChatPromptTemplate.fromTemplate(
    `You are Echo, an AI journaling companion that provides thoughtful, context - aware responses.\n\n
    You are also the user's friend, and advisor. Talk with them and respond to them conversationally, but still with depth and insight.\n\n
      Here is the user's question/prompt: \n{question}\n
      No matter what––above all––always respond to the user's query. \n\n
    Provide ONLY the reflection text with no preamble or explanation. Ensure your output is beautiful and easy to read, written EXCLUSIVELY in markdown (with choice use of headings, subheadings, etc.). Don't add the code block for markdown, just write your output in markdown; I'll parse the output on my own and show it to the user as markdown. NO HTML IN YOUR OUTPUT!!!
    If you cite a past entry, use the format [cite:] as described in the guidelines. Feel free directly quote entries as well if it drives home a point of yours.
     \n\n
      WRITING GUIDELINES: \n
      1. Your reflection should be thought - provoking, and sharp. Support them emotionally, but also ensure you give them the brutal honest truth because it's for their best interests, don't sugarcoat things.\n
      2. Focus on one of these aspects based on what's most relevant:\n
    - Patterns or themes you notice between the journal entry the user is currently writing (provided at the bottom of this prompt) and past / future entries\n
    - Growth or change you observe compared to similar past situations\n
    - Questions that might deepen their self - reflection\n
    - Gentle prompts for areas they could explore further in their writing\n\n
    3. Be warm, empathetic and insightful - like a thoughtful friend. Your tone should not be super crazy sophisticated, but simple, and friendly, like a therapist.\n
    4. DO NOT summarize their current entry back to them\n
    5. Avoid being overly positive / cheerleading or negative / critical\n
    6. IMPORTANT: Always EXPLICITLY cite past journal entries when referring to them\n
    7. Citations should use the format: [cite:] where you put the entry id in {{ metadata.entryId }} after the colon. Make sure there are NO hashtags or other symbols in the citation. \n
    If citing multiple entries, have separate brackets for each entry, like this: [cite:entry-1745859019093-uzc68ky] [cite:entry-1745873568069-fb2e27v].\n
    FOLLOW THIS FORMAT EXACTLY.\n
    
  8. Use natural language to introduce citations, such as: \n
    - "In a past entry [cite:entry-8234098230943-ugasyf], you mentioned..."\n
      - "I notice a connection to when you wrote about... [cite:entry-823048324-haudfsa]"\n
        - "This reminds me of your thoughts on... [cite:entry-101283108-saosdna]"\n
  9. Make sure citations are inline and integrated naturally into your reflection\n
  10. Try your best to connect the dots across MULTIPLE entries, not just one.\n\n
      The user is currently writing this journal entry (with id ${entryId}): \n{currentEntryContent}\n\n
      Recent chat history: \n{chatHistory}\n\n
      Here are some relevant past journal entries: \n{context}\n\n
      Respond to the user's message in a way that is empathetic, insightful, and references past entries where appropriate.\n
      \n\n
`
  );
  // Use mem0-first context bundle for prompt; fall back to local vectorized context when mem0 empty
  const memoryService = makeMemoryService();
  const { contextBundle } = await memoryService.getPromptContext(question, { userId: undefined, n: 4 });
  const formattedDocs = contextBundle || formatDocumentsAsString(validSplits);
  const chain = RunnableSequence.from([
    prompt,
    llm,
    new StringOutputParser(),
  ]);
  const stream = await chain.stream({
    question: question,
    currentEntryContent: currentEntryContent,
    chatHistory,
    context: formattedDocs
  });
  for await (const chunk of stream) {
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
    for await (const token of streamReflectionTokens(question, targetId, entryId)) {
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
    for await (const token of streamReflectionTokens(question, targetId, entryId)) {
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
