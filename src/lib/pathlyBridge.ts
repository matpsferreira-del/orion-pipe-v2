import { supabase } from "@/integrations/supabase/client";

export type PathlyAction =
  | "activate_plan"
  | "upsert_company"
  | "upsert_contact"
  | "list_mentee_contributions"
  | "list_active_plans";

export interface PathlyResponse<T = unknown> {
  ok: boolean;
  data: T;
}

/**
 * Chama a edge function pathly-proxy, que repassa a chamada para a bridge
 * do Pathly autenticando com o ORION_BRIDGE_SECRET.
 */
export async function callPathly<T = unknown>(
  action: PathlyAction,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<PathlyResponse<T>>(
    "pathly-proxy",
    {
      body: { action, payload },
    },
  );

  if (error) throw error;
  if (!data?.ok) throw new Error("Pathly bridge call failed");
  return data.data;
}
