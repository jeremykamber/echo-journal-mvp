import React from 'react';
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
    isExpanded?: boolean; // New prop: true if part of full panel, false if floating
    onMinimize?: () => void; // New prop: function to call when minimize is clicked
}

export const ChatInput: React.FC<ChatInputProps> = ({
    value,
    onChange,
    onSend,
    disabled = false,
    placeholder = "Type a message...",
    onFocus,
    onBlur,
    isExpanded = true, // Default to expanded state (for desktop or when panel is shown)
    onMinimize
}) => (
    <div className="relative flex items-center gap-2 bg-white dark:bg-input-opaque shadow-md rounded-full px-4 py-2 border border-muted dark:border-input">
        {/* Minimize Button - Show only when expanded and onMinimize is provided */}
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
        <input
            value={value}
            onChange={e => onChange(e.target.value)}
            className={cn(
                "flex-grow bg-transparent border-none focus:outline-none text-black dark:text-white placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/70",
                disabled && "opacity-60 cursor-not-allowed",
                isExpanded && onMinimize && "pl-8" // Add padding when minimize button is shown
            )}
            placeholder={placeholder}
            disabled={disabled}
            onFocus={onFocus}
            onBlur={onBlur}
        />
        <Button
            onClick={onSend}
            disabled={disabled || !value.trim()}
            className="h-10 aspect-square rounded-full p-0 bg-primary text-white hover:bg-primary/80 transition-colors"
        >
            <Send size={20} />
        </Button>
    </div>
);
