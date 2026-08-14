
import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'green' | 'white';
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 40, variant = 'green' }) => {
  const colors = {
    blue: '#4285F4',
    red: '#EA4335',
    yellow: '#FBBC05',
    green: '#34A853'
  };
  
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
        {/* Roof - Blue */}
        <path 
            d="M10 45L50 15L90 45" 
            stroke={colors.blue} 
            strokeWidth="12" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />
        
        {/* I (Left) - Red */}
        <path 
            d="M25 55V85" 
            stroke={colors.red} 
            strokeWidth="10" 
            strokeLinecap="round"
        />
        
        {/* l (Middle) - Yellow */}
        <path 
            d="M50 50V85" 
            stroke={colors.yellow} 
            strokeWidth="10" 
            strokeLinecap="round"
        />
        
        {/* e (Curve) - Green */}
        <path 
            d="M75 65C75 65 85 65 85 75C85 85 75 85 75 85H85" 
            stroke={colors.green} 
            strokeWidth="10" 
            strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export default Logo;
