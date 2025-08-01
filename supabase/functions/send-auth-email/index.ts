import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailRequest {
  user: {
    email: string;
    user_metadata?: {
      first_name?: string;
      last_name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: 'signup' | 'recovery' | 'email_change' | 'invite';
    site_url: string;
  };
}

const logStep = (step: string, details?: any) => {
  console.log(`[send-auth-email] ${step}`, details ? JSON.stringify(details, null, 2) : '');
};

const getEmailVerificationTemplate = (token: string, redirectUrl: string, firstName?: string) => {
  const displayName = firstName ? firstName : 'there';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - MovingWaldo</title>
      <style>
        body { 
          margin: 0; 
          padding: 0; 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          background-color: #f8fafc; 
          line-height: 1.6; 
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff; 
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
        }
        .header { 
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
          padding: 40px 30px; 
          text-align: center; 
        }
        .logo { 
          max-width: 180px; 
          height: auto; 
          margin-bottom: 20px; 
        }
        .header-title { 
          color: #ffffff; 
          font-size: 28px; 
          font-weight: 700; 
          margin: 0; 
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); 
        }
        .content { 
          padding: 40px 30px; 
        }
        .greeting { 
          font-size: 20px; 
          color: #1e293b; 
          margin-bottom: 20px; 
          font-weight: 600; 
        }
        .message { 
          font-size: 16px; 
          color: #475569; 
          margin-bottom: 30px; 
          line-height: 1.7; 
        }
        .cta-button { 
          display: inline-block; 
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
          color: #ffffff; 
          padding: 16px 32px; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600; 
          font-size: 16px; 
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); 
          transition: all 0.3s ease; 
          margin-bottom: 30px; 
        }
        .cta-button:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4); 
        }
        .token-section { 
          background-color: #f1f5f9; 
          border: 2px dashed #cbd5e1; 
          border-radius: 8px; 
          padding: 20px; 
          margin: 30px 0; 
          text-align: center; 
        }
        .token-label { 
          font-size: 14px; 
          color: #64748b; 
          margin-bottom: 10px; 
          font-weight: 500; 
        }
        .token-code { 
          font-family: 'Courier New', monospace; 
          font-size: 24px; 
          font-weight: 700; 
          color: #1e293b; 
          letter-spacing: 4px; 
          background-color: #ffffff; 
          padding: 12px 20px; 
          border-radius: 6px; 
          border: 1px solid #e2e8f0; 
          display: inline-block; 
        }
        .footer { 
          background-color: #f8fafc; 
          padding: 30px; 
          text-align: center; 
          border-top: 1px solid #e2e8f0; 
        }
        .footer-text { 
          font-size: 14px; 
          color: #64748b; 
          margin: 0; 
        }
        .footer-link { 
          color: #3b82f6; 
          text-decoration: none; 
          font-weight: 500; 
        }
        .warning { 
          background-color: #fef3c7; 
          border-left: 4px solid #f59e0b; 
          padding: 15px 20px; 
          margin: 20px 0; 
          border-radius: 0 6px 6px 0; 
        }
        .warning-text { 
          font-size: 14px; 
          color: #92400e; 
          margin: 0; 
        }
        @media (max-width: 600px) {
          .container { margin: 0 10px; }
          .header, .content, .footer { padding: 20px; }
          .header-title { font-size: 24px; }
          .cta-button { padding: 12px 24px; font-size: 14px; }
          .token-code { font-size: 18px; letter-spacing: 2px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://sgqhadhgegmamirzfaxy.supabase.co/storage/v1/object/public/subsection-pdfs/movingwaldo-logo.svg" alt="MovingWaldo" class="logo">
          <h1 class="header-title">Verify Your Email</h1>
        </div>
        
        <div class="content">
          <div class="greeting">Hi ${displayName}! 👋</div>
          
          <div class="message">
            Welcome to MovingWaldo! We're excited to have you join our moving certification program. 
            To complete your account setup and start your learning journey, please verify your email address.
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${redirectUrl}" class="cta-button">
              ✉️ Verify Email Address
            </a>
          </div>
          
          <div class="token-section">
            <div class="token-label">Or use this verification code:</div>
            <div class="token-code">${token}</div>
          </div>
          
          <div class="warning">
            <div class="warning-text">
              <strong>Security Note:</strong> This verification link will expire in 24 hours. 
              If you didn't create a MovingWaldo account, please ignore this email.
            </div>
          </div>
          
          <div class="message">
            Once verified, you'll have access to our comprehensive moving certification courses and can start building your expertise in the moving industry.
          </div>
        </div>
        
        <div class="footer">
          <p class="footer-text">
            This email was sent by MovingWaldo Certification Platform.<br>
            Need help? Contact us at <a href="mailto:support@movingwaldo.com" class="footer-link">support@movingwaldo.com</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const getPasswordResetTemplate = (token: string, redirectUrl: string, firstName?: string) => {
  const displayName = firstName ? firstName : 'there';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password - MovingWaldo</title>
      <style>
        body { 
          margin: 0; 
          padding: 0; 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          background-color: #f8fafc; 
          line-height: 1.6; 
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff; 
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
        }
        .header { 
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); 
          padding: 40px 30px; 
          text-align: center; 
        }
        .logo { 
          max-width: 180px; 
          height: auto; 
          margin-bottom: 20px; 
        }
        .header-title { 
          color: #ffffff; 
          font-size: 28px; 
          font-weight: 700; 
          margin: 0; 
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); 
        }
        .content { 
          padding: 40px 30px; 
        }
        .greeting { 
          font-size: 20px; 
          color: #1e293b; 
          margin-bottom: 20px; 
          font-weight: 600; 
        }
        .message { 
          font-size: 16px; 
          color: #475569; 
          margin-bottom: 30px; 
          line-height: 1.7; 
        }
        .cta-button { 
          display: inline-block; 
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); 
          color: #ffffff; 
          padding: 16px 32px; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600; 
          font-size: 16px; 
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3); 
          transition: all 0.3s ease; 
          margin-bottom: 30px; 
        }
        .cta-button:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4); 
        }
        .token-section { 
          background-color: #fef2f2; 
          border: 2px dashed #fecaca; 
          border-radius: 8px; 
          padding: 20px; 
          margin: 30px 0; 
          text-align: center; 
        }
        .token-label { 
          font-size: 14px; 
          color: #991b1b; 
          margin-bottom: 10px; 
          font-weight: 500; 
        }
        .token-code { 
          font-family: 'Courier New', monospace; 
          font-size: 24px; 
          font-weight: 700; 
          color: #dc2626; 
          letter-spacing: 4px; 
          background-color: #ffffff; 
          padding: 12px 20px; 
          border-radius: 6px; 
          border: 1px solid #fecaca; 
          display: inline-block; 
        }
        .footer { 
          background-color: #f8fafc; 
          padding: 30px; 
          text-align: center; 
          border-top: 1px solid #e2e8f0; 
        }
        .footer-text { 
          font-size: 14px; 
          color: #64748b; 
          margin: 0; 
        }
        .footer-link { 
          color: #dc2626; 
          text-decoration: none; 
          font-weight: 500; 
        }
        .security-notice { 
          background-color: #fef3c7; 
          border-left: 4px solid #f59e0b; 
          padding: 15px 20px; 
          margin: 20px 0; 
          border-radius: 0 6px 6px 0; 
        }
        .security-text { 
          font-size: 14px; 
          color: #92400e; 
          margin: 0; 
        }
        .warning { 
          background-color: #fee2e2; 
          border-left: 4px solid #dc2626; 
          padding: 15px 20px; 
          margin: 20px 0; 
          border-radius: 0 6px 6px 0; 
        }
        .warning-text { 
          font-size: 14px; 
          color: #dc2626; 
          margin: 0; 
        }
        @media (max-width: 600px) {
          .container { margin: 0 10px; }
          .header, .content, .footer { padding: 20px; }
          .header-title { font-size: 24px; }
          .cta-button { padding: 12px 24px; font-size: 14px; }
          .token-code { font-size: 18px; letter-spacing: 2px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://sgqhadhgegmamirzfaxy.supabase.co/storage/v1/object/public/subsection-pdfs/movingwaldo-logo.svg" alt="MovingWaldo" class="logo">
          <h1 class="header-title">Reset Your Password</h1>
        </div>
        
        <div class="content">
          <div class="greeting">Hi ${displayName}! 🔐</div>
          
          <div class="message">
            We received a request to reset the password for your MovingWaldo account. 
            If you made this request, click the button below to create a new password.
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${redirectUrl}" class="cta-button">
              🔑 Reset Password
            </a>
          </div>
          
          <div class="token-section">
            <div class="token-label">Or use this reset code:</div>
            <div class="token-code">${token}</div>
          </div>
          
          <div class="security-notice">
            <div class="security-text">
              <strong>Security Reminder:</strong> This password reset link will expire in 1 hour for your security.
            </div>
          </div>
          
          <div class="warning">
            <div class="warning-text">
              <strong>Important:</strong> If you did not request a password reset, please ignore this email 
              and consider reviewing your account security. Your current password will remain unchanged.
            </div>
          </div>
          
          <div class="message">
            After resetting your password, you'll be able to continue accessing your MovingWaldo certification courses and progress.
          </div>
        </div>
        
        <div class="footer">
          <p class="footer-text">
            This email was sent by MovingWaldo Certification Platform.<br>
            Need help? Contact us at <a href="mailto:support@movingwaldo.com" class="footer-link">support@movingwaldo.com</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  logStep("Function invoked", { method: req.method });

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: AuthEmailRequest = await req.json();
    logStep("Request data received", requestData);

    const { user, email_data } = requestData;
    const { email } = user;
    const { token, token_hash, redirect_to, email_action_type, site_url } = email_data;

    const firstName = user.user_metadata?.first_name;
    
    // Construct the redirect URL
    const redirectUrl = `${site_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;
    
    let subject: string;
    let htmlContent: string;

    switch (email_action_type) {
      case 'signup':
        subject = 'Welcome to MovingWaldo - Verify Your Email';
        htmlContent = getEmailVerificationTemplate(token, redirectUrl, firstName);
        break;
      case 'recovery':
        subject = 'Reset Your MovingWaldo Password';
        htmlContent = getPasswordResetTemplate(token, redirectUrl, firstName);
        break;
      case 'email_change':
        subject = 'Confirm Your New Email Address - MovingWaldo';
        htmlContent = getEmailVerificationTemplate(token, redirectUrl, firstName);
        break;
      case 'invite':
        subject = 'You\'re Invited to Join MovingWaldo';
        htmlContent = getEmailVerificationTemplate(token, redirectUrl, firstName);
        break;
      default:
        throw new Error(`Unsupported email action type: ${email_action_type}`);
    }

    logStep("Sending email", { to: email, subject, action_type: email_action_type });

    const emailResponse = await resend.emails.send({
      from: "MovingWaldo <noreply@movingwaldo.com>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    logStep("Email sent successfully", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Auth email sent successfully",
        email_id: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    logStep("Error in send-auth-email function", { 
      error: error.message, 
      stack: error.stack 
    });

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        details: "Failed to send authentication email"
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);