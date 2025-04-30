import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

interface AnimatedButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "primary-foreground" | "ghost";
  icon?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

const AnimatedButton = ({
  children,
  className,
  onClick,
  type = "button",
  variant = "primary",
  icon = true,
  disabled = false,
  loading = false,
}: AnimatedButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyles = "relative overflow-hidden rounded-full font-medium transition-all duration-300 flex items-center justify-center";

  const variantStyles = {
    "primary": "bg-primary text-white hover:shadow-md hover:shadow-primary/25 hover:translate-y-[-2px] active:translate-y-0 dark:bg-primary dark:text-primary-foreground dark:hover:shadow-primary/40",
    "primary-foreground": "bg-primary-foreground text-primary hover:bg-primary/10 dark:bg-primary-foreground dark:text-primary dark:hover:bg-primary/20",
    "ghost": "bg-transparent text-accent hover:bg-accent/5 dark:text-accent-foreground dark:hover:bg-accent/20"
  };

  const sizeStyles = "px-6 py-3 text-base";

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles,
        disabled && "opacity-60 cursor-not-allowed hover:translate-y-0",
        loading && "relative cursor-wait",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="flex items-center justify-center gap-2 transition-transform duration-300">
        {children}
        {icon && (
          <ArrowRight
            className={cn(
              "h-4 w-4 ml-1 transition-transform duration-300",
              isHovered ? "translate-x-1" : ""
            )}
          />
        )}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center bg-inherit">
          <svg
            className="animate-spin h-5 w-5 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </span>
      )}
    </button>
  );
};

export default AnimatedButton;
