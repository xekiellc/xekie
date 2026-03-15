const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jlcrarqiyejgjbdesxik.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  'mailto:zach@xekie.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { userId, title, body, url } = JSON.parse(event.body);
    if (!userId || !title) return { statusCode: 400, body: 'Missing userId or title' };

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: subs } = await sb
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId);

    if (!subs || !subs.length) return { statusCode: 200, body: 'No subscriptions found' };

    const payload = JSON.stringify({ title, body, url: url || '/' });
    const results = await Promise.allSettled(
      subs.map(row => webpush.sendNotification(row.subscription, payload))
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return { statusCode: 200, body: JSON.stringify({ sent }) };

  } catch (err) {
    console.error('send-push error:', err);
    return { statusCode: 500, body: err.message };
  }
};
