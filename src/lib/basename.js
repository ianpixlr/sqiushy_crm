export function routerBasename() {
  const base = import.meta.env.BASE_URL || '/'
  if (base === '/') return undefined
  return base.replace(/\/$/, '')
}
