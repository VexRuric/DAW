'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/* ── Types ────────────────────────────────────────── */

type StylePill = 'Striker' | 'Technician' | 'Powerhouse' | 'High Flyer'

function parseHeightToInches(h: string): number {
  const m = h.match(/(\d+)ft\s*(\d+)/)
  if (m) return parseInt(m[1]) * 12 + parseInt(m[2])
  const ft = h.match(/(\d+)ft/)
  if (ft) return parseInt(ft[1]) * 12
  return 72
}

function formatHeight(inches: number): string {
  return `${Math.floor(inches / 12)}ft ${inches % 12}in`
}
type WeightClass = 'Lightweight' | 'Cruiserweight' | 'Middleweight' | 'Heavyweight' | 'Super Heavyweight'
type Gender = 'Male' | 'Female' | 'Other'
type Alignment = 'Face' | 'Heel'

interface PersonalityTrait {
  faceA: string
  faceB: string
}

const PERSONALITY_TRAITS: PersonalityTrait[] = [
  { faceA: 'Brave',       faceB: 'Cowardly'    },
  { faceA: 'Humble',      faceB: 'Cocky'       },
  { faceA: 'Serious',     faceB: 'Fun'         },
  { faceA: 'Calculated',  faceB: 'Wild'        },
  { faceA: 'Friendly',    faceB: 'Vicious'     },
  { faceA: 'Respectful',  faceB: 'Dirty'       },
]

/* ── Pill Selector ────────────────────────────────── */

function PillSelector<T extends string>({
  options,
  value,
  onChange,
  multi = false,
}: {
  options: T[]
  value: T | T[] | null
  onChange: (v: T | T[]) => void
  multi?: boolean
}) {
  function isSelected(opt: T) {
    if (multi) return Array.isArray(value) && value.includes(opt)
    return value === opt
  }
  function toggle(opt: T) {
    if (multi && Array.isArray(value)) {
      onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt])
    } else {
      onChange(opt)
    }
  }
  return (
    <div className="style-pills">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`style-pill${isSelected(opt) ? ' selected' : ''}`}
          onClick={() => toggle(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

/* ── Color Picker Row ─────────────────────────────── */

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      <div className="color-row">
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div className="color-swatch" style={{ backgroundColor: value }} />
          <input
            type="color"
            className="color-input-native"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: 36, height: 36, cursor: 'none' }}
          />
        </div>
        <input
          type="text"
          className="form-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          placeholder="#8000da"
          style={{ fontFamily: 'var(--font-meta)', letterSpacing: '0.15em' }}
        />
      </div>
    </div>
  )
}

/* ── Drop Zone ────────────────────────────────────── */

function DropZone({ preview, onFile }: { preview: string | null; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  return (
    <div
      className={`drop-zone${drag ? ' drag-over' : ''}`}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false)
        const file = e.dataTransfer.files?.[0]
        if (file) onFile(file)
      }}
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="preview" style={{ maxHeight: 160, maxWidth: '100%', objectFit: 'contain' }} />
      ) : (
        <>
          <span style={{ fontSize: '2rem' }}>🖼️</span>
          <span>Drop image here or <span style={{ color: 'var(--purple-hot)' }}>browse</span></span>
          <span style={{ fontSize: '0.55rem', opacity: 0.6 }}>PNG / JPG — Max 5MB</span>
        </>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
    </div>
  )
}

/* ── Toast ────────────────────────────────────────── */

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t) }, [onDone])
  return (
    <div className="toast">
      <span style={{ fontSize: '1.2rem' }}>⏳</span>
      {message}
    </div>
  )
}

/* ── Wrestler Builder Modal ───────────────────────── */

interface WrestlerEditData {
  id: string
  name: string
  gender: string | null
  role: string | null
  country: string | null
  gimmick: string | null
  bio: string | null
}

interface WrestlerBuilderProps {
  onClose: () => void
  onSubmitted?: () => void
  userId: string
  editData?: WrestlerEditData
}

