// ai-suggest.js — AI-powered XEKIE suggestions
// Takes a target XEKIE + active listings, asks Claude to find semantic matches
// Returns top 3-5 related XEKIEs with relevance reasons

const { createClient } = require('@supabase/supabase-js');
const { rateLimit, getIP, limitedResponse } = require('./rate-limit');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const ip = getIP(event);
  const { limited } = rateLimit(ip, 'ai-suggest', 10, 60000);
  if (limited) return limitedResponse();

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { xekieId, title, description, category } = body;
  if (!title) return { statusCode: 400, body: JSON.stringify({ error: 'Missing title' }) };

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'Missing Anthropic key' }) };

  const _sb = createClient(
    'https://jlcrarqiyejgjbdesxik.supabase.co',
    process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY3JhcnFpeWVqZ2piZGVzeGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDU1NTQsImV4cCI6MjA4ODU4MTU1NH0.c4wUvoU_j8CXtLN7Lm-iCzPD-4aQRL2r1-FhfUCK2wA'
  );

  // Fetch active XEKIEs excluding the current one
  const { data: xekies } = await _sb
    .from('xekies')
    .select('id, title, description, category, budget, budget_min, budget_max, location')
    .eq('is_fulfilled', false)
    .neq('id', xekieId || '')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!xekies || xekies.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ suggestions: [] }) };
  }

  // Build a compact listing for the prompt
  const listingsText = xekies.map(x => {
    const bud = x.budget_max || x.budget || x.budget_min;
    return `ID:${x.id} | "${x.title}"${x.description ? ' — ' + x.description.slice(0, 80) : ''} | Category: ${x.category || 'Other'} | Budget: ${bud ? '$' + Number(bud).toLocaleString() : 'flexible'} | Location: ${x.location || 'anywhere'}`;
  }).join('\n');

  const prompt = `You are a smart marketplace assistant for XEKIE, a demand-side marketplace where buyers post what they want to buy.

A buyer is looking for:
Title: "${title}"
${description ? `Description: "${description}"` : ''}
${category ? `Category: ${category}` : ''}

Here are other active listings on the platform:
${listingsText}

Find the 3 most relevant listings that this buyer might also be interested in. Think broadly about intent:
- Same series, set, or collection (e.g. adjacent issues, volumes, seasons)
- Same era, period, or decade
- Same person, brand, or subject
- Similar category and price range
- Complementary or related items

Return ONLY a JSON array with no other text, no markdown, no explanation. Format:
[
  { "id": "uuid-here", "reason": "One sentence explaining why this is relevant" },
  { "id": "uuid-here", "reason": "One sentence explaining why this is relevant" },
  { "id": "uuid-here", "reason": "One sentence explaining why this is relevant" }
]

If there are no relevant matches at all, return an empty array: []`;

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const aiData = await aiRes.json();
    if (!aiRes.ok) return { statusCode: 500, body: JSON.stringify({ error: aiData }) };

    const rawText = aiData.content?.[0]?.text || '[]';

    let suggestions = [];
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error('Not an array');

      // Enrich with full XEKIE data
      suggestions = parsed
        .filter(s => s.id && s.reason)
        .map(s => {
          const xekie = xekies.find(x => x.id === s.id);
          if (!xekie) return null;
          const bud = xekie.budget_max || xekie.budget || xekie.budget_min;
          return {
            id: xekie.id,
            title: xekie.title,
            description: xekie.description,
            category: xekie.category,
            budget: bud ? '$' + Number(bud).toLocaleString() : null,
            location: xekie.location,
            reason: s.reason
          };
        })
        .filter(Boolean)
        .slice(0, 5);
    } catch(e) {
      return { statusCode: 200, body: JSON.stringify({ suggestions: [] }) };
    }

    return { statusCode: 200, body: JSON.stringify({ suggestions }) };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
