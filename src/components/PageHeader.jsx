import { usePageTitle } from '../usePageTitle'

export function PageHeader({ title, lede, children }) {
  usePageTitle(title)
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {lede ? <p>{lede}</p> : null}
      </div>
      {children ? <div className="page-actions">{children}</div> : null}
    </header>
  )
}
