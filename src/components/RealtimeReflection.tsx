import React, { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { getRealtimeReflection, RealtimeReflectionResponse } from '@/services/aiService';
import { cn } from '@/lib/utils';
import { parseReflectionWithCitations } from '@/lib/parseReflectionWithCitations';
import { IterableReadableStream } from '@langchain/core/utils/stream';
import MarkdownWithCitations from './MarkdownWithCitations';

interface RealtimeReflectionProps {
    content: string;
    entryId: string;
    initialContent: string; // Add prop to track if this is the first edit session
}

interface RealtimeReflectionState extends RealtimeReflectionResponse {
    loading: boolean;
    visible: boolean; // Track visibility for animations
}

const RealtimeReflection: React.FC<RealtimeReflectionProps> = ({ content, entryId, initialContent }) => {
    const [reflection, setReflection] = useState<RealtimeReflectionState>({
        reflection: new IterableReadableStream,
        relatedEntries: [],
        loading: false,
        visible: false
    });

    const [reflectionContent, setReflectionContent] = useState<string>(''); // New state for accumulated reflection content

    // Track if this is the user's first edit to avoid immediate reflection
    const [isFirstEdit, setIsFirstEdit] = useState(true);

    // Debounce the content to avoid too many API calls
    const debouncedContent = useDebounce(content, 1500);

    // Only fetch reflection if content has meaningful length
    useEffect(() => {
        // Skip the initial content (when first opening the entry)
        if (isFirstEdit && debouncedContent === initialContent) {
            return;
        }

        // After first content change, we're no longer in first edit
        if (isFirstEdit && debouncedContent !== initialContent) {
            setIsFirstEdit(false);
            return; // Skip triggering reflection on the very first edit
        }

        const fetchReflection = async () => {
            // Don't generate for very short content
            if (debouncedContent.trim().length < 30) {
                setReflection(prev => ({ ...prev, reflection: new IterableReadableStream, relatedEntries: [], loading: false }));
                setReflectionContent(''); // Clear reflection content
                return;
            }

            setReflection(prev => ({ ...prev, loading: true, visible: false }));
            setReflectionContent(''); // Reset reflection content before fetching

            try {
                const result = await getRealtimeReflection(debouncedContent, entryId);

                // If we got an actual reflection, make component visible with animation
                if (result.reflection) {
                    setReflection({ ...result, loading: false, visible: false });

                    // Slight delay before showing to make animation smoother
                    setTimeout(() => {
                        setReflection(prev => ({ ...prev, visible: true }));
                    }, 100);

                    // Accumulate tokens from the reflection stream
                    for await (const token of result.reflection) {
                        setReflectionContent(prev => prev + token);
                    }
                }
            } catch (error) {
                console.error("Error getting real-time reflection:", error);
                setReflection(prev => ({ ...prev, reflection: new IterableReadableStream, relatedEntries: [], loading: false, visible: false }));
                setReflectionContent(''); // Clear reflection content on error
            }
        };

        fetchReflection();
    }, [debouncedContent, entryId, initialContent, isFirstEdit]);

    // No visibility if we're loading or have no reflection
    if (!reflectionContent || !reflection.visible) {
        return null;
    }

    return (
        <div
            className={cn(
                "p-4 border border-border rounded-md bg-background/80 shadow-sm",
                "transition-all duration-700 ease-in-out",
                reflection.visible ? "opacity-100 backdrop-blur-sm" : "opacity-0 backdrop-blur-none"
            )}
        >
            <div className="flex items-center space-x-2 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span className="text-xs font-medium text-muted-foreground">Echo's Reflection</span>
            </div>

            <div className="text-sm text-foreground mb-3">
                <MarkdownWithCitations>
                    {reflectionContent}
                </MarkdownWithCitations>
            </div>
        </div>
    );
};

export default RealtimeReflection;
