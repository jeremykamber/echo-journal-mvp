import React, { useState } from 'react';
import useGoalsStore from '@/store/goalsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const GoalPanel: React.FC = () => {
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const addGoal = useGoalsStore((s) => s.addGoal);
    const goals = useGoalsStore((s) => s.goals);

    return (
        <div className="space-y-2">
            <h3 className="text-lg font-semibold">Goals</h3>
            <div className="flex gap-2">
                <Input placeholder="Small goal (e.g., sleep 7 hours)" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Button onClick={() => { if (title.trim()) { addGoal({ title: title.trim(), description: desc.trim() }); setTitle(''); setDesc(''); } }}>Add</Button>
            </div>
            <ul className="space-y-1 text-sm">
                {goals.map(g => (
                    <li key={g.id} className="flex items-center justify-between">
                        <div>{g.title} {g.completed ? '✓' : ''}</div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={() => useGoalsStore.getState().completeGoal(g.id)}>Complete</Button>
                            <Button size="sm" variant="destructive" onClick={() => useGoalsStore.getState().removeGoal(g.id)}>Remove</Button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default GoalPanel;
