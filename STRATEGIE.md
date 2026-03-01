# Stratégie d'expansion — Seedelli

## Insight clé : Seedelli est le premier de sa catégorie

Il n'existe aucun outil de recommandation de semences libres en France ou en Europe.
Ni les grainetiers, ni les réseaux, ni les institutions n'ont ça.
C'est un blue ocean réel — pas une niche, une infrastructure manquante.

---

## La carte des acteurs

### Semenciers artisans français (sans affiliation digitale)

| Semencier | Catalogue | Digital | Réseau |
|-----------|-----------|---------|--------|
| Kokopelli | ~1 600 var. | Sylius / bon | Indépendant |
| Germinance | ~1 010 var. | Bon | Croqueurs de Carottes |
| Biau Germe | ~500 var. | Basique | Croqueurs de Carottes, RSP |
| La Ferme de Sainte Marthe | n.c. | Shopify / bon | Indépendant |
| Semailles (BE) | ~700 var. | Limité | Croqueurs de Carottes |
| Jardin'Envie | n.c. | Limité | Croqueurs de Carottes, RSP fondateur |
| Agrosemens | n.c. | Basique | Indépendant |

**Graines del Païs : cessation d'activité juin 2025** — leur catalogue
pourrait être récupéré/intégré comme ressource libre.

### Les deux réseaux structurants

**Croqueurs de Carottes** — 8 producteurs artisans européens qui se coordonnent
déjà (Biau Germe, Germinance, Semailles, Jardin'Envie + 4 autres).
Entrée plus tractable que RSP. Si Seedelli devient leur outil, c'est 8 catalogues d'un coup.

**Réseau Semences Paysannes (RSP)** — 80+ organisations membres, Maisons des
Semences Paysannes, réseau territorial. Plus grand levier mais conversation plus longue.
Siège : Aiguillon (47). Pas d'outil digital de recommandation.

---

## Les deux questions stratégiques

### 1. Projet propre ou association ?

**Projet propre :** Seedelli reste indépendant, integre plusieurs catalogues,
modèle "powered by Seedelli". Chaque semencier peut avoir son flavor.
→ Plus de contrôle, plus de valeur à terme, nécessite plus de travail de maintien.

**Association (co-ownership) :** Seedelli devient un bien commun numérique,
porté par un réseau (Croqueurs de Carottes ou RSP).
→ Légitimité maximale, distribution naturelle, mais gouvernance partagée.

**Position recommandée :** commencer projet propre avec mentalité "bien commun".
Ne pas chercher à monétiser tant que l'écosystème n'est pas convaincu.
Garder le code open source. Proposer la gouvernance partagée quand la confiance est établie.

### 2. Multi-catalogue : aggregateur ou white-label ?

**Aggregateur** (comparer les prix entre semenciers) :
→ Très utile pour l'utilisateur, mal perçu dans cet écosystème (met en concurrence des gens
qui se respectent). À éviter comme positioning.

**Multi-catalogue non-concurrent** :
Chaque semencier apparaît dans son contexte propre.
L'utilisateur choisit le grainetier qu'il soutient, ou la sélection est filtrée par disponibilité régionale.
→ C'est le bon positionnement. "Trouve les graines adaptées à ta région,
chez le grainetier proche de toi."

---

## Séquence d'expansion recommandée

### Étape 1 — Valider avec Kokopelli (maintenant)
Relation Leentje / Ananda en cours. Objectif : légitimité de base et accès catalogue structuré.

### Étape 2 — Croqueurs de Carottes (dans 2-3 mois)
Pitch simple : "On a construit ça pour Kokopelli, on veut l'ouvrir à votre réseau."
Un seul interlocuteur pour 8 catalogues. Germinance est probablement le plus réceptif
(1 010 variétés, bonne infra digitale, coopérative ouvrière = valeurs alignées).

**Angle Germinance :** leur site a un bon catalogue mais zéro moteur de recommandation.
Seedelli résout exactement ce manque. Contact froid acceptable ici (pas de relation préexistante
nécessaire — la démo parle d'elle-même).

### Étape 3 — RSP comme partenaire institutionnel (6-12 mois)
Une fois 3-4 catalogues intégrés, Seedelli a une légitimité réelle.
RSP pourrait recommander l'outil à leurs 80 membres comme ressource commune.
Pas besoin d'accord formel au départ — juste qu'ils le mentionnent.

### Étape 4 — Europe (12-24 mois)
Bingenheimer (DE), Sativa (CH), Semailles (BE) sont déjà dans l'orbite des Croqueurs.
La recommandation géographique prend tout son sens : variétés adaptées au climat local
→ base de données de zones climatiques à étendre (déjà fait pour la France).

---

## Architecture technique pour multi-semencier

Le catalogue actuel est hardcodé dans le HTML (161 variétés Kokopelli).
Pour intégrer d'autres semenciers sans backend :

**Option A — JSON par semencier dans le repo (viable jusqu'à ~10 semenciers)**
```
seedelli/
  catalogs/
    kokopelli.json   (existant, à extraire du HTML)
    germinance.json
    biau-germe.json
```
Le JS charge le bon catalogue selon un param URL (`?source=germinance`)
ou selon la géographie (semenciers proches de l'utilisateur).
Zéro backend. Update manuel ou via script.

**Option B — Backend léger (quand +5 semenciers)**
Un simple endpoint JSON hébergé (Cloudflare Workers, Deno Deploy, gratuit)
qui sert les catalogues et permet les mises à jour sans redéployer le site.

**Option C — Standard ouvert**
Proposer au réseau un schéma JSON commun pour les catalogues semenciers.
Seedelli devient la référence d'implémentation.
Long terme, fort impact.

---

## Prochaines actions concrètes

1. **[En cours]** Contact Kokopelli via Leentje/Ananda
2. **[Dès validation Kokopelli]** Extraire le catalogue Kokopelli en JSON séparé
   (prépare l'architecture multi-semencier sans changer l'UX)
3. **[Dans 4-6 semaines]** Contact Germinance — cold email avec démo
4. **[En parallèle]** Identifier le bon interlocuteur Croqueurs de Carottes
5. **[Plus tard]** Contact RSP pour positionnement "outil du réseau"
