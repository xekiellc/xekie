exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing API key' }) };
  }

  let body;
  try { body = JSON.parse(event.body); }
  catch (e) { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { type, to, data } = body;

  let subject, html;

  if (type === 'welcome') {
    subject = `You just joined the retail revolution. Welcome to XEKIE.`;
    html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Welcome to XEKIE</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:0;">
<tr><td align="center" style="padding:48px 20px 0;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <tr><td style="padding-bottom:40px;text-align:center;">
    <div style="font-size:36px;font-weight:900;letter-spacing:-0.04em;color:#fafaf8;line-height:1;">
      <span style="color:#ff4d1c;">XE</span>KIE
    </div>
    <div style="font-size:10px;letter-spacing:0.3em;color:#444;text-transform:uppercase;margin-top:6px;">TRADE DIFFERENT</div>
  </td></tr>

  <tr><td style="padding:0 0 20px 0;">
    <div style="font-size:13px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#ff4d1c;margin-bottom:20px;">
      THE RETAIL REVOLUTION IS HERE
    </div>
    <div style="font-size:48px;font-weight:900;color:#fafaf8;line-height:1.05;letter-spacing:-0.03em;margin-bottom:24px;">
      For the first time in history,<br>
      <span style="color:#ff4d1c;">YOU</span> set the terms.
    </div>
    <div style="font-size:19px;font-weight:400;color:#888;line-height:1.6;margin-bottom:0;">
      Hi ${data.name ? `<strong style="color:#fafaf8;">${data.name}</strong>` : 'there'} — you just stepped into something that has never existed before.
    </div>
  </td></tr>

  <tr><td style="padding:36px 0;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#333,transparent);"></div>
  </td></tr>

  <tr><td style="padding-bottom:40px;">
    <div style="font-size:22px;font-weight:800;color:#fafaf8;letter-spacing:-0.02em;line-height:1.3;margin-bottom:20px;">
      Retail has always worked one way.<br>
      <span style="color:#666;">Until now.</span>
    </div>
    <div style="font-size:16px;color:#888;line-height:1.8;margin-bottom:20px;">
      Sellers list. Buyers scroll. Sellers name the price. Buyers take it or leave it.<br>
      That's how retail has worked for <em style="color:#fafaf8;">centuries.</em>
    </div>
    <div style="font-size:18px;font-weight:700;color:#fafaf8;line-height:1.6;padding:24px;background:#111;border-radius:12px;border-left:4px solid #ff4d1c;margin-bottom:20px;">
      XEKIE flips the script. This is <span style="color:#ff4d1c;">demand-side retail</span> — where the buyer leads, and the market follows.
    </div>
    <div style="font-size:16px;color:#888;line-height:1.8;">
      You post what you want. You set your budget. You choose who to buy from.<br>
      Sellers <strong style="color:#fafaf8;">compete for your business.</strong> Not the other way around.
    </div>
  </td></tr>

</table>
</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#ff4d1c;padding:0;">
<tr><td align="center" style="padding:48px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="text-align:center;">
    <div style="font-size:13px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:rgba(255,255,255,0.6);margin-bottom:16px;">
      YOU ARE NOW PART OF
    </div>
    <div style="font-size:38px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;line-height:1.1;margin-bottom:16px;">
      The Retail Revolution
    </div>
    <div style="font-size:17px;color:rgba(255,255,255,0.85);line-height:1.6;max-width:440px;margin:0 auto;">
      An industry-first movement that puts power back in the hands of buyers — exactly where it belongs.
    </div>
  </td></tr>
</table>
</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#111;padding:0;">
<tr><td align="center" style="padding:48px 20px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <tr><td style="padding-bottom:32px;">
    <div style="font-size:13px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#ff4d1c;margin-bottom:12px;">HOW TO TRADE DIFFERENT</div>
    <div style="font-size:26px;font-weight:900;color:#fafaf8;letter-spacing:-0.02em;">Three steps. Zero compromise.</div>
  </td></tr>

  <tr><td style="padding-bottom:20px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="52" valign="top">
          <div style="width:44px;height:44px;background:#ff4d1c;border-radius:12px;text-align:center;line-height:44px;font-size:20px;font-weight:900;color:#fff;">1</div>
        </td>
        <td style="padding-left:16px;vertical-align:top;">
          <div style="font-size:17px;font-weight:800;color:#fafaf8;margin-bottom:4px;">Post Your XEKIE</div>
          <div style="font-size:15px;color:#777;line-height:1.6;">Tell the market exactly what you want. Item, condition, budget, location. You name it. Your terms. Your rules.</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="padding-bottom:20px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="52" valign="top">
          <div style="width:44px;height:44px;background:#ff4d1c;border-radius:12px;text-align:center;line-height:44px;font-size:20px;font-weight:900;color:#fff;">2</div>
        </td>
        <td style="padding-left:16px;vertical-align:top;">
          <div style="font-size:17px;font-weight:800;color:#fafaf8;margin-bottom:4px;">Sellers Come to You</div>
          <div style="font-size:15px;color:#777;line-height:1.6;">Motivated sellers browse your XEKIE and respond with their best offers. No cold calls. No endless searching. The market moves to meet you.</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="padding-bottom:40px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="52" valign="top">
          <div style="width:44px;height:44px;background:#ff4d1c;border-radius:12px;text-align:center;line-height:44px;font-size:20px;font-weight:900;color:#fff;">3</div>
        </td>
        <td style="padding-left:16px;vertical-align:top;">
          <div style="font-size:17px;font-weight:800;color:#fafaf8;margin-bottom:4px;">You Choose. You Win.</div>
          <div style="font-size:15px;color:#777;line-height:1.6;">Review every offer. Pick the deal that's right for you. Connect directly. Pay on your terms. No middleman. No markup. Just results.</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="text-align:center;padding-bottom:16px;">
    <a href="https://xekie.com/request.html"
       style="display:inline-block;background:#ff4d1c;color:#ffffff;text-decoration:none;padding:18px 44px;border-radius:10px;font-size:17px;font-weight:800;letter-spacing:-0.01em;">
      Post Your First XEKIE →
    </a>
  </td></tr>
  <tr><td style="text-align:center;padding-bottom:40px;">
    <div style="font-size:13px;color:#555;">It takes 60 seconds. Sellers are waiting.</div>
  </td></tr>

  <tr><td style="padding-bottom:36px;">
    <div style="height:1px;background:linear-gradient(90deg,transparent,#333,transparent);"></div>
  </td></tr>

  <tr><td style="text-align:center;padding-bottom:40px;">
    <div style="font-size:22px;font-weight:900;color:#fafaf8;letter-spacing:-0.02em;margin-bottom:10px;">
      You don't chase deals.<br><span style="color:#ff4d1c;">Deals chase you.</span>
    </div>
    <div style="font-size:14px;color:#555;letter-spacing:0.15em;text-transform:uppercase;">Welcome to demand-side retail.</div>
  </td></tr>

  <tr><td style="border-top:1px solid #222;padding-top:24px;text-align:center;">
    <div style="font-size:20px;font-weight:900;letter-spacing:-0.03em;color:#fafaf8;margin-bottom:4px;">
      <span style="color:#ff4d1c;">XE</span>KIE
    </div>
    <div style="font-size:10px;letter-spacing:0.25em;color:#444;text-transform:uppercase;margin-bottom:16px;">TRADE DIFFERENT</div>
    <div style="font-size:12px;color:#444;line-height:1.8;">
      Questions? <a href="mailto:hello@xekie.com" style="color:#ff4d1c;text-decoration:none;">hello@xekie.com</a><br>
      <a href="https://xekie.com/privacy.html" style="color:#444;text-decoration:none;">Privacy</a>
      &nbsp;·&nbsp;
      <a href="https://xekie.com/terms.html" style="color:#444;text-decoration:none;">Terms</a><br><br>
      © 2025 XEKIE LLC
    </div>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>`;

  } else if (type === 'offer') {
    subject = `New offer on your XEKIE: "${data.xekieTitle}"`;
    html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f2ec;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ec;padding:40px 20px;">
<tr><td align="center">
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
  <div style="border-top:1px solid rgba(10,10,10,0.1);padding-top:20px;">
    <p style="font-size:13px;color:#999;margin:0;">Questions? <a href="mailto:hello@xekie.com" style="color:#ff4d1c;">hello@xekie.com</a></p>
  </div>
</td></tr>
<tr><td style="padding:20px 0;text-align:center;">
  <p style="font-size:12px;color:#999;margin:0;">© 2025 XEKIE LLC · <a href="https://xekie.com/privacy.html" style="color:#999;">Privacy</a> · <a href="https://xekie.com/terms.html" style="color:#999;">Terms</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  } else if (type === 'expiring') {
    subject = `Your XEKIE expires in 24 hours: "${data.xekieTitle}"`;
    html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f2ec;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ec;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#0a0a0a;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
  <div style="font-size:28px;font-weight:900;color:#fafaf8;letter-spacing:-0.03em;"><span style="color:#ff4d1c;">XE</span>KIE</div>
  <div style="font-size:10px;letter-spacing:0.2em;color:#666;text-transform:uppercase;margin-top:4px;">TRADE DIFFERENT</div>
</td></tr>
<tr><td style="background:#fafaf8;padding:40px;border-radius:0 0 16px 16px;">
  <h1 style="font-size:24px;font-weight:800;color:#0a0a0a;margin:0 0 6px 0;">Your XEKIE expires soon</h1>
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
  <div style="border-top:1px solid rgba(10,10,10,0.1);padding-top:20px;">
    <p style="font-size:13px;color:#999;margin:0;">Questions? <a href="mailto:hello@xekie.com" style="color:#ff4d1c;">hello@xekie.com</a></p>
  </div>
</td></tr>
<tr><td style="padding:20px 0;text-align:center;">
  <p style="font-size:12px;color:#999;margin:0;">© 2025 XEKIE LLC · <a href="https://xekie.com/privacy.html" style="color:#999;">Privacy</a> · <a href="https://xekie.com/terms.html" style="color:#999;">Terms</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
  } else {
    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown email type' }) };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({ from: 'XEKIE <hello@xekie.com>', to, subject, html })
    });
    const result = await res.json();
    if (!res.ok) return { statusCode: 500, body: JSON.stringify({ error: result }) };
    return { statusCode: 200, body: JSON.stringify({ success: true, id: result.id }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
