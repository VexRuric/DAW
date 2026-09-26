// Match formats shared by the booker, Results Entry and the public matchcard.

export const MATCH_TYPES = ['Singles', 'Tag Team', 'Triple Threat', 'Fatal 4-Way', 'Gauntlet', 'Battle Royal', 'Royal Rumble', 'Handicap']

export const STIP_COLORS: Record<string, string> = {
  'Extreme': '#ff6b35', 'Weapons': '#ff4444', 'Steel Cage': '#8899aa',
  'Falls Count Anywhere': '#22cc88', 'No Holds Barred': '#ff3355',
  'Iron Man': '#ffc933', 'Ladder': '#4488ff', 'TLC': '#6644ff',
  'Table': '#44aaff', 'No DQ': '#ff2244', 'Elimination Chamber': '#aa44ff',
  'Hardcore': '#cc2222', 'Ambulance': '#aaaacc', 'War Games': '#882288',
  'Casket': '#555577',
}

/**
 * Wrestlers per side, in card order. `size` is the total number of wrestlers
 * (6 = 3-on-3 tag; any size for Battle Royal / Royal Rumble).
 */
export function getParticipantsPerSide(matchType: string, size?: number): number[] {
  switch (matchType) {
    case 'Tag Team':      return size === 6 ? [3, 3] : [2, 2]
    case 'Triple Threat': return [1, 1, 1]
    case 'Fatal 4-Way':   return [1, 1, 1, 1]
    case 'Gauntlet':      return [1, 1, 1, 1, 1, 1]
    case 'Battle Royal':  return Array(size ?? 8).fill(1)
    case 'Royal Rumble':  return Array(size ?? 30).fill(1)
    case 'Handicap':      return [2, 1]
    default:              return [1, 1]
  }
}
