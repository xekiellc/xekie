const SUPABASE_URL = 'https://jlcrarqiyejgjbdesxik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY3JhcnFpeWVqZ2piZGVzeGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDU1NTQsImV4cCI6MjA4ODU4MTU1NH0.c4wUvoU_j8CXtLN7Lm-iCzPD-4aQRL2r1-FhfUCK2wA';

export default async function handler(request, context) {
  const url = new URL(request.url);
  const xekieId = url.searchParams.get('id');
  if (!xekieId) return context.next();

  const pageUrl = `https://xekie.com/xekie.html?id=${xekieId}`;
  let title = 'XEKIE — Trade Different';
  let description = 'Someone is looking to buy this on XEKIE. Respond with your best offer.';
  let ogImage = 'https://xekie.com/icon-512x512.png';

  try {
    const supaRes = await fetch(
      `${SUPABASE_URL}/rest/v1/xekies?id=eq.${encodeURIComponent(xekieId)}&select=title,description,budget,budget_min,budget_max,location,category&limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Accept': 'application/json',
        }
      }
    );

    if (supaRes.ok) {
      const data = await supaRes.json();
      const x = Array.isArray(data) ? data[0] : null;
      if (x && x.title) {
        let budget = '';
        if (x.budget_min && x.budget_max) budget = `$${Number(x.budget_min).toLocaleString()} – $${Number(x.budget_max).toLocaleString()}`;
        else if (x.budget_min) budget = `$${Number(x.budget_min).toLocaleString()}+`;
        else if (x.budget_max) budget = `Up to $${Number(x.budget_max).toLocaleString()}`;
        else if (x.budget) budget = `$${Number(x.budget).toLocaleString()}`;

        title = `${x.title} — XEKIE`;
        description = x.description
          ? `${x.description.slice(0, 120)}${x.description.length > 120 ? '...' : ''} | Budget: ${budget}`
          : `Looking to buy: ${x.title}. Budget: ${budget}. Respond with your best offer on XEKIE.`;

        const ogParams = new URLSearchParams({
          title: x.title, budget,
          location: x.location || '',
          category: x.category || ''
        });
        ogImage = `https://xekie.com/.netlify/functions/og-image?${ogParams.toString()}`;
      }
    }
  } catch(e) {}

  // Build clean head injection — replaces ALL og tags at once
  const injection = `
<meta property="og:type" content="website">
<meta property="og:site_name" content="XEKIE">
<meta property="og:title" content="${escHtml(title)}">
<meta property="og:description" content="${escHtml(description)}">
<meta property="og:url" content="${pageUrl}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escHtml(title)}">
<meta name="twitter:description" content="${escHtml(description)}">
<meta name="twitter:image" content="${ogImage}">`;

  try {
    const originalResponse = await context.next();
    let html = await originalResponse.text();

    // Remove all existing og/twitter meta tags to avoid duplicates
    html = html.replace(/<meta property="og:[^"]*"[^>]*>/g, '');
    html = html.replace(/<meta name="twitter:[^"]*"[^>]*>/g, '');
    html = html.replace(/<title>.*?<\/title>/s, `<title>${escHtml(title)}</title>`);

    // Inject clean tags right after <head>
    html = html.replace('<head>', `<head>${injection}`);

    return new Response(html, {
      status: originalResponse.status,
      headers: {
        ...Object.fromEntries(originalResponse.headers),
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300',
      }
    });
  } catch(e) {
    return context.next();
  }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
