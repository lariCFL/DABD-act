/**
 * Determines if a session is still live (no end time).
 */
export function isLive(session) {
  return !session.endedAt
}

/**
 * Returns a human-readable duration string.
 * If endIso is null/undefined, uses the current time (elapsed so far).
 * Examples: "2h 15min", "45min", "3h"
 */
export function formatDuration(startIso, endIso) {
  const start = new Date(startIso)
  const end   = endIso ? new Date(endIso) : new Date()
  const totalMinutes = Math.max(0, Math.floor((end - start) / 60000))

  const hours   = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes}min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}min`
}
