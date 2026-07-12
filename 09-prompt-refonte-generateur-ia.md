# Refonte du module "Générateur IA" — Prompt pour Claude Code

## Avant d'envoyer ce prompt

1. Place le fichier `08-supabase-schema-v4-generateur-ia.sql` à la racine du projet
2. Vérifie que la clé API OpenAI est bien configurée en secret d'Edge Function
   Supabase (elle est censée déjà être en place selon Maurel)
3. MCP Supabase connecté

---

## Le prompt à coller

Je veux **refondre complètement le module "Générateur IA"** de Pipeline. La version
actuelle (avec les 5 cartes : description de service, post LinkedIn, email de relance,
pitch elevator, message WhatsApp) doit être remplacée. Retire tout ça.

Le nouveau module est un **assistant IA spécialisé pour freelances sur 3 plateformes** :
ComeUp, Fiverr, Upwork. C'est un module qui doit vraiment aider le freelance à
construire son business sur ces plateformes, pas juste générer du texte générique.

### Le schéma de données

Utilise `08-supabase-schema-v4-generateur-ia.sql` (à exécuter via MCP). Il crée :
- `user_visual_style` (le style visuel choisi par l'utilisateur, appliqué à toutes
  ses miniatures)
- `suggested_services` (idées de services proposées par l'IA)
- `generated_services` (services rédigés avec description + miniature)
- `upwork_proposals` (candidatures Upwork générées)

### Décision d'architecture importante

**Pas de scraping des plateformes ComeUp/Fiverr/Upwork.** L'IA (Claude) connaît
déjà très bien ces plateformes grâce à ses données d'entraînement. On mise sur la
qualité des prompts et sur la connaissance générale de l'IA plutôt que sur des
données en temps réel — c'est plus fiable, moins risqué juridiquement, et
suffisamment précis pour la valeur produit visée.

### Interface utilisateur

Une page "Générateur IA" avec **3 onglets** en haut : **ComeUp** | **Fiverr** |
**Upwork**. Chaque onglet a son propre flux.

---

### ONGLET COMEUP

**Flux en 3 étapes** :

**Étape 1 — Suggestions de services gagnants**
- Bouton "Générer des idées de services adaptés à mon profil"
- Ça déclenche un appel à Claude (Edge Function `suggest-comeup-services`) qui reçoit
  en entrée le profil complet de l'utilisateur (compétences, secteur, expérience —
  tout ce qui a été rempli à l'onboarding et dans son portfolio)
- Claude renvoie 8-10 idées de services au format JSON, chacune avec :
  - `title` : titre du service — **DOIT OBLIGATOIREMENT commencer par "Je vais..."**
    (convention ComeUp stricte, exemple : "Je vais créer votre site vitrine WordPress
    optimisé SEO en 5 jours")
  - `category` : catégorie ComeUp (Programmation & Tech, Design, Marketing, etc.)
  - `price_min` et `price_max` : fourchette de prix conseillée en euros
  - `potential` : 'high' | 'medium' | 'low' — potentiel de vente estimé
  - `rationale` : 1-2 phrases expliquant pourquoi ce service marche bien
- Les résultats sont enregistrés en base (`suggested_services`) et affichés en cartes

**Étape 2 — Rédaction complète d'un service choisi**
- L'utilisateur clique sur une carte de suggestion → passage à l'étape 2
- Edge Function `generate-comeup-service` : Claude génère la description complète du
  service au format ComeUp :
  - Titre (relire, ajuster si besoin, doit toujours commencer par "Je vais...")
  - Description détaillée en français, structurée (accroche → ce que vous obtenez →
    processus → pourquoi moi)
  - Prix conseillé
  - 5-10 tags pertinents
  - 3-5 questions FAQ avec réponses
- Résultat éditable inline dans l'interface, puis enregistré dans `generated_services`

**Étape 3 — Génération de la miniature**
- Bouton "Générer la miniature" sur un service rédigé
- Ouvre une modale avec :
  - Sélecteur de style : 5 presets (modern_clean, bold_typo, photo_pro,
    minimal_pastel, tech_dark) + option "custom" avec champ libre + option
    "utiliser une image de référence" (upload)
  - Choix de couleur dominante (color picker)
  - Si l'utilisateur a déjà défini son style dans `user_visual_style`, ces choix
    sont **pré-remplis avec ses préférences existantes** — la cohérence est le
    comportement par défaut
  - Bouton "Sauvegarder ces choix comme mon style par défaut" (met à jour
    `user_visual_style`)
- Au clic sur "Générer" : Edge Function `generate-service-thumbnail` qui appelle
  l'API OpenAI (dernier modèle image disponible — GPT Image ou successeur de
  DALL-E 3) avec un prompt construit dynamiquement à partir de :
  - Le titre et la description du service
  - Le style choisi
  - Le format ComeUp : **1200x760 pixels**
  - Si image de référence fournie, l'inclure dans l'appel (image editing/vision
    de l'API OpenAI)
- L'image générée est stockée dans Supabase Storage (bucket `service-thumbnails`,
  policy : lecture publique, écriture propriétaire uniquement) et l'URL enregistrée
  dans `generated_services.thumbnail_url`

---

### ONGLET FIVERR

**Exactement le même flux que ComeUp**, avec ces adaptations :
- **Tout en anglais** (titres, descriptions, tags)
- **Prix en USD**
- **Titres au format Fiverr** : "I will..." (équivalent anglais de "Je vais...")
- **3 paliers de prix** obligatoires (Basic / Standard / Premium) au lieu d'un prix
  unique — stockés dans `pricing_tiers` de `generated_services` au format
  `[{tier: 'basic', price: X, delivery_days: Y, features: [...]}, ...]`
- Miniatures au **format Fiverr : 1280x769 pixels**
- Réutilise le même `user_visual_style` que ComeUp (cohérence de marque
  personnelle entre plateformes)

---

### ONGLET UPWORK

**Flux différent** : sur Upwork, on ne vend pas de services pré-packagés, on postule
à des missions.

- L'interface propose un grand champ texte : **"Colle ici le texte de l'offre à
  laquelle tu veux postuler"**
- Note explicative sous le champ : "Copie le texte de l'offre Upwork directement.
  Les liens ne sont pas supportés car les offres Upwork sont derrière un login."
- Bouton "Générer ma candidature"
- Edge Function `generate-upwork-proposal` : Claude analyse l'offre + le profil
  utilisateur et génère une cover letter en anglais, structurée :
  - Ouverture accrocheuse (montre qu'il a lu l'offre)
  - Démonstration de compréhension du besoin
  - Ce qu'il apporte concrètement (référence son expérience du profil)
  - Preuve sociale ou exemple pertinent
  - Call-to-action clair
- Le résultat s'affiche dans un éditeur, copiable en un clic, enregistré dans
  `upwork_proposals`
- **Historique des propositions générées** en bas de page, avec possibilité de
  marquer "Utilisée" (`is_used = true`)

---

### Consignes techniques transverses

- **Tous les appels IA (Claude + OpenAI) passent par des Edge Functions Supabase**,
  jamais depuis le frontend
- Les clés API sont en secrets Edge Function (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`)
- **Système de crédits** : décrémenter les crédits `search_credits` à chaque
  génération importante :
  - Suggestions de services : 1 crédit
  - Rédaction d'un service : 1 crédit
  - Miniature : 3 crédits (plus coûteux à cause de l'image)
  - Proposition Upwork : 1 crédit
  - Toujours vérifier le solde côté serveur avant d'appeler l'API
- **Supabase Storage** : créer le bucket `service-thumbnails` si pas déjà présent,
  avec la policy publique en lecture
- **Design** : reprendre le design system existant (couleurs cream/ink/accent,
  fonts Geist/Instrument Serif). Les 3 onglets doivent être visuellement distincts
  (petites icônes ou couleurs subtiles pour les différencier) sans casser
  l'harmonie générale

---

### Ce qui est HORS PÉRIMÈTRE

- Toute génération de contenu qui n'est pas liée aux 3 plateformes (post LinkedIn,
  email de relance, pitch elevator, message WhatsApp — on les retire complètement
  de ce module)
- Le scraping en temps réel des plateformes
- La publication automatique sur les plateformes (l'utilisateur copie-colle
  lui-même sur ComeUp/Fiverr/Upwork)
- L'achat de crédits supplémentaires (V2)

Commence par la refonte de la structure (retirer l'ancien module, exécuter le
nouveau schéma via MCP, créer le bucket Storage), puis développe onglet par onglet
en commençant par ComeUp. Pose-moi des questions si un point mérite précision.
