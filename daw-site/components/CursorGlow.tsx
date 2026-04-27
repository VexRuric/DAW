'use client'

import { useEffect, useRef } from 'react'

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const glow = glowRef.current
    const dot = dotRef.current
    if (!glow || !dot) return

    let rafId: number
    let mouseX = -500
    let mouseY = -500
    let glowX = -500
    let glowY = -500

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      dot.style.left = `${mouseX}px`
      dot.style.top = `${mouseY}px`
    }

    const onEnter = () => {
      const el = document.elementFromPoint(mouseX, mouseY)
      if (el?.closest('a, button, [data-hover]')) {
        dot.classList.add('hover')
      } else {
        dot.classList.remove('hover')
      }
    }

    const loop = () => {
      glowX += (mouseX - glowX) * 0.08
      glowY += (mouseY - glowY) * 0.08
      glow.style.left = `${glowX}px`
      glow.style.top = `${glowY}px`
      rafId = requestAnimationFrame(loop)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseover', onEnter)
    rafId = requestAnimationFrame(loop)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onEnter)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      <div className="cursor-glow" ref={glowRef} />
      <div className="cursor-dot" ref={dotRef} />
    </>
  )
}
