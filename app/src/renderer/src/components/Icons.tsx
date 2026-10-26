import type { ReactNode } from 'react'

type IconProps = { size?: number; className?: string }

function base(props: IconProps, paths: ReactNode) {
  const s = props.size ?? 18
  return (
    <svg
      className={props.className}
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths}
    </svg>
  )
}

export function IconOverview(p: IconProps) {
  return base(
    p,
    <>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="15" width="7" height="6" rx="1.5" />
    </>
  )
}

export function IconRecords(p: IconProps) {
  return base(
    p,
    <>
      <path d="M8 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M7 11h10M7 15h7" />
    </>
  )
}

export function IconPlus(p: IconProps) {
  return base(p, <path d="M12 5v14M5 12h14" strokeWidth="2" />)
}

export function IconSync(p: IconProps) {
  return base(
    p,
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3" />
    </>
  )
}

export function IconTheme(p: IconProps) {
  return base(p, <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" />)
}

export function IconLogout(p: IconProps) {
  return base(
    p,
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  )
}

export function IconBalances(p: IconProps) {
  return base(
    p,
    <>
      <path d="M3 5h18v14H3z" />
      <path d="M3 9h18M7 15h4" />
    </>
  )
}

export function IconExport(p: IconProps) {
  return base(
    p,
    <>
      <path d="M12 3v12m-4-4 4 4 4-4M4 17v3h16v-3" />
    </>
  )
}

export function IconClock(p: IconProps) {
  return base(
    p,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  )
}

export function IconUsers(p: IconProps) {
  return base(
    p,
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21v-2a7 7 0 0 1 14 0v2M17 8h5M19.5 5.5v5" />
    </>
  )
}

export function IconUser(p: IconProps) {
  return base(
    p,
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
    </>
  )
}
