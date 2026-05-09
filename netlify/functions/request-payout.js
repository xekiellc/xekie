// request-payout.js — seller requests cashout of their XEKIE balance
// THIS is when Stripe Connect onboarding happens — not upfront
// Seller sees their balance on cashout.html and requests a transfer to their bank

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jlcrarqiyejgjbdesxik.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { userId, amountCents } = body;
  if (!userId) return { statusCode: 400, body: 'Missing userId' };

  const _sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Get seller profile and balance
    const { data: profile, error: profileError } = await _sb
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const balance = profile?.balance_cents || 0;

    if (balance <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No balance available to cash out' }) };
    }

    const cashoutCents = amountCents ? Math.min(amountCents, balance) : balance;

    if (cashoutCents < 100) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Minimum cashout is $1.00' }) };
    }

    // If seller hasn't connected Stripe yet — create onboarding link
    if (!profile?.stripe_account_id || !profile?.stripe_onboarded) {
      let accountId = profile?.stripe_account_id;

      // Create Stripe Connect account if doesn't exist
      if (!accountId) {
        const res = await fetch('https://api.stripe.com/v1/accounts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            'type': 'express',
            'capabilities[transfers][requested]': 'true',
            'capabilities[card_payments][requested]': 'true',
          }).toString(),
        });
        const account = await res.json();
        if (account.error) return { statusCode: 400, body: JSON.stringify({ error: account.error.message }) };
        accountId = account.id;

        await _sb.from('user_profiles').upsert({
          user_id: userId,
          stripe_account_id: accountId,
          stripe_onboarded: false,
        }, { onConflict: 'user_id' });
      }

      // Create onboarding link
      const linkRes = await fetch('https://api.stripe.com/v1/account_links', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'account': accountId,
          'refresh_url': 'https://xekie.com/cashout.html',
          'return_url': 'https://xekie.com/cashout.html?onboarded=true',
          'type': 'account_onboarding',
        }).toString(),
      });
      const link = await linkRes.json();
      if (link.error) return { statusCode: 400, body: JSON.stringify({ error: link.error.message }) };

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ needsOnboarding: true, url: link.url }),
      };
    }

    // Seller is onboarded — execute the transfer
    const transferRes = await fetch('https://api.stripe.com/v1/transfers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'amount': String(cashoutCents),
        'currency': 'usd',
        'destination': profile.stripe_account_id,
        'metadata[user_id]': userId,
        'metadata[type]': 'seller_cashout',
      }).toString(),
    });

    const transfer = await transferRes.json();
    if (transfer.error) {
      return { statusCode: 400, body: JSON.stringify({ error: transfer.error.message }) };
    }

    // Deduct from seller balance
    const newBalance = balance - cashoutCents;
    await _sb.from('user_profiles').update({
      balance_cents: newBalance,
    }).eq('user_id', userId);

    // Send cashout confirmation email
    try {
      await fetch('https://xekie.com/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payout_released',
          sellerId: userId,
          payoutAmount: (cashoutCents / 100).toFixed(2),
          newBalance: (newBalance / 100).toFixed(2),
        }),
      });
    } catch (e) {}

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        transferId: transfer.id,
        cashedOut: (cashoutCents / 100).toFixed(2),
        remainingBalance: (newBalance / 100).toFixed(2),
      }),
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
