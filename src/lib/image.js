export function productImageSrc(imagePath) {
  if (!imagePath) return ''
  if (/^(https?:|data:|blob:)/i.test(imagePath)) return imagePath
  const base = import.meta.env.BASE_URL || '/'
  return `${base}${String(imagePath).replace(/^\//, '')}`
}
