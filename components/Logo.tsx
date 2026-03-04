
import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'green' | 'white';
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 40, variant = 'green' }) => {
  const strokeColor = variant === 'white' ? '#ffffff' : '#14532d';
  
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
        <style>
            {`
            @keyframes roof-drop {
                0% { transform: translateY(-40px); opacity: 0; }
                50% { transform: translateY(0px); opacity: 1; }
                65% { transform: translateY(-5px); }
                100% { transform: translateY(0); opacity: 1; }
            }
            @keyframes pillar-grow {
                0% { transform: scaleY(0); opacity: 0; }
                100% { transform: scaleY(1); opacity: 1; }
            }
            @keyframes draw-line {
                to { stroke-dashoffset: 0; opacity: 1; }
            }
            @keyframes dot-pop {
                0% { transform: scale(0); opacity: 0; }
                80% { transform: scale(1.2); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
            }
            .ile-logo-roof {
                animation: roof-drop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
            .ile-logo-pillar-1 {
                transform-origin: bottom;
                animation: pillar-grow 0.4s ease-out 0.3s forwards;
                opacity: 0;
            }
            .ile-logo-pillar-2 {
                transform-origin: bottom;
                animation: pillar-grow 0.4s ease-out 0.5s forwards;
                opacity: 0;
            }
            .ile-logo-curve {
                stroke-dasharray: 100;
                stroke-dashoffset: 100;
                animation: draw-line 0.6s ease-out 0.7s forwards;
                opacity: 0;
            }
            .ile-logo-dot {
                transform-origin: center;
                transform-box: fill-box;
                animation: dot-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) 1s forwards;
                opacity: 0;
            }
            `}
        </style>
      <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="overflow-visible">
        {/* Roof */}
        <path 
            d="M10 45L50 15L90 45" 
            stroke={strokeColor} 
            strokeWidth="10" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className="ile-logo-roof"
        />
        
        {/* I (Left) */}
        <path 
            d="M25 55V85" 
            stroke={strokeColor} 
            strokeWidth="8" 
            strokeLinecap="round"
            className="ile-logo-pillar-1"
        />
        
        {/* l (Middle) */}
        <path 
            d="M50 50V85" 
            stroke={strokeColor} 
            strokeWidth="8" 
            strokeLinecap="round"
            className="ile-logo-pillar-2"
        />
        
        {/* e (Curve) */}
        <path 
            d="M75 65C75 65 85 65 85 75C85 85 75 85 75 85H85" 
            stroke={strokeColor} 
            strokeWidth="8" 
            strokeLinecap="round"
            className="ile-logo-curve"
        />

        {/* Window/Dot */}
        <rect 
            x="42" y="28" width="16" height="16" rx="3" 
            fill="#ca8a04"
            className="ile-logo-dot"
        />
      </svg>
    </div>
  );
};

export default Logo;
