export function CoinIcon({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </svg>
  );
}

export function LandmarkIcon({ built = false, className = '' }) {
  if (built) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M4 21h16" />
        <path d="M6 18V9" />
        <path d="M10 18V9" />
        <path d="M14 18V9" />
        <path d="M18 18V9" />
        <path d="M3 9h18L12 3 3 9z" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 21h16" />
      <path d="M7 21V9" />
      <path d="M17 21V9" />
      <path d="M5 9h14" />
      <path d="M8 6h8" />
      <path d="M10 3h4" />
      <path d="M9 14h6" />
    </svg>
  );
}

export function TrophyIcon({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v6a5 5 0 0 1-10 0V4z" />
      <path d="M7 7H4a3 3 0 0 0 3 3" />
      <path d="M17 7h3a3 3 0 0 1-3 3" />
    </svg>
  );
}

export function CityIcon({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 21h18" />
      <path d="M5 21V8l5-3v16" />
      <path d="M10 21V4h6v17" />
      <path d="M16 21v-9l3 2v7" />
      <path d="M7 11h1" />
      <path d="M7 15h1" />
      <path d="M12 8h2" />
      <path d="M12 12h2" />
      <path d="M12 16h2" />
    </svg>
  );
}

export function CrownIcon({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m3 8 4 3 5-7 5 7 4-3-2 11H5L3 8z" />
      <path d="M5 19h14" />
    </svg>
  );
}
