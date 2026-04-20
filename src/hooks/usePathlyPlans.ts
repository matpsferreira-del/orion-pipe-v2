import { useQuery } from "@tanstack/react-query";
import { callPathly } from "@/lib/pathlyBridge";

export interface PathlyPlan {
  id: string;
  mentee_name?: string | null;
  mentee_email?: string | null;
  status?: string | null;
  started_at?: string | null;
  ends_at?: string | null;
  plan_type?: string | null;
}

export interface PathlyContribution {
  id: string;
  mentee_id: string;
  mentee_name?: string | null;
  type?: string | null;
  content?: string | null;
  created_at?: string | null;
}

export function usePathlyActivePlans() {
  return useQuery({
    queryKey: ["pathly", "active-plans"],
    queryFn: () => callPathly<PathlyPlan[]>("list_active_plans"),
    staleTime: 60_000,
  });
}

export function usePathlyMenteeContributions() {
  return useQuery({
    queryKey: ["pathly", "mentee-contributions"],
    queryFn: () => callPathly<PathlyContribution[]>("list_mentee_contributions"),
    staleTime: 60_000,
  });
}
