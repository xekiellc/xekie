// request-payout.js — XEKIE Cashout Request
// Logs payout request to Supabase, notifies admin via Resend
// Admin manually sends via PayPal Friends & Family within 24 hours

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://jlcrarqiyejgjbdesxik.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = "zach@xekie.com";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: "Method not allowed" }) };

  const _sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Verify user session
    const authHeader = event.headers.authorization || event.headers.Authorization || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: "Unauthorized" }) };

    const { data: { user }, error: authErr } = await _sb.auth.getUser(token);
    if (authErr || !user) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: "Invalid session. Please log in again." }) };

    // Parse body
    let body;
    try { body = JSON.parse(event.body || "{}"); }
    catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid request" }) }; }

    const { paypalEmail, amountCents } = body;

    if (!paypalEmail || !paypalEmail.includes("@")) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Valid PayPal email required." }) };
    }
    if (!amountCents || typeof amountCents !== "number" || amountCents < 100) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Minimum payout is $1.00." }) };
    }

    // Verify seller balance
    const { data: profile, error: profileErr } = await _sb
      .from("user_profiles")
      .select("balance_cents, display_name")
      .eq("user_id", user.id)
      .single();

    if (profileErr || !profile) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: "Profile not found." }) };

    const balance = profile.balance_cents || 0;
    if (amountCents > balance) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: `Insufficient balance. Available: $${(balance / 100).toFixed(2)}` }) };
    }

    const amountDollars = (amountCents / 100).toFixed(2);
    const newBalance = balance - amountCents;

    // Deduct balance immediately — holds the funds
    await _sb
      .from("user_profiles")
      .update({ balance_cents: newBalance })
      .eq("user_id", user.id);

    // Log payout request
    const { data: payoutRecord } = await _sb
      .from("cashout_history")
      .insert({
        user_id: user.id,
        amount_cents: amountCents,
        method: "paypal_manual",
        paypal_email: paypalEmail,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    // PayPal send link for admin
    const paypalSendLink = `https://www.paypal.com/myaccount/transfer/homepage/send?amount=${amountDollars}&recipient=${encodeURIComponent(paypalEmail)}&currencyCode=USD`;

    // Notify admin via Resend
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "XEKIE Payouts <payouts@xekie.com>",
          to: ADMIN_EMAIL,
          subject: `💸 Payout Request — $${amountDollars} to ${paypalEmail}`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
              <h2 style="color:#ff4d1c;">New Payout Request</h2>
              <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <tr><td style="padding:8px 0;color:#666;font-size:14px;">Seller</td><td style="padding:8px 0;font-weight:600;">${profile.display_name || user.email}</td></tr>
                <tr><td style="padding:8px 0;color:#666;font-size:14px;">Email</td><td style="padding:8px 0;">${user.email}</td></tr>
                <tr><td style="padding:8px 0;color:#666;font-size:14px;">PayPal</td><td style="padding:8px 0;font-weight:600;">${paypalEmail}</td></tr>
                <tr><td style="padding:8px 0;color:#666;font-size:14px;">Amount</td><td style="padding:8px 0;font-size:20px;font-weight:700;color:#ff4d1c;">$${amountDollars}</td></tr>
                <tr><td style="padding:8px 0;color:#666;font-size:14px;">Request ID</td><td style="padding:8px 0;font-size:12px;color:#999;">${payoutRecord?.id || "—"}</td></tr>
              </table>
              <a href="${paypalSendLink}" style="display:inline-block;background:#003087;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">Send via PayPal →</a>
              <p style="margin-top:16px;font-size:12px;color:#999;">Send as Friends & Family — zero fees. Mark paid in the admin dashboard after sending.</p>
              <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
              <a href="https://xekie.com/admin-payouts.html" style="font-size:13px;color:#ff4d1c;">Open Admin Dashboard →</a>
            </div>
          `,
        }),
      });
    } catch (emailErr) {
      console.error("Admin email failed:", emailErr);
      // Don't block — payout request is still logged
    }

    // Confirm email to seller
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "XEKIE <payouts@xekie.com>",
          to: user.email,
          subject: `Your $${amountDollars} payout is on its way`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;">
              <h2 style="color:#ff4d1c;">Payout Request Received</h2>
              <p style="color:#444;line-height:1.6;">We've received your payout request and will send <strong>$${amountDollars}</strong> to your PayPal (<strong>${paypalEmail}</strong>) within 24 hours.</p>
              <div style="background:#f4f2ec;border-radius:12px;padding:20px;margin:24px 0;text-align:center;">
                <div style="font-size:13px;color:#666;margin-bottom:4px;">Payout amount</div>
                <div style="font-size:36px;font-weight:700;color:#ff4d1c;">$${amountDollars}</div>
              </div>
              <p style="color:#999;font-size:13px;">Questions? Reply to this email or contact us at support@xekie.com.</p>
              <p style="color:#999;font-size:13px;margin-top:8px;">Trade Different. #TeamXEKIE</p>
            </div>
          `,
        }),
      });
    } catch (_) {}

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        success: true,
        newBalanceCents: newBalance,
        payoutId: payoutRecord?.id,
      }),
    };

  } catch (err) {
    console.error("request-payout unhandled error:", err);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
    };
  }
};
