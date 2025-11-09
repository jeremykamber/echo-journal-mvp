import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "./ui/textarea";
import { trackEvent, trackAppSatisfactionFeedback, trackAppSatisfactionDetailedFeedback } from '@/lib/analytics';
import useFeedbackNudge from '@/features/feedback/hooks/useFeedbackNudge';
import { useServices } from '@/providers/ServiceProvider';

// Custom event name for reflection viewing
const REFLECTION_VIEWED_EVENT = 'reflection_viewed';

const FeedbackNudge: React.FC = () => {
  // Track if the user has interacted with reflections
  const [isNudgeOpen, setIsNudgeOpen] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [hasShownNudge, setHasShownNudge] = useState(false);

  const { sessionService } = useServices();

  // Use sessionService to track if we've already shown the nudge in this session
  useEffect(() => {
    const nudgeShown = sessionService.getItem('feedbackNudgeShown');
    if (nudgeShown) {
      setHasShownNudge(true);
    }

    // Set up event listener for when a reflection is viewed
    const handleReflectionViewed = () => {
      if (!hasShownNudge) {
        // Only show the nudge once per session and after short delay
        setTimeout(() => {
          setIsNudgeOpen(true);
          setHasShownNudge(true);
          sessionService.setItem('feedbackNudgeShown', 'true');
          trackEvent('Feedback', 'NudgeDisplayed', 'AfterReflectionView');
        }, 1500); // Delay to ensure user has had time to read the reflection
      }
    };

    // Listen for reflection viewed event
    document.addEventListener(REFLECTION_VIEWED_EVENT, handleReflectionViewed);

    // Cleanup
    return () => {
      document.removeEventListener(REFLECTION_VIEWED_EVENT, handleReflectionViewed);
    };
  }, [hasShownNudge, sessionService]);

  const { submitEmoji, submitFeedback } = useFeedbackNudge();

  const handleEmojiClick = async (emoji: string) => {
    // Track immediately for analytics parity with previous behavior
    trackAppSatisfactionFeedback(emoji);

    const res = await submitEmoji(emoji);
    if ((res as any).needsFollowUp) {
      setShowFollowUp(true);
      return;
    }

    // If submission returned a result, handle errors or close dialog on success
    const { result } = res as any;
    if (result && !result.success) {
      console.error('Failed to submit emoji feedback:', result.error);
    }
    setIsNudgeOpen(false);
  };

  const handleSubmitFeedback = async () => {
    // Track detailed feedback submission with specific function
    trackAppSatisfactionDetailedFeedback(feedback.length);

    // Send feedback via service
    const res = await submitFeedback('😞', feedback);
    if (!res.success) {
      console.error('Failed to submit detailed feedback:', res.error);
    }

    // Close dialog and reset state
    setIsNudgeOpen(false);
    setShowFollowUp(false);
    setFeedback("");
  };

  return (
    <Dialog open={isNudgeOpen} onOpenChange={setIsNudgeOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>How was today's insight?</DialogTitle>
        </DialogHeader>
        {!showFollowUp ? (
          <div className="flex justify-around my-4">
            {["😃", "🙂", "😐", "😞"].map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                className="text-2xl p-4 h-auto hover:bg-secondary"
                onClick={() => handleEmojiClick(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <Textarea
              placeholder="What went wrong?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[100px]"
            />
            <DialogFooter>
              <Button onClick={handleSubmitFeedback} variant="default">
                Submit
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackNudge;