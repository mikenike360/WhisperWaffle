import React from 'react';
import cn from 'classnames';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hover?: boolean;
  dark?: boolean;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  hover = false,
  dark = false,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-base-100/80 backdrop-blur-xl border border-base-300/30 rounded-2xl shadow-lg',
        hover && 'glass-hover',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
