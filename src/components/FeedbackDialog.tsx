import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePortfolio } from "@/lib/store";
import { feedbackCopy } from "@/lib/feedback-i18n";
import { feedbackSchema } from "@/lib/feedback";
import { submitFeedback } from "@/lib/feedback.functions";

export function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = usePortfolio();
  const c = feedbackCopy[p.lang];
  const send = useServerFn(submitFeedback);
  const [category, setCategory] = useState("idea");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const close = () => {
    if (busy) return;
    setSaved(false);
    setError("");
    onClose();
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !p.user) return;
    const result = feedbackSchema.safeParse({ category, message });
    if (!result.success) {
      setError(c.invalid);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await send({ data: result.data });
      setSaved(true);
      setMessage("");
    } catch {
      setError(c.error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle>{c.title}</DialogTitle>
          <DialogDescription>{c.description}</DialogDescription>
        </DialogHeader>
        {!p.user ? (
          <Button asChild className="h-auto min-h-11 whitespace-normal">
            <Link to="/auth" onClick={close}>
              {c.signIn}
            </Link>
          </Button>
        ) : saved ? (
          <div className="space-y-5 py-3">
            <p role="status" className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="shrink-0 text-success" />
              {c.success}
            </p>
            <Button onClick={close} className="w-full">
              {c.done}
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="feedback-category">{c.category}</Label>
              <Select value={category} onValueChange={setCategory} disabled={busy}>
                <SelectTrigger id="feedback-category" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["idea", "bug", "other"] as const).map((key) => (
                    <SelectItem key={key} value={key}>
                      {c[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-message">{c.message}</Label>
              <Textarea
                id="feedback-message"
                placeholder={c.placeholder}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setError("");
                }}
                minLength={10}
                maxLength={2000}
                required
                disabled={busy}
                aria-invalid={!!error}
                aria-describedby={error ? "feedback-error" : undefined}
                className="min-h-36 resize-y"
              />
              <p className="text-right text-xs text-muted-foreground">{message.length} / 2000</p>
            </div>
            {error && (
              <p id="feedback-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy} className="min-h-11 w-full">
              {busy ? <Loader2 className="animate-spin" /> : <Send />}
              {busy ? c.sending : c.send}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
