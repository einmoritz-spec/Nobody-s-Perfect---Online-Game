
import React, { useState } from 'react';

interface AvatarProps {
  avatar: string; // Hex-Code ODER Bild-URL
  name?: string; 
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ avatar, name = '?', size = 'md', className = '' }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-10 h-10 text-[12px]',
    md: 'w-14 h-14 text-sm',
    lg: 'w-24 h-24 text-lg',
    xl: 'w-32 h-32 text-xl',
    '2xl': 'w-40 h-40 text-2xl',
    '3xl': 'w-56 h-56 text-4xl',
  };

  const isImage = avatar.startsWith('http') || avatar.startsWith('data:');
  const baseClasses = `rounded-full flex items-center justify-center font-bold shadow-xl shrink-0 transition-transform border-4 border-white/20 text-white overflow-hidden bg-gray-800 ${sizeClasses[size]} ${className}`;

  if (isImage) {
    return (
      <div className={baseClasses}>
        <img 
          src={avatar} 
          alt={name} 
          className={`w-full h-full object-cover transition-opacity duration-500 ease-in-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
          onLoad={() => setIsLoaded(true)}
          loading="eager"
        />
        {!isLoaded && <div className="absolute inset-0 bg-white/10 animate-pulse" />}
      </div>
    );
  }

  return (
    <div 
      className={baseClasses}
      style={{ backgroundColor: avatar }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};
