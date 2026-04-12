// stripe-webhook.js — handles Stripe payment confirmation
// Handles both 'promoted' ($5 listing boost) and 'transaction' (5% platform fee)

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
  const { type, xekieId, offerId, buyerId, sellerId, offerPrice, xekieTitle } = session.metadata || {};

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
      // Mark XEKIE as fulfilled, record payment
      await _sb.from('xekies')
        .update({ is_fulfilled: true })
        .eq('id', xekieId);

      // Send confirmation email to buyer
      if (buyerId && offerId) {
        const baseUrl = 'https://xekie.com/.netlify/functions/send-email';
        await fetch(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'transaction_complete',
            xekieId,
            offerId,
            buyerId,
            sellerId,
            offerPrice,
            xekieTitle,
          }),
        });
      }
    }

  } catch (err) {
    console.error('Webhook handler error:', err.message);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
