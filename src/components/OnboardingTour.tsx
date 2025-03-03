import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Step {
  title: string;
  content: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  steps: Step[];
  currentStep: number;
  onNextStep: () => void;
  onPrevStep: () => void;
  onFinish: () => void;
}

export function OnboardingTour({
  isOpen,
  onClose,
  steps,
  currentStep,
  onNextStep,
  onPrevStep,
  onFinish
}: OnboardingTourProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && steps[currentStep]) {
      const positionTooltip = () => {
        const target = document.querySelector(steps[currentStep].target);
        if (target) {
          const rect = target.getBoundingClientRect();
          const step = steps[currentStep];
          let top = 0;
          let left = 0;

          // Position the tooltip next to the target element based on the specified position
          switch (step.position) {
            case 'top':
              top = rect.top - 120;
              left = rect.left + (rect.width / 2) - 150;
              break;
            case 'bottom':
              top = rect.bottom + 20;
              left = rect.left + (rect.width / 2) - 150;
              break;
            case 'left':
              top = rect.top + (rect.height / 2) - 60;
              left = rect.left - 320;
              break;
            case 'right':
              top = rect.top + (rect.height / 2) - 60;
              left = rect.right + 20;
              break;
          }

          // Ensure tooltip stays within viewport
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          // Adjust horizontal position if needed
          if (left < 20) left = 20;
          if (left + 300 > viewportWidth - 20) left = viewportWidth - 320;
          
          // Adjust vertical position if needed
          if (top < 20) top = 20;
          if (top + 200 > viewportHeight - 20) top = viewportHeight - 220;

          setPosition({ top, left });
        }
      };

      // Position immediately and then on resize
      positionTooltip();
      window.addEventListener('resize', positionTooltip);
      
      return () => {
        window.removeEventListener('resize', positionTooltip);
      };
    }
  }, [isOpen, currentStep, steps]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Add a highlight effect to the target element */}
      {steps[currentStep] && (
        <div className="absolute inset-0 bg-black bg-opacity-30 pointer-events-none">
          <div className="absolute bg-transparent" style={{
            top: position.top - 10,
            left: position.left - 10,
            width: '320px',
            height: '220px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            borderRadius: '8px'
          }} />
        </div>
      )}
      
      <div 
        className="absolute bg-white rounded-lg shadow-xl p-4 w-[300px] pointer-events-auto"
        style={{ 
          top: position.top,
          left: position.left,
          transform: 'translate(0, 0)'
        }}
      >
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg">{steps[currentStep].title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-gray-600 mb-4">
          {steps[currentStep].content}
        </p>
        
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={onPrevStep}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                type="button"
              >
                Previous
              </button>
            )}
            {currentStep < steps.length - 1 ? (
              <button
                onClick={onNextStep}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                type="button"
              >
                Next
              </button>
            ) : (
              <button
                onClick={onFinish}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                type="button"
              >
                Finish
              </button>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {currentStep + 1} of {steps.length}
          </div>
        </div>
      </div>
    </div>
  );
}