// filepath: src/components/MessageCitation.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';

interface MessageCitationProps {
    messageId: string;
    text: string;
    link: string;
    sender: 'user' | 'ai';
}

const MessageCitation: React.FC<MessageCitationProps> = ({ text, link, sender }) => {
    return (
        <Link
            to={link}
            className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md",
                "bg-blue-500/10 text-blue-600 hover:bg-blue-500/5 dark:text-blue-400",
                "text-xs font-medium no-underline transition-colors",
                "whitespace-nowrap max-w-[150px]",
                "border border-blue-200/50 dark:border-blue-800/50",
                "shadow-sm"
            )}
        >
            <MessageSquare className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
                {sender === 'user' ? 'User' : 'Echo'}: {text.substring(0, 15)}...
            </span>
        </Link>
    );
};

export default MessageCitation;
