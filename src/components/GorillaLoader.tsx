"use client";

import { Locale, tr } from "@/lib/i18n";

interface GorillaLoaderProps {
  locale?: Locale;
}

export function GorillaLoader({ locale = "en" }: GorillaLoaderProps) {
  return (
    <div className="gorilla-loader">
      <div aria-hidden="true" className="gorilla-loader-scene">
        <svg className="gorilla-loader-svg" viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg">
          <ellipse className="gorilla-shadow" cx="80" cy="168" rx="34" ry="8" />
          <g className="gorilla-body-group">
            <ellipse cx="80" cy="118" fill="#4B5563" rx="42" ry="36" />
            <ellipse cx="80" cy="122" fill="#6B7280" rx="30" ry="24" />
            <circle cx="48" cy="108" fill="#374151" r="14" />
            <circle cx="112" cy="108" fill="#374151" r="14" />
            <g className="gorilla-wave-arm">
              <ellipse cx="126" cy="92" fill="#374151" rx="12" ry="18" transform="rotate(18 126 92)" />
              <circle cx="136" cy="72" fill="#6B7280" r="10" />
            </g>
            <ellipse cx="34" cy="96" fill="#374151" rx="11" ry="16" transform="rotate(-16 34 96)" />
          </g>
          <g className="gorilla-head-group">
            <circle cx="80" cy="62" fill="#4B5563" r="34" />
            <circle cx="52" cy="48" fill="#374151" r="12" />
            <circle cx="108" cy="48" fill="#374151" r="12" />
            <ellipse cx="80" cy="70" fill="#D1D5DB" rx="24" ry="20" />
            <circle className="gorilla-eye" cx="68" cy="58" fill="#111827" r="5" />
            <circle className="gorilla-eye" cx="92" cy="58" fill="#111827" r="5" />
            <circle cx="70" cy="56" fill="#FFFFFF" r="1.8" />
            <circle cx="94" cy="56" fill="#FFFFFF" r="1.8" />
            <ellipse cx="80" cy="72" fill="#9CA3AF" rx="8" ry="5" />
            <path
              d="M68 78 Q80 86 92 78"
              fill="none"
              stroke="#111827"
              strokeLinecap="round"
              strokeWidth="2.5"
            />
          </g>
        </svg>
      </div>
      <p className="gorilla-loader-caption">
        {tr(locale, "Muzungu is grooving while we work...", "무준구가 열심히 처리 중이에요...")}
      </p>
    </div>
  );
}
