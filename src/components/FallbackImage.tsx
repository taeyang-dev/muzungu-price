"use client";

interface FallbackImageProps {
  src: string | null | undefined;
  fallbackSrc: string;
  alt: string;
  className?: string;
}

export function FallbackImage({ src, fallbackSrc, alt, className }: FallbackImageProps) {
  return (
    <img
      alt={alt}
      className={className}
      onError={(event) => {
        const target = event.currentTarget;
        if (target.src.endsWith(fallbackSrc)) {
          return;
        }
        target.onerror = null;
        target.src = fallbackSrc;
      }}
      src={src || fallbackSrc}
    />
  );
}
