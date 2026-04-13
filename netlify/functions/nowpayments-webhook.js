// nowpayments-webhook.js — handles NowPayments IPN callbacks
// Marks XEKIE as fulfilled when crypto payment confirms

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jlcrarqiyejgjbdesxik.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;

  // Verify IPN signature
  const sig = event.headers['x-nowpayments-sig'];
  if (IPN_SECRET && sig) {
    const payload = JSON.parse(event.body);
    const sorted = JSON.stringify(Object.keys(payload).sort().reduce((acc, k) => { acc[k] = payload[k]; return acc; }, {}));
    const hmac = crypto.createHmac('sha512', IPN_SECRET).update(sorted).digest('hex');
    if (hmac !== sig) {
      console.error('Invalid NowPayments signature');
      return { statusCode: 401, body: 'Invalid signature' };
    }
  }

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { payment_status, order_id } = body;

  // Only act on confirmed/finished payments
  if (!['confirmed', 'finished'].includes(payment_status)) {
    return { statusCode: 200, body: JSON.stringify({ received: true, status: payment_status }) };
  }

  // order_id format: xekie-{xekieId}-{offerId}
  if (!order_id || !order_id.startsWith('xekie-')) {
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  }

  const parts = order_id.split('-');
  const xekieId = parts[1];

  if (!xekieId) return { statusCode: 200, body: JSON.stringify({ received: true }) };

  try {
    const _sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await _sb.from('xekies').update({ is_fulfilled: true }).eq('id', xekieId);
    console.log(`XEKIE ${xekieId} marked fulfilled via crypto payment`);
  } catch (err) {
    console.error('Supabase error:', err.message);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
