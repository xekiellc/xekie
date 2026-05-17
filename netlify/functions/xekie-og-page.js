const SUPABASE_URL = 'https://jlcrarqiyejgjbdesxik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY3JhcnFpeWVqZ2piZGVzeGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDU1NTQsImV4cCI6MjA4ODU4MTU1NH0.c4wUvoU_j8CXtLN7Lm-iCzPD-4aQRL2r1-FhfUCK2wA';

const BOT_AGENTS = ['facebookexternalhit', 'Facebot', 'Twitterbot', 'LinkedInBot', 'WhatsApp', 'TelegramBot', 'Slackbot', 'pinterest', 'Instagram'];

exports.handler = async function(event) {
  const pathParts = event.path.replace('/.netlify/functions/xekie-og-page', '').replace(/^\//, '');
  const slug = pathParts || event.queryStringParameters?.slug;

  if (!slug) {
    return { statusCode: 302, headers: { Location: '/radar.html' } };
  }

  const userAgent = event.headers['user-agent'] || '';
  const isBot = BOT_AGENTS.some(bot => userAgent.toLowerCase().includes(bot.toLowerCase()));

  if (!isBot) {
    return {
      statusCode: 302,
      headers: {
        'Location': `/xekie.html?slug=${encodeURIComponent(slug)}`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    };
  }

  let title = 'XEKIE — Trade Different';
  let description = 'Someone is looking to buy this on XEKIE. Respond with your best offer.';
  let ogImage = 'https://xekie.com/icon-512x512.png';
  const canonicalUrl = `https://xekie.com/x/${slug}`;
  const functionUrl = `https://xekie.com/.netlify/functions/xekie-og-page?slug=${encodeURIComponent(slug)}`;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/xekies?slug=eq.${encodeURIComponent(slug)}&select=title,description,budget_min,budget_max,budget,is_flexible,location,category&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Accept': 'application/json',
        }
      }
    );

    if (res.ok) {
      const data = await res.json();
      const x = Array.isArray(data) ? data[0] : null;

      if (x && x.title) {
        let budget = '';
        if (x.budget_min && x.budget_max) budget = `$${Number(x.budget_min).toLocaleString()} – $${Number(x.budget_max).toLocaleString()}`;
        else if (x.budget_min) budget = `$${Number(x.budget_min).toLocaleString()}+`;
        else if (x.budget_max) budget = `Up to $${Number(x.budget_max).toLocaleString()}`;
        else if (x.budget) budget = `$${Number(x.budget).toLocaleString()}`;
        if (x.is_flexible) budget += ' (flexible)';

        title = `${x.title} — XEKIE`;
        description = x.description
          ? `${x.description.slice(0, 120)}${x.description.length > 120 ? '...' : ''} | Budget: ${budget}`
          : `Looking to buy: ${x.title}. Budget: ${budget}. Respond with your best offer on XEKIE.`;

        const ogParams = new URLSearchParams({
          title: x.title,
          budget,
          location: x.location || '',
          category: x.category || ''
        });
        ogImage = `https://xekie.com/.netlify/functions/og-image?${ogParams.toString()}`;
      }
    }
  } catch (e) {
    console.error('xekie-og-page error:', e);
  }

  const esc = str => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>
  <link rel="canonical" href="${esc(canonicalUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="XEKIE">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(functionUrl)}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${ogImage}">
</head>
<body>
  <h1>${esc(title)}</h1>
  <p>${esc(description)}</p>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
    body: html,
  };
};
