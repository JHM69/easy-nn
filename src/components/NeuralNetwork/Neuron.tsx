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

  return (
    <div 
      className={`
        relative group w-16 h-16 rounded-full
        flex items-center justify-center
        border-2 transition-all duration-200
        ${isActive ? 'border-blue-500' : 'border-gray-300'}
      `}
      style={{
        background: `rgba(59, 130, 246, ${activationIntensity})`
      }}
    >
      <div className="text-center text-xs">
        <div>{activation.data.toFixed(3)}</div>
        {activation.grad !== 0 && (
          <div className="text-gray-500">
            ∇{activation.grad.toFixed(3)}
          </div>
        )}
        {bias && (
          <div className="text-gray-400">
            b:{bias.data.toFixed(2)}
          </div>
        )}
      </div>

      {/* Tooltip */}
      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 
                    opacity-0 group-hover:opacity-100 transition-opacity
                    bg-black text-white p-2 rounded text-xs whitespace-nowrap z-10">
        Layer: {layerIndex}, Neuron: {neuronIndex}
        <br />
        Value: {activation.data.toFixed(5)}
        <br />
        Gradient: {activation.grad.toFixed(5)}
        {bias && (
          <>
            <br />
            Bias: {bias.data.toFixed(5)}
          </>
        )}
      </div>
    </div>
  );
}
