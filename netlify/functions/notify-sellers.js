// notify-sellers.js — fires when a new XEKIE is posted
// Finds matching subscriptions and emails + texts each one

const { createClient } = require('@supabase/supabase-js');
const { rateLimit, getIP, limitedResponse } = require('./rate-limit');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const ip = getIP(event);
  const { limited } = rateLimit(ip, 'notify-sellers', 10, 60000);
  if (limited) return limitedResponse();

  let xekie;
  try { xekie = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { title, description, budget, location, category, id } = xekie;

  const _sb = createClient(
    'https://jlcrarqiyejgjbdesxik.supabase.co',
    process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY3JhcnFpeWVqZ2piZGVzeGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDU1NTQsImV4cCI6MjA4ODU4MTU1NH0.c4wUvoU_j8CXtLN7Lm-iCzPD-4aQRL2r1-FhfUCK2wA'
  );

  const { data: subs } = await _sb.from('subscriptions').select('*');
  if (!subs || !subs.length) return { statusCode: 200, body: 'No subscribers' };

  const matching = subs.filter(sub => {
    const categoryMatch = !sub.categories || sub.categories.length === 0 ||
      sub.categories.includes('All') || (category && sub.categories.includes(category));
    const locationMatch = !sub.location ||
      (location && location.toLowerCase().includes(sub.location.toLowerCase()));
    return categoryMatch && locationMatch;
  });

  if (!matching.length) return { statusCode: 200, body: 'No matching subscribers' };

  const RESEND_KEY = process.env.RESEND_API_KEY;
  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

  const xekieUrl = `https://xekie.com/xekie.html?id=${id}`;

  const formatBudget = (x) => {
    if (x.budget_min && x.budget_max) return `$${Number(x.budget_min).toLocaleString()} – $${Number(x.budget_max).toLocaleString()}`;
    if (x.budget_min) return `$${Number(x.budget_min).toLocaleString()}+`;
    if (x.budget_max) return `Up to $${Number(x.budget_max).toLocaleString()}`;
    if (x.budget) return `$${Number(x.budget).toLocaleString()}`;
    return 'Flexible';
  };

  const budgetStr = formatBudget(xekie);

  // Send SMS via Twilio
  async function sendSMS(to, body) {
    if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_PHONE) return;
    try {
      const credentials = Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64');
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ To: to, From: TWILIO_PHONE, Body: body }).toString()
      });
    } catch(e) {}
  }

  const results = await Promise.allSettled(matching.map(async sub => {
    const smsBody = `🔶 XEKIE Alert: "${title}" — ${budgetStr}${location ? ' · ' + location : ''}\nRespond: ${xekieUrl}`;

    // Send SMS if subscriber has a phone number and opted in
    if (sub.phone && sub.sms_alerts) {
      await sendSMS(sub.phone, smsBody);
    }

    // Send email
    if (!sub.email) return;
    return fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'XEKIE <hello@xekie.com>',
        to: sub.email,
        subject: `🔶 New XEKIE: ${title}`,
        html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f2ec;font-family:'DM Sans',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ec;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#0a0a0a;border-radius:16px 16px 0 0;padding:32px 40px;">
    <div style="font-size:28px;font-weight:900;letter-spacing:-1px;"><span style="color:#ff4d1c;">XE</span><span style="color:#fafaf8;">KIE</span></div>
    <div style="font-size:10px;letter-spacing:3px;color:#555;text-transform:uppercase;margin-top:4px;">TRADE DIFFERENT</div>
  </td></tr>
  <tr><td style="background:linear-gradient(135deg,#ff4d1c,#ff8c00);padding:16px 40px;">
    <div style="color:white;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">🔔 New XEKIE Alert — ${category || 'All Categories'}</div>
  </td></tr>
  <tr><td style="background:#ffffff;padding:40px;">
    <p style="font-size:14px;color:#6b6b6b;margin:0 0 8px;">Hey ${sub.name || 'there'},</p>
    <p style="font-size:14px;color:#6b6b6b;margin:0 0 28px;">A new XEKIE just posted that matches your alert:</p>
    <div style="background:#f4f2ec;border-radius:14px;padding:28px;margin-bottom:28px;">
      <div style="font-size:22px;font-weight:900;color:#0a0a0a;letter-spacing:-0.5px;margin-bottom:12px;">${title}</div>
      ${description ? `<div style="font-size:15px;color:#444;line-height:1.6;margin-bottom:16px;">${description}</div>` : ''}
      <table cellpadding="0" cellspacing="0" style="width:100%;"><tr>
        <td style="width:50%;padding-right:8px;"><div style="background:white;border-radius:10px;padding:14px 16px;"><div style="font-size:10px;font-weight:700;letter-spacing:2px;color:#6b6b6b;text-transform:uppercase;margin-bottom:4px;">Budget</div><div style="font-size:20px;font-weight:900;color:#ff4d1c;">${budgetStr}</div></div></td>
        <td style="width:50%;padding-left:8px;"><div style="background:white;border-radius:10px;padding:14px 16px;"><div style="font-size:10px;font-weight:700;letter-spacing:2px;color:#6b6b6b;text-transform:uppercase;margin-bottom:4px;">Location</div><div style="font-size:20px;font-weight:900;color:#0a0a0a;">${location || 'Not specified'}</div></div></td>
      </tr></table>
    </div>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${xekieUrl}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:100px;font-size:16px;font-weight:700;">Respond with an offer →</a>
    </div>
    <p style="font-size:13px;color:#6b6b6b;text-align:center;margin:0;">Be the first to respond — buyers pick fast.</p>
  </td></tr>
  <tr><td style="background:#0a0a0a;border-radius:0 0 16px 16px;padding:28px 40px;">
    <p style="font-size:12px;color:#444;margin:0 0 8px;">You're receiving this because you subscribed to XEKIE alerts.</p>
    <p style="font-size:11px;color:#333;margin:12px 0 0;">© 2025 XEKIE LLC</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
      })
    });
  }));

  const sent = results.filter(r => r.status === 'fulfilled').length;
  return { statusCode: 200, body: JSON.stringify({ sent, total: matching.length }) };
};
