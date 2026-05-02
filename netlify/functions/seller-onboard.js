// seller-onboard.js — creates a Stripe Connect onboarding link for sellers
// Called when a seller wants to receive payouts from XEKIE transactions

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jlcrarqiyejgjbdesxik.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { userId, returnUrl } = body;
  if (!userId) return { statusCode: 400, body: 'Missing userId' };

  const _sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Check if seller already has a Stripe account
    const { data: profile } = await _sb
      .from('user_profiles')
      .select('stripe_account_id, stripe_onboarded')
      .eq('user_id', userId)
      .single();

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

      // Save to user_profiles
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
        'refresh_url': returnUrl || 'https://xekie.com/seller-onboard.html',
        'return_url': returnUrl || 'https://xekie.com/seller-onboard.html?success=true',
        'type': 'account_onboarding',
      }).toString(),
    });

    const link = await linkRes.json();
    if (link.error) return { statusCode: 400, body: JSON.stringify({ error: link.error.message }) };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: link.url, accountId }),
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
