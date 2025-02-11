import { Value } from '@/utils/neural-network'

interface ConnectionProps {
  source: { x: number; y: number }
  target: { x: number; y: number }
  weight: Value
  gradient?: number
  isActive?: boolean
  animationType?: 'forward' | 'backward'
}

export default function Connection({
  source,
  target,
  weight,
  gradient,
  isActive = false,
  animationType = 'forward'
}: ConnectionProps) {
  // Calculate visual properties
  const weightValue = weight?.data || 0;
  const gradientValue = animationType === 'backward' ? (gradient || weight?.grad || 0) : 0;
  
  // Adjust stroke properties based on animation type
  const strokeWidth = Math.max(Math.min(Math.abs(weightValue) * 5, 4), 2.5);
  const opacity = animationType === 'backward' 
    ? Math.max(Math.min(Math.abs(gradientValue) * 2, 1), 0.3)
    : Math.max(Math.min(Math.abs(weightValue), 1), 0.3);
  
  const color = animationType === 'backward'
    ? (gradientValue >= 0 ? '#34D399' : '#F87171')
    : (weightValue >= 0 ? '#60A5FA' : '#F87171');

  // Calculate midpoint for tooltip positioning
  const midX = (source.x + target.x) / 2
  const midY = (source.y + target.y) / 2
  
  return (
    <g className="group">
      {/* Connection line */}
      <line
        x1={source.x}
        y1={source.y}
        x2={target.x}
        y2={target.y}
        stroke={color}
        strokeWidth={strokeWidth.toString()}
        opacity={isActive ? opacity * 1.5 : opacity}
        strokeLinecap="round"
      />
      
      {/* Interactive hover area */}
      <g transform={`translate(${midX},${midY})`}>
        <circle 
          r="8" 
          fill="transparent"
          className="cursor-pointer"
        />
        
        {/* Tooltip */}
        <g className="opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Tooltip background */}
          <rect
            x="-60"
            y="-40"
            width="120"
            height="50"
            rx="4"
            fill="black"
            fillOpacity="0.8"
          />
          
          {/* Tooltip text */}
          <text
            fill="white"
            fontSize="12"
            textAnchor="middle"
            y="-25"
          >
            Weight: {weightValue.toFixed(3)}
          </text>
          <text
            fill="white"
            fontSize="12"
            textAnchor="middle"
            y="-10"
          >
            Gradient: {gradientValue.toFixed(3)}
          </text>
          
          {/* Connection strength indicator */}
          <text
            fill="white"
            fontSize="12"
            textAnchor="middle"
            y="5"
          >
            Strength: {Math.abs(weightValue) < 0.001 ? "Very Weak" : 
                      Math.abs(weightValue) < 0.3 ? "Weak" :
                      Math.abs(weightValue) < 0.7 ? "Medium" : "Strong"}
          </text>
        </g>
      </g>
    </g>
  )
}
