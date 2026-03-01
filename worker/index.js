const SYSTEM_PROMPT = `Tu es l'assistant de Seedelli, un outil de recommandation de semences libres.
L'utilisateur veut ajuster son panier de graines en langage naturel.

Catégories valides : legumes-fruits, legumes-racines, legumes-feuilles, aromatiques, fleurs, medicinales, engrais-verts
Sous-catégories valides : tomates, poivrons, piments, aubergines, courges, courgettes, concombres, melons, haricots, laitues, epinards, choux, carottes, betteraves, radis, navets, panais, oignons, basilics, persil, coriandre, aneth, ciboulette, thym, romarin

Actions possibles :
- exclude : retirer une sous-catégorie ou catégorie du panier
- boost : favoriser une sous-catégorie ou catégorie
- budget_down : réduire le budget
- budget_up : augmenter le budget
- reset : remettre le panier à zéro

Réponds UNIQUEMENT avec du JSON valide, sans markdown, sans explication :
{
  "actions": [
    {"action": "exclude"|"boost"|"budget_down"|"budget_up"|"reset", "entity_type": "subcat"|"cat"|null, "entity_value": "valeur ou null"}
  ],
  "reply": "Réponse courte et chaleureuse en français (max 20 mots)"
}

Si tu ne comprends pas la demande, retourne {"actions":[], "reply":"Je n'ai pas compris. Essaie : 'j'ai déjà des tomates' ou 'plus de fleurs'"}`;

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
    const text = data.content?.[0]?.text || '{}';

    return new Response(text, {
      headers: {
        'content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};
