import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.ComponentProps<"div"> {
    children: React.ReactNode;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className, ...props }) => {
    return (
        <div
            className={cn(
                "glass-card flex flex-col items-center md:block border-2 border-primary/20 relative overflow-hidden md:flex-col md:items-center transform translate-y-8",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

export default GlassCard;