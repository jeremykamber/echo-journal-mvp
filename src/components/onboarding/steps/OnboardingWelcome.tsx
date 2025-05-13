import { motion } from 'framer-motion';
import Logo from '@/components/Logo';
import EchoCard from '@/components/EchoCard';

const OnboardingWelcome = () => {
    return (
        <motion.div
            className="flex flex-col items-center text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className='flex-1 flex items-center mb-6'>
                <Logo />
            </div>

            <h2 className="text-4xl font-serif text-primary-900 font-medium mb-2">Welcome to <span className='text-primary'>Echo</span></h2>
            <p className="text-muted-foreground mb-6">
                Your AI-powered journaling companion that helps you reflect, grow, and evolve.
            </p>

            <EchoCard variant='outlined'>
                <p className="mb-2">Here's what makes Echo special:</p>
                <ul className="space-y-2">
                    <li className="flex items-center gap-2">
                        <div className="h-2 w-2 min-w-2 min-h-2 rounded-full bg-primary aspect-square"></div>
                        <span>Private first-class journaling experience</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <div className="h-2 w-2 min-w-2 min-h-2 rounded-full bg-primary aspect-square"></div>
                        <span>Thoughtful AI reflections on your entries</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <div className="h-2 w-2 min-w-2 min-h-2 rounded-full bg-primary aspect-square"></div>
                        <span>Connect with past insights and memories</span>
                    </li>
                </ul>
            </EchoCard>
        </motion.div>
    );
};

export default OnboardingWelcome;
