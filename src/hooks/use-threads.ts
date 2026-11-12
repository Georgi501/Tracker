import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
export function useThreads(enabled: boolean) {
  return useQuery({
    queryKey: ["ai-threads"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_threads")
        .select("id,title,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
