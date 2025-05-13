import React from 'react';
import { Card } from '@/components/ui/card';

type CardVariant = 'normal' | 'outlined' | 'elevated' | 'flat' | 'gradient';

interface EchoCardProps {
    children: React.ReactNode;
    variant?: CardVariant;
    className?: string;
}

const EchoCard: React.FC<EchoCardProps> = ({ 
    children, 
    variant = 'normal',
    className = '' 
}) => {
    const baseClasses = "group relative rounded-xl transition-all duration-300 px-8 py-6";
    
    const variantClasses = {
        normal: "bg-card border border-primary/20 hover:border-primary/0 shadow-lg hover:shadow-xl dark:shadow-primary/5",
        outlined: "bg-background border-2 border-primary/30 hover:border-primary/50 shadow-none hover:shadow",
        elevated: "bg-card border-0 shadow-xl hover:shadow-2xl dark:shadow-primary/10 hover:-translate-y-1",
        flat: "bg-muted/50 border-0 shadow-none hover:bg-muted",
        gradient: "bg-gradient-to-br from-primary/10 to-primary/5 border-0 shadow-lg hover:shadow-xl"
    };

    return (
        <Card className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
            {children}
        </Card>
    );
};

export default EchoCard;