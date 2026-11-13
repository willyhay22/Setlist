import React, { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { CloseIcon, ChevronRightIcon, ChevronLeftIcon, CheckIcon } from './Icons';

interface TourStep {
  title: string;
  description: string;
  targetId?: string;
  tabTarget?: 'home' | 'library' | 'setlists';
}

const TOUR_STEPS: TourStep[] = [
  {
    title: '1. Adding Songs',
    description: 'Quickly enter a new song with its title, artist, key, tempo/BPM, and time signature. Only the title is required. New songs are placed at the bottom of your library in creation order.',
    tabTarget: 'home',
  },
  {
    title: '2. Searching Your Library',
    description: 'Use the global search bar (⌘F) from anywhere in the app to find songs by title or artist. If no exact matches are found, reasonable close matches are surfaced automatically.',
    tabTarget: 'library',
  },
  {
    title: '3. Musical Readouts & Autosaved Notes',
    description: 'Key, BPM, and time signature remain prominently displayed above your scrollable arrangement notes. As you type chord reminders or band cues, changes are durably autosaved with zero friction.',
    tabTarget: 'library',
  },
  {
    title: '4. Creating & Using Setlists',
    description: 'Organize songs into running orders for worship services or rehearsals. Move songs freely with drag-and-drop, step through songs with Prev/Next (⌘⌥← / →), and archive past sets when done.',
    tabTarget: 'setlists',
  },
];

export const GuidedTour: React.FC = () => {
  const { finishTour, setActiveTab } = useStore();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const step = TOUR_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      finishTour();
    } else {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      if (TOUR_STEPS[nextIdx].tabTarget) {
        setActiveTab(TOUR_STEPS[nextIdx].tabTarget!);
      }
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      if (TOUR_STEPS[prevIdx].tabTarget) {
        setActiveTab(TOUR_STEPS[prevIdx].tabTarget!);
      }
    }
  };

  const handleSkip = () => {
    finishTour();
  };

  return (
    <div className="tour-overlay" onClick={handleSkip} role="dialog" aria-modal="true" aria-labelledby="tour-step-title">
      <div className="tour-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="tour-step-badge">
            Studio Guide • Step {currentStepIndex + 1} of {TOUR_STEPS.length}
          </span>
          <button className="btn btn-icon" onClick={handleSkip} title="Skip tour" aria-label="Skip walkthrough">
            <CloseIcon size={13} />
          </button>
        </div>

        <h3 id="tour-step-title">{step.title}</h3>
        <p>{step.description}</p>

        <div className="tour-footer">
          <button className="btn" onClick={handleSkip} style={{ fontSize: '12px' }}>
            Skip Tour
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {!isFirst && (
              <button className="btn" onClick={handleBack}>
                <ChevronLeftIcon size={12} />
                <span>Back</span>
              </button>
            )}

            <button className="btn btn-primary" onClick={handleNext}>
              {isLast ? (
                <>
                  <span>Get Started</span>
                  <CheckIcon size={12} />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRightIcon size={12} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
