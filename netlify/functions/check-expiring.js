// check-expiring.js — runs daily at 9am, emails buyers 24hrs before their XEKIE expires
const { createClient } = require('@supabase/supabase-js');

exports.handler = async () => {
  const _sb = createClient(
    'https://jlcrarqiyejgjbdesxik.supabase.co',
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const now = new Date();
  const in24hrs = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find XEKIEs expiring in the next 24 hours that haven't been notified yet
  const { data: expiring, error } = await _sb
    .from('xekies')
    .select('id, title, user_id, expires_at')
    .eq('is_fulfilled', false)
    .eq('expiry_notified', false)
    .gte('expires_at', now.toISOString())
    .lte('expires_at', in24hrs.toISOString());

  if (error) {
    console.error('Supabase query error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  if (!expiring || !expiring.length) {
    console.log('No expiring XEKIEs found.');
    return { statusCode: 200, body: JSON.stringify({ sent: 0 }) };
  }

  console.log(`Found ${expiring.length} expiring XEKIEs`);

  const RESEND_KEY = process.env.RESEND_API_KEY;
  let sent = 0;

  for (const xekie of expiring) {
    // Get the buyer's email from Supabase auth
    const { data: userData, error: userError } = await _sb.auth.admin.getUserById(xekie.user_id);
    if (userError || !userData?.user?.email) {
      console.error('Could not get user email for', xekie.user_id);
      continue;
    }

    const email = userData.user.email;
    const name = userData.user.user_metadata?.full_name || '';

    // Send the expiry email via Resend
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_KEY}`
        },
        body: JSON.stringify({
          from: 'XEKIE <hello@xekie.com>',
          to: email,
          subject: `Your XEKIE expires in 24 hours: "${xekie.title}"`,
          html: buildExpiryEmail(xekie.title, xekie.id, name)
        })
      });

      if (res.ok) {
        // Mark as notified so we don't send again
        await _sb
          .from('xekies')
          .update({ expiry_notified: true })
          .eq('id', xekie.id);
        sent++;
        console.log(`Sent expiry email to ${email} for XEKIE: ${xekie.title}`);
      } else {
        const err = await res.json();
        console.error('Resend error:', err);
      }
    } catch (e) {
      console.error('Email send failed:', e.message);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ sent, total: expiring.length }) };
};

function buildExpiryEmail(xekieTitle, xekieId, name) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f2ec;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ec;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:#0a0a0a;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
  <div style="font-size:28px;font-weight:900;color:#fafaf8;letter-spacing:-0.03em;"><span style="color:#ff4d1c;">XE</span>KIE</div>
  <div style="font-size:10px;letter-spacing:0.2em;color:#666;text-transform:uppercase;margin-top:4px;">TRADE DIFFERENT</div>
</td></tr>
<tr><td style="background:#fafaf8;padding:40px;border-radius:0 0 16px 16px;">
  <h1 style="font-size:24px;font-weight:800;color:#0a0a0a;margin:0 0 6px 0;">Your XEKIE expires in 24 hours ⏰</h1>
  <p style="font-size:15px;color:#6b6b6b;margin:0 0 28px 0;">Hey${name ? ` ${name}` : ''} — did you find what you were looking for?</p>
  <div style="background:#f4f2ec;border-radius:12px;padding:18px 22px;margin-bottom:24px;border-left:4px solid #ff4d1c;">
    <div style="font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#6b6b6b;margin-bottom:4px;">Expiring XEKIE</div>
    <div style="font-size:17px;font-weight:700;color:#0a0a0a;">${xekieTitle}</div>
  </div>
  <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 24px 0;">Your XEKIE expires in <strong>24 hours</strong>. Log in to renew it and keep receiving offers — or mark it as fulfilled if you found your item.</p>
  <div style="text-align:center;margin:24px 0;">
    <a href="https://xekie.com/dashboard.html" style="display:inline-block;background:#ff4d1c;color:#fff;text-decoration:none;padding:15px 28px;border-radius:10px;font-size:15px;font-weight:700;margin-right:10px;">Renew my XEKIE →</a>
    <a href="https://xekie.com/dashboard.html" style="display:inline-block;background:#f4f2ec;color:#0a0a0a;text-decoration:none;padding:15px 28px;border-radius:10px;font-size:15px;font-weight:600;border:1px solid rgba(10,10,10,0.15);">Mark fulfilled</a>
  </div>
  <p style="font-size:13px;color:#999;margin:0;text-align:center;">Questions? <a href="mailto:hello@xekie.com" style="color:#ff4d1c;">hello@xekie.com</a></p>
</td></tr>
<tr><td style="padding:20px 0;text-align:center;">
  <p style="font-size:12px;color:#999;margin:0;">© 2025 XEKIE LLC · <a href="https://xekie.com/privacy.html" style="color:#999;">Privacy</a> · <a href="https://xekie.com/terms.html" style="color:#999;">Terms</a></p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}
