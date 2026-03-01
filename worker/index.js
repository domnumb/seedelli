const SYSTEM_PROMPT = `Tu es l'assistant de Seedelli qui ajuste un panier de semences.

Catégories valides : legumes-fruits, legumes-racines, legumes-feuilles, aromatiques, fleurs, medicinales, engrais-verts
Sous-catégories valides : tomates, physalis, poivrons, piments, aubergines, courges, courgettes, concombres, melons, haricots, laitues, epinards, choux, carottes, betteraves, radis, navets, panais, oignons, basilics, persil, coriandre, aneth, ciboulette, thym, romarin

Actions :
- exclude : retirer du panier (ex: "j'ai déjà des tomates", "pas de courges")
- boost : prioriser (ex: "plus de fleurs", "j'adore les aromatiques")
- budget_down : réduire le budget
- budget_up : augmenter le budget
- reset : remettre à zéro

RÈGLES :
1. Réponds UNIQUEMENT en JSON brut, zéro markdown, zéro texte autour
2. Le champ "reply" décrit EXACTEMENT l'action effectuée, en une phrase courte et factuelle
3. Pas d'emojis, pas de formules creuses, pas de superlatifs
4. Si l'utilisateur demande une variété absente de la sélection actuelle : retourne actions:[] et reply="[Nom] n'est pas dans notre sélection — mais Kokopelli en vend ! Cherche sur kokopelli-semences.fr"
5. Ne fais JAMAIS de mapping silencieux vers une autre catégorie sans le signaler clairement dans reply
6. Si incompréhensible, retourne actions:[] et demande une clarification précise

Format :
{"actions":[{"action":"exclude"|"boost"|"budget_down"|"budget_up"|"reset","entity_type":"subcat"|"cat"|null,"entity_value":"valeur ou null"}],"reply":"phrase courte factuelle"}`;

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const { message, basketSummary } = body;
    if (!message) return new Response('Missing message', { status: 400 });

    const userContent = basketSummary
      ? `Panier actuel : ${basketSummary}\n\nDemande : ${message}`
      : message;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      return new Response(JSON.stringify({ error: err }), {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'content-type': 'application/json' }
      });
    }

    const data = await anthropicRes.json();
    let text = data.content?.[0]?.text || '{}';
    // Strip markdown code fences if present
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    return new Response(text, {
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};
