'use client'

import { useEffect, useRef } from 'react'

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const glow = glowRef.current
    const dot = dotRef.current
    if (!glow || !dot) return

    // Touch devices have no cursor — skip the effect entirely
    if (window.matchMedia('(pointer: coarse)').matches) {
      glow.style.display = 'none'; dot.style.display = 'none'
      return
    }

    let mouseX = -500
    let mouseY = -500

    // transform (not left/top) so moving the cursor never triggers page layout
    const place = (el: HTMLElement, x: number, y: number) => {
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
    }

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      place(dot, mouseX, mouseY)
      place(glow, mouseX, mouseY)
    }

    const onEnter = () => {
      const el = document.elementFromPoint(mouseX, mouseY)
      if (el?.closest('a, button, [data-hover]')) {
        dot.classList.add('hover')
      } else {
        dot.classList.remove('hover')
      }
    }

    document.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseover', onEnter, { passive: true })

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onEnter)
    }
  }, [])

  return (
    <>
      <div className="cursor-glow" ref={glowRef} />
      <div className="cursor-dot" ref={dotRef} />
    </>
  )
}
