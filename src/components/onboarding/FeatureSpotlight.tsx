import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SpotlightProps {
  targetSelector: string;
  isActive: boolean;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  onClose: () => void;
}

const FeatureSpotlight: React.FC<SpotlightProps> = ({
  targetSelector,
  isActive,
  title,
  description,
  position = 'bottom',
  onClose,
}) => {
  const [coordinates, setCoordinates] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Find target element and calculate its position
    const targetElement = document.querySelector(targetSelector);
    if (!targetElement) return;

    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect();
      setCoordinates({
        top: rect.top + window.scrollY + (targetSelector == '[data-sidebar="trigger"]' ? 2 : 0),
        left: rect.left + window.scrollX  + (targetSelector == '[data-sidebar="trigger"]' ? 8 : 0),
        width: rect.width,
        height: rect.height,
      });
    };

    updatePosition();

    // Update position on resize and scroll
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, targetSelector]);

  if (!isActive || !coordinates) return null;

  // Calculate tooltip position
  const getTooltipPosition = () => {
    const padding = 10;

    switch (position) {
      case 'top':
        return {
          top: coordinates.top - padding,
          left: coordinates.left + coordinates.width / 2,
          transform: 'translate(-50%, -100%)',
        };
      case 'bottom':
        return {
          top: coordinates.top + coordinates.height + padding,
          left: coordinates.left + coordinates.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          top: coordinates.top + coordinates.height / 2,
          left: coordinates.left - padding,
          transform: 'translate(-100%, -50%)',
        };
      case 'right':
        return {
          top: coordinates.top + coordinates.height / 2,
          left: coordinates.left + coordinates.width + padding,
          transform: 'translateY(-50%)',
        };
      default:
        return {
          top: coordinates.top + coordinates.height + padding,
          left: coordinates.left + coordinates.width / 2,
          transform: 'translateX(-50%)',
        };
    }
  };

  const tooltipPosition = getTooltipPosition();

  // Create overlay with a hole for the target element
  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 pointer-events-auto"
        onClick={onClose}
      >
        {/* Semi-transparent overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Cutout for target element */}
        <div
          className="absolute bg-transparent border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
          style={{
            top: coordinates.top,
            left: coordinates.left,
            width: coordinates.width,
            height: coordinates.height,
            borderRadius: '4px',
          }}
        />

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "fixed bg-card border border-border rounded-md p-4 shadow-lg",
            "max-w-xs z-50"
          )}
          style={{
            top: Math.min(
              Math.max(tooltipPosition.top, 8),
              window.innerHeight - 8 - 200 // 8px margin, 200px min height for box
            ),
            left: Math.min(
              Math.max(tooltipPosition.left, 8),
              window.innerWidth - 8 - 320 // 8px margin, 320px max width
            ),
            transform: tooltipPosition.transform,
            maxWidth: '320px',
            width: 'calc(100vw - 16px)',
            minWidth: 0,
            boxSizing: 'border-box',
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-medium mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          <button
            className="mt-2 text-sm text-primary hover:text-primary/80 font-medium"
            onClick={onClose}
          >
            Got it
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default FeatureSpotlight;
