// The ClearSettle mark: three linked stages of the settlement chain (D-UI-07), on petrol.

export function BrandMark({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect width="24" height="24" rx="6" fill="#0b5563" />
      <path d="M6 12h12" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.6" />
      <circle cx="6" cy="12" r="2.4" fill="#ffffff" />
      <circle cx="12" cy="12" r="2.4" fill="#ffffff" />
      <circle cx="18" cy="12" r="2.4" fill="none" stroke="#ffffff" strokeWidth="1.6" />
    </svg>
  );
}

export function Brand({ className }) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <BrandMark />
      <span style={{ fontWeight: 600, fontSize: "1.0625rem", letterSpacing: "-0.01em", color: "var(--ink)" }}>ClearSettle</span>
    </span>
  );
}
