# AGENT.md — Seedelli

## Vision

Outil gratuit et open-source de recommandation de semences adaptées à la région et l'altitude de l'utilisateur. Bien commun numérique, pas un produit commercial. Catalogs Kokopelli (2557 variétés) + Germinance (1010 variétés), chat NLP via Claude Haiku.

## État actuel

| Composant | Status | Détails |
|---|---|---|
| Site | ✅ | https://domnumb.github.io/seedelli/ — GitHub Pages, single HTML |
| Catalog Kokopelli | ✅ | 2557 variétés, `catalogs/kokopelli.json` (2.8 MB) |
| Catalog Germinance | ✅ | 1010 variétés, `catalogs/germinance.json` (47 KB) |
| Chat NLP | ✅ | CF Worker `seedelli-chat`, Haiku, basket adjustment |
| Scraper | ✅ | `scrape-kokopelli.js` — 68 pages, 2429 produits |
| Reclassification | ✅ | `reclassify2.py` — 8 catégories, 50+ sous-catégories |
| Outreach Kokopelli | ⚠️ draft | Briefs prêts (Leentje, Ananda), pas encore envoyés |
| Outreach Germinance | 📋 planned | Contact froid avec démo live |
| Multi-semencier | ⚠️ | Architecture OK (`?source=germinance`), UI hardcodée |

## Autonomy scope

**Peut :**
- Enrichir les catalogs (scrape, reclassification, validation)
- Corriger bugs code (index.html, worker)
- Recherche marché semencier, analyse concurrents
- Préparer drafts outreach dans `outreach/drafts/`

**Ne peut pas :**
- Envoyer des emails ou messages aux partenaires (Kokopelli, Germinance)
- Modifier le worker en production sans test
- Engager des partenariats

## Stack et commandes

```bash
# Scrape Kokopelli
node scrape-kokopelli.js

# Clean names
node clean-names.js

# Reclassify
python3 reclassify2.py

# Validate catalog
node validate.js

# Deploy worker
cd worker && wrangler deploy

# Site = push to GitHub (GitHub Pages auto-deploy)
git push origin main
```

## Next actions

1. **Finaliser outreach Kokopelli** — drafts email Leentje + LinkedIn Ananda prêts → Pax valide et envoie — complétion : réponse reçue
2. **Préparer outreach Germinance** — cold email avec démo live — complétion : draft dans `outreach/drafts/`
3. **UI multi-semencier** — toggle Kokopelli/Germinance dans l'interface — complétion : sélecteur visible, deux catalogs chargeables
4. **Améliorer chat NLP** — ajouter companions planting suggestions dans les réponses — complétion : chat suggère associations
5. **SEO + analytics** — ajouter meta tags, tracking basique — complétion : données de trafic visibles

## Journal agent

| Date | Agent | Action |
|---|---|---|
| 2026-03-03 | cc-cto | Création AGENT.md — système multi-agents v1.0 |
