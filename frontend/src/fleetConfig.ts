export const ACTIVE_UNIT_NUMBERS = [
  1, 2, 3, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15,
] as const

export const TOTAL_UNITS = ACTIVE_UNIT_NUMBERS.length

const activeUnitIds = new Set<string>(
  ACTIVE_UNIT_NUMBERS.map((number) => `SAC#${number}`),
)

export function isActiveUnit(id: string): boolean {
  return activeUnitIds.has(id)
}