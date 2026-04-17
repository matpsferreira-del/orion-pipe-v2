import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const TABLES = [
  "activities","application_history","applications","automation_triggers","chart_of_accounts",
  "commercial_strategy_groups","commercial_strategy_members","companies","contacts","cv_education",
  "cv_experiences","cv_skills","email_log","email_templates","financial_documents",
  "financial_transactions","gmail_tokens","invoices","job_contract_milestones","job_pipeline_stages",
  "job_postings","job_questions","jobs","opportunities","opportunity_attachments","party",
  "party_duplicate_suggestion","party_identity","party_merge_log","party_role","profiles",
  "questionnaire_responses","tasks","user_company_access","user_roles"
];

function toCSV(rows: any[]): string {
  if (!rows || rows.length === 0) return "";
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) if (!seen.has(k)) { seen.add(k); keys.push(k); }
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replaceAll('"', '""') + '"';
    return s;
  };
  const lines = [keys.join(",")];
  for (const r of rows) lines.push(keys.map(k => esc(r[k])).join(","));
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const url = new URL(req.url);
  const table = url.searchParams.get("table");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (table) {
    const all: any[] = [];
    let from = 0; const step = 1000;
    while (true) {
      const { data, error } = await supabase.from(table).select("*").range(from, from + step - 1);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < step) break;
      from += step;
    }
    return new Response(toCSV(all), {
      headers: { ...corsHeaders, "Content-Type": "text/csv; charset=utf-8" }
    });
  }

  return new Response(JSON.stringify({ tables: TABLES }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
