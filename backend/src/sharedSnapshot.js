// One shared upstream request per process; timestamps from the source are preserved.
export function createSharedSnapshot({ intervalMs = 1000, now = Date.now } = {}) {
  let state
  return function read(key, loader) {
    if (!state || state.key !== key) state = { key, pending:null, until:0, value:null, error:null }
    const entry = state
    if (entry.pending) return entry.pending
    if (now() < entry.until) return entry.error ? Promise.reject(entry.error) : Promise.resolve(entry.value)
    entry.pending = Promise.resolve().then(loader).then(value => {
      entry.value = value; entry.error = null
      return value
    }, error => {
      entry.value = null; entry.error = error
      throw error
    }).finally(() => {
      entry.until = now() + intervalMs
      entry.pending = null
    })
    return entry.pending
  }
}
