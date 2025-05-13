import React from "react";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface AppHeaderProps {
    left?: React.ReactNode;
    center?: React.ReactNode;
    right?: React.ReactNode;
    className?: string;
}

/**
 * Responsive header with sidebar trigger, left/center/right slots.
 * - On mobile, SidebarTrigger is always visible on the left.
 * - Left, center, right slots are flexed for layout.
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
    left,
    center,
    right,
    className,
}) => {
    return (
        <header
            className={cn(
                "sticky top-0 z-30 w-full bg-background/80 backdrop-blur flex items-center border-b border-border px-2 md:px-4 h-14 md:h-16",
                className
            )}
        >
            <div className="flex items-center min-w-0 flex-1 gap-2">
                {/* Sidebar trigger always visible on mobile */}
                <SidebarTrigger className="md:hidden mr-2" />
                {left && <div className="flex items-center min-w-0">{left}</div>}
            </div>
            {center && (
                <div className="flex-4 flex justify-center min-w-0 px-2">
                    <div className="truncate text-center max-w-full flex items-center">
                        {center}
                    </div>
                </div>
            )}
            <div className="flex items-center min-w-0 flex-1 justify-end gap-2">
                {right}
            </div>
        </header>
    );
};

export default AppHeader;
