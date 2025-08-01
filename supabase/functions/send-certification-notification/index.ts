import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-CERTIFICATION-NOTIFICATION] ${step}${detailsStr}`);
};

interface NotificationRequest {
  user_id: string;
  level: number;
  action: "approve" | "reject";
  user_email: string;
  user_name: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { user_id, level, action, user_email, user_name }: NotificationRequest = await req.json();

    if (!user_id || !level || !action || !user_email || !user_name) {
      throw new Error("Missing required fields: user_id, level, action, user_email, user_name");
    }

    logStep("Processing notification", { user_id, level, action, user_email });

    const isApproved = action === "approve";
    const subject = `Certification Level ${level} ${isApproved ? "Approved" : "Rejected"}`;
    
    const htmlContent = isApproved 
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #22c55e;">Congratulations! Your Certification Request has been Approved</h1>
          <p>Dear ${user_name},</p>
          <p>We're pleased to inform you that your Level ${level} certification request has been <strong>approved</strong>!</p>
          <p>Next steps:</p>
          <ul>
            <li>You can now proceed to the contract signing step</li>
            <li>Log in to your account to continue the certification process</li>
          </ul>
          <p>Thank you for your dedication to professional development.</p>
          <p>Best regards,<br>The Certification Team</p>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #ef4444;">Certification Request Update</h1>
          <p>Dear ${user_name},</p>
          <p>We regret to inform you that your Level ${level} certification request has been <strong>rejected</strong>.</p>
          <p>Next steps:</p>
          <ul>
            <li>Please review the course materials</li>
            <li>You may retake the exam when you feel ready</li>
            <li>Contact us if you have any questions about the requirements</li>
          </ul>
          <p>We encourage you to continue your learning journey and reapply when ready.</p>
          <p>Best regards,<br>The Certification Team</p>
        </div>
      `;

    const emailResponse = await resend.emails.send({
      from: "Certification Team <onboarding@resend.dev>",
      to: [user_email],
      subject: subject,
      html: htmlContent,
    });

    logStep("Email sent successfully", { emailResponse });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email notification sent successfully",
      emailResponse 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in send-certification-notification", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});