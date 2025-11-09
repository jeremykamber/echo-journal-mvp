import React, { useEffect, useState } from 'react';
import { useServices } from '@/providers/ServiceProvider';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useSettingsStore } from '@/store/settingsStore';

export const MemoryManager: React.FC = () => {
    const { memoryService } = useServices();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const doSearch = async () => {
        setIsLoading(true);
        try {
            const res = await memoryService.searchMemory(query || '');
            setResults(res.results || []);
        } catch (err) {
            console.warn('search failed', err);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        doSearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const handleConfirmDelete = async () => {
        if (!pendingDeleteId) return;
        try {
            if (typeof memoryService.deleteMemory === 'function') {
                await (memoryService.deleteMemory as (id: string) => Promise<{ success: boolean }>)(pendingDeleteId);
            } else {
                console.warn('memoryService.deleteMemory is not implemented. Delete skipped.');
            }
            setResults((r) => r.filter((it) => it.id !== pendingDeleteId));
        } catch (err) {
            console.warn('delete failed', err);
        } finally {
            setPendingDeleteId(null);
        }
    };

    const settings = useSettingsStore();

    return (
        <Card>
            <CardHeader>
                <CardTitle>Memory Manager</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 mb-3">
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search memories..." />
                    <Button onClick={doSearch} size="sm">Search</Button>
                </div>
                {isLoading && <div>Loading…</div>}
                {!isLoading && results.length === 0 && <div className="text-sm text-muted-foreground">No memories found</div>}
                <ScrollArea className="h-64">
                    <ul className="space-y-2 p-2">
                        {results.map((r) => (
                            <li key={r.id} className="border rounded p-2 bg-muted flex justify-between items-start">
                                <div className="text-sm">{String(r.memory || r.content || r.text)}</div>
                                <div className="ml-4 flex gap-2">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button size="sm" variant="ghost" onClick={() => setPendingDeleteId(r.id)}>Delete</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Delete memory?</DialogTitle>
                                            </DialogHeader>
                                            <div className="mt-2">Are you sure you want to delete this memory? This action cannot be undone.</div>
                                            <DialogFooter>
                                                <Button size="sm" variant="destructive" onClick={async () => { await handleConfirmDelete(); }}>Confirm</Button>
                                                <DialogClose asChild>
                                                    <Button size="sm">Cancel</Button>
                                                </DialogClose>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Manage user memories stored by Echo</div>
                <div className="flex gap-2">
                    <Button size="sm" onClick={async () => {
                        const res = await memoryService.searchMemory('', { limit: 1000 });
                        const data = res.results || [];
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'echo-memories.json';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                    }}>Export</Button>
                    {settings.enableSharing && (
                        <Button size="sm" onClick={async () => {
                            // anonymize and copy first 5 memories
                            const res = await memoryService.searchMemory('', { limit: 5 });
                            const data = (res.results || []).map((m: any) => ({ text: (m.memory || m.content || m.text || '').slice(0, 500) }));
                            const anonymized = JSON.stringify(data, null, 2);
                            await navigator.clipboard.writeText(anonymized);
                            alert('Anonymized memories copied to clipboard');
                        }}>Share anonymized</Button>
                    )}
                </div>
            </CardFooter>
        </Card>
    );
};

export default MemoryManager;
