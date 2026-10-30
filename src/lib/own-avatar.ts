import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { avatarUrls } from "@/lib/community";

const EVENT = "capispot-avatar-changed";
const MAX_BYTES = 5 * 1024 * 1024;

/** Signed URL of the signed-in user's own avatar; refreshes when it is changed anywhere. */
export function useOwnAvatar(userId: string | undefined) {
  const [url, setUrl] = useState<string>();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((n) => n + 1);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  useEffect(() => {
    if (!userId) {
      setUrl(undefined);
      return;
    }
    let active = true;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_path")
        .eq("id", userId)
        .maybeSingle();
      const path = data?.avatar_path;
      const signed = path ? (await avatarUrls([path]))[path] : undefined;
      if (active) setUrl(signed);
    })();
    return () => {
      active = false;
    };
  }, [userId, tick]);
  return url;
}

async function currentPath(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle();
  return data?.avatar_path ?? null;
}

async function saveAvatarPath(userId: string, path: string | null) {
  const { error } = await supabase.from("profiles").upsert({ id: userId, avatar_path: path });
  if (error) throw error;
  window.dispatchEvent(new Event(EVENT));
}

export async function uploadOwnAvatar(userId: string, file: File) {
  if (!file.type.startsWith("image/") || file.size > MAX_BYTES) throw new Error("size");
  const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const previous = await currentPath(userId);
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  await saveAvatarPath(userId, path);
  if (previous) await supabase.storage.from("avatars").remove([previous]);
}

export async function removeOwnAvatar(userId: string) {
  const previous = await currentPath(userId);
  await saveAvatarPath(userId, null);
  if (previous) await supabase.storage.from("avatars").remove([previous]);
}
