import { initials } from "@/lib/community";

export function Avatar({ url, name, size = 44 }: { url?: string | undefined; name?: string | null | undefined; size?: number }) {
  return url
    ? <img src={url} alt={name ?? ""} width={size} height={size} className="shrink-0 rounded-full object-cover ring-2 ring-primary/40" style={{ width: size, height: size }} />
    : <span className="bg-brand-gradient flex shrink-0 items-center justify-center rounded-full font-display font-bold text-primary-foreground" style={{ width: size, height: size, fontSize: size / 2.6 }}>{initials(name)}</span>;
}
