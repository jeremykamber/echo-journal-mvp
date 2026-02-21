import { JournalEntry } from '@/store/journalStore';

export interface Cluster {
    theme: string;
    entryIds: string[];
    relevance: number;
}

/**
 * Groups entries into clusters based on shared tags and semantic similarity.
 * For the MVP, we use tag-based grouping as the primary clustering mechanism.
 */
export function clusterEntries(entries: JournalEntry[]): Cluster[] {
    const tagMap = new Map<string, string[]>();

    entries.forEach(entry => {
        (entry.tags || []).forEach(tag => {
            const normalizedTag = tag.toLowerCase().trim();
            if (!tagMap.has(normalizedTag)) {
                tagMap.set(normalizedTag, []);
            }
            tagMap.get(normalizedTag)!.push(entry.id);
        });
    });

    // Convert map to clusters, filtering out very small clusters if there are many
    const clusters: Cluster[] = Array.from(tagMap.entries())
        .map(([theme, ids]) => ({
            theme: theme.charAt(0).toUpperCase() + theme.slice(1),
            entryIds: ids,
            relevance: ids.length
        }))
        .sort((a, b) => b.relevance - a.relevance);

    return clusters;
}
