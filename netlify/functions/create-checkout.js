// create-checkout.js — Stripe checkout for promoted listings + full escrow transactions
// Type 'promoted' = $5 flat fee
// Type 'transaction' = buyer pays full amount (offer price + 5% fee) into escrow

const { createClient } = require('@supabase/supabase-js');
const { rateLimit, getIP, limitedResponse } = require('./rate-limit');

const SUPABASE_URL = 'https://jlcrarqiyejgjbdesxik.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const ip = getIP(event);
  const { limited } = rateLimit(ip, 'create-checkout', 10, 300000);
  if (limited) return limitedResponse();

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { type, xekieId, xekieTitle, userId, offerId, offerPrice, sellerId } = body;

  if (!xekieId || !userId) return { statusCode: 400, body: 'Missing xekieId or userId' };
  if (!type || !['promoted', 'transaction'].includes(type)) return { statusCode: 400, body: 'Invalid type' };

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) return { statusCode: 500, body: 'Stripe not configured' };

  try {
    let params;

    if (type === 'promoted') {
      // $5 flat fee for promoted listing
      params = new URLSearchParams({
        'payment_method_types[0]': 'card',
        'line_items[0][price]': 'price_1TAdT7I1ESy65BqbPFttF4Ej',
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': 'https://xekie.com/dashboard.html?promoted=success',
        'cancel_url': 'https://xekie.com/dashboard.html?promoted=cancel',
        'metadata[type]': 'promoted',
        'metadata[xekieId]': xekieId,
        'metadata[userId]': userId,
        'metadata[xekieTitle]': (xekieTitle || 'XEKIE').slice(0, 100),
      });

    } else if (type === 'transaction') {
      // Full escrow — buyer pays offer price + 5% platform fee
      if (!offerId || !offerPrice || !sellerId) {
        return { statusCode: 400, body: 'Missing offerId, offerPrice, or sellerId' };
      }

      const offerAmountCents = Math.round(parseFloat(offerPrice) * 100);
      if (offerAmountCents < 100) return { statusCode: 400, body: 'Offer price too low' };

      const feeAmountCents = Math.max(Math.round(offerAmountCents * 0.05), 50);
      const totalCents = offerAmountCents + feeAmountCents;
      const title = (xekieTitle || 'XEKIE').slice(0, 100);

      params = new URLSearchParams({
        'payment_method_types[0]': 'card',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': title,
        'line_items[0][price_data][product_data][description]': `Item: $${offerPrice} + XEKIE 5% fee: $${(feeAmountCents/100).toFixed(2)}`,
        'line_items[0][price_data][unit_amount]': String(totalCents),
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'payment_intent_data[capture_method]': 'automatic',
        'payment_intent_data[metadata][type]': 'transaction',
        'payment_intent_data[metadata][xekieId]': xekieId,
        'payment_intent_data[metadata][offerId]': offerId,
        'payment_intent_data[metadata][buyerId]': userId,
        'payment_intent_data[metadata][sellerId]': sellerId,
        'payment_intent_data[metadata][offerAmountCents]': String(offerAmountCents),
        'payment_intent_data[metadata][feeAmountCents]': String(feeAmountCents),
        'success_url': `https://xekie.com/xekie.html?id=${xekieId}&payment=success`,
        'cancel_url': `https://xekie.com/xekie.html?id=${xekieId}&payment=cancel`,
        'metadata[type]': 'transaction',
        'metadata[xekieId]': xekieId,
        'metadata[offerId]': offerId,
        'metadata[buyerId]': userId,
        'metadata[sellerId]': sellerId,
        'metadata[offerAmountCents]': String(offerAmountCents),
        'metadata[feeAmountCents]': String(feeAmountCents),
        'metadata[xekieTitle]': title,
      });
    }

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await res.json();

    if (session.error) {
      return { statusCode: 400, body: JSON.stringify({ error: session.error.message }) };
    }

    // Create pending transaction record in Supabase
    if (type === 'transaction') {
      const offerAmountCents = Math.round(parseFloat(offerPrice) * 100);
      const feeAmountCents = Math.max(Math.round(offerAmountCents * 0.05), 50);
      const totalCents = offerAmountCents + feeAmountCents;

      const _sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      await _sb.from('transactions').insert({
        xekie_id: xekieId,
        offer_id: offerId,
        buyer_id: userId,
        seller_id: sellerId,
        offer_amount_cents: offerAmountCents,
        fee_amount_cents: feeAmountCents,
        total_charged_cents: totalCents,
        stripe_payment_intent_id: session.payment_intent,
        status: 'pending',
      });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
