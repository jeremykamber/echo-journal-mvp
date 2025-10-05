import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "./ui/textarea";
import { trackEvent, trackAppSatisfactionFeedback, trackAppSatisfactionDetailedFeedback } from '@/lib/analytics';
import { submitAppFeedback } from '@/services/supabaseService';

// Custom event name for reflection viewing
const REFLECTION_VIEWED_EVENT = 'reflection_viewed';

const FeedbackNudge: React.FC = () => {
  // Track if the user has interacted with reflections
  const [isNudgeOpen, setIsNudgeOpen] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [hasShownNudge, setHasShownNudge] = useState(false);

  // Use local storage to track if we've already shown the nudge in this session
  useEffect(() => {
    const nudgeShown = localStorage.getItem('feedbackNudgeShown');
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
          localStorage.setItem('feedbackNudgeShown', 'true');
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
  }, [hasShownNudge]);

  const handleEmojiClick = async (emoji: string) => {
    // Track the feedback given with the emoji using specific function
    trackAppSatisfactionFeedback(emoji);

    if (emoji === "😞") {
      setShowFollowUp(true);
    } else {
      // For positive/neutral feedback, submit immediately
      try {
        await submitAppFeedback(emoji);
      } catch (error) {
        console.error('Failed to submit emoji feedback:', error);
      }
      setIsNudgeOpen(false);
    }
  };

  const handleSubmitFeedback = async () => {
    // Track detailed feedback submission with specific function
    trackAppSatisfactionDetailedFeedback(feedback.length);

    // Send feedback to Supabase
    try {
      await submitAppFeedback("😞", feedback);
    } catch (error) {
      console.error('Failed to submit detailed feedback:', error);
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