export function normalizeAlarmSearch(value: string): string {
 return value.toLowerCase().replace(/\b(?:sac|centac)\s*#?\s*(\d+)\b/g,'sac$1')
  .replace(/[^a-z0-9]+/g,' ').trim()
}
export function matchesAlarmSearch(query: string, fields: string[]): boolean {
 const terms=normalizeAlarmSearch(query).split(/\s+/).filter(Boolean)
 const text=normalizeAlarmSearch(fields.join(' '))
 const words=text.split(' ')
 return terms.every(term=>/^sac\d+$/.test(term)?words.includes(term):text.includes(term))
}
