const paths = {
  shop: "M3 10v11h18V10M2 10l2-7h16l2 7M2 10c0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0 0 4 5 4 5 0M9 21v-7h6v7",
  home: "M3 10l9-7 9 7v11H3V10M9 21v-8h6v8",
  cart: "M3 3h2l3 12h11l3-9H6M9 20h.01M18 20h.01",
  box: "M3 7l9-5 9 5v10l-9 5-9-5V7Zm0 0 9 5 9-5M12 12v10M7.5 4.5l9 5",
  folder: "M3 20h18V7H11L9 4H3v16",
  receipt: "M5 3h14v19l-3-2-4 2-4-2-3 2V3ZM8 8h8M8 12h8M8 16h4",
  wallet: "M20 7V3H5a2 2 0 0 0 0 4h16v14H3V5M21 12h-6v5h6M17 14.5h.01",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M12 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM17 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-4",
  chart: "M3 3v18h18M8 16v-5M13 16V6M18 16v-8",
  calendar: "M3 5h18v16H3V5ZM7 2v6M17 2v6M3 11h18M7 15h2M14 15h2",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 3 5-2 3v4l-5 3-3-2-3 2-5-3v-4l-2-3 3-5 3-1 1-3Z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  plus: "M12 5v14M5 12h14",
  search: "M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M6 18 18 6",
  logout: "M9 3H3v18h6M9 12h12M17 8l4 4-4 4",
  check: "M5 12l4 4L19 6",
  alert: "M12 3 2 21h20L12 3ZM12 9v5M12 18h.01",
  qr: "M3 3h6v6H3V3ZM15 3h6v6h-6V3ZM3 15h6v6H3v-6ZM15 15h2v2h4v4h-6v-2M21 12v1M12 3v3M12 12h3M3 12h3",
} as const

export type IconName = keyof typeof paths

export default function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}><path d={paths[name]} /></svg>
}
