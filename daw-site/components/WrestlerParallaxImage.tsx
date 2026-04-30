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
      img.style.transform = `translateY(${window.scrollY * 0.22}px)`
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
        top: '-8%',
        left: 0,
        width: '100%',
        height: '116%',
        objectFit: 'cover',
        objectPosition: 'top center',
        display: 'block',
        willChange: 'transform',
      }}
    />
  )
}
