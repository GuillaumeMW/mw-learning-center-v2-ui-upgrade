import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (msg: string, details?: unknown) => {
  console.log(`[LIST-SIGNNOW-TEMPLATES] ${msg}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Function started");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Require authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const userId = userData.user?.id;
    if (!userId) throw new Error("User not authenticated");
    log("User authenticated", { userId });

    // Read SignNow credentials from secrets
    const signNowToken = Deno.env.get("SIGNNOW_API_KEY");
    if (!signNowToken) throw new Error("SIGNNOW_API_KEY is not configured in Supabase secrets");

    // Try to fetch all documents from SignNow API with pagination
    const endpoints = [
      "https://api.signnow.com/user/documents",
      "https://api-eval.signnow.com/user/documents",
    ];

    let allDocuments: any[] = [];
    let ok = false;
    let lastStatus = 0;

    for (const baseEndpoint of endpoints) {
      try {
        let offset = 0;
        const limit = 100; // Max per page
        let hasMore = true;
        let pageDocuments: any[] = [];

        while (hasMore) {
          const endpoint = `${baseEndpoint}?limit=${limit}&offset=${offset}`;
          log("Fetching from endpoint", { endpoint, offset, limit });

          const res = await fetch(endpoint, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${signNowToken}`,
              Accept: "application/json",
            },
          });
          
          lastStatus = res.status;
          const raw = await res.json().catch(() => ({}));
          
          if (!res.ok) {
            log("Endpoint failed", { endpoint, status: res.status, raw });
            break;
          }

          // Extract documents from response
          const items: any[] = Array.isArray(raw)
            ? raw
            : Array.isArray((raw as any).data)
            ? (raw as any).data
            : Array.isArray((raw as any).documents)
            ? (raw as any).documents
            : [];

          pageDocuments = pageDocuments.concat(items);
          
          // Check if we have more pages
          hasMore = items.length === limit;
          offset += limit;
          
          log("Fetched page", { pageSize: items.length, totalSoFar: pageDocuments.length, hasMore });
          
          // Safety break after 50 pages (5000 documents)
          if (offset >= 5000) {
            log("Safety break - too many documents");
            break;
          }
        }

        if (pageDocuments.length > 0) {
          allDocuments = pageDocuments;
          ok = true;
          log("Successfully fetched all documents", { endpoint: baseEndpoint, total: allDocuments.length });
          break;
        }
      } catch (err) {
        log("Endpoint error", { endpoint: baseEndpoint, err: String(err) });
      }
    }

    if (!ok) {
      throw new Error(`SignNow API error (${lastStatus})`);
    }

    // Filter templates by known flags/fields
    const templates = allDocuments.filter((it) =>
      Boolean(
        it?.is_template === true ||
          it?.template === true ||
          it?.type === "template" ||
          it?.document_type === "template"
      )
    );

    // Show ALL documents for debugging
    const allDocsFormatted = allDocuments.map((t) => ({
      id: t.id || t.document_id || t.uid || t.uuid,
      name: t.name || t.document_name || t.title || t.original_filename,
      updated: t.updated || t.updated_at || t.modified,
      isTemplate: Boolean(
        t?.is_template === true ||
          t?.template === true ||
          t?.type === "template" ||
          t?.document_type === "template"
      ),
    }));

    // Map to concise list (templates only)
    const list = templates.map((t) => ({
      id: t.id || t.document_id || t.uid || t.uuid,
      name: t.name || t.document_name || t.title || t.original_filename,
      updated: t.updated || t.updated_at || t.modified,
    }));

    log("Templates fetched", { count: list.length, totalDocuments: allDocuments.length });

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: list.length, 
        templates: list,
        totalDocuments: allDocuments.length,
        allDocuments: allDocsFormatted // Include all documents for debugging
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log("ERROR", { message });
    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
