import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { system, messages } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Convert Anthropic-style messages to OpenAI-compatible format for Lovable AI
    const openaiMessages: any[] = [];

    if (system) {
      openaiMessages.push({ role: "system", content: system });
    }

    for (const msg of messages) {
      if (typeof msg.content === "string") {
        openaiMessages.push({ role: msg.role, content: msg.content });
      } else if (Array.isArray(msg.content)) {
        // Convert content blocks
        const parts: any[] = [];
        for (const block of msg.content) {
          if (block.type === "text") {
            parts.push({ type: "text", text: block.text });
          } else if (block.type === "document" && block.source?.type === "base64") {
            // Convert document to inline_data for Gemini via OpenAI-compatible format
            parts.push({
              type: "image_url",
              image_url: {
                url: `data:${block.source.media_type};base64,${block.source.data}`,
              },
            });
          }
        }
        openaiMessages.push({ role: msg.role, content: parts });
      }
    }

    const response = await fetch("https://ai.lovable.dev/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: openaiMessages,
        max_tokens: 16000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Lovable AI error:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: { message: data?.error?.message || "AI request failed" } }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract text from OpenAI-compatible response and return in a format the frontend expects
    const text = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ content: [{ text }] }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (e) {
    console.error("extract-cv error:", e);
    return new Response(
      JSON.stringify({ error: { message: e instanceof Error ? e.message : "Erro desconhecido" } }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
