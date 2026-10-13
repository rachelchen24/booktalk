/**
 * The BookTalk mark: an upright B on a shelf, with the T leaning on it like a book.
 * Same shapes as src/app/icon.svg (the browser-tab icon); keep the two in sync.
 * Decorative next to the "BookTalk" wordmark, so it's hidden from screen readers.
 */
export function Logo({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={`shrink-0 ${className}`}>
      <rect width="64" height="64" rx="14" fill="#2f6b55" />
      <rect x="8" y="50" width="48" height="3.5" rx="1.75" fill="#f6efe2" opacity="0.55" />
      <path
        fill="#f6efe2"
        fillRule="evenodd"
        d="M11 14 H23.5 C30 14 32.5 18 32.5 22.6 C32.5 26 30.8 28.3 28.2 29.4 C31.8 30.4 34.5 33.4 34.5 38.2 C34.5 44.8 30.5 50 23.8 50 H11 Z M17.2 19.6 V27.2 H22.6 C25.3 27.2 26.6 25.6 26.6 23.3 C26.6 21 25.3 19.6 22.6 19.6 Z M17.2 32.4 V44.4 H23.2 C26.6 44.4 28.4 42.4 28.4 38.4 C28.4 34.4 26.6 32.4 23.2 32.4 Z"
      />
      <path
        fill="#f6efe2"
        d="M49.00 50.00 L55.15 47.88 L45.70 20.46 L51.14 18.59 L49.19 12.92 L32.17 18.78 L34.12 24.45 L39.56 22.58 Z"
      />
    </svg>
  );
}
