import React from 'react';
import { Value } from '@/utils/neural-network';

interface NeuronProps {
  activation: Value;
  bias?: Value;
  isActive?: boolean;
  layerIndex: number;
  neuronIndex: number;
  phase?: 'forward' | 'backward';
  highlightGradient?: boolean;
  gradientUpdate?: {
    parameterUpdates?: { oldValue: number; newValue: number; delta: number }[];
  };
}

export default function Neuron({
  activation,
  bias,
  isActive = false,
  layerIndex,
  neuronIndex,
  phase = 'forward',
  highlightGradient = false,
  gradientUpdate
}: NeuronProps) {
  const activationIntensity = phase === 'backward'
    ? Math.min(Math.abs(activation.grad), 1)
    : Math.min(Math.abs(activation.data), 1);

  const showBias = bias && Math.abs(bias.data) > 0.0001; // Only show significant biases

  // Add phase-specific styling
  const phaseColors = {
    forward: `rgba(59, 130, 246, ${activationIntensity})`,
    backward: `rgba(16, 185, 129, ${activationIntensity})`
  };

  return (
    <div 
      className={`
        relative group w-16 h-16 rounded-full
        flex items-center justify-center
        border-2 transition-all duration-200
        ${isActive ? 'border-blue-500' : 'border-gray-300 dark:border-gray-700'}
        ${phase === 'backward' ? 'ring-2 ring-green-500/50' : ''}
        ${gradientUpdate ? 'animate-pulse' : ''}
      `}
      style={{
        background: phaseColors[phase]
      }}
    >
      <div className="text-center text-xs">
        {/* Show either value or gradient based on phase */}
        {phase === 'backward' ? (
          <>
            <div className="text-green-600 font-medium">∇{activation.grad.toFixed(3)}</div>
            {showBias && (
              <div className="text-gray-400">
                ∇b:{bias.grad.toFixed(3)}
              </div>
            )}
          </>
        ) : (
          <>
            <div>{activation.data.toFixed(3)}</div>
            {showBias && (
              <div className="text-gray-400">
                b:{bias.data.toFixed(2)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Tooltip */}
      <div className="absolute z-50 left-1/2 bottom-full mb-2 -translate-x-1/2
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    bg-black text-white p-2 rounded text-xs whitespace-nowrap
                    transform transition-opacity duration-200">
        <div className="font-semibold mb-1">
          Layer {layerIndex} - Neuron {neuronIndex}
        </div>
        <div className="grid grid-cols-2 gap-x-2 text-left">
          <span>Value:</span>
          <span>{activation.data.toFixed(5)}</span>
          <span>Gradient:</span>
          <span>{activation.grad.toFixed(5)}</span>
          {showBias && (
            <>
              <span>Bias:</span>
              <span>{bias.data.toFixed(5)}</span>
              <span>Bias ∇:</span>
              <span>{bias.grad.toFixed(5)}</span>
            </>
          )}
          {phase === 'backward' && (
            <div className="col-span-2 text-green-400 mt-1">
              Backward Pass Active
            </div>
          )}
        </div>
      </div>

      {/* Gradient update visualization */}
      {phase === 'backward' && gradientUpdate && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2
                      bg-green-100 dark:bg-green-900 rounded-lg px-2 py-1
                      text-xs font-mono animate-fade-in">
          {gradientUpdate.parameterUpdates?.map((update, i) => (
            <div key={i} className="whitespace-nowrap">
              <span className="text-red-500">
                {update.oldValue.toFixed(3)}
              </span>
              →
              <span className="text-green-500">
                {update.newValue.toFixed(3)}
              </span>
              <span className="text-gray-500 ml-1">
                (Δ{update.delta.toFixed(3)})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
