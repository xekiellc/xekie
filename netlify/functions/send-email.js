const { rateLimit, getIP, limitedResponse } = require('./rate-limit');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const ip = getIP(event);
  const { limited } = rateLimit(ip, 'send-email', 5, 60000);
  if (limited) return limitedResponse();

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing API key' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { type, to, data } = body;

  let subject, html;

  // ─────────────────────────────────────────
  // WELCOME
  // ─────────────────────────────────────────
  if (type === 'welcome') {
    subject = `You just joined the retail revolution. Welcome to XEKIE — Just XEKIE It..`;
    html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Welcome to XEKIE — Just XEKIE It.</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:0;">
<tr><td align="center" style="padding:48px 20px 0;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="padding-bottom:40px;text-align:center;">
    <div style="font-size:36px;font-weight:900;letter-spacing:-0.04em;color:#fafaf8;line-height:1;"><span style="color:#ff4d1c;">XE</span>KIE</div>
    <div style="font-size:10px;letter-spacing:0.3em;color:#444;text-transform:uppercase;margin-top:6px;">TRADE DIFFERENT</div>
  </td></tr>
  <tr><td style="padding:0 0 20px 0;">
    <div style="font-size:13px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#ff4d1c;margin-bottom:20px;">THE RETAIL REVOLUTION IS HERE</div>
    <div style="font-size:48px;font-weight:900;color:#fafaf8;line-height:1.05;letter-spacing:-0.03em;margin-bottom:24px;">For the first time in history,<br><span style="color:#ff4d1c;">YOU</span> set the terms.</div>
    <div style="font-size:19px;font-weight:400;color:#888;line-height:1.6;">Hi ${data.name ? `<strong style="color:#fafaf8;">${data.name}</strong>` : 'there'} — you just stepped into something that has never existed before.</div>
  </td></tr>
  <tr><td style="padding:36px 0;"><div style="height:1px;background:linear-gradient(90deg,transparent,#333,transparent);"></div></td></tr>
  <tr><td style="padding-bottom:40px;">
    <div style="font-size:22px;font-weight:800;color:#fafaf8;letter-spacing:-0.02em;line-height:1.3;margin-bottom:20px;">Retail has always worked one way.<br><span style="color:#666;">Until now.</span></div>
    <div style="font-size:16px;color:#888;line-height:1.8;margin-bottom:20px;">Sellers list. Buyers scroll. Sellers name the price. Buyers take it or leave it.<br>That's how retail has worked for <em style="color:#fafaf8;">centuries.</em></div>
    <div style="font-size:18px;font-weight:700;color:#fafaf8;line-height:1.6;padding:24px;background:#111;border-radius:12px;border-left:4px solid #ff4d1c;margin-bottom:20px;">XEKIE flips the script. This is <span style="color:#ff4d1c;">demand-side retail</span> — where the buyer leads, and the market follows.</div>
    <div style="font-size:16px;color:#888;line-height:1.8;">You post what you want. You set your budget. You choose who to buy from.<br>Sellers <strong style="color:#fafaf8;">compete for your business.</strong> Not the other way around.</div>
  </td></tr>
</table></td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ff4d1c;padding:0;">
<tr><td align="center" style="padding:48px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="text-align:center;">
    <div style="font-size:13px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:rgba(255,255,255,0.6);margin-bottom:16px;">YOU ARE NOW PART OF</div>
    <div style="font-size:38px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;line-height:1.1;margin-bottom:16px;">The Retail Revolution</div>
    <div style="font-size:17px;color:rgba(255,255,255,0.85);line-height:1.6;max-width:440px;margin:0 auto;">An industry-first movement that puts power back in the hands of buyers — exactly where it belongs.</div>
  </td></tr>
</table></td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#111;padding:0;">
<tr><td align="center" style="padding:48px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="padding-bottom:32px;">
    <div style="font-size:13px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#ff4d1c;margin-bottom:12px;">HOW TO TRADE DIFFERENT</div>
    <div style="font-size:26px;font-weight:900;color:#fafaf8;letter-spacing:-0.02em;">Three steps. Zero compromise.</div>
  </td></tr>
  <tr><td style="padding-bottom:20px;"><table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="52" valign="top"><div style="width:44px;height:44px;background:#ff4d1c;border-radius:12px;text-align:center;line-height:44px;font-size:20px;font-weight:900;color:#fff;">1</div></td>
    <td style="padding-left:16px;vertical-align:top;"><div style="font-size:17px;font-weight:800;color:#fafaf8;margin-bottom:4px;">Post Your XEKIE</div><div style="font-size:15px;color:#777;line-height:1.6;">Tell the market exactly what you want. Item, condition, budget, location. Your terms. Your rules.</div></td>
  </tr></table></td></tr>
  <tr><td style="padding-bottom:20px;"><table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="52" valign="top"><div style="width:44px;height:44px;background:#ff4d1c;border-radius:12px;text-align:center;line-height:44px;font-size:20px;font-weight:900;color:#fff;">2</div></td>
    <td style="padding-left:16px;vertical-align:top;"><div style="font-size:17px;font-weight:800;color:#fafaf8;margin-bottom:4px;">Sellers Come to You</div><div style="font-size:15px;color:#777;line-height:1.6;">Motivated sellers respond with their best offers. No searching. The market moves to meet you.</div></td>
  </tr></table></td></tr>
  <tr><td style="padding-bottom:40px;"><table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td width="52" valign="top"><div style="width:44px;height:44px;background:#ff4d1c;border-radius:12px;text-align:center;line-height:44px;font-size:20px;font-weight:900;color:#fff;">3</div></td>
    <td style="padding-left:16px;vertical-align:top;"><div style="font-size:17px;font-weight:800;color:#fafaf8;margin-bottom:4px;">You Choose. You Win.</div><div style="font-size:15px;color:#777;line-height:1.6;">Review every offer. Pick the deal that's right for you. No middleman. No markup. Just results.</div></td>
  </tr></table></td></tr>
  <tr><td style="text-align:center;padding-bottom:16px;">
    <a href="https://xekie.com/request.html" style="display:inline-block;background:#ff4d1c;color:#ffffff;text-decoration:none;padding:18px 44px;border-radius:10px;font-size:17px;font-weight:800;">Post Your First XEKIE →</a>
  </td></tr>
  <tr><td style="text-align:center;padding-bottom:40px;"><div style="font-size:13px;color:#555;">It takes 60 seconds. Sellers are waiting.</div></td></tr>
  <tr><td style="padding-bottom:36px;"><div style="height:1px;background:linear-gradient(90deg,transparent,#333,transparent);"></div></td></tr>
  <tr><td style="text-align:center;padding-bottom:40px;">
    <div style="font-size:22px;font-weight:900;color:#fafaf8;letter-spacing:-0.02em;margin-bottom:10px;">You don't chase deals.<br><span style="color:#ff4d1c;">Deals chase you.</span></div>
    <div style="font-size:14px;color:#555;letter-spacing:0.15em;text-transform:uppercase;">Welcome to demand-side retail.</div>
  </td></tr>
  <tr><td style="border-top:1px solid #222;padding-top:24px;text-align:center;">
    <div style="font-size:20px;font-weight:900;color:#fafaf8;margin-bottom:4px;"><span style="color:#ff4d1c;">XE</span>KIE</div>
    <div style="font-size:10px;letter-spacing:0.25em;color:#444;text-transform:uppercase;margin-bottom:16px;">TRADE DIFFERENT</div>
    <div style="font-size:12px;color:#444;line-height:1.8;">Questions? <a href="mailto:hello@xekie.com" style="color:#ff4d1c;text-decoration:none;">hello@xekie.com</a><br><a href="https://xekie.com/privacy.html" style="color:#444;text-decoration:none;">Privacy</a> &nbsp;·&nbsp; <a href="https://xekie.com/terms.html" style="color:#444;text-decoration:none;">Terms</a><br><br>© 2025 XEKIE LLC</div>
  </td></tr>
</table></td></tr></table>
</body></html>`;

  // ─────────────────────────────────────────
  // OFFER (buyer gets notified of seller response)
  // ─────────────────────────────────────────
  } else if (type === 'offer') {
    subject = `New offer on your XEKIE: "${data.xekieTitle}"`;
    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f2ec;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ec;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#0a0a0a;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
  <div style="font-size:28px;font-weight:900;color:#fafaf8;letter-spacing:-0.03em;"><span style="color:#ff4d1c;">XE</span>KIE</div>
  <div style="font-size:10px;letter-spacing:0.2em;color:#666;text-transform:uppercase;margin-top:4px;">TRADE DIFFERENT</div>
</td></tr>
<tr><td style="background:#fafaf8;padding:40px;border-radius:0 0 16px 16px;">
  <div style="display:inline-block;background:linear-gradient(135deg,#ff4d1c,#ff8c00);color:#fff;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:5px 12px;border-radius:20px;margin-bottom:20px;">New Response</div>
  <h1 style="font-size:24px;font-weight:800;color:#0a0a0a;margin:0 0 6px 0;">You got an offer!</h1>
  <p style="font-size:15px;color:#6b6b6b;margin:0 0 28px 0;">A seller responded to your XEKIE.</p>
  <div style="background:#f4f2ec;border-radius:12px;padding:18px 22px;margin-bottom:20px;border-left:4px solid #ff4d1c;">
    <div style="font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#6b6b6b;margin-bottom:4px;">Your XEKIE</div>
    <div style="font-size:17px;font-weight:700;color:#0a0a0a;">${data.xekieTitle}</div>
  </div>
  <div style="background:#fff;border:1px solid rgba(10,10,10,0.1);border-radius:12px;padding:20px 22px;margin-bottom:28px;">
    <div style="font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#6b6b6b;margin-bottom:10px;">Their offer</div>
    ${data.offerPrice ? `<div style="font-size:26px;font-weight:800;color:#ff4d1c;margin-bottom:10px;">$${Number(data.offerPrice).toLocaleString()}</div>` : ''}
    <p style="font-size:15px;color:#333;line-height:1.6;margin:0;">${data.offerMessage}</p>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="https://xekie.com/messages.html" style="display:inline-block;background:#ff4d1c;color:#fff;text-decoration:none;padding:15px 34px;border-radius:10px;font-size:15px;font-weight:700;">View response →</a>
  </div>
  <p style="font-size:13px;color:#999;margin:0;">Questions? <a href="mailto:hello@xekie.com" style="color:#ff4d1c;">hello@xekie.com</a></p>
</td></tr>
<tr><td style="padding:20px 0;text-align:center;"><p style="font-size:12px;color:#999;margin:0;">© 2025 XEKIE LLC · <a href="https://xekie.com/privacy.html" style="color:#999;">Privacy</a> · <a href="https://xekie.com/terms.html" style="color:#999;">Terms</a></p></td></tr>
</table></td></tr></table></body></html>`;

  // ─────────────────────────────────────────
  // SELLER REPLY
  // ─────────────────────────────────────────
  } else if (type === 'seller_reply') {
    subject = `💬 The buyer replied to you on "${data.xekieTitle}"`;
    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:28px;font-weight:900;color:#fafaf8;letter-spacing:-0.03em;"><span style="color:#ff4d1c;">XE</span>KIE</div>
    <div style="font-size:10px;letter-spacing:0.2em;color:#444;text-transform:uppercase;margin-top:4px;">TRADE DIFFERENT</div>
  </div>
  <div style="text-align:center;margin-bottom:28px;">
    <div style="display:inline-block;background:rgba(255,77,28,0.12);color:#ff4d1c;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:5px 12px;border-radius:20px;margin-bottom:16px;">Buyer replied</div>
    <h1 style="font-size:26px;font-weight:800;color:#fafaf8;margin:0 0 8px 0;letter-spacing:-0.02em;">The buyer messaged you!</h1>
    <p style="font-size:15px;color:#666;margin:0;">They're interested. Don't leave them waiting.</p>
  </div>
  <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px 22px;margin-bottom:20px;">
    <div style="font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#555;margin-bottom:6px;">About your offer on</div>
    <div style="font-size:17px;font-weight:700;color:#fafaf8;">${data.xekieTitle}</div>
  </div>
  <div style="background:#1a1a1a;border:1px solid rgba(255,77,28,0.2);border-left:4px solid #ff4d1c;border-radius:12px;padding:20px 22px;margin-bottom:28px;">
    <div style="font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#555;margin-bottom:10px;">Their message</div>
    <p style="font-size:16px;color:#ccc;line-height:1.7;margin:0;font-style:italic;">"${data.message}"</p>
  </div>
  <div style="text-align:center;margin-bottom:24px;">
    <a href="https://xekie.com/messages.html?xekie=${data.xekieId}&other=${data.buyerId}" style="display:inline-block;background:#ff4d1c;color:#fff;text-decoration:none;padding:16px 40px;border-radius:10px;font-size:16px;font-weight:700;">Reply now →</a>
  </div>
  <div style="text-align:center;border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
    <p style="font-size:12px;color:#444;margin:0;line-height:1.8;">Questions? <a href="mailto:hello@xekie.com" style="color:#ff4d1c;text-decoration:none;">hello@xekie.com</a><br>
    <a href="https://xekie.com/privacy.html" style="color:#444;text-decoration:none;">Privacy</a> &nbsp;·&nbsp; <a href="https://xekie.com/terms.html" style="color:#444;text-decoration:none;">Terms</a><br>© 2025 XEKIE LLC</p>
  </div>
</td></tr>
</table></td></tr></table></body></html>`;

  // ─────────────────────────────────────────
  // EXPIRING
  // ─────────────────────────────────────────
  } else if (type === 'expiring') {
    subject = `Your XEKIE expires in 24 hours: "${data.xekieTitle}"`;
    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f2ec;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ec;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#0a0a0a;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
  <div style="font-size:28px;font-weight:900;color:#fafaf8;letter-spacing:-0.03em;"><span style="color:#ff4d1c;">XE</span>KIE</div>
  <div style="font-size:10px;letter-spacing:0.2em;color:#666;text-transform:uppercase;margin-top:4px;">TRADE DIFFERENT</div>
</td></tr>
<tr><td style="background:#fafaf8;padding:40px;border-radius:0 0 16px 16px;">
  <h1 style="font-size:24px;font-weight:800;color:#0a0a0a;margin:0 0 6px 0;">Your XEKIE expires soon ⏰</h1>
  <p style="font-size:15px;color:#6b6b6b;margin:0 0 28px 0;">Did you find what you were looking for?</p>
  <div style="background:#f4f2ec;border-radius:12px;padding:18px 22px;margin-bottom:24px;border-left:4px solid #ff4d1c;">
    <div style="font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#6b6b6b;margin-bottom:4px;">Expiring XEKIE</div>
    <div style="font-size:17px;font-weight:700;color:#0a0a0a;">${data.xekieTitle}</div>
  </div>
  <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 24px 0;">Your XEKIE expires in <strong>24 hours</strong>. Log in to renew it and keep receiving offers — or mark it as fulfilled if you found your item.</p>
  <div style="text-align:center;margin:24px 0;">
    <a href="https://xekie.com/dashboard.html" style="display:inline-block;background:#ff4d1c;color:#fff;text-decoration:none;padding:15px 28px;border-radius:10px;font-size:15px;font-weight:700;margin-right:10px;">Renew my XEKIE →</a>
    <a href="https://xekie.com/dashboard.html" style="display:inline-block;background:#f4f2ec;color:#0a0a0a;text-decoration:none;padding:15px 28px;border-radius:10px;font-size:15px;font-weight:600;border:1px solid rgba(10,10,10,0.15);">Mark fulfilled</a>
  </div>
  <p style="font-size:13px;color:#999;margin:0;">Questions? <a href="mailto:hello@xekie.com" style="color:#ff4d1c;">hello@xekie.com</a></p>
</td></tr>
<tr><td style="padding:20px 0;text-align:center;"><p style="font-size:12px;color:#999;margin:0;">© 2025 XEKIE LLC · <a href="https://xekie.com/privacy.html" style="color:#999;">Privacy</a> · <a href="https://xekie.com/terms.html" style="color:#999;">Terms</a></p></td></tr>
</table></td></tr></table></body></html>`;

  // ─────────────────────────────────────────
  // VIEW MILESTONE
  // ─────────────────────────────────────────
  } else if (type === 'view_milestone') {
    subject = `👁 Your XEKIE just hit ${data.milestone} views: "${data.xekieTitle}"`;
    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:28px;font-weight:900;color:#fafaf8;letter-spacing:-0.03em;"><span style="color:#ff4d1c;">XE</span>KIE</div>
    <div style="font-size:10px;letter-spacing:0.2em;color:#444;text-transform:uppercase;margin-top:4px;">TRADE DIFFERENT</div>
  </div>
  <div style="text-align:center;margin-bottom:28px;">
    <div style="font-size:64px;font-weight:900;color:#ff4d1c;letter-spacing:-0.04em;line-height:1;margin-bottom:8px;">${data.milestone}</div>
    <div style="font-size:16px;font-weight:600;color:#888;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:20px;">views 👁</div>
    <h1 style="font-size:24px;font-weight:800;color:#fafaf8;margin:0 0 8px 0;letter-spacing:-0.02em;">Your XEKIE is getting noticed!</h1>
    <p style="font-size:15px;color:#666;margin:0;">Sellers are looking — the right offer could be on its way.</p>
  </div>
  <div style="background:#1a1a1a;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:18px 22px;margin-bottom:28px;">
    <div style="font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#555;margin-bottom:6px;">Your XEKIE</div>
    <div style="font-size:17px;font-weight:700;color:#fafaf8;">${data.xekieTitle}</div>
  </div>
  <div style="text-align:center;margin-bottom:24px;">
    <a href="https://xekie.com/xekie.html?id=${data.xekieId}" style="display:inline-block;background:#ff4d1c;color:#fff;text-decoration:none;padding:15px 34px;border-radius:10px;font-size:15px;font-weight:700;margin-right:8px;">View my XEKIE →</a>
    <a href="https://xekie.com/dashboard.html" style="display:inline-block;background:rgba(255,255,255,0.06);color:#fafaf8;text-decoration:none;padding:15px 28px;border-radius:10px;font-size:15px;font-weight:600;border:1px solid rgba(255,255,255,0.08);">Dashboard</a>
  </div>
  <div style="text-align:center;border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
    <p style="font-size:12px;color:#444;margin:0;line-height:1.8;"><a href="https://xekie.com/privacy.html" style="color:#444;text-decoration:none;">Privacy</a> &nbsp;·&nbsp; <a href="https://xekie.com/terms.html" style="color:#444;text-decoration:none;">Terms</a><br>© 2025 XEKIE LLC</p>
  </div>
</td></tr>
</table></td></tr></table></body></html>`;

  // ─────────────────────────────────────────
  // PAYMENT ESCROWED (buyer + seller notified)
  // ─────────────────────────────────────────
  } else if (type === 'payment_escrowed') {
    const { xekieId, xekieTitle, buyerId, sellerId, offerAmountCents, feeAmountCents } = data;
    const offerAmt = (parseInt(offerAmountCents) / 100).toFixed(2);
    const feeAmt = (parseInt(feeAmountCents) / 100).toFixed(2);
    const totalAmt = (parseInt(offerAmountCents) / 100 + parseInt(feeAmountCents) / 100).toFixed(2);
    const stripeFees = (Math.round(parseInt(offerAmountCents) * 0.029) + 30) / 100;
    const sellerPayout = (parseInt(offerAmountCents) / 100 - stripeFees).toFixed(2);

    // Send to both buyer and seller
    const buyerSubject = `🔒 Payment confirmed — your item is on its way!`;
    const sellerSubject = `💰 You have a buyer! Payment is in escrow for "${xekieTitle}"`;

    const buyerHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f2ec;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ec;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#0a0a0a;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
  <div style="font-size:28px;font-weight:900;color:#fafaf8;letter-spacing:-0.03em;"><span style="color:#ff4d1c;">XE</span>KIE</div>
  <div style="font-size:10px;letter-spacing:0.2em;color:#666;text-transform:uppercase;margin-top:4px;">TRADE DIFFERENT</div>
</td></tr>
<tr><td style="background:#fafaf8;padding:40px;border-radius:0 0 16px 16px;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="font-size:48px;margin-bottom:12px;">🔒</div>
    <div style="display:inline-block;background:#EEF2FF;color:#3730a3;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:5px 12px;border-radius:20px;margin-bottom:16px;">Payment Secured</div>
    <h1 style="font-size:26px;font-weight:800;color:#0a0a0a;margin:0 0 8px 0;">Your payment is in escrow!</h1>
    <p style="font-size:15px;color:#6b6b6b;margin:0;">Your funds are held securely until you confirm receipt.</p>
  </div>
  <div style="background:#EEF2FF;border:1px solid #c7d2fe;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
    <div style="font-size:13px;font-weight:600;color:#3730a3;margin-bottom:12px;">Transaction summary</div>
    <div style="display:flex;justify-content:space-between;font-size:14px;color:#4338ca;margin-bottom:6px;"><span>Item: ${xekieTitle}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:14px;color:#4338ca;margin-bottom:6px;"><span>Item price</span><span>$${offerAmt}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:14px;color:#4338ca;margin-bottom:6px;"><span>Platform fee (5%)</span><span>$${feeAmt}</span></div>
    <div style="border-top:1px solid #c7d2fe;padding-top:8px;margin-top:8px;display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#3730a3;"><span>Total charged</span><span>$${totalAmt}</span></div>
  </div>
  <div style="background:#f4f2ec;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
    <div style="font-size:14px;color:#333;line-height:1.6;"><strong>What happens next:</strong><br>The seller has been notified and will ship your item. Once you receive it, log in to XEKIE and confirm receipt to release payment to the seller.</div>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="https://xekie.com/xekie.html?id=${xekieId}" style="display:inline-block;background:#3730a3;color:#fff;text-decoration:none;padding:15px 34px;border-radius:10px;font-size:15px;font-weight:700;">Confirm receipt when ready →</a>
  </div>
  <p style="font-size:13px;color:#999;margin:0;">Questions? <a href="mailto:hello@xekie.com" style="color:#ff4d1c;">hello@xekie.com</a></p>
</td></tr>
<tr><td style="padding:20px 0;text-align:center;"><p style="font-size:12px;color:#999;margin:0;">© 2025 XEKIE LLC · <a href="https://xekie.com/privacy.html" style="color:#999;">Privacy</a> · <a href="https://xekie.com/terms.html" style="color:#999;">Terms</a></p></td></tr>
</table></td></tr></table></body></html>`;

    const sellerHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:28px;font-weight:900;color:#fafaf8;letter-spacing:-0.03em;"><span style="color:#ff4d1c;">XE</span>KIE</div>
    <div style="font-size:10px;letter-spacing:0.2em;color:#444;text-transform:uppercase;margin-top:4px;">TRADE DIFFERENT</div>
  </div>
  <div style="text-align:center;margin-bottom:28px;">
    <div style="font-size:48px;margin-bottom:12px;">💰</div>
    <div style="display:inline-block;background:rgba(55,48,163,0.2);color:#a5b4fc;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:5px 12px;border-radius:20px;margin-bottom:16px;">Payment Secured</div>
    <h1 style="font-size:26px;font-weight:800;color:#fafaf8;margin:0 0 8px 0;">You have a buyer!</h1>
    <p style="font-size:15px;color:#666;margin:0;">Payment is held in escrow and waiting for you.</p>
  </div>
  <div style="background:#1a1a1a;border:1px solid rgba(165,180,252,0.2);border-radius:12px;padding:20px 24px;margin-bottom:24px;">
    <div style="font-size:13px;font-weight:600;color:#a5b4fc;margin-bottom:12px;">Your payout details</div>
    <div style="font-size:14px;color:#888;margin-bottom:6px;">Item: ${xekieTitle}</div>
    <div style="font-size:14px;color:#888;margin-bottom:6px;">Offer price: $${offerAmt}</div>
    <div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:8px;margin-top:8px;font-size:16px;font-weight:700;color:#fafaf8;">You receive: ~$${sellerPayout} <span style="font-size:12px;font-weight:400;color:#666;">(after Stripe fees)</span></div>
  </div>
  <div style="background:#1a1a1a;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
    <div style="font-size:14px;color:#888;line-height:1.6;"><strong style="color:#fafaf8;">Ship the item now.</strong><br>Once the buyer confirms receipt, your payout will be released automatically to your connected bank account within 2 business days.</div>
  </div>
  <div style="text-align:center;margin-bottom:24px;">
    <a href="https://xekie.com/messages.html" style="display:inline-block;background:#ff4d1c;color:#fff;text-decoration:none;padding:15px 34px;border-radius:10px;font-size:15px;font-weight:700;">Message the buyer →</a>
  </div>
  <div style="text-align:center;border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
    <p style="font-size:12px;color:#444;margin:0;line-height:1.8;">Questions? <a href="mailto:hello@xekie.com" style="color:#ff4d1c;text-decoration:none;">hello@xekie.com</a><br>© 2025 XEKIE LLC</p>
  </div>
</td></tr>
</table></td></tr></table></body></html>`;

    // For escrowed payments we need to send two emails
    // We'll send buyer email first, then seller
    try {
      const _sb = require('@supabase/supabase-js').createClient(
        'https://jlcrarqiyejgjbdesxik.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Get buyer email
      const { data: buyerData } = await _sb.auth.admin.getUserById(buyerId);
      const buyerEmail = buyerData?.user?.email;

      // Get seller email
      const { data: sellerData } = await _sb.auth.admin.getUserById(sellerId);
      const sellerEmail = sellerData?.user?.email;

      const promises = [];
      if (buyerEmail) {
        promises.push(fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({ from: 'XEKIE <hello@xekie.com>', to: buyerEmail, subject: buyerSubject, html: buyerHtml })
        }));
      }
      if (sellerEmail) {
        promises.push(fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({ from: 'XEKIE <hello@xekie.com>', to: sellerEmail, subject: sellerSubject, html: sellerHtml })
        }));
      }
      await Promise.all(promises);
      return { statusCode: 200, body: JSON.stringify({ success: true }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }

  // ─────────────────────────────────────────
  // PAYOUT RELEASED (seller gets paid)
  // ─────────────────────────────────────────
  } else if (type === 'payout_released') {
    const { sellerId, xekieId, payoutAmount } = data;
    subject = `🎉 You've been paid! $${payoutAmount} is on its way to your bank`;
    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:40px;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:28px;font-weight:900;color:#fafaf8;letter-spacing:-0.03em;"><span style="color:#ff4d1c;">XE</span>KIE</div>
    <div style="font-size:10px;letter-spacing:0.2em;color:#444;text-transform:uppercase;margin-top:4px;">TRADE DIFFERENT</div>
  </div>
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:64px;margin-bottom:16px;">🎉</div>
    <div style="display:inline-block;background:rgba(59,109,17,0.2);color:#86efac;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:5px 12px;border-radius:20px;margin-bottom:16px;">Payment Released</div>
    <h1 style="font-size:32px;font-weight:900;color:#fafaf8;margin:0 0 8px 0;letter-spacing:-0.02em;">$${payoutAmount}</h1>
    <p style="font-size:16px;color:#666;margin:0;">is on its way to your bank account.</p>
  </div>
  <div style="background:#1a1a1a;border:1px solid rgba(134,239,172,0.2);border-radius:12px;padding:20px 24px;margin-bottom:24px;">
    <div style="font-size:14px;color:#888;line-height:1.7;">The buyer confirmed receipt of their item. Your payout of <strong style="color:#fafaf8;">$${payoutAmount}</strong> has been transferred and will arrive in your connected bank account within <strong style="color:#fafaf8;">2 business days</strong> via Stripe.</div>
  </div>
  <div style="background:linear-gradient(135deg,rgba(255,77,28,0.08),rgba(255,140,0,0.04));border:1px solid rgba(255,77,28,0.15);border-radius:12px;padding:16px 20px;margin-bottom:28px;">
    <div style="font-size:14px;color:#888;line-height:1.6;">🔶 <strong style="color:#fafaf8;">Keep selling on XEKIE.</strong> Browse active XEKIEs and submit your next offer — buyers are waiting.</div>
  </div>
  <div style="text-align:center;margin-bottom:24px;">
    <a href="https://xekie.com/radar.html" style="display:inline-block;background:#ff4d1c;color:#fff;text-decoration:none;padding:15px 34px;border-radius:10px;font-size:15px;font-weight:700;">Browse XEKIEs →</a>
  </div>
  <div style="text-align:center;border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
    <p style="font-size:12px;color:#444;margin:0;line-height:1.8;">Questions? <a href="mailto:hello@xekie.com" style="color:#ff4d1c;text-decoration:none;">hello@xekie.com</a><br>© 2025 XEKIE LLC</p>
  </div>
</td></tr>
</table></td></tr></table></body></html>`;

    // Get seller email and send
    try {
      const _sb = require('@supabase/supabase-js').createClient(
        'https://jlcrarqiyejgjbdesxik.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { data: sellerData } = await _sb.auth.admin.getUserById(sellerId);
      const sellerEmail = sellerData?.user?.email;
      if (!sellerEmail) return { statusCode: 400, body: JSON.stringify({ error: 'Seller email not found' }) };

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({ from: 'XEKIE <hello@xekie.com>', to: sellerEmail, subject, html })
      });
      const result = await res.json();
      if (!res.ok) return { statusCode: 500, body: JSON.stringify({ error: result }) };
      return { statusCode: 200, body: JSON.stringify({ success: true, id: result.id }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }

  // ─────────────────────────────────────────
  // REPORT
  // ─────────────────────────────────────────
  } else if (type === 'report') {
    const { xekieId, xekieTitle, reason, details, reporterEmail } = data;
    subject = `🚩 New report: ${reason} — ${xekieTitle || xekieId}`;
    html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fafaf8;border-radius:16px;">
      <div style="font-weight:800;font-size:22px;margin-bottom:4px;"><span style="color:#ff4d1c;">XE</span>KIE Admin</div>
      <div style="font-size:11px;letter-spacing:0.2em;color:#888;text-transform:uppercase;margin-bottom:24px;">New Report</div>
      <h2 style="font-size:20px;font-weight:700;color:#0a0a0a;margin-bottom:16px;">🚩 ${reason}</h2>
      <div style="background:#f4f2ec;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
        <div style="font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">XEKIE</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:6px;">${xekieTitle || '—'}</div>
        <a href="https://xekie.com/xekie.html?id=${xekieId}" style="font-size:13px;color:#ff4d1c;text-decoration:none;">View XEKIE →</a>
      </div>
      ${details ? `<div style="background:#fff5f5;border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px;margin-bottom:16px;font-size:14px;color:#333;">${details}</div>` : ''}
      <div style="font-size:13px;color:#888;margin-bottom:20px;">Reported by: ${reporterEmail || 'Unknown'}</div>
      <a href="https://xekie.com/admin.html" style="display:inline-block;padding:12px 24px;background:#0a0a0a;color:white;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">Review in Admin →</a>
      <p style="font-size:12px;color:#bbb;margin-top:24px;">© 2025 XEKIE LLC</p>
    </div>`;

  } else {
    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown email type' }) };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: 'XEKIE <hello@xekie.com>', to, subject, html })
    });
    const result = await res.json();
    if (!res.ok) return { statusCode: 500, body: JSON.stringify({ error: result }) };
    return { statusCode: 200, body: JSON.stringify({ success: true, id: result.id }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
