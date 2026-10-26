import { z } from "zod";

export const feedbackSchema = z.object({
  category: z.enum(["idea", "bug", "other"]),
  message: z.string().trim().min(10).max(2000),
});
