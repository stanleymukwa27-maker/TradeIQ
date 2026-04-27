import React from 'react';
import { motion } from 'motion/react';

interface TradingChartAnimationProps {
  className?: string;
  isLoader?: boolean;
}

export const TradingChartAnimation: React.FC<TradingChartAnimationProps> = ({ className = '', isLoader = false }) => {
  // Generate pseudo-random points for the chart
  const points = [
    { x: 0, y: 80 },
    { x: 20, y: 60 },
    { x: 40, y: 70 },
    { x: 60, y: 40 },
    { x: 80, y: 50 },
    { x: 100, y: 30 },
    { x: 120, y: 45 },
    { x: 140, y: 25 },
    { x: 160, y: 35 },
    { x: 180, y: 15 },
    { x: 200, y: 20 },
  ];

  const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  const areaPathData = `${pathData} L 200,100 L 0,100 Z`;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 200 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.2)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        {!isLoader && (
          <g opacity="0.1">
            {[0, 25, 50, 75, 100].map(y => (
              <line key={y} x1="0" y1={y} x2="200" y2={y} stroke="currentColor" strokeWidth="0.5" className="text-slate-400" />
            ))}
            {[0, 40, 80, 120, 160, 200].map(x => (
              <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="currentColor" strokeWidth="0.5" className="text-slate-400" />
            ))}
          </g>
        )}

        {/* Fill Area */}
        <motion.path
          d={areaPathData}
          fill="url(#chartGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />

        {/* Glow effect for the line */}
        <motion.path
          d={pathData}
          stroke="rgb(16, 185, 129)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: 1, 
            opacity: 1,
            transition: {
              pathLength: { duration: 2, ease: "linear", repeat: Infinity },
              opacity: { duration: 0.5 }
            }
          }}
          style={{
            filter: 'drop-shadow(0 0 3px rgba(16, 185, 129, 0.4))'
          }}
        />

        {/* Candlesticks (Decorative) */}
        {points.filter((_, i) => i % 2 === 0).map((p, i) => (
          <motion.g
            key={`candle-${i}`}
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: isLoader ? [0.1, 0.3, 0.1] : [0.3, 0.6, 0.3],
              transition: { duration: 3, delay: i * 0.2, repeat: Infinity }
            }}
          >
            <rect 
              x={p.x - 1.5} 
              y={p.y - (i % 2 === 0 ? 8 : 4)} 
              width="3" 
              height={i % 2 === 0 ? 12 : 8} 
              rx="0.5" 
              fill={i % 2 === 0 ? "#10b981" : "#ef4444"} 
            />
            <line 
              x1={p.x} 
              y1={p.y - 12} 
              x2={p.x} 
              y2={p.y + 12} 
              stroke={i % 2 === 0 ? "#10b981" : "#ef4444"} 
              strokeWidth="0.5" 
              opacity="0.5"
            />
          </motion.g>
        ))}

        {/* Moving price indicator */}
        <motion.g
          animate={{
            transform: points.map(p => `translate(${p.x}px, ${p.y}px)`),
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <circle r="3" fill="#10b981" />
          <circle r="6" fill="#10b981" opacity="0.2" className="animate-ping" />
          
          {/* Price Tag */}
          {!isLoader && (
             <text 
               x="8" 
               y="4" 
               fill="#10b981" 
               fontSize="6" 
               fontWeight="bold" 
               className="font-mono"
             >
               ${(1.2345 + Math.random() * 0.01).toFixed(4)}
             </text>
          )}
        </motion.g>
      </svg>

      {isLoader && (
        <>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"
            animate={{
              x: ['-100%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
          <motion.div 
            className="absolute top-0 bottom-0 w-px bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] z-10"
            animate={{
              left: ['0%', '100%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </>
      )}
    </div>
  );
};
