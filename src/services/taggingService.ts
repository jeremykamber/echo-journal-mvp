import { getGlobalLLMProvider } from '@/services/llmProviders/adapterService';
import { ChatMessage } from '@/services/llmProviders/interface';

const TAGGING_SYSTEM_PROMPT = `You are an expert at categorizing personal journal entries.
Your task is to analyze the content of a journal entry and provide a list of relevant tags.

RULES:
1. Provide between 3 and 6 tags.
2. Tags should be single words or short phrases (e.g., "Work", "Anxiety", "Personal Growth", "Family").
3. Tags should capture the emotional state, main topics, and people mentioned.
4. Respond ONLY with a JSON array of strings. Do not include any other text or formatting blocks.
5. Example response: ["Productivity", "Optimism", "New Project"]`;

/**
 * Generates tags for a journal entry based on its content.
 */
export async function generateTagsForEntry(content: string): Promise<string[]> {
    const provider = getGlobalLLMProvider();
    if (!provider || content.trim().length < 20) {
        return [];
    }

    const messages: ChatMessage[] = [
        { role: 'system', content: TAGGING_SYSTEM_PROMPT },
        { role: 'user', content: `Please tag this journal entry:\n\n${content}` },
    ];

    try {
        let result = '';
        // Use the streaming interface but catch it all
        for await (const chunk of provider.streamChatCompletion({ messages })) {
            result += chunk;
        }

        // Attempt to parse result as JSON
        // Sometimes LLMs wrap in markdown code blocks even if told not to
        const jsonMatch = result.match(/\[.*\]/s);
        if (jsonMatch) {
            const tags = JSON.parse(jsonMatch[0]);
            if (Array.isArray(tags)) {
                return tags.map(t => String(t).trim());
            }
        }

        return [];
    } catch (error) {
        console.error('Error generating tags:', error);
        return [];
    }
}
