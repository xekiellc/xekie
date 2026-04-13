// create-crypto-checkout.js — NowPayments crypto checkout for XEKIE transactions
// 5% platform fee collected, buyer pays fee in crypto

const { rateLimit, getIP, limitedResponse } = require('./rate-limit');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const ip = getIP(event);
  const { limited } = rateLimit(ip, 'create-crypto-checkout', 10, 300000);
  if (limited) return limitedResponse();

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { xekieId, xekieTitle, userId, offerId, offerPrice, sellerId, currency } = body;

  if (!xekieId || !userId || !offerId || !offerPrice) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
  if (!NOWPAYMENTS_API_KEY) return { statusCode: 500, body: 'NowPayments not configured' };

  const offerAmount = parseFloat(offerPrice);
  const feeAmount = Math.max(Math.round(offerAmount * 0.05 * 100) / 100, 0.50);
  const title = (xekieTitle || 'XEKIE').slice(0, 100);
  const selectedCurrency = currency || 'btc';

  try {
    const res = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'x-api-key': NOWPAYMENTS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: feeAmount,
        price_currency: 'usd',
        pay_currency: selectedCurrency,
        order_id: `xekie-${xekieId}-${offerId}`,
        order_description: `XEKIE 5% fee: ${title}`,
        ipn_callback_url: 'https://xekie.com/.netlify/functions/nowpayments-webhook',
        success_url: `https://xekie.com/xekie.html?id=${xekieId}&payment=success`,
        cancel_url: `https://xekie.com/xekie.html?id=${xekieId}&payment=cancel`,
        is_fixed_rate: false,
        is_fee_paid_by_user: false,
      }),
    });

    const data = await res.json();

    if (data.payment_id) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: data.payment_id,
          payAddress: data.pay_address,
          payAmount: data.pay_amount,
          payCurrency: data.pay_currency,
          feeUsd: feeAmount,
          status: data.payment_status,
        }),
      };
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: data.message || 'NowPayments error' }) };
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
