// stripe-webhook.js — handles Stripe payment confirmation
// Marks xekie as promoted in Supabase when payment succeeds

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  let stripeEvent;
  try { stripeEvent = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const { xekieId } = session.metadata || {};
    if (xekieId) {
      const _sb = createClient(
        'https://jlcrarqiyejgjbdesxik.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY3JhcnFpeWVqZ2piZGVzeGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDU1NTQsImV4cCI6MjA4ODU4MTU1NH0.c4wUvoU_j8CXtLN7Lm-iCzPD-4aQRL2r1-FhfUCK2wA'
      );
      const promotedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await _sb.from('xekies').update({ is_promoted: true, promoted_until: promotedUntil }).eq('id', xekieId);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
