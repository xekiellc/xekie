// confirm-payout.js — sends seller confirmation email when admin marks payout as paid

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://jlcrarqiyejgjbdesxik.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };

  try {
    let body;
    try { body = JSON.parse(event.body || "{}"); }
    catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid request" }) }; }

    const { payoutId, paypalEmail, amountCents } = body;

    if (!payoutId || !paypalEmail || !amountCents) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Missing required fields." }) };
    }

    const _sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const amountDollars = (amountCents / 100).toFixed(2);

    // Get payout + user details
    const { data: payout } = await _sb
      .from("cashout_history")
      .select("user_id")
      .eq("id", payoutId)
      .single();

    if (!payout) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: "Payout not found." }) };

    // Get user email
    const { data: { user } } = await _sb.auth.admin.getUserById(payout.user_id);
    if (!user) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: "User not found." }) };

    // Send confirmation email to seller
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "XEKIE <payouts@xekie.com>",
        to: user.email,
        subject: `$${amountDollars} has been sent to your PayPal`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
            <h2 style="color:#ff4d1c;">Your payout has been sent! 🎉</h2>
            <p style="color:#444;line-height:1.6;margin-bottom:24px;">Great news — your XEKIE earnings have been sent to your PayPal. Check your PayPal account for the transfer.</p>

            <div style="background:#f4f2ec;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
              <div style="font-size:13px;color:#666;margin-bottom:4px;">Amount sent</div>
              <div style="font-size:40px;font-weight:700;color:#ff4d1c;">$${amountDollars}</div>
              <div style="font-size:13px;color:#666;margin-top:8px;">Sent to: ${paypalEmail}</div>
            </div>

            <p style="color:#999;font-size:13px;line-height:1.6;">PayPal transfers typically appear within minutes. If you don't see it within a few hours, please contact us at support@xekie.com.</p>

            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
            <p style="color:#999;font-size:12px;">Thank you for selling on XEKIE. Trade Different. #TeamXEKIE</p>
          </div>
        `,
      }),
    });

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true }),
    };

  } catch (err) {
    console.error("confirm-payout error:", err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: "Failed to send confirmation." }),
    };
  }
};
