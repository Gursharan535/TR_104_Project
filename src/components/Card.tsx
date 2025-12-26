// ai-workspace/src/components/Card.tsx
import React, {type  ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
  // Added noPadding prop to support cases where default padding is not desired
  noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, action, noPadding = false }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          {title && <h3 className="font-semibold text-slate-800 text-lg">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
};

export default Card;
