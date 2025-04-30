import React from 'react';
import useConversationStore from '@/store/conversationStore';
import { ChatInput } from '@/components/ChatInput';
import { useNavigate } from 'react-router-dom';
import { useAI } from '@/context/AIContext';

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
    const navigate = useNavigate();

    const { sendMessageToAI } = useAI();

    const handleSend = async () => {
        if (!input.trim()) return;
        const conversationId = createConversation(input.trim());
        await sendMessageToAI(input.trim(), conversationId, {}, `/conversation/${conversationId}`); // Pass navigateTo here
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
