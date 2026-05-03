'use client'

import { useState, useCallback, useEffect } from 'react'

export default function FactionHeroImages({
  memberRenders,
  logoUrl,
  hasComposite,
}: {
  memberRenders: string[]
  logoUrl: string | null
  hasComposite: boolean
}) {
  const [zoomSrc, setZoomSrc] = useState<string | null>(null)

  const close = useCallback(() => setZoomSrc(null), [])

  useEffect(() => {
    if (!zoomSrc) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomSrc, close])

  return (
    <>
      {hasComposite ? (
        memberRenders.slice(0, 5).map((url, i) => {
          const count    = Math.min(memberRenders.length, 5)
          const segW     = 100 / count
          const leftPct  = i * segW - (count > 2 ? segW * 0.2 : 0)
          const zIdx     = Math.round(count / 2) === i ? count + 1 : count - Math.abs(i - Math.floor(count / 2))
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt=""
              onClick={() => setZoomSrc(url)}
              style={{
                position: 'absolute', top: 0, left: `${leftPct}%`,
                width: count <= 2 ? '60%' : '50%', height: '125%',
                objectFit: 'cover', objectPosition: 'top center',
                zIndex: zIdx, cursor: 'zoom-in',
              }}
            />
          )
        })
      ) : logoUrl ? (
        // Solo faction — clicking the logo image zooms it
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          onClick={() => setZoomSrc(logoUrl)}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'top', cursor: 'zoom-in',
          }}
        />
      ) : null}

      {/* Faction logo badge — composite only, separate zoom from wrestler images */}
      {hasComposite && logoUrl && (
        <div
          onClick={() => setZoomSrc(logoUrl)}
          style={{
            position: 'absolute', top: '1rem', right: '1rem', zIndex: 20,
            background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.15)',
            padding: 6, cursor: 'zoom-in',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="" style={{ display: 'block', height: 40, width: 40, objectFit: 'contain' }} />
        </div>
      )}

      {/* Lightbox */}
      {zoomSrc && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem', cursor: 'zoom-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomSrc}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }}
          />
        </div>
      )}
    </>
  )
}
