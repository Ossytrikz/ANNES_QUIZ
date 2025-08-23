import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'header';
  withText?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  withText = true, 
  className = '',
  onClick
}) => {
  const sizeClasses = {
    sm: 'h-8',    // Small size
    md: 'h-12',   // Medium size
    lg: 'h-16',   // Large size
    header: 'h-10' // Slightly larger for header
  };

  const textSizes = {
    sm: 'text-2xl',  // ~25% larger than xl
    md: 'text-3xl',  // ~25% larger than 2xl
    lg: 'text-5xl',  // ~25% larger than 4xl
    header: 'text-2xl font-bold'
  };

  return (
    <div 
      className={`flex items-center space-x-2 ${className}`}
      onClick={onClick}
    >
      <img 
        src="/Annes Quiz.png" 
        alt="Anne's Quiz Logo" 
        className={`${size === 'header' ? 'h-10 w-auto' : sizeClasses[size]} drop-shadow-md hover:drop-shadow-lg transition-all duration-200`}
        style={{ 
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
          objectFit: 'contain'
        }}
      />
      {withText && (
        <span 
          className={`${size === 'header' ? textSizes.header : textSizes[size]} font-extrabold text-gray-900 dark:text-white`}
          style={{ 
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
            WebkitTextStroke: '0.2px currentColor'
          }}
        >
          Anne's Quiz
        </span>
      )}
    </div>
  );
};

export const LogoWithLink: React.FC<Omit<LogoProps, 'onClick'>> = (props) => {
  return (
    <Link to="/">
      <Logo {...props} />
    </Link>
  );
};
