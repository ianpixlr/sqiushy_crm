import { useEffect } from 'react'

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Sqiushy` : 'Sqiushy shop desk'
  }, [title])
}
