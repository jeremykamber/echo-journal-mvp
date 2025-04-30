import React from "react";
import { cn } from "@/lib/utils";

interface ErrorCardProps {
  error: boolean;
  message: string;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ error, message }) => {
  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out mb-16 md:mb-20 max-w-md",
        error ? "overflow-visible max-h-96 opacity-100 mt-6" : "max-h-0 opacity-0 mt-0"
      )}
    >
      <div className="p-5 glass-card border-2 border-primary/20 shadow-sm flex flex-col items-center text-center">
        <div className="w-10 h-10 rounded-full bg-primary-foreground/60 flex items-center justify-center mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M12 9v4"></path>
            <path d="M12 17h.01"></path>
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        </div>
        <h4 className="font-medium text-accent mb-1">Checkout Issue</h4>
        <p className="text-foreground/80">{message}</p>
        <button
          className="mt-3 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default ErrorCard;
