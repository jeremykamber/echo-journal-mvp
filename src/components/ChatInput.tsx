import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';

interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend: () => void;
    disabled?: boolean;
    placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    value,
    onChange,
    onSend,
    disabled = false,
    placeholder = "Type a message..."
}) => (
    <div className="px-4 py-2">
        <div className="flex items-center gap-2 bg-white dark:bg-input/40 shadow-md rounded-full px-4 py-2 border border-muted dark:border-input">
            <input
                value={value}
                onChange={e => onChange(e.target.value)}
                className={cn(
                    "flex-grow bg-transparent border-none focus:outline-none text-black dark:text-white placeholder:text-muted-foreground/60 dark:placeholder:text-muted-foreground/70",
                    disabled && "opacity-60 cursor-not-allowed"
                )}
                placeholder={placeholder}
                disabled={disabled}
            />
            <Button
                onClick={onSend}
                disabled={disabled || !value.trim()}
                className="h-10 aspect-square rounded-full p-0 bg-primary text-white hover:bg-primary/80 transition-colors"
            >
                <Send size={20} />
            </Button>
        </div>
    </div>
);
