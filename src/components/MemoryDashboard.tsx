import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useServices } from '@/providers/ServiceProvider';
import journalStore from '@/store/journalStore';

export const MemoryDashboard: React.FC = () => {
    const { memoryService } = useServices();
    const [count, setCount] = useState(0);
    const [topTags, setTopTags] = useState<Array<{ tag: string; count: number }>>([]);
    const [dailyCounts, setDailyCounts] = useState<Array<{ date: string; count: number }>>([]);

    useEffect(() => {
        let mounted = true;
        async function load() {
            try {
                const res = await memoryService.searchMemory('', { limit: 1000 });
                const items = res.results || [];
                if (!mounted) return;
                setCount(items.length);
                // simple tag extraction from metadata
                const tagCounts: Record<string, number> = {};
                const dayCounts: Record<string, number> = {};
                items.forEach((it: any) => {
                    const tags = (it.metadata && it.metadata.tags) || (it.metadata && it.metadata.category && [it.metadata.category]) || [];
                    if (Array.isArray(tags)) tags.forEach((t: string) => tagCounts[t] = (tagCounts[t] || 0) + 1);
                    const date = (it.created_at || it.createdAt || new Date()).slice(0, 10);
                    dayCounts[date] = (dayCounts[date] || 0) + 1;
                });
                setTopTags(Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, c]) => ({ tag, count: c })));
                setDailyCounts(Object.entries(dayCounts).sort((a, b) => a[0].localeCompare(b[0])).map(([date, count]) => ({ date, count })));
            } catch (err) {
                console.warn('memory dashboard load failed', err);
            }
        }
        load();
        return () => { mounted = false; };
    }, [memoryService]);

    const entries = journalStore.getState().entries || [];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Memory Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <div>
                            <div className="text-sm text-muted-foreground">Total memories</div>
                            <div className="text-2xl font-semibold">{count}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Top tags</div>
                            <ul className="mt-2 text-sm space-y-1">
                                {topTags.map(t => <li key={t.tag}>{t.tag} — {t.count}</li>)}
                            </ul>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Recent entries</div>
                            <ul className="mt-2 text-sm space-y-1">
                                {entries.slice(-5).reverse().map(e => <li key={e.id}>{e.title || e.date}</li>)}
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Memory timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm">
                        {dailyCounts.map(d => (
                            <li key={d.date}>{d.date} — {d.count}</li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
};

export default MemoryDashboard;
