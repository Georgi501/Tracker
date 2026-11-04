import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Ban, Flag, MessageCircle, Pencil, Send, Trash2, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { CommunityUpsell } from "@/components/CommunityGate";
import { PortfolioSnapshot, type SnapshotRow } from "@/components/PortfolioSnapshot";
import { usePortfolio } from "@/lib/store";
import { wallCopy, type WallCopy } from "@/lib/wall-i18n";
import {
  avatarUrls,
  cc,
  levelLabel,
  PROFILE_COLS,
  SHARE_LEVELS,
  type MemberProfile,
  type ShareLevel,
} from "@/lib/community";

export const Route = createFileRoute("/wall")({
  head: () => ({
    meta: [
      { title: "Community wall — Capispot" },
      {
        name: "description",
        content:
          "Community wall for Capispot Pro members: share wins, losses and questions with other investors and learn from their experience.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Wall,
});

// Wall tables are not in the generated types yet, so the client is used untyped here.
const db = supabase as unknown as SupabaseClient;

type Mood = "brag" | "vent" | "question" | "chat";
const MOODS: Mood[] = ["brag", "vent", "question", "chat"];
const MOOD_EMOJI: Record<Mood, string> = { brag: "📈", vent: "📉", question: "❓", chat: "💬" };
const REACTIONS = [
  "🚀",
  "👏",
  "🔥",
  "💪",
  "🤝",
  "😢",
  "👍",
  "❤️",
  "😂",
  "😮",
  "🤔",
  "💎",
  "🐂",
  "🐻",
  "🎉",
  "🙏",
] as const;

interface Post {
  id: string;
  user_id: string;
  body: string;
  mood: Mood;
  share_level: ShareLevel | null;
  snapshot: SnapshotRow[] | null;
  tags: string[];
  edited_at: string | null;
  is_team: boolean;
  created_at: string;
}
interface Reaction {
  post_id: string;
  user_id: string;
  emoji: string;
}
interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

function ago(iso: string, lang: string) {
  const s = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const abs = Math.abs(s);
  if (abs < 60) return rtf.format(Math.round(s / 60) || 0, "minute");
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  return new Date(iso).toLocaleDateString(lang);
}

function Wall() {
  const p = usePortfolio();
  const c = cc(p.lang);
  const w = wallCopy[p.lang];
  const me = p.user?.id;
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [authors, setAuthors] = useState<Record<string, MemberProfile>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [follows, setFollows] = useState<Set<string>>(new Set());
  const [blocked, setBlocked] = useState<string[]>([]);
  const [followingOnly, setFollowingOnly] = useState(false);
  const [moodFilter, setMoodFilter] = useState<Mood | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const shownPosts = useMemo(
    () =>
      (posts ?? []).filter(
        (x) =>
          (moodFilter === "all" || x.mood === moodFilter) &&
          (!followingOnly || follows.has(x.user_id)) &&
          (!tagFilter || x.tags.includes(tagFilter)),
      ),
    [posts, moodFilter, tagFilter, followingOnly, follows],
  );
  const load = useCallback(async () => {
    if (!me) return;
    setError(false);
    try {
      const { data, error: e } = await db
        .from("wall_posts")
        .select(
          "id, user_id, body, mood, share_level, snapshot, tags, edited_at, is_team, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (e) throw e;
      const [fl, bl] = await Promise.all([
        db.from("wall_follows").select("followee_id").eq("follower_id", me),
        db.from("wall_blocks").select("blocked_id").eq("blocker_id", me),
      ]);
      setFollows(new Set(((fl.data ?? []) as { followee_id: string }[]).map((x) => x.followee_id)));
      const blockedIds = ((bl.data ?? []) as { blocked_id: string }[]).map((x) => x.blocked_id);
      setBlocked(blockedIds);
      const rows = (data ?? []) as Post[];
      const ids = rows.map((r) => r.id);
      const people = [...new Set([...rows.map((r) => r.user_id), me, ...blockedIds])];
      const [rx, cm, pr] = await Promise.all([
        ids.length
          ? db.from("wall_reactions").select("post_id, user_id, emoji").in("post_id", ids)
          : { data: [] },
        ids.length
          ? db
              .from("wall_comments")
              .select("id, post_id, user_id, body, created_at")
              .in("post_id", ids)
              .order("created_at")
              .limit(500)
          : { data: [] },
        supabase.from("profiles").select(PROFILE_COLS).in("id", people),
      ]);
      const comms = (cm.data ?? []) as Comment[];
      const commenters = comms.map((x) => x.user_id).filter((x) => !people.includes(x));
      const extra = commenters.length
        ? await supabase
            .from("profiles")
            .select(PROFILE_COLS)
            .in("id", [...new Set(commenters)])
        : { data: [] };
      const profiles = [
        ...((pr.data ?? []) as MemberProfile[]),
        ...((extra.data ?? []) as MemberProfile[]),
      ];
      setAuthors(Object.fromEntries(profiles.map((x) => [x.id, x])));
      setIsPublic(profiles.find((x) => x.id === me)?.is_public ?? false);
      setUrls(await avatarUrls(profiles.map((x) => x.avatar_path)));
      setReactions((rx.data ?? []) as Reaction[]);
      setComments(comms);
      setPosts(rows);
    } catch (err) {
      console.error("Unable to load wall", err);
      setError(true);
    }
  }, [me]);

  useEffect(() => {
    if (p.user && p.isPro) void load();
  }, [p.user, p.isPro, load]);

  if (!p.user)
    return (
      <Card className="mx-auto max-w-lg text-center">
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

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link to="/community" className="text-sm text-muted-foreground">
          ← {w.back}
        </Link>
        <h1 className="font-display mt-1 text-2xl font-bold">{w.title}</h1>
        <p className="text-sm text-muted-foreground">{w.sub}</p>
      </div>
      <Composer w={w} c={c} canPost={isPublic} onPosted={() => void load()} />
      {posts && posts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={w.all}>
          {(["all", ...MOODS] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={moodFilter === m}
              onClick={() => setMoodFilter(m)}
              className={`press rounded-full px-3 py-1.5 text-xs font-semibold ${
                moodFilter === m ? "bg-primary text-primary-foreground" : "bg-secondary"
              }`}
            >
              {m === "all" ? w.all : `${MOOD_EMOJI[m]} ${w.moods[m]}`}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={followingOnly}
            onClick={() => setFollowingOnly((v) => !v)}
            className={`press rounded-full px-3 py-1.5 text-xs font-semibold ${
              followingOnly ? "bg-primary text-primary-foreground" : "bg-secondary"
            }`}
          >
            ★ {w.followingOnly}
          </button>
          {tagFilter && (
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className="press rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
            >
              #{tagFilter} ✕ <span className="sr-only">{w.clearTag}</span>
            </button>
          )}
        </div>
      )}
      {blocked.length > 0 && (
        <details className="rounded-2xl border border-border bg-card p-3 text-sm">
          <summary className="cursor-pointer font-semibold">
            {w.blockedTitle} ({blocked.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {blocked.map((id) => (
              <li key={id} className="flex items-center justify-between gap-2">
                <span className="truncate">{authors[id]?.display_name || w.unknown}</span>
                <button
                  type="button"
                  onClick={async () => {
                    const { error: e } = await db
                      .from("wall_blocks")
                      .delete()
                      .match({ blocker_id: me, blocked_id: id });
                    if (e) toast.error(e.message);
                    else void load();
                  }}
                  className="press rounded-full bg-secondary px-3 py-1 text-xs font-semibold"
                >
                  {w.unblock}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {error ? (
        <div role="alert">
          <Card className="text-center">
            <p className="text-sm text-muted-foreground">{c.loadError}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              {c.retry}
            </button>
          </Card>
        </div>
      ) : posts === null ? (
        <div role="status" className="h-40 animate-pulse rounded-3xl">
          <span className="sr-only">{c.loading}</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="space-y-4">
          <Card className="text-center text-sm text-muted-foreground">{w.empty}</Card>
          <Card className="space-y-2 border-dashed opacity-80">
            <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
              {w.example}
            </span>
            <p className="text-sm">{w.exampleBody}</p>
          </Card>
        </div>
      ) : shownPosts.length === 0 ? (
        <Card className="text-center text-sm text-muted-foreground">{w.noMatch}</Card>
      ) : (
        <div className="space-y-4">
          {shownPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              me={me!}
              w={w}
              c={c}
              lang={p.lang}
              canComment={isPublic}
              authors={authors}
              urls={urls}
              reactions={reactions.filter((r) => r.post_id === post.id)}
              comments={comments.filter((x) => x.post_id === post.id)}
              setReactions={setReactions}
              setComments={setComments}
              setPosts={setPosts}
              following={follows.has(post.user_id)}
              setFollows={setFollows}
              onBlocked={() => void load()}
              onTag={setTagFilter}
              reload={() => void load()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function parseTags(raw: string) {
  return [
    ...new Set(
      raw
        .split(/[\s,]+/)
        .map((x) => x.replace(/^#+/, "").toLowerCase())
        .filter((x) => /^[\p{L}\p{N}_]{2,24}$/u.test(x)),
    ),
  ].slice(0, 5);
}

type Copy = WallCopy;

function Composer({
  w,
  c,
  canPost,
  onPosted,
}: {
  w: Copy;
  c: ReturnType<typeof cc>;
  canPost: boolean;
  onPosted: () => void;
}) {
  const [body, setBody] = useState("");
  const [mood, setMood] = useState<Mood>("chat");
  const [level, setLevel] = useState<ShareLevel | "">("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!body.trim() || busy) return;
    setBusy(true);
    const { error } = await db.rpc("create_wall_post", {
      _body: body.trim(),
      _mood: mood,
      _level: level || null,
      _tags: parseTags(tags),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    setTags("");
    setLevel("");
    onPosted();
  };
  return (
    <Card className="space-y-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        placeholder={w.placeholder}
        aria-label={w.placeholder}
        className="chat-input min-h-24 w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Mood">
        {MOODS.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mood === m}
            onClick={() => setMood(m)}
            className={`press rounded-full px-3 py-1.5 text-xs font-semibold ${
              mood === m ? "bg-primary text-primary-foreground" : "bg-secondary"
            }`}
          >
            {MOOD_EMOJI[m]} {w.moods[m]}
          </button>
        ))}
      </div>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        maxLength={80}
        placeholder={w.tagsPh}
        aria-label={w.tagsPh}
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <label className="block text-xs text-muted-foreground">
        {w.attach}
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value as ShareLevel | "")}
          className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="">{w.attachNone}</option>
          {SHARE_LEVELS.map((lv) => (
            <option key={lv} value={lv}>
              {levelLabel(c, lv)}
            </option>
          ))}
        </select>
      </label>
      {level && <p className="text-xs text-muted-foreground">{w.privacy}</p>}
      {!canPost && <p className="text-xs text-amber-500">{w.needPublic}</p>}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground tabular-nums">{body.length}/1000</span>
        <button
          type="button"
          disabled={!body.trim() || busy || !canPost}
          onClick={() => void submit()}
          className="press flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Send size={15} />
          {w.post}
        </button>
      </div>
    </Card>
  );
}

function PostCard({
  post,
  me,
  w,
  c,
  lang,
  canComment,
  authors,
  urls,
  reactions,
  comments,
  setReactions,
  setComments,
  setPosts,
  following,
  setFollows,
  onBlocked,
  onTag,
}: {
  post: Post;
  me: string;
  w: Copy;
  c: ReturnType<typeof cc>;
  lang: string;
  canComment: boolean;
  authors: Record<string, MemberProfile>;
  urls: Record<string, string>;
  reactions: Reaction[];
  comments: Comment[];
  setReactions: Dispatch<SetStateAction<Reaction[]>>;
  setComments: Dispatch<SetStateAction<Comment[]>>;
  setPosts: Dispatch<SetStateAction<Post[] | null>>;
  following: boolean;
  setFollows: Dispatch<SetStateAction<Set<string>>>;
  onBlocked: () => void;
  onTag: (tag: string) => void;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const author = authors[post.user_id];
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reactions) m.set(r.emoji, (m.get(r.emoji) ?? 0) + 1);
    return m;
  }, [reactions]);
  const mine = new Set(reactions.filter((r) => r.user_id === me).map((r) => r.emoji));
  const name = (id: string) => authors[id]?.display_name || w.unknown;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const [draftTags, setDraftTags] = useState(post.tags.join(" "));
  const canEdit = post.user_id === me && Date.now() - new Date(post.created_at).getTime() < 600_000;

  // Optimistic: the UI updates first and is rolled back if the database rejects the change.
  const toggle = async (emoji: string) => {
    const had = mine.has(emoji);
    const row: Reaction = { post_id: post.id, user_id: me, emoji };
    const same = (r: Reaction) => r.post_id === post.id && r.user_id === me && r.emoji === emoji;
    setReactions((all) => (had ? all.filter((r) => !same(r)) : [...all, row]));
    const { error } = had
      ? await db.from("wall_reactions").delete().match(row)
      : await db.from("wall_reactions").insert(row);
    if (error) {
      setReactions((all) => (had ? [...all, row] : all.filter((r) => !same(r))));
      toast.error(error.message);
    }
  };
  const addComment = async () => {
    if (!text.trim()) return;
    const { data, error } = await db
      .from("wall_comments")
      .insert({ post_id: post.id, user_id: me, body: text.trim() })
      .select("id, post_id, user_id, body, created_at")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    setComments((all) => [...all, data as Comment]);
  };
  const remove = async (table: "wall_posts" | "wall_comments", id: string) => {
    const { error } = await db.from(table).delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (table === "wall_posts") setPosts((all) => (all ?? []).filter((x) => x.id !== id));
    else setComments((all) => all.filter((x) => x.id !== id));
  };
  const saveEdit = async () => {
    if (!draft.trim()) return;
    const tags = parseTags(draftTags);
    const { error } = await db.rpc("edit_wall_post", {
      _id: post.id,
      _body: draft.trim(),
      _tags: tags,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditing(false);
    setPosts((all) =>
      (all ?? []).map((x) =>
        x.id === post.id
          ? { ...x, body: draft.trim(), tags, edited_at: new Date().toISOString() }
          : x,
      ),
    );
  };
  const toggleFollow = async () => {
    const key = { follower_id: me, followee_id: post.user_id };
    setFollows((s) => {
      const n = new Set(s);
      if (following) n.delete(post.user_id);
      else n.add(post.user_id);
      return n;
    });
    const { error } = following
      ? await db.from("wall_follows").delete().match(key)
      : await db.from("wall_follows").insert(key);
    if (error) {
      toast.error(error.message);
      setFollows((s) => {
        const n = new Set(s);
        if (following) n.add(post.user_id);
        else n.delete(post.user_id);
        return n;
      });
    }
  };
  const blockAuthor = async () => {
    if (!window.confirm(w.blockConfirm)) return;
    const { error } = await db
      .from("wall_blocks")
      .insert({ blocker_id: me, blocked_id: post.user_id });
    if (error) toast.error(error.message);
    else {
      toast.success(w.blockedDone);
      onBlocked();
    }
  };
  const report = async () => {
    const { error } = await db.from("wall_reports").insert({ post_id: post.id, reporter_id: me });
    if (error && error.code !== "23505") toast.error(error.message);
    else toast.success(w.reported);
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar
          url={author?.avatar_path ? urls[author.avatar_path] : undefined}
          name={author?.display_name}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {author ? (
              <Link
                to="/community/$userId"
                params={{ userId: author.id }}
                className="truncate font-semibold hover:underline"
              >
                {name(post.user_id)}
              </Link>
            ) : (
              <p className="font-semibold">{w.unknown}</p>
            )}
            {post.is_team && (
              <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {w.team}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {MOOD_EMOJI[post.mood]} {w.moods[post.mood]} · {ago(post.created_at, lang)}
            {post.edited_at && ` · ${w.edited}`}
          </p>
        </div>
        {canEdit && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={w.edit}
            title={w.edit}
            className="press rounded-full p-2 text-muted-foreground hover:text-foreground"
          >
            <Pencil size={16} />
          </button>
        )}
        {post.user_id === me ? (
          <button
            type="button"
            onClick={() => void remove("wall_posts", post.id)}
            aria-label={w.del}
            title={w.del}
            className="press rounded-full p-2 text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={16} />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void toggleFollow()}
              aria-pressed={following}
              aria-label={following ? w.unfollow : w.follow}
              title={following ? w.unfollow : w.follow}
              className={`press rounded-full p-2 ${following ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {following ? <UserCheck size={16} /> : <UserPlus size={16} />}
            </button>
            <button
              type="button"
              onClick={() => void blockAuthor()}
              aria-label={w.block}
              title={w.block}
              className="press rounded-full p-2 text-muted-foreground hover:text-destructive"
            >
              <Ban size={16} />
            </button>
            <button
              type="button"
              onClick={() => void report()}
              aria-label={w.report}
              title={w.report}
              className="press rounded-full p-2 text-muted-foreground hover:text-foreground"
            >
              <Flag size={16} />
            </button>
          </>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
            aria-label={w.edit}
            className="chat-input min-h-24 w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={draftTags}
            onChange={(e) => setDraftTags(e.target.value)}
            maxLength={80}
            placeholder={w.tagsPh}
            aria-label={w.tagsPh}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="press rounded-full bg-secondary px-4 py-1.5 text-xs font-semibold"
            >
              {w.cancel}
            </button>
            <button
              type="button"
              disabled={!draft.trim()}
              onClick={() => void saveEdit()}
              className="press rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {w.save}
            </button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm">{post.body}</p>
      )}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTag(tag)}
              className="press rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
      {post.snapshot && post.share_level && (
        <details className="rounded-2xl border border-border bg-background/50 p-3" open>
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
            {w.snapshotNote} · {levelLabel(c, post.share_level)}
          </summary>
          <div className="mt-3">
            <PortfolioSnapshot rows={post.snapshot} lang={lang} />
          </div>
        </details>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {REACTIONS.map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={mine.has(e)}
            onClick={() => void toggle(e)}
            className={`press rounded-full border px-2.5 py-1 text-sm ${
              mine.has(e) ? "border-primary bg-primary/10" : "border-border"
            }`}
          >
            {e}
            {counts.get(e) ? (
              <span className="ml-1 text-xs tabular-nums">{counts.get(e)}</span>
            ) : null}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="press ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted-foreground"
        >
          <MessageCircle size={14} />
          {comments.length}
        </button>
      </div>
      {open && (
        <div className="space-y-2 border-t border-border pt-3">
          {comments.map((cm) => (
            <div key={cm.id} className="flex items-start gap-2 text-sm">
              <div className="min-w-0 flex-1 rounded-2xl bg-secondary px-3 py-2">
                <b className="text-xs">{name(cm.user_id)}</b>{" "}
                <span className="text-xs text-muted-foreground">{ago(cm.created_at, lang)}</span>
                <p className="whitespace-pre-wrap break-words">{cm.body}</p>
              </div>
              {(cm.user_id === me || post.user_id === me) && (
                <button
                  type="button"
                  onClick={() => void remove("wall_comments", cm.id)}
                  aria-label={w.del}
                  className="press rounded-full p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {canComment ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void addComment();
              }}
            >
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={500}
                placeholder={w.commentPh}
                aria-label={w.commentPh}
                className="min-w-0 flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="submit"
                disabled={!text.trim()}
                aria-label={c.send}
                className="press rounded-full bg-primary px-4 text-primary-foreground disabled:opacity-50"
              >
                <Send size={15} />
              </button>
            </form>
          ) : (
            <p className="text-xs text-amber-500">{w.needPublic}</p>
          )}
        </div>
      )}
    </Card>
  );
}
