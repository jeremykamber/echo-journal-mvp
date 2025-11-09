import React, { useState } from 'react';
import useMemoryAssistant from '@/features/memory/hooks/useMemoryAssistant';
import type { MemoryService } from '@/features/memory/services/memoryService';
import { Button } from '@/components/ui/button';

type MemoryButtonProps = {
    textToSave: string;
    userId?: string;
    service?: MemoryService; // optional DI for tests
    label?: string;
};

// Use a shadcn Button and Echo design tokens (primary color). Keep aria-label
// for test discovery and provide an accessible label for screen readers.
export const MemoryButton: React.FC<MemoryButtonProps> = ({ textToSave, userId, service, label = 'Save to Echo' }) => {
    const { saveMemory, isSaving } = useMemoryAssistant({ service });
    const [saved, setSaved] = useState(false);

    const handleClick = async () => {
        setSaved(false);
        const res = await saveMemory(textToSave, { userId });
        if (res?.success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2_000);
        }
    };

    return (
        <Button
            onClick={handleClick}
            disabled={isSaving}
            variant="default"
            size="sm"
            aria-label="memory-save-button"
        >
            {isSaving ? 'Saving…' : saved ? 'Saved' : label}
        </Button>
    );
};

export default MemoryButton;
