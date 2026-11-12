import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { RATING_INFO } from "@/data/catalog";
import type { AgeRating, Profile } from "@/types";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="Lanterna">
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden>
        <defs>
          <linearGradient id="beam" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#F0A83A" />
            <stop offset="1" stopColor="#F0A83A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M9 12 L31 3 L31 29 L9 20 Z" fill="url(#beam)" opacity=".55" />
        <rect x="1" y="9" width="10" height="14" rx="3" fill="#F3EFE6" />
        <circle cx="9" cy="16" r="2.6" fill="#F0A83A" />
      </svg>
      <span className="font-display text-[26px] font-extrabold leading-none tracking-tight text-paper">lanterna</span>
    </span>
  );
}

export function RatingBadge({ rating, size = "sm" }: { rating: AgeRating; size?: "sm" | "md" }) {
  const info = RATING_INFO[rating];
  return (
    <span
      title={`Classificação indicativa: ${info.label}`}
      className={`inline-grid place-items-center rounded-[5px] font-extrabold text-white ring-1 ring-white/20 ${size === "md" ? "h-7 min-w-7 px-1 text-sm" : "h-5 min-w-5 px-0.5 text-[11px]"}`}
      style={{ background: info.color }}
    >
      {rating}
    </span>
  );
}

export function Score({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-bold text-lamp ${className}`} title={`Nota ${value.toFixed(1)} de 10`}>
      <Star size={13} className="fill-lamp" aria-hidden />
      {value.toFixed(1)}
    </span>
  );
}

export function Avatar({ profile, size = 36, className = "" }: { profile: Pick<Profile, "name" | "color" | "avatar" | "kids">; size?: number; className?: string }) {
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-lg font-display font-extrabold text-ink ${className}`}
      style={{ width: size, height: size, background: profile.color, fontSize: size * 0.5 }}
      aria-hidden
    >
      {profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : profile.name.slice(0, 1).toUpperCase()}
      {profile.kids && (
        <span className="absolute bottom-0 inset-x-0 bg-ink/70 text-center font-sans text-[9px] font-bold uppercase tracking-wide text-paper" style={{ fontSize: Math.max(8, size * 0.16) }}>
          infantil
        </span>
      )}
    </span>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="page-x mb-3 flex items-end justify-between gap-4">
      <h2 className="font-display text-[26px] font-bold leading-none tracking-tight text-paper sm:text-[30px]">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <header className="page-x pb-6 pt-24 sm:pt-28">
      <h1 className="display text-5xl text-paper sm:text-6xl">{title}</h1>
      {description && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-mute">{description}</p>}
      {children}
    </header>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-line bg-surface text-lamp">{icon}</div>
      <h2 className="text-xl font-bold text-paper">{title}</h2>
      <p className="mt-2 text-[15px] leading-relaxed text-mute">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PosterSkeleton() {
  return <div className="skeleton aspect-[2/3] w-full rounded-xl" />;
}

export function RowSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div className="mb-10" aria-hidden>
      <div className="page-x mb-3"><div className="skeleton h-7 w-56 rounded-md" /></div>
      <div className="page-x flex gap-3 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="w-[38vw] shrink-0 sm:w-[24vw] md:w-[18vw] lg:w-[14.5vw] xl:w-[12.4vw]"><PosterSkeleton /></div>
        ))}
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="page-x grid grid-cols-2 gap-3 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" aria-hidden>
      {Array.from({ length: count }).map((_, i) => <PosterSkeleton key={i} />)}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative h-[78vh] min-h-[520px] w-full" aria-hidden>
      <div className="skeleton absolute inset-0" />
      <div className="page-x absolute bottom-20 w-full max-w-2xl space-y-4">
        <div className="skeleton h-16 w-3/4 rounded-lg" />
        <div className="skeleton h-4 w-1/2 rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="flex gap-3"><div className="skeleton h-12 w-40 rounded-lg" /><div className="skeleton h-12 w-40 rounded-lg" /></div>
      </div>
    </div>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <span className="inline-block animate-spin rounded-full border-2 border-current border-r-transparent" style={{ width: size, height: size }} aria-hidden />;
}

export function Divider() {
  return <span aria-hidden className="h-1 w-1 rounded-full bg-mute/60" />;
}
