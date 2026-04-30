'use client'

import { useEffect, useRef } from 'react'

interface Props {
  src: string
  alt: string
}

export default function WrestlerParallaxImage({ src, alt }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    function onScroll() {
      if (!img) return
      const scrolled = window.scrollY
      // Scale up as user scrolls — wrestler "steps toward the camera"
      const scale = 1 + Math.min(scrolled * 0.00028, 0.18)
      // Slight upward drift so the face stays centered while body expands
      const nudge = scrolled * 0.06
      img.style.transform = `scale(${scale}) translateY(-${nudge}px)`
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '110%',
        objectFit: 'cover',
        objectPosition: 'top center',
        display: 'block',
        transformOrigin: 'top center',
        willChange: 'transform',
      }}
    />
  )
}
