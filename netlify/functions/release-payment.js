// release-payment.js — releases escrowed funds to seller's XEKIE balance
// Called when buyer confirms receipt of item
// Seller balance accumulates until they request a cashout via cashout.html
// No Stripe Connect required upfront — seller connects bank when they cash out

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jlcrarqiyejgjbdesxik.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

    // Calculate payout — offer amount minus Stripe processing fees (~2.9% + $0.30)
    const offerAmountCents = transaction.offer_amount_cents;
    const stripeFeesCents = Math.round(offerAmountCents * 0.029) + 30;
    const payoutCents = offerAmountCents - stripeFeesCents;

    // Add to seller's XEKIE balance
    // First get current balance
    const { data: sellerProfile } = await _sb
      .from('user_profiles')
      .select('balance_cents')
      .eq('user_id', transaction.seller_id)
      .single();

    const currentBalance = sellerProfile?.balance_cents || 0;
    const newBalance = currentBalance + payoutCents;

    // Upsert seller profile with new balance
    await _sb.from('user_profiles').upsert({
      user_id: transaction.seller_id,
      balance_cents: newBalance,
    }, { onConflict: 'user_id' });

    // Update transaction status to released
    await _sb.from('transactions').update({
      status: 'released',
      released_at: new Date().toISOString(),
      payout_amount_cents: payoutCents,
    }).eq('id', transaction.id);

    // Mark XEKIE as fulfilled
    await _sb.from('xekies').update({ is_fulfilled: true }).eq('id', xekieId);

    // Send payout notification email to seller
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
          newBalance: (newBalance / 100).toFixed(2),
        }),
      });
    } catch (e) {}

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        payoutAmount: (payoutCents / 100).toFixed(2),
        newBalance: (newBalance / 100).toFixed(2),
      }),
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
