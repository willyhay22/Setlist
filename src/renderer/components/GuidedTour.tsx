import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../hooks/useStore';
import { CloseIcon, ChevronRightIcon, ChevronLeftIcon, CheckIcon } from './Icons';

interface TourStep {
  title: string;
  description: string;
  targetSelector: string;
  tabTarget?: 'home' | 'library' | 'setlist';
  fallbackSelector?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Adding Songs',
    description: 'Use the + Add Song button (⌘N) to enter a title, musical details, and arrangement notes. New songs are placed at the bottom of your library in creation order.',
    targetSelector: '#tour-add-song-btn',
    tabTarget: 'home',
  },
  {
    title: 'Searching Your Library',
    description: 'The global search bar (⌘F) covers your entire library. On Home or Setlist, suggestions appear below without interrupting your page. Reasonable close matches handle typos automatically.',
    targetSelector: '#tour-search-container',
  },
  {
    title: 'Musical Readouts & Notes',
    description: 'Key, BPM, and time signature stay fixed in prominent cards above your notes. Arrangement notes autosave as you type with zero friction, and standard undo (⌘Z) works natively.',
    tabTarget: 'library',
    targetSelector: '#tour-musical-readouts',
    fallbackSelector: '.split-pane-right',
  },
  {
    title: 'Your Current Setlist',
    description: 'Your service running order stays saved right here across app launches. Reorder songs by dragging, step through songs with Prev/Next (⌘⌥← / →), and click Clear when ready for the next service.',
    tabTarget: 'setlist',
    targetSelector: '#tour-setlist-order-pane',
    fallbackSelector: '.split-pane-left',
  },
];

export const GuidedTour: React.FC = () => {
  const { finishTour, setActiveTab } = useStore();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number }>({ top: 120, left: 100 });

  const cardRef = useRef<HTMLDivElement>(null);
  const step = TOUR_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  // Reposition card beside target element
  const updatePosition = useCallback(() => {
    let target = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (!target && step.fallbackSelector) {
      target = document.querySelector(step.fallbackSelector) as HTMLElement | null;
    }

    if (!target) {
      // Fallback: center in viewport
      setSpotlightRect(null);
      setCardPos({
        top: Math.max(20, Math.round((window.innerHeight - 200) / 2)),
        left: Math.max(20, Math.round((window.innerWidth - 320) / 2)),
      });
      return;
    }

    const rect = target.getBoundingClientRect();
    setSpotlightRect(rect);

    const cardWidth = 320;
    const cardHeight = cardRef.current?.offsetHeight || 180;
    const margin = 10;

    let top = rect.bottom + margin;
    let left = rect.left;

    // If placing below exceeds window height, place above or beside
    if (top + cardHeight > window.innerHeight - 16) {
      top = Math.max(16, rect.top - cardHeight - margin);
    }

    // Clamp horizontally within viewport
    if (left + cardWidth > window.innerWidth - 16) {
      left = window.innerWidth - cardWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }

    setCardPos({ top, left });
  }, [step]);

  // When step changes or tab switches, recompute after paint
  useEffect(() => {
    if (step.tabTarget) {
      setActiveTab(step.tabTarget);
    }

    const timer = setTimeout(() => {
      updatePosition();
    }, 80);

    const handleResize = () => updatePosition();
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [currentStepIndex, step, setActiveTab, updatePosition]);

  const handleNext = () => {
    if (isLast) {
      finishTour();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    finishTour();
  };

  return (
    <div className="tour-overlay" onClick={handleSkip} role="dialog" aria-modal="true" aria-labelledby="tour-tip-title">
      {/* Target Element Spotlight Outline */}
      {spotlightRect && (
        <div
          className="tour-spotlight-box"
          style={{
            top: `${Math.round(spotlightRect.top - 3)}px`,
            left: `${Math.round(spotlightRect.left - 3)}px`,
            width: `${Math.round(spotlightRect.width + 6)}px`,
            height: `${Math.round(spotlightRect.height + 6)}px`,
          }}
        />
      )}

      {/* Anchored Tip Card */}
      <div
        ref={cardRef}
        className="tour-anchored-card"
        style={{
          top: `${cardPos.top}px`,
          left: `${cardPos.left}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="tour-step-badge">
            Step {currentStepIndex + 1} of {TOUR_STEPS.length}
          </span>
          <button className="btn btn-icon" style={{ width: '22px', height: '22px' }} onClick={handleSkip} title="Skip walkthrough" aria-label="Skip walkthrough">
            <CloseIcon size={12} />
          </button>
        </div>

        <h3 id="tour-tip-title">{step.title}</h3>
        <p>{step.description}</p>

        <div className="tour-footer">
          <button className="btn" onClick={handleSkip} style={{ fontSize: '11.5px', height: '26px', padding: '0 8px' }}>
            Skip
          </button>

          <div style={{ display: 'flex', gap: '6px' }}>
            {!isFirst && (
              <button className="btn" onClick={handleBack} style={{ height: '26px', padding: '0 8px', fontSize: '11.5px' }}>
                <ChevronLeftIcon size={11} />
                <span>Back</span>
              </button>
            )}

            <button className="btn btn-primary" onClick={handleNext} style={{ height: '26px', padding: '0 10px', fontSize: '11.5px' }}>
              {isLast ? (
                <>
                  <span>Finish</span>
                  <CheckIcon size={11} />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRightIcon size={11} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
