import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Site Orion (portal) – publishable anon key
    const portalUrl = "https://eeazdhbvizaqwsdebgjg.supabase.co";
    const portalKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlYXpkaGJ2aXphcXdzZGViZ2pnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjAwNDQsImV4cCI6MjA4NzA5NjA0NH0.3CuZYhcgnF_q58XaZUtJec_1s3ZvvrNdpUOFkuHXmv8";
    const portal = createClient(portalUrl, portalKey);

    // CRM (this project) – service role for writes
    const crmUrl = Deno.env.get("SUPABASE_URL")!;
    const crmKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const crm = createClient(crmUrl, crmKey);

    // 1. Get all applications from portal with parsed CV
    const { data: apps, error: appErr } = await portal
      .from("applications")
      .select("id, email, full_name, parsed_summary, total_exp_years, cv_parse_status")
      .eq("cv_parse_status", "done");

    if (appErr) throw new Error(`Error fetching applications: ${appErr.message}`);
    if (!apps || apps.length === 0) {
      return new Response(
        JSON.stringify({ message: "No applications with parsed CVs found", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let synced = 0;
    const errors: string[] = [];

    for (const app of apps) {
      try {
        if (!app.email) continue;
        const emailLower = app.email.toLowerCase().trim();

        // Find matching party in CRM
        const { data: party } = await crm
          .from("party")
          .select("id")
          .or(`email_norm.eq.${emailLower},email_raw.ilike.${emailLower}`)
          .maybeSingle();

        if (!party?.id) continue;
        const partyId = party.id;

        // Update party metadata
        await crm.from("party").update({
          parsed_summary: app.parsed_summary || null,
          total_exp_years: app.total_exp_years || null,
          cv_parse_status: "done",
          cv_parsed_at: new Date().toISOString(),
        }).eq("id", partyId);

        // Fetch CV data from portal (source_table = 'applications')
        const [expRes, skillRes, eduRes] = await Promise.all([
          portal.from("cv_experiences").select("*").eq("source_id", app.id).eq("source_table", "applications"),
          portal.from("cv_skills").select("*").eq("source_id", app.id).eq("source_table", "applications"),
          portal.from("cv_education").select("*").eq("source_id", app.id).eq("source_table", "applications"),
        ]);

        // Clear existing CV data in CRM for this party
        await Promise.all([
          crm.from("cv_experiences").delete().eq("party_id", partyId),
          crm.from("cv_skills").delete().eq("party_id", partyId),
          crm.from("cv_education").delete().eq("party_id", partyId),
        ]);

        // Insert experiences
        if (expRes.data && expRes.data.length > 0) {
          await crm.from("cv_experiences").insert(
            expRes.data.map((e: any) => ({
              party_id: partyId,
              company: e.company,
              role: e.role,
              start_date: e.start_date,
              end_date: e.end_date,
              is_current: e.is_current || false,
              description: e.description,
            }))
          );
        }

        // Insert skills
        if (skillRes.data && skillRes.data.length > 0) {
          await crm.from("cv_skills").insert(
            skillRes.data.map((s: any) => ({
              party_id: partyId,
              skill: s.skill,
              level: s.level,
              category: s.category,
            }))
          );
        }

        // Insert education
        if (eduRes.data && eduRes.data.length > 0) {
          await crm.from("cv_education").insert(
            eduRes.data.map((ed: any) => ({
              party_id: partyId,
              institution: ed.institution,
              degree: ed.degree,
              field_of_study: ed.field_of_study,
              start_date: ed.start_date,
              end_date: ed.end_date,
            }))
          );
        }

        synced++;
      } catch (err) {
        errors.push(`${app.email}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Backfill complete`,
        total_applications: apps.length,
        synced,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Backfill error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
