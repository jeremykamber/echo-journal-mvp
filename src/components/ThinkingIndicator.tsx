// filepath: /Users/jeremy/Development/Apps/echo-journal-mvp/src/components/ThinkingIndicator.tsx
import React from 'react';
import { cn } from '@/lib/utils';

const ThinkingIndicator: React.FC = () => {
    return (
        <div className="flex items-start self-start max-w-xs p-3 rounded-md bg-muted text-muted-foreground">
            <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"
                        style={{ animationDuration: '1.2s', animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"
                        style={{ animationDuration: '1.2s', animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"
                        style={{ animationDuration: '1.2s', animationDelay: '0.4s' }}></div>
                </div>
                <span className="text-xs font-medium">Echo is thinking...</span>
            </div>
        </div>
    );
};

export default ThinkingIndicator;
