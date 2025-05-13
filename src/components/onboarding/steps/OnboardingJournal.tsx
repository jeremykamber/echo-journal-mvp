import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

export const OnboardingJournal = () => {
    return (
        <motion.div
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
        >
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                <BookOpen className="h-8 w-8 text-primary" />
            </div>

            <h2 className="text-2xl font-semibold mb-2">Journal with Ease</h2>
            <p className="text-muted-foreground mb-6">
                Create daily journal entries that capture your thoughts, experiences, and emotions.
            </p>

            <div className="w-full border border-border rounded-lg overflow-hidden mb-4">
                <div className="border-b border-border p-3 bg-card flex items-center">
                    <span className="font-medium">Monday Morning Reflections</span>
                </div>
                <div className="p-4 bg-card/50 text-left text-sm">
                    <p>Today I woke up feeling refreshed and optimistic about the week ahead...</p>
                </div>
            </div>

            <p className="text-sm text-muted-foreground">
                Your entries are stored locally in your browser, so your privacy is protected.
            </p>
        </motion.div>
    );
};

export default OnboardingJournal;
