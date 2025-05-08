import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send, ChevronDown } from 'lucide-react';

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    disabled?: boolean;
    placeholder?: string;
    onFocus?: () => void;
    onBlur?: () => void;
    isExpanded?: boolean;
    onMinimize?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    value,
    onChange,
    onSend,
    disabled = false,
    placeholder = "Type a message...",
    onFocus,
    onBlur,
    isExpanded = true,
    onMinimize
}) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent newline
            if (value.trim()) {
                handleSend();
            }
        }
    };

    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset height
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Adjust to content
        }
    };

    const handleSend = () => {
        onSend();
        onChange(''); // Clear the input
        resetTextareaHeight(); // Reset the height of the textarea
    };

    const resetTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset to original height
        }
    };

    return (
        <div className="relative flex items-center gap-2 bg-white dark:bg-input-opaque shadow-md rounded-xl px-4 py-2 border border-muted dark:border-input">
            {isExpanded && onMinimize && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onMinimize}
                    className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-300 ease-in-out"
                    aria-label="Minimize chat"
                >
                    <ChevronDown
                        size={isExpanded ? 18 : 0}
                        className={cn(
                            "transition-all duration-300 ease-in-out",
                            isExpanded ? "w-4 opacity-100" : "w-0 opacity-0"
                        )}
                    />
                </Button>
            )}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    adjustTextareaHeight();
                }}
                onKeyDown={handleKeyDown}
                className={cn(
                    "flex-grow bg-transparent border-none focus:outline-none text-black dark:text-white placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/70 resize-none overflow-hidden",
                    disabled && "opacity-60 cursor-not-allowed",
                    isExpanded && onMinimize && "pl-8"
                )}
                placeholder={placeholder}
                disabled={disabled}
                onFocus={onFocus}
                onBlur={onBlur}
                rows={1} // Start with a single row
            />
            <Button
                onClick={handleSend}
                disabled={disabled || !value.trim()}
                className="h-10 aspect-square rounded-full p-0 bg-primary text-white hover:bg-primary/80 transition-colors"
            >
                <Send size={20} />
            </Button>
        </div>
    );
};
