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
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Certification Approved - MovingWaldo</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f8f9fa; font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);">
            
            <!-- Header with MovingWaldo branding -->
            <div style="background: linear-gradient(135deg, #fa372c, #ff5849); padding: 40px 40px 30px; text-align: center;">
              <div style="background-color: #ffffff; display: inline-block; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px;">
                <span style="font-size: 24px; font-weight: bold; color: #fa372c;">MovingWaldo</span>
              </div>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0; line-height: 1.3;">
                🎉 Congratulations!<br>Your Certification Request has been Approved
              </h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px;">
              <p style="color: #2d3748; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Dear <strong>${user_name}</strong>,
              </p>
              
              <p style="color: #2d3748; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                We're thrilled to inform you that your <strong>Level ${level} certification request has been approved</strong>! You've successfully demonstrated the knowledge and skills required to become a certified MovingWaldo advisor.
              </p>
              
              <div style="background-color: #f7fafc; border-left: 4px solid #fa372c; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                <h3 style="color: #fa372c; font-size: 18px; font-weight: bold; margin: 0 0 15px;">Next Steps:</h3>
                <ul style="color: #4a5568; margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">You can now proceed to the contract signing step</li>
                  <li style="margin-bottom: 8px;">Log in to your account to continue the certification process</li>
                  <li>Start helping clients with their moving needs as a certified advisor</li>
                </ul>
              </div>
              
              <p style="color: #2d3748; font-size: 16px; line-height: 1.6; margin: 25px 0 0;">
                Thank you for your dedication to professional development and for choosing to be part of the MovingWaldo family.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f7fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 14px; margin: 0 0 10px;">
                Best regards,<br>
                <strong style="color: #fa372c;">The MovingWaldo Certification Team</strong>
              </p>
              <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                This email was sent from MovingWaldo's certification platform. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
      : `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Certification Update - MovingWaldo</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f8f9fa; font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);">
            
            <!-- Header with MovingWaldo branding -->
            <div style="background: linear-gradient(135deg, #64748b, #94a3b8); padding: 40px 40px 30px; text-align: center;">
              <div style="background-color: #ffffff; display: inline-block; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px;">
                <span style="font-size: 24px; font-weight: bold; color: #fa372c;">MovingWaldo</span>
              </div>
              <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0; line-height: 1.3;">
                Certification Request Update
              </h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px;">
              <p style="color: #2d3748; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Dear <strong>${user_name}</strong>,
              </p>
              
              <p style="color: #2d3748; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                We regret to inform you that your <strong>Level ${level} certification request has been rejected</strong>. While this is disappointing, we want to help you succeed on your next attempt.
              </p>
              
              <div style="background-color: #fef5e7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                <h3 style="color: #f59e0b; font-size: 18px; font-weight: bold; margin: 0 0 15px;">Next Steps:</h3>
                <ul style="color: #4a5568; margin: 0; padding-left: 20px;">
                  <li style="margin-bottom: 8px;">Please review the course materials thoroughly</li>
                  <li style="margin-bottom: 8px;">You may retake the exam when you feel ready</li>
                  <li style="margin-bottom: 8px;">Contact us if you have any questions about the requirements</li>
                  <li>Focus on areas where you may need additional study</li>
                </ul>
              </div>
              
              <p style="color: #2d3748; font-size: 16px; line-height: 1.6; margin: 25px 0 0;">
                We encourage you to continue your learning journey and believe in your potential to become a certified MovingWaldo advisor. Don't give up!
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f7fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #718096; font-size: 14px; margin: 0 0 10px;">
                Best regards,<br>
                <strong style="color: #fa372c;">The MovingWaldo Certification Team</strong>
              </p>
              <p style="color: #a0aec0; font-size: 12px; margin: 0;">
                This email was sent from MovingWaldo's certification platform. Please do not reply to this email.
              </p>
            </div>
          </div>
        </body>
        </html>
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