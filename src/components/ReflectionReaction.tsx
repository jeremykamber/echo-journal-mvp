// src/components/ReflectionReaction.tsx
import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trackReflectionReaction } from '@/lib/analytics';
import { submitReflectionFeedback } from '@/services/supabaseService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReflectionReactionProps {
  reflectionText: string;
  source: 'Journal' | 'Conversation';
  className?: string;
  isRealtimeReflection?: boolean;
}

/**
 * ReflectionReaction component provides like/dislike buttons for AI reflections
 * with tooltip explanations and anonymous tracking
 */
const ReflectionReaction: React.FC<ReflectionReactionProps> = ({
  reflectionText,
  source,
  className,
  isRealtimeReflection = false
}) => {
  const [selectedReaction, setSelectedReaction] = useState<'like' | 'dislike' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const handleReaction = async (type: 'like' | 'dislike') => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Determine reflection type based on isRealtimeReflection flag
      const reflectionType = isRealtimeReflection ? 'realtime-reflection' : 'chat-response';
      
      // Track the reaction in analytics with reflection type
      trackReflectionReaction(type, source, reflectionType);
      
      // Submit reaction to Supabase
      const result = await submitReflectionFeedback(reflectionText, type, reflectionType);
      
      if (!result.success) {
        throw result.error || new Error('Failed to submit feedback');
      }
      
      // Update UI state
      setSelectedReaction(type);
    } catch (error) {
      console.error('Error submitting reaction:', error);
      // Don't change the selected state if there was an error
      setSubmitError('Failed to submit feedback. Your reaction was still recorded for analytics.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <TooltipProvider>
      <div className={cn("flex items-center space-x-2 text-muted-foreground", className)}>
        <span className="text-xs mr-1">Feedback:</span>
        
        {submitError ? (
          <span className="text-xs text-amber-500 max-w-[180px] truncate" title={submitError}>
            Feedback recorded in analytics
          </span>
        ) : selectedReaction ? (
          <span className="text-xs text-primary">
            {selectedReaction === 'like' ? 'Thank you!' : 'Thanks for the feedback'}
          </span>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleReaction('like')}
                  disabled={isSubmitting}
                  aria-label="Like this reflection"
                  className={cn(
                    "p-1 rounded-full hover:bg-accent/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    isSubmitting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>This reflection was helpful</p>
                <p className="text-xs opacity-70">Help improve future reflections</p>
                <p className="text-xs opacity-70">Liked reflection data will be shared</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleReaction('dislike')}
                  disabled={isSubmitting}
                  aria-label="Dislike this reflection"
                  className={cn(
                    "p-1 rounded-full hover:bg-accent/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    isSubmitting && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>This reflection wasn't helpful</p>
                <p className="text-xs opacity-70">Help improve future reflections</p>
                <p className="text-xs opacity-70">Disliked reflection data will be shared</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

export default ReflectionReaction;
