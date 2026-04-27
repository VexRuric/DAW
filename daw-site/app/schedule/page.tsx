import { Metadata } from 'next'
import ScheduleClient from '@/components/CalendarGrid'

export const metadata: Metadata = {
  title: 'Show Schedule',
  description: 'Full year-view calendar of DAW Warehouse LIVE shows and PPV events — 2022 through 2026.',
}

export default function SchedulePage() {
  return <ScheduleClient initialYear={2025} />
}
