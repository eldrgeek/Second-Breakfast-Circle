import React from 'react';
import { X } from 'lucide-react';

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Welcome to Second Breakfast Circle</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            type="button"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-lg font-semibold mb-3">About Our Space</h3>
            <p className="text-gray-600 mb-4">
              This is a virtual co-working space where you can work alongside others in our cohort.
              Whether researching, writing, or working on any other project, this space helps create a sense of community
              and accountability.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">The Visitor Page</h3>
            <div className="space-y-3">
              <p className="text-gray-600">
                The visitor page shows everyone who's been in the room and who is there now. Here's what you can do:
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-2">
                <li>See who's currently active in the space</li>
                <li>View how long each person has been in the room</li>
                <li>Click on any user to see their updates and interact with them</li>
                <li>Share your own updates about what you're working on</li>
                <li>React to others' updates with emoji reactions</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Updates & Reactions System</h3>
            <div className="space-y-3">
              <p className="text-gray-600">
                Our updates system helps you share your progress and stay connected:
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-2">
                <li><strong>Sharing Updates:</strong> Click on your name in the roster panel to open your profile and share what you're working on</li>
                <li><strong>Viewing Updates:</strong> Click on any user's name to see their recent updates</li>
                <li><strong>Reacting to Updates:</strong> Use emoji reactions to acknowledge or support others' updates</li>
                <li><strong>New Activity:</strong> A notification will appear when there are new updates from others</li>
                <li><strong>Unread Indicators:</strong> Blue dots indicate unread updates from other users</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Moving Around the Space</h3>
            <div className="space-y-3">
              <p className="text-gray-600">
                You can navigate the 3D space using these controls:
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-2">
                <li><strong>Camera Rotation:</strong> Click and drag in the scene to look around</li>
                <li><strong>Zoom:</strong> Use your mouse wheel to zoom in and out</li>
                <li><strong>Reset View:</strong> Click the reset button in the camera controls to return to the default view</li>
                <li><strong>Quick Zoom:</strong> Use the zoom in/out buttons for precise adjustments</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">People Panel Features</h3>
            <div className="space-y-3">
              <p className="text-gray-600">
                The people panel can be customized to your preference:
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-2">
                <li><strong>Dragging:</strong> Click and hold the drag handle (≡) to move the panel anywhere on screen</li>
                <li><strong>Minimizing:</strong> Click the arrow button to collapse the panel when you need more space</li>
                <li><strong>Session Indicators:</strong> Users in your current session are marked with "(you)" or "(same session)"</li>
                <li><strong>Activity Status:</strong> Colored dots show who's currently active</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Using the Space</h3>
            <div className="space-y-3">
              <p className="text-gray-600">
                To make the most of your co-working experience:
              </p>
              <ul className="list-disc pl-5 text-gray-600 space-y-2">
                <li>Share what you're working on when you join</li>
                <li>Post updates about your progress</li>
                <li>Interact with others through reactions and comments</li>
                <li>Use the talking stick feature for focused discussions</li>
                <li>Keep your audio muted when not speaking</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Tips for Success</h3>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li>Set clear goals for your work session</li>
              <li>Take regular breaks</li>
              <li>Engage with the community</li>
              <li>Share your achievements, no matter how small</li>
              <li>Respect others' focus time</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}