'use client'

import { useState } from 'react'
import { evaluate } from 'mathjs'

interface FunctionInputProps {
  equation: string
  onEquationChange: (equation: string) => void
}

export default function FunctionInput({ equation, onEquationChange }: FunctionInputProps) {
  const [inputValue, setInputValue] = useState(equation)
  const [error, setError] = useState<string>('')

  const exampleEquations = [
    'y=2*x+1',
    'y=x^2',
    'y=sin(x)',
    'y=1/(1+exp(-x))',
    'y=x^3-2*x'
  ]

  const validateEquation = (eq: string) => {
    try {
      const scope = { x: 1 }
      evaluate(eq.replace('y=', '').replace('f(x)=', ''), scope)
      setError('')
      onEquationChange(eq)
    } catch (err) {
      setError('Invalid equation format')
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Define Function</h3>
      <div className="flex gap-4 items-center">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter function (e.g., y=2*x+1)"
          className="px-4 py-2 border rounded-md w-full dark:bg-gray-800"
        />
        <button
          onClick={() => validateEquation(inputValue)}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Apply
        </button>
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <div className="mt-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">Example equations:</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {exampleEquations.map((eq, index) => (
            <button
              key={index}
              onClick={() => {
                setInputValue(eq)
                validateEquation(eq)
              }}
              className="text-sm px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {eq}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
