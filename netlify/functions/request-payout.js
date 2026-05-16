// request-payout.js — XEKIE PayPal Payouts
// Seller enters PayPal or Venmo email → funds arrive in minutes
// No KYC, no onboarding, no eligibility requirements

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://jlcrarqiyejgjbdesxik.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const PAYPAL_BASE = "https://api-m.paypal.com";

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
      .select("balance_cents")
      .eq("user_id", user.id)
      .single();

    if (profileErr || !profile) return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: "Profile not found." }) };

    const balance = profile.balance_cents || 0;
    if (amountCents > balance) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: `Insufficient balance. Available: $${(balance / 100).toFixed(2)}` }) };
    }

    // Get PayPal access token
    const tokenRes = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("PayPal token error:", tokenData);
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: "Payment service unavailable. Please try again." }) };
    }

    const accessToken = tokenData.access_token;
    const amountDollars = (amountCents / 100).toFixed(2);
    const payoutId = `XEKIE-${user.id.slice(0, 8)}-${Date.now()}`;

    // Fire PayPal payout
    const payoutRes = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: payoutId,
          email_subject: "Your XEKIE earnings have arrived!",
          email_message: `You've received $${amountDollars} from your XEKIE sales. Trade Different.`,
        },
        items: [{
          recipient_type: "EMAIL",
          amount: {
            value: amountDollars,
            currency: "USD",
          },
          receiver: paypalEmail,
          note: "XEKIE seller payout",
          sender_item_id: payoutId,
        }],
      }),
    });

    const payoutData = await payoutRes.json();
    console.log("PayPal payout response:", JSON.stringify(payoutData));

    if (!payoutRes.ok || payoutData.error) {
      const msg = payoutData.message || payoutData.error || "Payout failed.";
      console.error("PayPal payout error:", msg);
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: msg }) };
    }

    const batchId = payoutData.batch_header?.payout_batch_id;
    const status = payoutData.batch_header?.batch_status;

    // Deduct seller balance
    const newBalance = balance - amountCents;
    await _sb
      .from("user_profiles")
      .update({ balance_cents: newBalance })
      .eq("user_id", user.id);

    // Log payout history
    await _sb.from("cashout_history").insert({
      user_id: user.id,
      amount_cents: amountCents,
      method: "paypal",
      stripe_payout_id: batchId || payoutId,
      status: status || "pending",
      card_last4: null,
      created_at: new Date().toISOString(),
    });

    // Email notification (non-blocking)
    try {
      await fetch("https://xekie.com/.netlify/functions/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payout_released",
          sellerId: user.id,
          payoutAmount: amountDollars,
          newBalance: (newBalance / 100).toFixed(2),
        }),
      });
    } catch (_) {}

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        success: true,
        batchId,
        status,
        amountCents,
        newBalanceCents: newBalance,
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
