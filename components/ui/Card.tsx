import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl ${className}`}>
      {title && (
        <h2 className="text-2xl font-bold text-center text-brand-accent mb-6 font-serif tracking-wide">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
};