import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AiTipInput {
  topCategory: string | null;
  topShare: number;
  totalMonth: number;
  prevMonthTotal: number;
  predictedMonthEnd: number;
  budget: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const input: AiTipInput = await req.json();

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ tip: null, error: "missing-key" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sys =
      "You are a concise personal finance coach for an Indian user. Respond with exactly one short, actionable tip under 22 words. No preface, no emojis, no markdown.";

    const ctx = `Top category: ${input.topCategory ?? "n/a"} (${Math.round(
      input.topShare * 100
    )}% of month). This month so far: ₹${Math.round(
      input.totalMonth
    )}. Last month: ₹${Math.round(
      input.prevMonthTotal
    )}. Predicted end-of-month: ₹${Math.round(
      input.predictedMonthEnd
    )}. Monthly budget: ₹${Math.round(input.budget)}.`;

    const resp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: ctx },
          ],
        }),
      }
    );

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ tip: null, error: "rate-limit" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ tip: null, error: "credits" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ tip: null, error: `http-${resp.status}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await resp.json();
    const tip: string | undefined =
      json?.choices?.[0]?.message?.content?.trim();

    return new Response(JSON.stringify({ tip: tip ?? null, error: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ tip: null, error: "network" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
