import React, { useState } from 'react';
import { X, Users, HelpCircle, PlayCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AdminPanel } from './AdminPanel';
import { HelpDialog } from './HelpDialog';
import { OnboardingTour } from './OnboardingTour';
import { TOUR_STEPS } from '../config';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRestartTour: () => void;
}

export function SettingsDialog({ isOpen, onClose, onRestartTour }: SettingsDialogProps) {
  const resetRoom = useStore(state => state.resetRoom);
  const currentUser = useStore(state => state.currentUser);
  const markTourCompleted = useStore(state => state.markTourCompleted);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const handleResetRoom = async () => {
    if (confirm('Are you sure you want to reset the room? This will mark all users as inactive.')) {
      await resetRoom();
    }
  };

  const handleRestartTour = () => {
    onRestartTour();
    onClose();
  };

  const handleFinishOnboarding = async () => {
    if (currentUser) {
      await markTourCompleted(currentUser.id);
      setShowOnboarding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold">Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              type="button"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <button
              onClick={() => setShowHelp(true)}
              className="w-full flex items-center gap-3 bg-blue-50 text-blue-700 px-4 py-3 rounded-lg hover:bg-blue-100 transition-colors text-left"
              type="button"
            >
              <HelpCircle className="w-5 h-5" />
              <div>
                <div className="font-medium">Help & Guide</div>
                <div className="text-sm text-blue-600">Learn how to use the space</div>
              </div>
            </button>

            <button
              onClick={handleRestartTour}
              className="w-full flex items-center gap-3 bg-green-50 text-green-700 px-4 py-3 rounded-lg hover:bg-green-100 transition-colors text-left"
              type="button"
            >
              <PlayCircle className="w-5 h-5" />
              <div>
                <div className="font-medium">Restart Tour</div>
                <div className="text-sm text-green-600">Take the interactive tour again</div>
              </div>
            </button>

            <button
              onClick={() => setShowAdminPanel(true)}
              className="w-full flex items-center gap-3 bg-purple-50 text-purple-700 px-4 py-3 rounded-lg hover:bg-purple-100 transition-colors text-left"
              type="button"
            >
              <Users className="w-5 h-5" />
              <div>
                <div className="font-medium">Admin Panel</div>
                <div className="text-sm text-purple-600">Manage users and view statistics</div>
              </div>
            </button>

            <div className="pt-4 border-t">
              <button
                onClick={handleResetRoom}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                type="button"
              >
                Reset Room
              </button>
            </div>
          </div>
        </div>
      </div>

      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
      />

      <HelpDialog
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />

      <OnboardingTour
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        steps={TOUR_STEPS}
        currentStep={currentStep}
        onNextStep={() => setCurrentStep(curr => curr + 1)}
        onPrevStep={() => setCurrentStep(curr => curr - 1)}
        onFinish={handleFinishOnboarding}
      />
    </>
  );
}