import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { ChatBubble } from '@/components/ChatBubble';

const OnboardingAI = () => {
    return (
        <motion.div
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <Sparkles className="h-8 w-8 text-primary" />
            </div>

            <h2 className="text-2xl font-semibold mb-2">AI-Powered Insights</h2>
            <p className="text-muted-foreground mb-6">
                Echo offers real-time reflections on your journal entries and can answer questions about your past experiences.
            </p>

            <div className="w-full space-y-3 mb-4">
                <div className="w-[70%] ml-auto">
                    <ChatBubble
                        message={{
                            sender: 'user',
                            text: 'What patterns do you notice in how I deal with stress?',
                            timestamp: new Date().toISOString(),
                            messageId: 'example-1',
                            conversationId: 'example-1',
                        }}
                    />
                </div>

                <ChatBubble
                    message={{
                        sender: 'ai',
                        text: 'Based on your journal entries, I\'ve noticed you tend to process stress through creative activities like **drawing** and **writing**. For example, last month you wrote that sketching helped clear your mind after a challenging work meeting.',
                        timestamp: new Date().toISOString(),
                        messageId: 'example-2',
                        conversationId: 'example-1',
                        isRealtimeReflection: false
                    }}
                />
            </div>

            <p className="text-sm text-muted-foreground">
                Echo uses AI to help you gain insights from your journal, connecting past and present reflections.
            </p>
        </motion.div>
    );
};

export default OnboardingAI;
