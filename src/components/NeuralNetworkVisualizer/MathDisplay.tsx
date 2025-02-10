'use client'

import { useEffect, useRef } from 'react'

interface MathDisplayProps {
  equation: string
}

export default function MathDisplay({ equation }: MathDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current && (window as any).MathJax) {
      const texEquation = equation
        .replace('y=', '')
        .replace(/\*/g, '\\cdot ')
        .replace(/exp/g, 'e^')
      
      containerRef.current.innerHTML = `\\[${texEquation}\\]`
      ;(window as any).MathJax.typesetPromise([containerRef.current])
    }
  }, [equation])

  return <div ref={containerRef} className="my-2" />
}
