'use client'

import { useState, useCallback } from 'react'

export default function FactionLogoBadge({ src, size = 36 }: { src: string; size?: number }) {
  const [open, setOpen] = useState(false)

  const openZoom = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }, [])

  const closeZoom = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen(false)
  }, [])

  return (
    <>
      <div
        onClick={openZoom}
        style={{
          position: 'absolute', top: '0.6rem', right: '0.6rem', zIndex: 12,
          background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)',
          padding: '4px', borderRadius: 2, cursor: 'zoom-in',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" style={{ display: 'block', height: size, width: size, objectFit: 'contain' }} />
      </div>

      {open && (
        <div
          onClick={closeZoom}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem', cursor: 'zoom-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '80vw', maxHeight: '80vh', objectFit: 'contain' }}
          />
        </div>
      )}
    </>
  )
}
