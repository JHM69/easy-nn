import React from 'react';
import { Value } from '@/utils/neural-network';

interface NeuronProps {
  activation: Value;
  bias?: Value;
  isActive?: boolean;
  layerIndex: number;
  neuronIndex: number;
}

export default function Neuron({
  activation,
  bias,
  isActive = false,
  layerIndex,
  neuronIndex
}: NeuronProps) {
  const activationIntensity = Math.min(Math.abs(activation.data), 1);
  const showBias = bias && Math.abs(bias.data) > 0.0001; // Only show significant biases

  return (
    <div 
      className={`
        relative group w-16 h-16 rounded-full
        flex items-center justify-center
        border-2 transition-all duration-200
        ${isActive ? 'border-blue-500' : 'border-gray-300 dark:border-gray-700'}
      `}
      style={{
        background: `rgba(59, 130, 246, ${activationIntensity})`
      }}
    >
      {/* Main display */}
      <div className="text-center text-xs">
        <div>{activation.data.toFixed(3)}</div>
        {activation.grad !== 0 && (
          <div className="text-gray-500">
            ∇{activation.grad.toFixed(3)}
          </div>
        )}
        {showBias && (
          <div className="text-gray-400">
            b:{bias.data.toFixed(2)}
          </div>
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
        </div>
      </div>
    </div>
  );
}
