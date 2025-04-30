import React from "react";
import { cn } from "@/lib/utils";

interface EyebrowTextProps {
  isLoaded: boolean;
  text: string;
}

const EyebrowTextPill: React.FC<EyebrowTextProps> = ({ isLoaded, text }) => {
  return (
    <p className={cn(
      "inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4",
      "opacity-0",
      isLoaded && "opacity-100 animate-fade-in"
    )}>
      {text}
    </p>
  );
};

export default EyebrowTextPill;
