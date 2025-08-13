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

    // Try different SignNow API endpoints with pagination
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
        const limit = 50; // Start with reasonable page size
        let hasMore = true;
        let pageDocuments: any[] = [];

        log("Starting pagination for endpoint", { baseEndpoint });

        while (hasMore && pageDocuments.length < 500) { // Safety limit
          // Try multiple pagination approaches
          const paginationParams = [
            `?offset=${offset}&limit=${limit}`,
            `?page=${Math.floor(offset/limit) + 1}&per_page=${limit}`,
            `?skip=${offset}&take=${limit}`
          ];

          let pageSuccess = false;
          
          for (const params of paginationParams) {
            const endpoint = `${baseEndpoint}${params}`;
            log("Trying endpoint", { endpoint, pageDocuments: pageDocuments.length });

            const res = await fetch(endpoint, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${signNowToken}`,
                Accept: "application/json",
              },
            });
            
            lastStatus = res.status;
            
            if (!res.ok) {
              log("Endpoint failed", { endpoint, status: res.status });
              continue;
            }

            const raw = await res.json().catch(() => ({}));
            
            // Extract documents from various response formats
            let items: any[] = [];
            if (Array.isArray(raw)) {
              items = raw;
            } else if (raw.data && Array.isArray(raw.data)) {
              items = raw.data;
            } else if (raw.documents && Array.isArray(raw.documents)) {
              items = raw.documents;
            } else if (raw.results && Array.isArray(raw.results)) {
              items = raw.results;
            }

            log("Page response", { 
              endpoint,
              itemCount: items.length,
              totalPages: raw.total_pages || 'unknown',
              totalCount: raw.total_count || raw.count || raw.total || 'unknown',
              hasNext: raw.has_next || 'unknown'
            });

            if (items.length > 0) {
              pageDocuments = pageDocuments.concat(items);
              pageSuccess = true;
              
              // Check various indicators for more pages
              hasMore = items.length === limit || 
                       raw.has_next === true || 
                       (raw.total_count && pageDocuments.length < raw.total_count) ||
                       (raw.total && pageDocuments.length < raw.total);
              
              log("Page successful", { 
                pageSize: items.length, 
                totalSoFar: pageDocuments.length, 
                hasMore 
              });
              break;
            }
          }

          if (!pageSuccess) {
            log("All pagination approaches failed for this page");
            break;
          }

          offset += limit;
        }

        if (pageDocuments.length > 0) {
          allDocuments = pageDocuments;
          ok = true;
          log("Successfully fetched all documents", { 
            endpoint: baseEndpoint, 
            total: allDocuments.length 
          });
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

    // Helper function to format dates properly
    const formatDate = (timestamp: any) => {
      if (!timestamp) return 'No date';
      try {
        // Handle Unix timestamp (seconds or milliseconds)
        const ts = typeof timestamp === 'number' 
          ? (timestamp > 1000000000000 ? timestamp : timestamp * 1000)
          : new Date(timestamp).getTime();
        return new Date(ts).toLocaleDateString();
      } catch {
        return 'Invalid date';
      }
    };

    // Show ALL documents for debugging
    const allDocsFormatted = allDocuments.map((t) => ({
      id: t.id || t.document_id || t.uid || t.uuid,
      name: t.name || t.document_name || t.title || t.original_filename,
      updated: formatDate(t.updated || t.updated_at || t.modified || t.created),
      created: formatDate(t.created || t.created_at),
      templateFlag: t.template,
      isTemplate: Boolean(
        t?.is_template === true ||
          t?.template === true ||
          t?.type === "template" ||
          t?.document_type === "template"
      ),
      rawData: {
        id: t.id,
        document_name: t.document_name,
        updated: t.updated,
        created: t.created,
        template: t.template,
        entity_type: t.entity_type
      }
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
