'use client';

import { useState } from 'react';

interface Props {
  /** Current value (0–5, can be decimal for averages). */
  value: number;
  /** Provide to make interactive; omit for read-only display. */
  onChange?: (stars: number) => void;
  /** Icon size in px (default 16). */
  size?: number;
  className?: string;
}

export function StarRating({ value, onChange, size = 16, className = '' }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? Math.round(value); // snap to integer for hover
  const interactive = !!onChange;

  return (
    <div
      className={`flex items-center gap-0.5 ${className}`}
      onMouseLeave={() => interactive && setHovered(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = display >= star;
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            aria-label={`${star} estrella${star !== 1 ? 's' : ''}`}
            className={`flex items-center justify-center rounded-md ${interactive ? 'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent' : 'cursor-default pointer-events-none'}`}
            style={{
              lineHeight: 0,
              background: 'none',
              border: 'none',
              // Keep the visual star compact but expand the hit target closer to
              // a touch-friendly size when the rating is actually interactive.
              padding: interactive ? Math.max(2, (32 - size) / 2) : 0,
            }}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={filled ? 'var(--color-accent)' : 'none'}
              stroke={filled ? 'var(--color-accent)' : 'var(--color-outline)'}
              strokeWidth={1.5}
              strokeLinejoin="round"
            >
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
