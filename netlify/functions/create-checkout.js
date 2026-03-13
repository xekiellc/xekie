// create-checkout.js — creates a Stripe checkout session for promoted XEKIEs
// Uses fetch directly — no npm packages needed

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { xekieId, xekieTitle, userId } = body;
  if (!xekieId || !userId) return { statusCode: 400, body: 'Missing xekieId or userId' };

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) return { statusCode: 500, body: 'Stripe not configured' };

  try {
    const params = new URLSearchParams({
      'payment_method_types[0]': 'card',
      'line_items[0][price]': 'price_1TAdT7I1ESy65BqbPFttF4Ej',
      'line_items[0][quantity]': '1',
      'mode': 'payment',
      'success_url': 'https://xekie.com/dashboard.html?promoted=success',
      'cancel_url': 'https://xekie.com/dashboard.html?promoted=cancel',
      'metadata[xekieId]': xekieId,
      'metadata[userId]': userId,
      'metadata[xekieTitle]': (xekieTitle || 'XEKIE').slice(0, 100),
    });

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
