// In-repository icons (D-UI-11): 16 px line icons drawn for ClearSettle, no icon package. Decorative by
// default (aria-hidden); the text next to an icon carries its meaning.

const PATHS = {
  home: <path d="M2 7.5 8 2.5l6 5V14H10v-4H6v4H2z" />,
  upload: <path d="M8 11V2.5M4.5 6 8 2.5 11.5 6M2.5 11v2.5h11V11" />,
  link: <path d="M6.5 9.5l3-3M5 11.5 3.8 12.7a2 2 0 0 1-2.8-2.8L4.6 6.3M11 4.5l1.2-1.2a2 2 0 0 1 2.8 2.8l-3.6 3.6" />,
  flag: <path d="M3 14V2.5M3 3h8.5l-2 3 2 3H3" />,
  rows: <path d="M2.5 3.5h11M2.5 8h11M2.5 12.5h11" />,
  book: <path d="M3 2.5h7.5a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2zM3 11.5a2 2 0 0 1 2-2h7.5" />,
  chart: <path d="M2.5 13.5h11M4.5 11V7M8 11V4M11.5 11V8.5" />,
  gear: (
    <>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.8v1.8M8 12.4v1.8M1.8 8h1.8M12.4 8h1.8M3.6 3.6l1.3 1.3M11.1 11.1l1.3 1.3M3.6 12.4l1.3-1.3M11.1 4.9l1.3-1.3" />
    </>
  ),
  shield: <path d="M8 1.8 13 4v4c0 3-2.2 5.2-5 6.2C5.2 13.2 3 11 3 8V4zM5.8 8.2 7.3 9.7 10.4 6.4" />,
  clock: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" />
    </>
  ),
  info: (
    <>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7.2V11M8 5v.2" />
    </>
  ),
  warn: <path d="M8 2.5 14 13H2zM8 6.5v3M8 11.3v.2" />,
  check: <path d="M3 8.5 6.5 12 13 4.5" />,
  cross: <path d="M4 4l8 8M12 4l-8 8" />,
  chevron: <path d="M6 3.5 10.5 8 6 12.5" />,
  signout: <path d="M6.5 2.5H3v11h3.5M10 5l3 3-3 3M13 8H6" />,
  devices: <path d="M1.5 3.5h9v6.5h-9zM4 12.5h4M11.5 6h3v6.5h-3z" />,
  lock: (
    <>
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" />
    </>
  ),
};

export default function Icon({ name, size = 16, title, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}
