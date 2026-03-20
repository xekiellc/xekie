// netlify/functions/ai-writer.js
const { rateLimit, getIP, limitedResponse } = require('./rate-limit');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const ip = getIP(event);
  const { limited } = rateLimit(ip, 'ai-writer', 10, 60000);
  if (limited) return limitedResponse();

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'Missing API key' }) };

  let body;
  try { body = JSON.parse(event.body); } catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const { title, category } = body;
  if (!title) return { statusCode: 400, body: JSON.stringify({ error: 'Missing title' }) };

  // Build niche-specific context
  const nicheContext = {
    'K-Pop': 'This is for the K-Pop collector market. Use K-Pop terminology: photocards, albums, inclusions, POBs, lightsticks, versions. Buyers are often looking for specific idol members, specific album versions, or rare inclusions.',
    'Sneakers': 'This is for the sneaker resale market. Use sneaker terminology: DS (deadstock), OG all, colorway, retail, size, box condition. Buyers want specific sizes, colorways, and condition details.',
    'Trading Cards': 'This is for the trading card market (Pokemon, MTG, Yu-Gi-Oh etc). Use card terminology: PSA/BGS graded, raw, holo, first edition, set name, card number, condition.',
    'Sports Cards': 'This is for the sports card market. Use card terminology: rookie card, auto, patch, graded, PSA/BGS, print run, parallel, refractor.',
    'Swifties': 'This is for the Taylor Swift fan/collector market. Use Swiftie terminology: Eras Tour, vault tracks, colored vinyl, signed, hand-written, deluxe edition, merch drops.',
    'Star Wars': 'This is for the Star Wars collectibles market. Use collector terminology: MOC (mint on card), vintage Kenner, first shot, ESB, POTF, AFA graded, original trilogy.',
    'Soccer': 'This is for the soccer/football memorabilia and shirt market. Use football terminology: player issue, match worn, home/away/third kit, season, badge, signed, COA.',
    'Vinyl Records': 'This is for the vinyl record collector market. Use vinyl terminology: first pressing, original pressing, VG+/NM condition, label, matrix number, mono/stereo, gatefold.',
    'Retro Games': 'This is for the retro video game collector market. Use gaming terminology: CIB (complete in box), loose, label, cart, manual, box art, WATA/VGA graded.',
    'Vintage & Antique': 'This is for the vintage and antique market. Use antique terminology: provenance, era, maker\'s mark, patina, restoration, period piece, original hardware.',
    'Comics': 'This is for the comic book collector market. Use comic terminology: key issue, first appearance, CGC/CBCS graded, raw, newsstand, direct edition, print run.',
    'Sports Memorabilia': 'This is for the sports memorabilia market. Use memorabilia terminology: PSA/JSA authenticated, game-used, player-issued, LOA (letter of authenticity), inscribed.',
    'Luxury Watches': 'This is for the luxury watch market. Use watch terminology: reference number, full set, box and papers, movement, dial, bezel, bracelet, serial number, service history.',
    'Retro Tech': 'This is for the vintage/retro technology market. Use tech terminology: working condition, cosmetic condition, original accessories, recapped, restored, tested.',
  };

  const categoryContext = nicheContext[category] || 'Write a clear, specific listing for any category.';
  const categoryLine = category ? `The listing category is: ${category}. ${categoryContext}` : '';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `You are helping a buyer write a compelling XEKIE listing. A XEKIE is a demand-side marketplace post where buyers tell sellers exactly what they want.

The buyer wants: "${title}"
${categoryLine}

Write a XEKIE listing for them. Return ONLY valid JSON with no markdown, no explanation:
{
  "title": "A specific, compelling title using terminology appropriate for this category (max 80 chars)",
  "description": "2-3 sentences describing exactly what they want, using niche-appropriate terminology for condition, specs, and preferences (max 300 chars)",
  "category": "ONE of: K-Pop, Sneakers, Trading Cards, Sports Cards, Swifties, Star Wars, Soccer, Vinyl Records, Retro Games, Vintage & Antique, Comics, Sports Memorabilia, Luxury Watches, Retro Tech, Electronics, Vehicles, Tools, Services, Household Items, Clothes & Apparel, Books, Toys, Music & Movies, Collectibles, Other",
  "budget_hint": "A suggested budget range as a string like '100-200' or '500-1000' based on typical market value for this specific item"
}`
        }]
      })
    });

    const data = await res.json();
    const raw = data.content?.[0]?.text || '{}';
    const clean = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
