import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

export const OnboardingComplete = () => {
    return (
        <motion.div
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <CheckCircle className="h-10 w-10 text-primary" />
            </div>

            <h2 className="text-2xl font-semibold mb-2">You're All Set!</h2>
            <p className="text-muted-foreground mb-6">
                You're ready to start your journaling journey with Echo.
            </p>

            <div className="grid grid-cols-1 gap-4 w-full mb-4">
                <div className="bg-card border border-border rounded-md p-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-medium">1</span>
                    </div>
                    <div className="text-left">
                        <p className="font-medium">Create your first journal entry</p>
                        <p className="text-sm text-muted-foreground">Start writing and reflect on your day</p>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-md p-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-medium">2</span>
                    </div>
                    <div className="text-left">
                        <p className="font-medium">Ask Echo a question</p>
                        <p className="text-sm text-muted-foreground">Start a conversation about your journal entries</p>
                    </div>
                </div>
            </div>

            <p className="text-sm text-muted-foreground">
                Your journey of self-reflection begins now!
            </p>
        </motion.div>
    );
};

export default OnboardingComplete;
