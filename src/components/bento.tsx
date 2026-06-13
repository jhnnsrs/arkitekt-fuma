import type { ReactNode } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Building blocks for the home-page bento grid. Cells come in two flavours:
 * a plain bordered card, and a `glow` frame whose thick brand-coloured border
 * + soft outer glow makes a cell pop (mirrors the accented cells on the
 * Fumadocs landing page). Screenshots are dropped in via <ScreenshotSlot>,
 * which renders a labelled placeholder until a real `src` is supplied.
 */

export function BentoGrid({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 lg:grid-cols-2 lg:auto-rows-fr',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BentoCard({
  glow = false,
  className,
  children,
}: {
  glow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (glow) {
    return (
      <div
        className={cn(
          'rounded-3xl bg-fd-primary p-2 shadow-[0_0_90px_-25px_var(--color-fd-primary)]',
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-fd-border bg-fd-card/50 backdrop-blur',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * A drop-in slot for a screenshot. Pass `src` once you have the image; until
 * then it renders a dashed placeholder so the layout is visible while building.
 */
export function ScreenshotSlot({
  src,
  alt = '',
  label = 'Screenshot',
  className,
  imgClassName,
}: {
  src?: string;
  alt?: string;
  label?: string;
  className?: string;
  imgClassName?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn('h-full w-full object-cover', imgClassName)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-fd-border bg-fd-muted/40 text-fd-muted-foreground',
        className,
      )}
    >
      <span className="inline-flex items-center gap-2 text-sm font-medium">
        <ImageIcon className="size-4" />
        {label}
      </span>
    </div>
  );
}

/** A single testimonial card used inside a glow bento cell. */
export function Quote({
  children,
  name,
  role,
  avatarSrc,
}: {
  children: ReactNode;
  name: string;
  role: string;
  avatarSrc?: string;
}) {
  return (
    <figure className="flex h-full flex-col justify-between gap-6 rounded-2xl bg-[#0a0a0c] p-6 text-white">
      <blockquote className="space-y-3 text-sm leading-relaxed text-white/90">
        {children}
      </blockquote>
      <figcaption className="flex items-center gap-3">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={name}
            className="size-9 rounded-full object-cover"
          />
        ) : (
          <span className="size-9 rounded-full bg-fd-primary/40 ring-1 ring-white/10" />
        )}
        <span className="leading-tight">
          <span className="block text-sm font-semibold">{name}</span>
          <span className="block text-xs text-white/50">{role}</span>
        </span>
      </figcaption>
    </figure>
  );
}
