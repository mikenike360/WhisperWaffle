import React, { useEffect, useState } from 'react';
import cn from 'classnames';

interface SuccessAnimationProps {
  show?: boolean;
  duration?: number;
  onComplete?: () => void;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  show = false,
  duration = 2000,
  onComplete,
}) => {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      <div className="bg-white/90 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border-2 border-green-500 animate-scale-up">
        <div className="flex flex-col items-center gap-4">
          {/* Success checkmark circle */}
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          
          {/* Waffle emoji for fun */}
          <div className="text-4xl animate-waffle-bounce-gentle">🧇</div>
          
          <p className="text-lg font-semibold text-gray-800">Success!</p>
        </div>
      </div>
    </div>
  );
};
