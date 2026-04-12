// create-checkout.js — Stripe checkout for promoted listings + offer transactions
// Type 'promoted' = $5 flat fee
// Type 'transaction' = 5% of offer price (seller pays, XEKIE keeps 5%)

const { rateLimit, getIP, limitedResponse } = require('./rate-limit');

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
      // 5% platform fee on offer price
      if (!offerId || !offerPrice || !sellerId) {
        return { statusCode: 400, body: 'Missing offerId, offerPrice, or sellerId for transaction' };
      }

      const offerAmountCents = Math.round(parseFloat(offerPrice) * 100);
      if (offerAmountCents < 100) return { statusCode: 400, body: 'Offer price too low' };

      const feeAmountCents = Math.round(offerAmountCents * 0.05);
      const feeAmountFinal = Math.max(feeAmountCents, 50); // minimum 50 cents

      const title = (xekieTitle || 'XEKIE').slice(0, 100);

      params = new URLSearchParams({
        'payment_method_types[0]': 'card',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': `XEKIE Transaction: ${title}`,
        'line_items[0][price_data][product_data][description]': `5% platform fee on $${offerPrice} offer. Seller receives $${(offerAmountCents - feeAmountFinal) / 100}.`,
        'line_items[0][price_data][unit_amount]': String(feeAmountFinal),
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `https://xekie.com/xekie.html?id=${xekieId}&payment=success`,
        'cancel_url': `https://xekie.com/xekie.html?id=${xekieId}&payment=cancel`,
        'metadata[type]': 'transaction',
        'metadata[xekieId]': xekieId,
        'metadata[offerId]': offerId,
        'metadata[buyerId]': userId,
        'metadata[sellerId]': sellerId,
        'metadata[offerPrice]': String(offerPrice),
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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
