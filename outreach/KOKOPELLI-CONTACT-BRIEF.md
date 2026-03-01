# Brief — Contact Kokopelli Semences

**Statut :** Recherche complète — prêt à contacter
**Dernière mise à jour :** 2026-03-01

---

## Ce qu'on sait

### Plateforme e-commerce
**Sylius** (pas PrestaShop) — framework e-commerce open-source sur Symfony.
Point crucial : Sylius a une **API REST native**. Si elle est activée chez Kokopelli,
cart injection et accès catalogue sont techniquement possibles sans module tiers.

### Programme partenaire
- **Programme revendeur** : existe pour retailers physiques (compte pro + documents légaux)
- Pas d'affiliation digitale/commission documentée publiquement
- Réseau actuel : ~30 producteurs certifiés bio, revendeurs en France/Europe

### Contacts
| Rôle | Contact |
|------|---------|
| Presse / Communications | Nathalie Lespes — press@kokopelli-semences.fr — +33 7 86 25 01 84 |
| Service client / réclamations | reclamation@kokopelli-semences.fr |
| Fondateur (retraité 2018) | Dominique Guillet ("Xochi") — Substack actif |

**Adresse** : Forêt de Castagnès, Route de Sabarat, 09290 Le Mas d'Azil, Ariège
→ Note : Le Mas d'Azil est à ~30km de Biert (09400). Connexion régionale possible.

### Analytics
Kokopelli utilise Google Analytics + Matomo + Google Tag Manager.
Ils **voient déjà** les sources de trafic — `?ref=seedelli` sera visible dans GA
comme paramètre UTM si on le formate correctement : `?utm_source=seedelli&utm_medium=referral`

---

## Stratégie de contact recommandée

### Angle
Pas "affilié qui veut une commission" mais **partenaire technique qui envoie du trafic qualifié**.
Montrer d'abord la valeur, négocier ensuite.

### Interlocuteur cible
**Nathalie Lespes** (Communications) est le meilleur premier contact.
Si connexion régionale Ariège possible → mentionner.

### Séquence
1. **Email court** (Nathalie) — présenter Seedelli, demander si intéressés pour discuter
2. **Appel 20 min** — montrer le flow, les stats de clics (même faibles au départ)
3. **Proposition technique** — selon leur réponse : affiliation simple OU intégration API Sylius

---

## Template email — version courte (recommandée)

**À :** press@kokopelli-semences.fr
**Objet :** Outil de recommandation gratuit — 161 de vos variétés, trafic qualifié

---

Bonjour Nathalie,

Je me permets de vous contacter au sujet d'un outil que nous avons développé :
**Seedelli** (https://domnumb.github.io/seedelli/).

En 2 minutes, un jardinier répond à quelques questions (sa région, son altitude,
ses objectifs) et obtient une sélection personnalisée parmi 161 de vos variétés,
avec un calendrier de semis adapté à son climat.

Chaque variété sélectionnée renvoie directement sur votre fiche produit.

Nous aimerions savoir si vous avez un programme partenaire pour ce type
d'apporteur de trafic qualifié, et si une intégration plus poussée vous
semblerait pertinente.

Seriez-vous disponible pour un échange de 20 minutes ?

Cordialement,
[Prénom Nom]
Seedelli

---

## Template email — version longue (si pas de réponse après 1 semaine)

**À :** press@kokopelli-semences.fr
**Objet :** Suite — Seedelli & Kokopelli, partenariat possible

---

Bonjour Nathalie,

Je reviens vers vous suite à mon précédent email.

Pour vous donner une meilleure idée de ce que fait Seedelli :
- L'utilisateur complète un questionnaire de 7 questions (2 minutes)
- Il obtient une sélection de 8 à 15 variétés Kokopelli adaptées à sa région et son budget
- Un calendrier de semis personnalisé selon son altitude et sa zone climatique
- Chaque variété est liée directement à votre page produit

Techniquement, tous les liens sortants portent déjà un paramètre de tracking
(ref=seedelli) visible dans vos analytics — vous pouvez donc mesurer
le trafic que nous vous envoyons indépendamment de toute discussion commerciale.

Ce qui nous intéresserait à terme :
1. Un programme d'affiliation simple (commission sur ventes générées)
2. Un accès à un export de votre catalogue pour maintenir nos 161 variétés à jour
3. Si faisable techniquement : une intégration permettant de pré-remplir
   le panier Kokopelli depuis notre interface (Sylius dispose d'une API REST)

Nous sommes une petite équipe et l'outil est entièrement gratuit pour les utilisateurs.
L'objectif est d'envoyer vers vous des acheteurs qui ont déjà décidé ce qu'ils veulent.

Seriez-vous disponible la semaine prochaine ?

Cordialement,
[Prénom Nom]
Seedelli

---

## Notes techniques — API Sylius

Sylius expose nativement une API REST et GraphQL.
Endpoints pertinents si activés chez Kokopelli :
- `GET /api/v2/shop/products` — catalogue complet avec prix et stock
- `POST /api/v2/shop/orders` — création de panier
- `PATCH /api/v2/shop/orders/{token}/items` — ajout de produits au panier

Si leur API est publique (même partiellement), on peut :
1. Sync automatique du catalogue (prix, disponibilité, nouveaux produits)
2. Créer un panier pré-rempli et rediriger l'utilisateur directement en checkout

À explorer lors du contact technique.

---

## UTM tracking — correction immédiate

Actuellement les liens sortants utilisent `?ref=seedelli`.
Pour être visible dans Google Analytics de Kokopelli, le format correct est :
```
?utm_source=seedelli&utm_medium=referral&utm_campaign=recommandation
```
→ **TODO** : mettre à jour les URLs dans index.html avant le premier contact
  (pour pouvoir leur montrer les stats depuis leur GA dès la prise de contact)

---

## Statut checklist
- [x] Recherche plateforme (Sylius)
- [x] Contacts identifiés
- [x] Brief rédigé
- [x] Templates email prêts
- [ ] UTM format corrigé dans index.html
- [ ] Premier contact envoyé
- [ ] Réponse reçue
