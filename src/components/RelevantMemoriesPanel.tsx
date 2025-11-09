import React, { useEffect, useState } from 'react';
import useMemoryAssistant from '@/features/memory/hooks/useMemoryAssistant';
import type { MemoryService } from '@/features/memory/services/memoryService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

type Props = {
    contextText: string;
    userId?: string;
    service?: MemoryService; // DI for tests
    limit?: number;
};

// Panel styled with shadcn Card tokens and Echo phrasing in the title so it
// matches the rest of the app's language and design system.
export const RelevantMemoriesPanel: React.FC<Props> = ({ contextText, userId, service, limit = 5 }) => {
    const { fetchRelevant } = useMemoryAssistant({ service });
    const [results, setResults] = useState<Array<any>>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        setIsLoading(true);
        fetchRelevant(contextText, userId, limit)
            .then((r) => {
                if (!mounted) return;
                setResults(r.results || []);
            })
            .catch(() => {
                if (!mounted) return;
                setResults([]);
            })
            .finally(() => {
                if (!mounted) return;
                setIsLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [contextText, userId, limit, fetchRelevant]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Echo's relevant memories</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div>Loading…</div>
                ) : results.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No relevant memories found.</div>
                ) : (
                    <ul className="space-y-2">
                        {results.map((r) => (
                            <li key={r.id} className="border rounded p-2 bg-muted">
                                <div className="text-sm">{String(r.memory || r.content || r.text)}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
};

export default RelevantMemoriesPanel;
