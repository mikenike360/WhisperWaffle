import React from 'react';
import cn from 'classnames';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  className,
}) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-10 h-10',
    large: 'w-16 h-16',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <img
        src="/logo.png"
        alt="Loading..."
        className={cn('animate-waffle-rotate', sizeClasses[size])}
      />
    </div>
  );
};
