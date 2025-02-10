'use client'

import { useState, useEffect } from 'react'
import { evaluate } from 'mathjs'
import MathDisplay from './MathDisplay'

interface FunctionInputProps {
  equation: string
  onEquationChange: (equation: string) => void
}

export default function FunctionInput({ equation, onEquationChange }: FunctionInputProps) {
  const [error, setError] = useState<string>('')

  const functionCategories = [
    {
      name: "Basic",
      functions: [
        { name: "Linear", equation: "y=2*x+1", latex: "y=2x+1", description: "Simple linear relationship" },
        { name: "Quadratic", equation: "y=x^2", latex: "y=x^2", description: "Parabolic curve" },
        { name: "Cubic", equation: "y=x^3", latex: "y=x^3", description: "S-shaped curve" },
      ]
    },
    {
      name: "Trigonometric",
      functions: [
        { name: "Sine", equation: "y=sin(x)", latex: "y=\\sin(x)", description: "Periodic wave" },
        { name: "Cosine", equation: "y=cos(x)", latex: "y=\\cos(x)", description: "Shifted sine wave" },
        { name: "Tangent", equation: "y=tan(x)", latex: "y=\\tan(x)", description: "Periodic with vertical asymptotes" },
      ]
    },
    {
      name: "Advanced",
      functions: [
        { name: "Sigmoid", equation: "y=1/(1+exp(-x))", latex: "y=\\frac{1}{1+e^{-x}}", description: "S-shaped activation function" },
        { name: "Gaussian", equation: "y=exp(-x^2)", latex: "y=e^{-x^2}", description: "Bell curve" },
        { name: "Polynomial", equation: "y=0.1*x^3-0.5*x^2+2*x", latex: "y=0.1x^3-0.5x^2+2x", description: "Complex curve" },
      ]
    }
  ]

  useEffect(() => {
    if (!equation) {
      validateAndSetEquation('y=1/(1+exp(-x))')
    }
  }, [])

  const validateAndSetEquation = (eq: string) => {
    if (!eq) {
      setError('Equation cannot be empty');
      return;
    }

    try {
      // Ensure equation starts with 'y='
      const expression = eq.startsWith('y=') ? eq.substring(2) : eq;
      const scope = { x: 1 }
      evaluate(expression, scope)
      setError('')
      onEquationChange(eq.startsWith('y=') ? eq : `y=${eq}`)
    } catch (err) {
      setError('Invalid equation format')
    }
  }

  const findLatexForEquation = (eq: string) => {
    const allFunctions = functionCategories.flatMap(category => category.functions);
    return allFunctions.find(f => f.equation === eq)?.latex || eq;
  }

  return (
    <div className="space-y-4 bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Select Function</h3>
        {equation && (
          <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <MathDisplay equation={findLatexForEquation(equation)} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {functionCategories.map((category) => (
          <div key={category.name} className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              {category.name}
            </h4>
            <div className="space-y-2">
              {category.functions.map((func) => (
                <button
                  key={func.name}
                  onClick={() => validateAndSetEquation(func.equation)}
                  className={`w-full p-4 rounded-lg transition-all duration-200 flex flex-col items-start
                    ${equation === func.equation 
                      ? 'bg-blue-700 text-white' 
                      : 'bg-gray-50 dark:bg-gray-950 hover:bg-blue-100 dark:hover:bg-gray-950'
                    }`}
                >
                  <span className="font-semibold">{func.name}</span>
                  <span className="text-sm opacity-80 mt-1">{func.description}</span>
                  {/* <MathDisplay equation={func.latex} /> */}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
