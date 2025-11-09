import React, { useState } from 'react';
import useNudgeStore from '@/store/nudgeStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import useGoalsStore from '@/store/goalsStore';

export const NudgeBanner: React.FC = () => {
    const current = useNudgeStore((s) => s.current);
    const dismiss = useNudgeStore((s) => s.dismissCurrent);
    const forgetRelated = useNudgeStore((s) => s.forgetRelated);
    const [showWhy, setShowWhy] = useState(false);

    if (!current) return null;

    return (
        <div aria-live="polite" className="fixed bottom-4 right-4 z-50 w-full max-w-md">
            <Card>
                <CardContent>
                    <div className="text-sm font-medium">Suggestion</div>
                    <div className="mt-1 text-sm">{current.text}</div>
                    <div className="mt-2 text-xs text-muted-foreground">From Echo • {new Date(current.createdAt).toLocaleString()}</div>
                    <div className="mt-3 flex gap-2">
                        <Button size="sm" onClick={() => setShowWhy((v) => !v)} aria-expanded={showWhy}>Why?</Button>
                        <Button size="sm" variant="outline" onClick={() => { if (current.relatedEntryIds) forgetRelated(current.relatedEntryIds); dismiss(); }}>Forget</Button>
                        <Button size="sm" onClick={() => { if (current?.text) { useGoalsStore.getState().addGoal({ title: current.text, description: current.reason }); dismiss(); } }}>Save as goal</Button>
                    </div>
                    {showWhy && (
                        <div className="mt-3 p-2 bg-muted rounded">
                            <div className="text-xs">{current.reason}</div>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button size="sm" variant="ghost" onClick={() => dismiss()}>Dismiss</Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default NudgeBanner;
