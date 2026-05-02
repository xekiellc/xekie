// release-payment.js — releases escrowed funds to seller after buyer confirms receipt
// Called when buyer clicks "I received my item" button
// Transfers offer amount minus 5% fee to seller's Stripe Connect account

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jlcrarqiyejgjbdesxik.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { xekieId, offerId, buyerId } = body;
  if (!xekieId || !offerId || !buyerId) return { statusCode: 400, body: 'Missing required fields' };

  const _sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Get the transaction record
    const { data: transaction, error: txError } = await _sb
      .from('transactions')
      .select('*')
      .eq('xekie_id', xekieId)
      .eq('offer_id', offerId)
      .single();

    if (txError || !transaction) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Transaction not found' }) };
    }

    // Verify buyer
    if (transaction.buyer_id !== buyerId) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // Check not already released
    if (transaction.status === 'released') {
      return { statusCode: 400, body: JSON.stringify({ error: 'Payment already released' }) };
    }

    // Get seller Stripe account
    const { data: sellerProfile } = await _sb
      .from('user_profiles')
      .select('stripe_account_id, stripe_onboarded')
      .eq('user_id', transaction.seller_id)
      .single();

    if (!sellerProfile?.stripe_account_id || !sellerProfile?.stripe_onboarded) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Seller has not completed payout setup' }) };
    }

    // Calculate payout amount
    // Buyer paid: offer_price + 5% fee
    // Seller receives: offer_price minus Stripe processing fee (~2.9% + $0.30)
    const offerAmountCents = transaction.offer_amount_cents;
    const stripeFeesCents = Math.round(offerAmountCents * 0.029) + 30;
    const payoutCents = offerAmountCents - stripeFeesCents;

    // Transfer to seller via Stripe Connect
    const transferRes = await fetch('https://api.stripe.com/v1/transfers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'amount': String(payoutCents),
        'currency': 'usd',
        'destination': sellerProfile.stripe_account_id,
        'transfer_group': `xekie-${xekieId}`,
        'metadata[xekie_id]': xekieId,
        'metadata[offer_id]': offerId,
        'metadata[buyer_id]': buyerId,
        'metadata[seller_id]': transaction.seller_id,
      }).toString(),
    });

    const transfer = await transferRes.json();
    if (transfer.error) {
      return { statusCode: 400, body: JSON.stringify({ error: transfer.error.message }) };
    }

    // Update transaction status
    await _sb.from('transactions').update({
      status: 'released',
      released_at: new Date().toISOString(),
      stripe_transfer_id: transfer.id,
      payout_amount_cents: payoutCents,
    }).eq('id', transaction.id);

    // Mark XEKIE fulfilled
    await _sb.from('xekies').update({ is_fulfilled: true }).eq('id', xekieId);

    // Notify seller via email
    try {
      await fetch('https://xekie.com/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payout_released',
          sellerId: transaction.seller_id,
          xekieId,
          offerId,
          payoutAmount: (payoutCents / 100).toFixed(2),
        }),
      });
    } catch (e) {}

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        transferId: transfer.id,
        payoutAmount: (payoutCents / 100).toFixed(2),
      }),
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
