import React from 'react';
import { useStashStore } from '@/store/stashStore';
import { toast } from 'sonner';
import { Bookmark, BookmarkCheck } from 'lucide-react';

interface StashButtonProps {
    reflectionText: string;
    sourceType: 'journal' | 'conversation';
    sourceId: string;
    sourceTitleOrDate: string;
    createdAt: string;
    userId: string;
    className?: string;
}

export const StashButton: React.FC<StashButtonProps> = ({
    reflectionText,
    sourceType,
    sourceId,
    sourceTitleOrDate,
    createdAt,
    userId,
    className = '',
}) => {
    const { addToStash, removeFromStash, items } = useStashStore();
    const stashed = items.some(
        (item) => item.sourceId === sourceId && item.reflectionText === reflectionText
    );
    const stashItem = items.find(
        (item) => item.sourceId === sourceId && item.reflectionText === reflectionText
    );

    const handleStash = () => {
        if (!stashed) {
            addToStash({
                userId,
                reflectionText,
                sourceType,
                sourceId,
                sourceTitleOrDate,
                createdAt,
            });
            toast('Reflection stashed.');
        } else if (stashItem) {
            removeFromStash(stashItem.stashItemId);
            toast('Removed from Stash.');
        }
    };

    return (
        <button
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border transition-all duration-300 hover:bg-muted ${className}`}
            onClick={handleStash}
            title={stashed ? 'Remove from Stash' : 'Save this reflection to your Stash.'}
            type="button"
        >
            {stashed ? (
                <BookmarkCheck className="w-4 h-4 text-primary" />
            ) : (
                <Bookmark className="w-4 h-4" />
            )}
            <span>{stashed ? 'Stashed' : 'Stash'}</span>
        </button>
    );
};
