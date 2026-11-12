import { profileStatusCopy } from "@/lib/profile-status-copy";
import { ListSkeleton } from "@/components/SectionState";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { usePortfolio } from "@/lib/store";
import { CommunityUpsell } from "@/components/CommunityGate";
import {
  avatarUrls,
  cc,
  levelLabel,
  PROFILE_COLS,
  SHARE_LEVELS,
  type MemberProfile,
} from "@/lib/community";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { title: "My profile — Capispot" },
      { name: "description", content: "Your photo, bio and sharing settings." },
      { property: "og:title", content: "My profile — Capispot" },
      { property: "og:description", content: "Your investor profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

const input =
  "mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function ProfilePage() {
  const p = usePortfolio();
  const c = cc(p.lang);
  const [f, setF] = useState<MemberProfile | null>(null);
  const [url, setUrl] = useState<string>();
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const status = profileStatusCopy[p.lang];
  useEffect(
    () => () => {
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    },
    [url],
  );
  useEffect(() => {
    if (!p.user || !p.isPro) {
      setF(null);
      return;
    }
    let active = true;
    setF(null);
    setUrl(undefined);
    setLoadError(false);
    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLS)
        .eq("id", p.user!.id)
        .maybeSingle();
      if (error) throw error;
      const prof = (data ?? {
        id: p.user!.id,
        display_name: "",
        bio: "",
        investing_style: "",
        avatar_path: null,
        is_public: false,
        share_portfolio: false,
        share_level: "weights",
      }) as MemberProfile;
      const avatar = prof.avatar_path
        ? (await avatarUrls([prof.avatar_path]))[prof.avatar_path]
        : undefined;
      if (active) {
        setF(prof);
        setUrl(avatar);
      }
    })().catch((error: unknown) => {
      console.error("Unable to load community profile", error);
      if (active) setLoadError(true);
    });
    return () => {
      active = false;
    };
  }, [p.user, p.isPro, reloadKey]);
  if (!p.user)
    return (
      <Card className="mx-auto max-w-lg text-center">
        <h1 className="font-display mb-4 text-2xl font-bold">{c.profile}</h1>
        <p className="mb-4">{c.signIn}</p>
        <Link
          to="/auth"
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          {p.t("signIn")}
        </Link>
      </Card>
    );
  if (!p.isPro) return <CommunityUpsell lang={p.lang} />;
  if (loadError)
    return (
      <div role="alert">
        <Card className="mx-auto max-w-xl text-center">
          <p className="text-sm text-muted-foreground">{c.loadError}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {c.retry}
          </button>
        </Card>
      </div>
    );
  if (!f)
    return (
      <div className="mx-auto max-w-xl">
        <ListSkeleton label={c.loading} />
      </div>
    );

  const upload = async (file: File) => {
    if (uploading || saving) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast.error(status.imageLimit);
      return;
    }
    setUploading(true);
    try {
      const path = `${p.user!.id}/avatar-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      setF({ ...f, avatar_path: path });
      setUrl(URL.createObjectURL(file));
    } catch {
      toast.error(status.uploadError);
    } finally {
      setUploading(false);
    }
  };
  const save = async () => {
    if (saving || uploading) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: f.id,
        display_name: f.display_name?.trim().slice(0, 60) || null,
        bio: f.bio.slice(0, 500),
        investing_style: f.investing_style.slice(0, 80),
        avatar_path: f.avatar_path,
        is_public: f.is_public,
        share_portfolio: f.is_public && f.share_portfolio,
        share_level: f.share_level,
      });
      if (error) throw error;
      toast.success(c.saved);
    } catch {
      toast.error(status.saveError);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="font-display text-2xl font-bold">{c.profile}</h1>
      <Card className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar url={url} name={f.display_name || p.user.email} size={84} />
          <label className="press flex cursor-pointer items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold focus-within:ring-2 focus-within:ring-primary">
            <Camera size={16} />
            {uploading ? status.uploading : c.photo}
            <input
              type="file"
              disabled={uploading || saving}
              accept="image/*"
              aria-label={c.photo}
              className="sr-only"
              onChange={(e) => {
                const x = e.target.files?.[0];
                if (x) void upload(x);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <label className="block text-sm">
          {c.name}
          <input
            className={input}
            maxLength={60}
            value={f.display_name ?? ""}
            onChange={(e) => setF({ ...f, display_name: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          {c.style}
          <input
            className={input}
            maxLength={80}
            placeholder={c.stylePh}
            value={f.investing_style}
            onChange={(e) => setF({ ...f, investing_style: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          {c.bio}
          <textarea
            className={`${input} min-h-24`}
            maxLength={500}
            value={f.bio}
            onChange={(e) => setF({ ...f, bio: e.target.value })}
          />
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={f.is_public}
            onChange={(e) => setF({ ...f, is_public: e.target.checked })}
          />
          {c.public}
        </label>
        <label className={`flex items-start gap-3 text-sm ${f.is_public ? "" : "opacity-50"}`}>
          <input
            type="checkbox"
            className="mt-1"
            disabled={!f.is_public}
            checked={f.is_public && f.share_portfolio}
            onChange={(e) => setF({ ...f, share_portfolio: e.target.checked })}
          />
          {c.share}
        </label>
        {f.is_public && f.share_portfolio && (
          <fieldset className="space-y-2 rounded-2xl border border-border p-3 text-sm">
            <legend className="px-1 font-semibold">{c.shareLevel}</legend>
            {SHARE_LEVELS.map((lv) => (
              <label key={lv} className="flex items-start gap-3">
                <input
                  type="radio"
                  name="share-level"
                  className="mt-1"
                  checked={f.share_level === lv}
                  onChange={() => setF({ ...f, share_level: lv })}
                />
                {levelLabel(c, lv)}
              </label>
            ))}
            <p className="text-xs text-muted-foreground">{c.lvHint}</p>
          </fieldset>
        )}
        <button
          onClick={() => void save()}
          disabled={saving || uploading}
          aria-busy={saving}
          className="press w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {saving ? status.saving : c.save}
        </button>
      </Card>
    </div>
  );
}
