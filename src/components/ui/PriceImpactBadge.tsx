import React from 'react';
import cn from 'classnames';

interface PriceImpactBadgeProps {
  impact: number; // Price impact percentage
  className?: string;
}

export const PriceImpactBadge: React.FC<PriceImpactBadgeProps> = ({
  impact,
  className,
}) => {
  const getColorClasses = () => {
    if (impact < 1) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (impact < 3) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const showWarning = impact >= 3;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border',
        getColorClasses(),
        className
      )}
    >
      <span>Price Impact: {impact.toFixed(2)}%</span>
      {showWarning && (
        <svg
          className="w-4 h-4"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </div>
  );
};
