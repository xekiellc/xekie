const SUPABASE_URL = 'https://jlcrarqiyejgjbdesxik.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY3JhcnFpeWVqZ2piZGVzeGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDU1NTQsImV4cCI6MjA4ODU4MTU1NH0.c4wUvoU_j8CXtLN7Lm-iCzPD-4aQRL2r1-FhfUCK2wA';

export default async function handler(request, context) {
  const url = new URL(request.url);
  const xekieId = url.searchParams.get('id');

  if (!xekieId) return context.next();

  const ua = request.headers.get('user-agent') || '';
  const isBot = /facebookexternalhit|twitterbot|linkedinbot|whatsapp|slackbot|telegrambot|discordbot|googlebot|bingbot|crawler|spider/i.test(ua);

  if (!isBot) return context.next();

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/xekies?id=eq.${xekieId}&select=title,description,budget,budget_min,budget_max,location,category&limit=1`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    const data = await res.json();
    const x = data?.[0];
    if (!x) return context.next();

    let budget = '';
    if (x.budget_min && x.budget_max) budget = `$${Number(x.budget_min).toLocaleString()} – $${Number(x.budget_max).toLocaleString()}`;
    else if (x.budget_min) budget = `$${Number(x.budget_min).toLocaleString()}+`;
    else if (x.budget_max) budget = `Up to $${Number(x.budget_max).toLocaleString()}`;
    else if (x.budget) budget = `$${Number(x.budget).toLocaleString()}`;

    const title = `${x.title} — XEKIE`;
    const description = x.description
      ? `${x.description.slice(0, 120)}${x.description.length > 120 ? '...' : ''} | Budget: ${budget}`
      : `Looking to buy: ${x.title}. Budget: ${budget}. Respond with your best offer on XEKIE.`;

    const ogParams = new URLSearchParams({
      title: x.title, budget, location: x.location || '', category: x.category || ''
    });
    const ogImage = `https://xekie.com/.netlify/functions/og-image?${ogParams}`;
    const pageUrl = `https://xekie.com/xekie.html?id=${xekieId}`;

    const originalResponse = await context.next();
    let html = await originalResponse.text();

    // Fix og:url — replace the id="og-url" tag and any content value
    html = html.replace(
      /<meta property="og:url"[^>]*>/,
      `<meta property="og:url" content="${pageUrl}">`
    );
    // Also fix the id="og-url" variant
    html = html.replace(
      /<meta property="og:url" id="og-url"[^>]*>/,
      `<meta property="og:url" content="${pageUrl}">`
    );

    html = html
      .replace(/<title>.*?<\/title>/, `<title>${escHtml(title)}</title>`)
      .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escHtml(title)}">`)
      .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escHtml(description)}">`)
      .replace(/<meta property="og:image" [^>]*>/, `<meta property="og:image" content="${ogImage}">`)
      .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escHtml(title)}">`)
      .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escHtml(description)}">`)
      .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${ogImage}">`);

    return new Response(html, {
      status: originalResponse.status,
      headers: {
        ...Object.fromEntries(originalResponse.headers),
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300, stale-while-revalidate=60',
      }
    });

  } catch (err) {
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
