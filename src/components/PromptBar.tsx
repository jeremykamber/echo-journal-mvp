import React from 'react';
import useConversationStore from '@/store/conversationStore';
import { ChatInput } from '@/components/ChatInput';
import { useAI } from '@/context/AIContext';
import { trackSendMessage, trackNewConversation } from '@/services/analyticsService';

interface PromptBarProps {
    className?: string;
    placeholder?: string;
    disabled?: boolean;
}

const PromptBar: React.FC<PromptBarProps> = ({
    className,
    placeholder = "Ask Echo anything...",
    disabled = false,
}) => {
    const [input, setInput] = React.useState('');
    const createConversation = useConversationStore((state) => state.createConversation);

    const { sendMessageToAI } = useAI();

    const handleSend = async () => {
        if (!input.trim()) return;
        const conversationId = createConversation(input.trim());
        trackNewConversation(); // Track new conversation started via prompt bar
        await sendMessageToAI(input.trim(), conversationId, {}, `/conversation/${conversationId}`); // Pass navigateTo here
        trackSendMessage(); // Track message sent via prompt bar
        setInput('');
    };

    return (
        <div className={`w-full max-w-3xl mx-auto ${className || ''}`}>
            <ChatInput
                value={input}
                onChange={setInput}
                onSend={handleSend}
                disabled={disabled}
                placeholder={placeholder}
            />
        </div>
    );
};

export default PromptBar;
