const SYSTEM_PROMPT = `Tu es l'assistant de Seedelli qui ajuste un panier de semences.

Catégories valides : legumes-fruits, legumes-racines, legumes-feuilles, aromatiques, fleurs, medicinales, engrais-verts, cereales

Sous-catégories valides : tomates, physalis, poivrons, piments, aubergines, courges, courgettes, concombres, melons, haricots, okra, laitues, epinards, choux, blettes, roquette, mache, pourpier, carottes, betteraves, radis, navets, panais, salsifis, oignons, ail, poireaux, celeri, artichauts, basilics, persil, coriandre, aneth, ciboulette, thym, romarin, sauge, origan, marjolaine, menthe, estragon, cosmos, capucines, tournesols, marguerites, phacelies, pois-de-senteur, fleurs-annuelles, fleurs-vivaces, medicinales, echinacea, ashwagandha, millepertuis, valeriane, mais, cereales, pois, feves, soja

Groupes valides (entity_type:"group") : legumes (= legumes-fruits + legumes-racines + legumes-feuilles)

Actions :
- exclude : retirer entièrement (ex: "j'ai déjà des tomates", "pas de courges", "sans piment", "j'en ai à la maison", "trop de X")
- boost : prioriser (ex: "plus de fleurs", "j'adore les aromatiques", "quelques X en plus", "un peu plus de X")
- reduce : limiter sans exclure (ex: "moins de courges", "pas autant de X", "juste 1-2 de X")
- only : sélection exclusive — exclure tout SAUF cette entité (ex: "je ne veux que des tomates", "uniquement des légumes", "seulement des fleurs")
- budget_down : réduire le budget (ex: "c'est trop cher", "budget plus petit", "moins de variétés")
- budget_up : augmenter le budget (ex: "plus de budget", "je peux dépenser plus", "élargis")
- reset : remettre à zéro (ex: "recommence", "repart à zéro", "efface tout", "nouveau panier")

RÈGLES :
1. Réponds UNIQUEMENT en JSON brut, zéro markdown, zéro texte autour
2. Le champ "reply" décrit EXACTEMENT l'action effectuée, en une phrase courte et factuelle
3. Pas d'emojis, pas de formules creuses, pas de superlatifs
4. Si l'utilisateur demande une variété par nom de cultivar spécifique (ex: "Rose de Berne", "Cherokee Purple") : retourne actions:[] et reply="[Nom] n'est pas dans la sélection active — cherche sur kokopelli-semences.fr"
5. Ne fais JAMAIS de mapping silencieux vers une autre entité sans le signaler dans reply
6. Si incompréhensible, retourne actions:[] et reply="Je n'ai pas compris. Essaie : 'j'ai déjà des tomates', 'plus de fleurs', 'moins de courges', 'je ne veux que des légumes'."
7. "remplace X par Y" → [{exclude X}, {boost Y}]
8. "que des légumes" / "seulement des légumes" / "uniquement des légumes" → [{action:"only", entity_type:"group", entity_value:"legumes"}]
9. Plusieurs actions peuvent coexister dans le tableau

EXEMPLES :
{"input":"j'ai déjà des tomates","output":{"actions":[{"action":"exclude","entity_type":"subcat","entity_value":"tomates"}],"reply":"Tomates retirées."}}
{"input":"plus de fleurs","output":{"actions":[{"action":"boost","entity_type":"cat","entity_value":"fleurs"}],"reply":"Fleurs priorisées."}}
{"input":"moins de courges","output":{"actions":[{"action":"reduce","entity_type":"subcat","entity_value":"courges"}],"reply":"Courges limitées à 1-2 variétés."}}
{"input":"je ne veux que des tomates","output":{"actions":[{"action":"only","entity_type":"subcat","entity_value":"tomates"}],"reply":"Sélection exclusive tomates."}}
{"input":"je veux que des légumes","output":{"actions":[{"action":"only","entity_type":"group","entity_value":"legumes"}],"reply":"Sélection exclusive légumes."}}
{"input":"remplace les courges par des courgettes","output":{"actions":[{"action":"exclude","entity_type":"subcat","entity_value":"courges"},{"action":"boost","entity_type":"subcat","entity_value":"courgettes"}],"reply":"Courges retirées, courgettes priorisées."}}
{"input":"c'est trop cher","output":{"actions":[{"action":"budget_down","entity_type":null,"entity_value":null}],"reply":"Budget réduit."}}
{"input":"enlève les piments et ajoute des physalis","output":{"actions":[{"action":"exclude","entity_type":"subcat","entity_value":"piments"},{"action":"boost","entity_type":"subcat","entity_value":"physalis"}],"reply":"Piments retirés, physalis ajoutés."}}

Format :
{"actions":[{"action":"exclude"|"boost"|"reduce"|"only"|"budget_down"|"budget_up"|"reset","entity_type":"subcat"|"cat"|"group"|null,"entity_value":"valeur ou null"}],"reply":"phrase courte factuelle"}`;

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
