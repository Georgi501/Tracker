import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { feedbackSchema } from "./feedback";

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => feedbackSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: saved, error } = await context.supabase
      .from("feedback")
      .insert({ ...data, user_id: context.userId })
      .select("id")
      .single();
    if (error || !saved) throw new Error("Feedback could not be saved");
    return { id: saved.id };
  });
