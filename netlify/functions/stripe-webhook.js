// stripe-webhook.js — handles Stripe payment confirmation
// On payment success: updates transaction to 'escrowed' status
// Funds held until buyer confirms receipt, then release-payment.js pays out seller

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jlcrarqiyejgjbdesxik.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  let stripeEvent;
  try { stripeEvent = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  if (stripeEvent.type !== 'checkout.session.completed') {
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  const session = stripeEvent.data.object;
  const { type, xekieId, offerId, buyerId, sellerId, offerAmountCents, feeAmountCents, xekieTitle } = session.metadata || {};

  if (!xekieId) return { statusCode: 200, body: JSON.stringify({ received: true }) };

  const _sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    if (type === 'promoted') {
      // Mark XEKIE as promoted for 7 days
      const promotedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await _sb.from('xekies')
        .update({ is_promoted: true, promoted_until: promotedUntil })
        .eq('id', xekieId);

    } else if (type === 'transaction') {
      // Payment confirmed — move transaction to escrowed status
      // Funds are held until buyer confirms receipt
      await _sb.from('transactions')
        .update({
          status: 'escrowed',
          stripe_payment_intent_id: session.payment_intent,
        })
        .eq('xekie_id', xekieId)
        .eq('offer_id', offerId)
        .eq('status', 'pending');

      // Send confirmation emails to buyer and seller
      try {
        await fetch('https://xekie.com/.netlify/functions/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'payment_escrowed',
            xekieId,
            offerId,
            buyerId,
            sellerId,
            offerAmountCents,
            feeAmountCents,
            xekieTitle,
          }),
        });
      } catch (e) {
        console.error('Email error:', e.message);
      }
    }

  } catch (err) {
    console.error('Webhook error:', err.message);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
