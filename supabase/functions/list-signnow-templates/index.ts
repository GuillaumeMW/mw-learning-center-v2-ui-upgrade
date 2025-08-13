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

    // Try to fetch documents from SignNow API - start with first page
    const endpoints = [
      "https://api.signnow.com/user/documents",
      "https://api-eval.signnow.com/user/documents",
    ];

    let allDocuments: any[] = [];
    let ok = false;
    let lastStatus = 0;

    for (const baseEndpoint of endpoints) {
      try {
        // First, try without pagination to see what we get
        log("Fetching first page from endpoint", { baseEndpoint });
        
        const res = await fetch(baseEndpoint, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${signNowToken}`,
            Accept: "application/json",
          },
        });
        
        lastStatus = res.status;
        const raw = await res.json().catch(() => ({}));
        
        if (!res.ok) {
          log("Endpoint failed", { baseEndpoint, status: res.status, raw });
          continue;
        }

        log("Raw response structure", { 
          baseEndpoint,
          isArray: Array.isArray(raw),
          hasData: Boolean(raw.data),
          hasDocuments: Boolean(raw.documents),
          keys: Object.keys(raw || {}),
          totalCount: raw.total_count || raw.count || 'unknown'
        });

        // Extract documents from response
        const items: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as any).data)
          ? (raw as any).data
          : Array.isArray((raw as any).documents)
          ? (raw as any).documents
          : [];

        log("First page results", { 
          itemCount: items.length,
          firstItemKeys: items[0] ? Object.keys(items[0]) : [],
          hasMore: items.length >= 15 // Check if likely paginated
        });

        if (items.length > 0) {
          allDocuments = items;
          ok = true;
          log("Successfully fetched documents", { endpoint: baseEndpoint, total: allDocuments.length });
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
