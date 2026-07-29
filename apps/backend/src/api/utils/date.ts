const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isCalendarDate(value: string): boolean {
  const match = DATE_RE.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function todayInVietnam(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""

  return `${value("year")}-${value("month")}-${value("day")}`
}

export function isFutureOrTodayInVietnam(value: string): boolean {
  return isCalendarDate(value) && value >= todayInVietnam()
}
