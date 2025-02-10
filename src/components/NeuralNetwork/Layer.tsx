import Neuron from './Neuron';
import Connection from './Connection';
import { Layer as LayerType } from '@/types/neural-network';
import { Value } from '@/utils/neural-network';

interface LayerProps {
  layer: LayerType;
  layerIndex: number;
  activations: Value[];
  biases?: number[];
  weights?: {
    sourceNeuron: number;
    targetNeuron: number;
    value: number;
    gradient?: number;
  }[];
  isActive?: boolean;
}

export default function Layer({
  layer,
  layerIndex,
  activations,
  biases,
  weights,
  isActive = false
}: LayerProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-sm font-semibold mb-4">
        Layer {layerIndex} ({layer.type})
        {layer.activation && ` - ${layer.activation}`}
      </div>
      
      <div className="flex flex-col gap-8">
        {Array(layer.neurons).fill(0).map((_, i) => (
          <div key={i} className="flex items-center">
            <Neuron
              activation={activations[i]}
              bias={biases?.[i]}
              isActive={isActive}
              layerIndex={layerIndex}
              neuronIndex={i}
            />
            
            {weights && (
              <div className="ml-4 grid gap-2">
                {weights
                  .filter(w => w.sourceNeuron === i)
                  .map(w => (
                    <Connection
                          key={`${w.sourceNeuron}-${w.targetNeuron}`}
                          weight={w.value}
                          gradient={w.gradient}
                          isActive={isActive} startX={0} startY={0} endX={0} endY={0}                    />
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
