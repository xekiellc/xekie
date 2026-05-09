// request-payout.js — XEKIE Instant Payout
// Architecture: Direct platform payout via Stripe Instant Payouts
// No Stripe Connect, no onboarding, no capability errors.
// Seller provides debit card → Stripe tokenizes client-side → platform fires payout directly.

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://jlcrarqiyejgjbdesxik.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

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
    const authHeader = event.headers.authorization || event.headers.Authorization || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: "Unauthorized" }) };

    const { data: { user }, error: authErr } = await _sb.auth.getUser(token);
    if (authErr || !user) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: "Invalid session. Please log in again." }) };

    let body;
    try { body = JSON.parse(event.body || "{}"); }
    catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid request" }) }; }

    const { cardToken, amountCents } = body;

    if (!cardToken) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Card token missing." }) };
    if (!amountCents || typeof amountCents !== "number") return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Amount missing." }) };
    if (amountCents < 100) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Minimum payout is $1.00." }) };

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

    const extAcctRes = await stripePost("accounts/acct_1TABmhI1ESy65Bqb/external_accounts", {
      "external_account": cardToken,
      "metadata[user_id]": user.id,
      "metadata[payout_type]": "instant_debit",
    });

    if (extAcctRes.error) {
      const msg = extAcctRes.error.message || "Could not attach card.";
      console.error("External account error:", msg);
      if (msg.includes("debit")) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "This card does not support instant payouts. Please use a Visa or Mastercard debit card." }) };
      if (msg.includes("invalid")) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Invalid card. Please check your card details and try again." }) };
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: msg }) };
    }

    const externalAccountId = extAcctRes.id;

    const payoutRes = await stripePost("payouts", {
      "amount": String(amountCents),
      "currency": "usd",
      "method": "instant",
      "destination": externalAccountId,
      "description": `XEKIE seller payout — ${user.email}`,
      "metadata[user_id]": user.id,
      "metadata[user_email]": user.email,
    });

    if (payoutRes.error) {
      const msg = payoutRes.error.message || "Payout failed.";
      console.error("Payout error:", msg);
      if (msg.includes("instant")) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "This card is not eligible for instant payouts. Please try a different debit card." }) };
      if (msg.includes("balance")) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: "Platform balance insufficient. Please contact support." }) };
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: msg }) };
    }

    const newBalance = balance - amountCents;
    await _sb
      .from("user_profiles")
      .update({ balance_cents: newBalance })
      .eq("user_id", user.id);

    await _sb.from("cashout_history").insert({
      user_id: user.id,
      amount_cents: amountCents,
      method: "instant_debit",
      stripe_payout_id: payoutRes.id,
      status: payoutRes.status,
      card_last4: extAcctRes.last4 || null,
      created_at: new Date().toISOString(),
    });

    try {
      await fetch("https://xekie.com/.netlify/functions/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "payout_released",
          sellerId: user.id,
          payoutAmount: (amountCents / 100).toFixed(2),
          newBalance: (newBalance / 100).toFixed(2),
        }),
      });
    } catch (_) {}

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({
        success: true,
        payoutId: payoutRes.id,
        status: payoutRes.status,
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

async function stripePost(endpoint, params) {
  const res = await fetch(`https://api.stripe.com/v1/${endpoint}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2023-10-16",
    },
    body: new URLSearchParams(params).toString(),
  });
  return res.json();
}