export function WrestlerBuilderModal({ onClose, onSubmitted, userId, editData }: WrestlerBuilderProps) {
  const parsedBio = editData?.bio ? (() => { try { return JSON.parse(editData.bio!) } catch { return {} } })() : {}
  const isEditing = !!editData

  const [creationType, setCreationType] = useState<'original' | 'community'>(parsedBio?.creationType ?? 'original')
  const [communityKeyword, setCommunityKeyword] = useState<string>(parsedBio?.communityKeyword ?? '')
  // Fighting style: single pick
  const initStyle: StylePill | null = Array.isArray(parsedBio?.style)
    ? (parsedBio.style[0] ?? null)
    : (parsedBio?.style ?? null)
  const [style, setStyle]       = useState<StylePill | null>(initStyle)
  const [weight, setWeight]     = useState<WeightClass | null>(parsedBio?.weightClass ?? null)
  // Height slider (inches: 48 = 4ft 0in … 95 = 7ft 11in)
  const [heightInches, setHeightInches] = useState<number>(
    parsedBio?.height ? parseHeightToInches(parsedBio.height) : 72
  )
  const [ringName, setRingName] = useState<string>(editData?.name ?? '')
  const [gender, setGender]     = useState<Gender | null>((editData?.gender as Gender) ?? null)
  const [primary, setPrimary]   = useState<string>(parsedBio?.primaryColor ?? '#8000da')
  const [secondary, setSecondary] = useState<string>(parsedBio?.secondaryColor ?? '#ff3355')
  const [homeState, setHomeState] = useState<string>(editData?.country ?? '')
  const [hair, setHair]         = useState<string>(parsedBio?.hair ?? '')
  const [eyes, setEyes]         = useState<string>(parsedBio?.eyes ?? '')
  const [alignment, setAlignment] = useState<Alignment | null>((editData?.role as Alignment) ?? null)
  const [finisher, setFinisher] = useState<string>(parsedBio?.finisher ?? '')
  const [songUrl, setSongUrl]   = useState<string>(parsedBio?.songUrl ?? '')
  const [imgFile, setImgFile]   = useState<File | null>(null)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [sliders, setSliders]   = useState<number[]>(parsedBio?.personalitySliders ?? PERSONALITY_TRAITS.map(() => 50))
  const [toast, setToast]       = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleFile(file: File) {
    setImgFile(file)
    const reader = new FileReader()
    reader.onload = () => setImgPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit() {
    if (!ringName.trim()) { setSubmitError('Ring name is required.'); return }
    if (creationType === 'community' && !communityKeyword.trim()) { setSubmitError('Creation keyword is required.'); return }
    setSubmitting(true)
    setSubmitError(null)

    const heightLabel = formatHeight(heightInches)
    const bioFields = creationType === 'community'
      ? { creationType: 'community', communityKeyword: communityKeyword.trim(), personalitySliders: sliders }
      : { creationType: 'original', style, weightClass: weight, height: heightLabel, primaryColor: primary, secondaryColor: secondary, hair, eyes, finisher, songUrl, personalitySliders: sliders }

    if (isEditing && editData) {
      // Upload image directly to original's path (image updates bypass text-field approval)
      if (imgFile) {
        const fd = new FormData(); fd.append('file', imgFile); fd.append('targetType', 'wrestlers'); fd.append('targetId', editData.id)
        await fetch('/api/portal/upload-image', { method: 'POST', body: fd })
      }
      const editRowName = `__edit_${editData.id.slice(0, 8)}_${Date.now()}`
      const { error } = await supabase.from('wrestlers').insert({
        name: editRowName,
        status: 'pending',
        submitted_by: userId,
        bio: JSON.stringify({
          editOf: editData.id,
          snapshot: {
            name: ringName.trim(),
            gender: gender ?? null,
            role: alignment ?? null,
            country: homeState || null,
            gimmick: creationType === 'original' && style ? style : null,
            bio: bioFields,
          },
        }),
      })
      setSubmitting(false)
      if (error) { setSubmitError('Edit submission failed — please try again.'); return }
      setToast(true)
      onSubmitted?.()
      return
    }

    const { data: newRow, error } = await supabase.from('wrestlers').insert({
      name:         ringName.trim(),
      gender:       gender ?? null,
      role:         alignment ?? null,
      country:      homeState || null,
      gimmick:      creationType === 'original' && style ? style : null,
      status:       'pending',
      submitted_by: userId,
      bio:          JSON.stringify(bioFields),
    }).select('id').single()

    if (error || !newRow) {
      setSubmitting(false)
      setSubmitError(error?.code === '23505' ? 'That ring name is already taken. Try a different name.' : 'Submission failed — please try again.')
      return
    }

    if (imgFile) {
      const fd = new FormData(); fd.append('file', imgFile); fd.append('targetType', 'wrestlers'); fd.append('targetId', newRow.id)
      await fetch('/api/portal/upload-image', { method: 'POST', body: fd })
    }

    setSubmitting(false)
    setToast(true)
    onSubmitted?.()
  }

  return (
    <>
      <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="modal" style={{ maxWidth: 760 }}>
          <div className="modal-header">
            <span className="modal-title">{isEditing ? `Edit: ${editData!.name}` : 'New Wrestler'}</span>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {/* Creation type toggle — new creations only */}
            {!isEditing && (
              <div className="form-section">
                <div className="form-section-label">Creation Type</div>
                <div className="style-pills">
                  {(['original', 'community'] as const).map((t) => (
                    <button key={t} type="button" className={`style-pill${creationType === t ? ' selected' : ''}`} onClick={() => setCreationType(t)}>
                      {t === 'original' ? 'New Creation' : 'WWE Community Creation'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Community disclaimer */}
            {creationType === 'community' && (
              <div style={{ margin: '0 0 1.25rem', padding: '0.85rem 1rem', background: 'rgba(255,159,0,0.08)', border: '1px solid rgba(255,159,0,0.4)', borderLeft: '3px solid var(--gold)' }}>
                <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.68rem', color: 'var(--gold)', letterSpacing: '0.05em', lineHeight: 1.7, margin: 0 }}>
                  <strong>WWE 2K Community Creation:</strong> Make sure your creation has the keyword <strong>DAWARE</strong> added in the WWE 2K creation tool so it can be found and downloaded for the show.
                </p>
              </div>
            )}

            {creationType === 'community' ? (
              <>
                <div className="form-section">
                  <div className="form-section-label">Identity</div>
                  <div className="form-field">
                    <label className="form-label">Wrestler Name (as announced)</label>
                    <input className="form-input" placeholder="Ring name" value={ringName} onChange={(e) => setRingName(e.target.value)} />
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <label className="form-label">Creation Keyword <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(used to find your creation in WWE 2K)</span></label>
                    <input className="form-input" placeholder="e.g. DAWARE_JOHN_DOE" value={communityKeyword} onChange={(e) => setCommunityKeyword(e.target.value)} />
                  </div>
                </div>
                <div className="form-section" style={{ marginBottom: 0 }}>
                  <div className="form-section-label">Character Image <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>(optional screenshot)</span></div>
                  <DropZone preview={imgPreview} onFile={handleFile} />
                </div>
              </>
            ) : (
              <>
                {/* Disclaimer */}
                <div style={{ margin: '0 0 1.25rem', padding: '0.75rem 1rem', background: 'rgba(128,0,218,0.07)', border: '1px solid rgba(128,0,218,0.25)', borderLeft: '3px solid var(--purple-hot)' }}>
                  <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.04em', lineHeight: 1.75, margin: 0 }}>
                    <strong style={{ color: 'var(--purple-hot)' }}>Heads up:</strong> Every field below is optional — feel free to leave anything blank and the creative team will fill in the gaps. Or type <strong style={{ color: 'var(--text-strong)' }}>random</strong> in any text field if you want to be surprised!
                  </p>
                </div>
                <div className="form-section">
                  <div className="form-section-label">Fighting Style <span style={{ fontWeight: 400, color: 'var(--text-dim)', fontSize: '0.7em' }}>(pick one)</span></div>
                  <PillSelector<StylePill> options={['Striker','Technician','Powerhouse','High Flyer']} value={style} onChange={(v) => setStyle(v as StylePill)} />
                </div>
                <div className="form-section">
                  <div className="form-section-label">Weight Class</div>
                  <PillSelector<WeightClass> options={['Lightweight','Cruiserweight','Middleweight','Heavyweight','Super Heavyweight']} value={weight} onChange={(v) => setWeight(v as WeightClass)} />
                </div>
                <div className="form-section">
                  <div className="form-section-label">Identity</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">
                        Height — <span style={{ color: 'var(--purple-hot)', fontWeight: 700 }}>{formatHeight(heightInches)}</span>
                      </label>
                      <input
                        type="range" min={48} max={95} value={heightInches}
                        onChange={(e) => setHeightInches(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--purple)', cursor: 'none', margin: '0.35rem 0 0.15rem' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-meta)', fontSize: '0.53rem', color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
                        <span>4ft 0in</span>
                        <span>7ft 11in</span>
                      </div>
                    </div>
                    <div className="form-field">
                      <label className="form-label">Announced As</label>
                      <input className="form-input" placeholder="Ring name" value={ringName} onChange={(e) => setRingName(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-field" style={{ marginBottom: '0.75rem' }}>
                    <label className="form-label">Gender</label>
                    <PillSelector<Gender> options={['Male','Female','Other']} value={gender} onChange={(v) => setGender(v as Gender)} />
                  </div>
                </div>
                <div className="form-section">
                  <div className="form-section-label">Brand Colors</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'start' }}>
                    <ColorPicker label="Primary Color" value={primary} onChange={setPrimary} />
                    <ColorPicker label="Secondary Color" value={secondary} onChange={setSecondary} />
                    <div className="form-field">
                      <label className="form-label">Preview</label>
                      <div style={{ height: 44, background: `linear-gradient(90deg, ${primary} 0%, ${secondary} 100%)`, border: '1px solid var(--border)' }} />
                    </div>
                  </div>
                </div>
                <div className="form-section">
                  <div className="form-section-label">Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-field">
                      <label className="form-label">Home State / Country</label>
                      <input className="form-input" placeholder="e.g. Texas, USA" value={homeState} onChange={(e) => setHomeState(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Hair (Color + Style)</label>
                      <input className="form-input" placeholder="e.g. Black, Braids" value={hair} onChange={(e) => setHair(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Eye Color</label>
                      <input className="form-input" placeholder="e.g. Brown" value={eyes} onChange={(e) => setEyes(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Finishing Move</label>
                      <input className="form-input" placeholder="e.g. The Killswitch" value={finisher} onChange={(e) => setFinisher(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Alignment</label>
                    <PillSelector<Alignment> options={['Face','Heel']} value={alignment} onChange={(v) => setAlignment(v as Alignment)} />
                  </div>
                  <div className="form-field" style={{ marginBottom: 0 }}>
                    <label className="form-label">Entrance Song URL (YouTube / Spotify)</label>
                    <input className="form-input" placeholder="https://youtube.com/..." value={songUrl} onChange={(e) => setSongUrl(e.target.value)} />
                  </div>
                </div>
                <div className="form-section">
                  <div className="form-section-label">Personality Traits</div>
                  {PERSONALITY_TRAITS.map((trait, i) => (
                    <div key={i} className="personality-row">
                      <span className="personality-label" style={{ textAlign: 'right' }}>{trait.faceA}</span>
                      <input type="range" className="personality-slider" min={0} max={100} value={sliders[i]} onChange={(e) => { const next = [...sliders]; next[i] = Number(e.target.value); setSliders(next) }} />
                      <span className="personality-label">{trait.faceB}</span>
                    </div>
                  ))}
                </div>
                <div className="form-section" style={{ marginBottom: 0 }}>
                  <div className="form-section-label">Character Image</div>
                  <DropZone preview={imgPreview} onFile={handleFile} />
                </div>
              </>
            )}
          </div>

          {submitError && (
            <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,51,85,0.1)', borderTop: '1px solid var(--accent-red)', color: 'var(--accent-red)', fontFamily: 'var(--font-meta)', fontSize: '0.68rem', letterSpacing: '0.08em' }}>
              ✕ {submitError}
            </div>
          )}

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : isEditing ? 'Submit Edit for Approval' : 'Submit for Approval'}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={isEditing ? 'Edit submitted! Daware will review your changes shortly.' : 'Submitted! Daware will review your character shortly.'}
          onDone={() => { setToast(false); onClose() }}
        />
      )}
    </>
  )
}

/* ── Faction Builder Modal ────────────────────────── */

interface FactionEditData {
  id: string
  name: string
  bio: string | null
}

interface FactionBuilderProps {
  onClose: () => void
  onSubmitted?: () => void
  userId: string
  editData?: FactionEditData
}

export function FactionBuilderModal({ onClose, onSubmitted, userId, editData }: FactionBuilderProps) {
  const parsedBio = editData?.bio ? (() => { try { return JSON.parse(editData.bio!) } catch { return {} } })() : {}
  const isEditing = !!editData

  const existingMembers: string[] = parsedBio?.members ?? []
  const initMembers = existingMembers.length >= 2 ? existingMembers : [...existingMembers, ...Array(2 - existingMembers.length).fill('')]

  const [name, setName]       = useState(editData?.name ?? '')
  const [color, setColor]     = useState(parsedBio?.color ?? '#8000da')
  const [motion, setMotion]   = useState<'Single' | 'Double' | null>(parsedBio?.motion ?? null)
  const [songUrl, setSongUrl] = useState(parsedBio?.songUrl ?? '')
  const [memberCount, setMemberCount] = useState(Math.max(2, initMembers.length))
  const [members, setMembers] = useState<string[]>(initMembers)
  const [imgFile, setImgFile]   = useState<File | null>(null)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [toast, setToast]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function updateMemberCount(n: number) {
    setMemberCount(n)
    setMembers((prev) => {
      const next = [...prev]
      while (next.length < n) next.push('')
      return next.slice(0, n)
    })
  }

  function handleFile(file: File) {
    setImgFile(file)
    const reader = new FileReader()
    reader.onload = () => setImgPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setSubmitError('Faction name is required.')
      return
    }
    setSubmitting(true)
    setSubmitError(null)

    const bioFields = { color, motion, songUrl, members: members.filter(Boolean) }

    if (isEditing && editData) {
      if (imgFile) {
        const fd = new FormData(); fd.append('file', imgFile); fd.append('targetType', 'teams'); fd.append('targetId', editData.id)
        await fetch('/api/portal/upload-image', { method: 'POST', body: fd })
      }
      const editRowName = `__edit_${editData.id.slice(0, 8)}_${Date.now()}`
      const { error } = await supabase.from('teams').insert({
        name: editRowName,
        status: 'pending',
        submitted_by: userId,
        bio: JSON.stringify({ editOf: editData.id, snapshot: { name: name.trim(), bio: bioFields } }),
      })
      setSubmitting(false)
      if (error) { setSubmitError('Edit submission failed — please try again.'); return }
      setToast(true)
      onSubmitted?.()
      return
    }

    const { data: newRow, error } = await supabase.from('teams').insert({
      name:         name.trim(),
      status:       'pending',
      submitted_by: userId,
      bio:          JSON.stringify(bioFields),
    }).select('id').single()

    setSubmitting(false)

    if (error || !newRow) {
      setSubmitError(error?.code === '23505' ? 'That faction name is already taken.' : 'Submission failed — please try again.')
      return
    }

    if (imgFile) {
      const fd = new FormData(); fd.append('file', imgFile); fd.append('targetType', 'teams'); fd.append('targetId', newRow.id)
      await fetch('/api/portal/upload-image', { method: 'POST', body: fd })
    }

    setToast(true)
    onSubmitted?.()
  }

  return (
    <>
      <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="modal" style={{ maxWidth: 560 }}>
          <div className="modal-header">
            <span className="modal-title">{isEditing ? `Edit: ${editData!.name}` : 'New Faction'}</span>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="modal-body">
            <div className="form-field">
              <label className="form-label">Faction Name</label>
              <input className="form-input" placeholder="e.g. The Syndicate" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'start' }}>
              <ColorPicker label="Faction Color" value={color} onChange={setColor} />
              <div className="form-field">
                <label className="form-label">Color Preview</label>
                <div style={{ height: 44, background: color, border: '1px solid var(--border)' }} />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Title Motion</label>
              <div className="style-pills">
                {(['Single','Double'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={`style-pill${motion === opt ? ' selected' : ''}`}
                    onClick={() => setMotion(opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Entrance Song (YouTube URL)</label>
              <input className="form-input" placeholder="https://youtube.com/..." value={songUrl} onChange={(e) => setSongUrl(e.target.value)} />
            </div>

            <div className="form-field">
              <label className="form-label">Member Count: {memberCount}</label>
              <input
                type="range" min={2} max={5} value={memberCount}
                onChange={(e) => updateMemberCount(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--purple)', cursor: 'none' }}
              />
            </div>

            <div className="form-section">
              <div className="form-section-label">Members</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {members.map((m, i) => (
                  <div key={i} className="form-field" style={{ marginBottom: 0 }}>
                    <label className="form-label">Member {i + 1}</label>
                    <input
                      className="form-input"
                      placeholder={`Member ${i + 1} name`}
                      value={m}
                      onChange={(e) => {
                        const next = [...members]
                        next[i] = e.target.value
                        setMembers(next)
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="form-section" style={{ marginBottom: 0 }}>
              <div className="form-section-label">Faction Image</div>
              <DropZone preview={imgPreview} onFile={handleFile} />
            </div>
          </div>

          {submitError && (
            <div style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,51,85,0.1)', borderTop: '1px solid var(--accent-red)', color: 'var(--accent-red)', fontFamily: 'var(--font-meta)', fontSize: '0.68rem', letterSpacing: '0.08em' }}>
              ✕ {submitError}
            </div>
          )}

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : isEditing ? 'Submit Edit for Approval' : 'Submit for Approval'}
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <Toast
          message={isEditing ? 'Edit submitted! Daware will review your changes shortly.' : 'Faction submitted! Daware will review it shortly.'}
          onDone={() => { setToast(false); onClose() }}
        />
      )}
    </>
  )
}

/* ── Creation Card ────────────────────────────────── */

type CreationStatus = 'hired' | 'pending' | 'rejected'

interface Creation {
  id: string
  name: string
  type: 'wrestler' | 'faction'
  status: CreationStatus
  bio: string | null
  render_url?: string | null
  gender?: string | null
  role?: string | null
  country?: string | null
  gimmick?: string | null
  editPending?: boolean
  twitchLinked?: boolean  // wrestler found via twitch_handle match, not submitted_by
}

const STATUS_CONFIG: Record<CreationStatus, { label: string; color: string; bg: string; icon: string }> = {
  hired:    { label: 'Hired!',   color: '#00c864', bg: 'rgba(0,200,100,0.12)',   icon: '✓' },
  pending:  { label: 'Pending',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '⏳' },
  rejected: { label: 'Rejected', color: 'var(--accent-red)', bg: 'rgba(255,51,85,0.12)', icon: '✕' },
}

/* ── Portal Page ──────────────────────────────────── */

export default function PortalPage() {
  const { isFan, user, loading } = useAuth()
  const router = useRouter()
  const [openNewWrestler, setOpenNewWrestler] = useState(false)
  const [editingWrestler, setEditingWrestler] = useState<Creation | null>(null)
  const [openNewFaction,  setOpenNewFaction]  = useState(false)
  const [editingFaction,  setEditingFaction]  = useState<Creation | null>(null)
  const [creations, setCreations]             = useState<Creation[]>([])
  const [loadingCreations, setLoadingCreations] = useState(true)

  useEffect(() => {
    if (!loading && !isFan) router.push('/login')
  }, [isFan, loading, router])

  const fetchCreations = useCallback(async () => {
    if (!user) return
    setLoadingCreations(true)

    const [wRes, tRes, profileRes] = await Promise.all([
      supabase
        .from('wrestlers')
        .select('id, name, status, bio, render_url, gender, role, country, gimmick')
        .eq('submitted_by', user.id)
        .in('status', ['pending', 'hired', 'rejected']),
      supabase
        .from('teams')
        .select('id, name, status, bio, render_url')
        .eq('submitted_by', user.id)
        .in('status', ['pending', 'hired', 'rejected']),
      supabase.from('profiles').select('twitch_handle').eq('id', user.id).single(),
    ])

    const allWrestlers = wRes.data ?? []
    const allTeams = tRes.data ?? []
    const twitchHandle: string | null = profileRes.data?.twitch_handle ?? null

    // Separate edit-pending rows (temp names) from real creations
    const wrestlerEdits = allWrestlers.filter((w) => w.name.startsWith('__edit_'))
    const realWrestlers = allWrestlers.filter((w) => !w.name.startsWith('__edit_'))
    const teamEdits = allTeams.filter((t) => t.name.startsWith('__edit_'))
    const realTeams = allTeams.filter((t) => !t.name.startsWith('__edit_'))

    // Build set of original IDs that already have a pending edit
    const editPendingIds = new Set<string>()
    for (const e of [...wrestlerEdits, ...teamEdits]) {
      try { const b = JSON.parse(e.bio ?? '{}'); if (b.editOf) editPendingIds.add(b.editOf) } catch { /* */ }
    }

    const seenIds = new Set(realWrestlers.map((w) => w.id))

    const wrestlers: Creation[] = realWrestlers.map((w) => ({
      id: w.id, name: w.name, type: 'wrestler' as const, status: w.status as CreationStatus,
      bio: w.bio, render_url: w.render_url, gender: w.gender, role: w.role, country: w.country, gimmick: w.gimmick,
      editPending: editPendingIds.has(w.id),
    }))

    // Twitch-linked wrestlers: roster wrestlers owned by this user's Twitch handle
    if (twitchHandle) {
      const { data: linked } = await supabase
        .from('wrestlers')
        .select('id, name, status, bio, render_url, gender, role, country, gimmick')
        .eq('twitch_handle', twitchHandle)
        .eq('status', 'hired')
      for (const w of linked ?? []) {
        if (!seenIds.has(w.id)) {
          wrestlers.push({
            id: w.id, name: w.name, type: 'wrestler' as const, status: 'hired' as CreationStatus,
            bio: w.bio, render_url: w.render_url, gender: w.gender, role: w.role, country: w.country, gimmick: w.gimmick,
            twitchLinked: true,
          })
        }
      }
    }

    const factions: Creation[] = realTeams.map((t) => ({
      id: t.id, name: t.name, type: 'faction' as const, status: t.status as CreationStatus,
      bio: t.bio, render_url: t.render_url, editPending: editPendingIds.has(t.id),
    }))

    setCreations([...wrestlers, ...factions])
    setLoadingCreations(false)
  }, [user])

  useEffect(() => { fetchCreations() }, [fetchCreations])

  if (loading || !isFan || !user) return null

  return (
    <>
      <div className="section-sm" style={{ borderTop: 'none' }}>
        <p className="section-label">Fan Portal</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 className="section-title">My Creations</h1>
          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.1em', maxWidth: 400, textAlign: 'right', lineHeight: 1.8 }}>
            Submit wrestlers and factions for Daware to review.<br />
            Approved characters may appear on upcoming shows.
          </p>
        </div>
      </div>

      <div className="section" style={{ paddingTop: '2rem' }}>
        {/* Creations grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          {/* Existing creations */}
          {loadingCreations ? (
            <div style={{ fontFamily: 'var(--font-meta)', fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.12em', gridColumn: '1/-1', padding: '1rem 0' }}>
              Loading…
            </div>
          ) : (
            creations.map((c) => {
              const cfg = STATUS_CONFIG[c.status]
              return (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    textAlign: 'left',
                    aspectRatio: '3/4',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, var(--surface-2) 0%, var(--surface-3) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {c.render_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.render_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                    ) : (
                      <span style={{ fontSize: c.type === 'faction' ? '3rem' : '2rem', opacity: 0.35 }}>
                        {c.type === 'faction' ? '🤝' : '🧍'}
                      </span>
                    )}
                  </div>
                  <div style={{ padding: '0.75rem 0.85rem', borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text-strong)', textTransform: 'uppercase', lineHeight: 1.1, marginBottom: '0.35rem' }}>
                      {c.name}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                        {c.type}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--font-meta)',
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          padding: '0.2rem 0.5rem',
                          background: cfg.bg,
                          color: cfg.color,
                          border: `1px solid ${cfg.color}`,
                        }}
                      >
                        {cfg.icon} {cfg.label}
                      </span>
                    </div>
                    {c.twitchLinked ? (
                      <div style={{ marginTop: '0.4rem', fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--purple-hot)', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        🔗 Twitch Linked
                      </div>
                    ) : c.editPending ? (
                      <div style={{ marginTop: '0.4rem', fontFamily: 'var(--font-meta)', fontSize: '0.55rem', color: 'var(--gold)', letterSpacing: '0.1em' }}>
                        ✎ EDIT PENDING
                      </div>
                    ) : (
                      <button
                        onClick={() => { if (c.type === 'wrestler') setEditingWrestler(c); else setEditingFaction(c) }}
                        style={{ marginTop: '0.4rem', background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', fontFamily: 'var(--font-meta)', fontSize: '0.55rem', letterSpacing: '0.1em', padding: '0.2rem 0.5rem', cursor: 'none', textTransform: 'uppercase' }}
                      >
                        ✎ Edit
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {/* New Wrestler card */}
          <NewCard
            icon="⚡"
            label="New Wrestler"
            sub="Submit a character"
            onClick={() => setOpenNewWrestler(true)}
          />

          {/* New Faction card */}
          <NewCard
            icon="🤝"
            label="New Faction"
            sub="Build a stable"
            onClick={() => setOpenNewFaction(true)}
          />
        </div>

        {/* Status legend */}
        <div
          style={{
            display: 'flex',
            gap: '2rem',
            padding: '1.5rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            flexWrap: 'wrap',
          }}
        >
          <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.15em', marginRight: '0.5rem', flexShrink: 0 }}>
            STATUS KEY:
          </p>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.65rem', color: cfg.color, fontWeight: 700, letterSpacing: '0.1em' }}>
                {cfg.icon} {cfg.label.toUpperCase()}
              </span>
              <span style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
                {key === 'hired'    && '— Character approved and active on the roster'}
                {key === 'pending'  && '— Awaiting Daware review (usually within 48h)'}
                {key === 'rejected' && "— Didn't meet guidelines, see notes"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {(openNewWrestler || editingWrestler) && (
        <WrestlerBuilderModal
          userId={user.id}
          onClose={() => { setOpenNewWrestler(false); setEditingWrestler(null) }}
          onSubmitted={fetchCreations}
          editData={editingWrestler ? {
            id: editingWrestler.id,
            name: editingWrestler.name,
            gender: editingWrestler.gender ?? null,
            role: editingWrestler.role ?? null,
            country: editingWrestler.country ?? null,
            gimmick: editingWrestler.gimmick ?? null,
            bio: editingWrestler.bio ?? null,
          } : undefined}
        />
      )}
      {(openNewFaction || editingFaction) && (
        <FactionBuilderModal
          userId={user.id}
          onClose={() => { setOpenNewFaction(false); setEditingFaction(null) }}
          onSubmitted={fetchCreations}
          editData={editingFaction ? {
            id: editingFaction.id,
            name: editingFaction.name,
            bio: editingFaction.bio ?? null,
          } : undefined}
        />
      )}
    </>
  )
}

function NewCard({ icon, label, sub, onClick }: { icon: string; label: string; sub: string; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? 'rgba(128,0,218,0.08)' : 'transparent',
        border: `2px dashed ${hover ? 'var(--purple-hot)' : 'var(--border-hot)'}`,
        cursor: 'none',
        aspectRatio: '3/4',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        transition: 'all 0.2s',
      }}
    >
      <span style={{ fontSize: '2.5rem', opacity: hover ? 1 : 0.4 }}>{icon}</span>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: hover ? 'var(--purple-hot)' : 'var(--text-dim)', textTransform: 'uppercase', lineHeight: 1 }}>
        + {label}
      </p>
      <p style={{ fontFamily: 'var(--font-meta)', fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.15em' }}>
        {sub}
      </p>
    </button>
  )
}
