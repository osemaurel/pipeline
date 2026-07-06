# Pipeline — Contexte projet pour Claude Code

## Vision

Plateforme pour freelances francophones (Afrique de l'Ouest en priorité) combinant :
1. Un **portfolio professionnel public** avec lien personnalisé partageable (fonctionnalité phare)
2. Un **CRM de prospection** pour suivre ses clients potentiels
3. Un **générateur de contenu IA léger** pour rédiger des descriptions de services

Proposition de valeur : "Envoie un lien, pas un CV. Suis tes prospects, pas ta mémoire."

Modèle économique : paiement unique (one-time), pas de version gratuite. Accès à
l'interface bloqué tant que le paiement n'est pas confirmé côté serveur.

## ⚠️ Périmètre de cette phase de développement

**NE PAS développer la landing page publique marketing pour le moment.**
On se concentre uniquement sur :
- L'interface applicative (dashboard, portfolio editor, CRM, etc.)
- L'authentification
- Les fonctionnalités cœur

La landing page (page d'accueil marketing avec pricing, hero, etc.) sera faite dans
une phase ultérieure séparée. Pour l'instant, après connexion/inscription, on va
directement vers l'app (onboarding puis dashboard).

## Stack technique

- **Frontend** : React + TypeScript + Tailwind CSS
- **Backend** : Supabase (Postgres + Auth + Row Level Security + Edge Functions)
- **State management** : Zustand
- **Routing** : react-router-dom
- **Icônes** : lucide-react
- **Dates** : date-fns avec locale française (`fr`)
- **Graphiques** : recharts
- **IA** : Claude API (Anthropic), appelée uniquement depuis une Edge Function
  Supabase (jamais de clé API exposée côté client)
- **Paiement** : Moneroo ou MoneyFusion, confirmation via webhook → Edge Function

## Design system

- Couleurs Tailwind custom :
  - `cream-50/100/200/300` : fonds (du plus clair au plus texturé)
  - `ink-50...950` : texte et éléments sombres
  - `accent-500 #E87A34` : orange, couleur d'action principale (CTA, liens actifs)
  - `success-500`, `danger-500`, `warn-500` : états
- Typographie :
  - `font-sans` → Geist (texte courant)
  - `font-display` → Instrument Serif (titres, style éditorial)
  - `font-mono` → Geist Mono (données chiffrées, scores)
- Coins arrondis : 8px (boutons/inputs), 12px (cards)
- Ambiance générale : chaleureuse, professionnelle, pas "SaaS générique bleu/blanc"

## Règles de sécurité non négociables

1. **Jamais de clé API (Anthropic, Moneroo, MoneyFusion) côté client.** Tout appel à
   ces services passe par une Supabase Edge Function.
2. **Le paiement est vérifié uniquement via webhook serveur**, jamais via une simple
   redirection côté client après paiement. Ne jamais débloquer `has_paid` depuis le
   frontend.
3. **RLS (Row Level Security) activé sur toutes les tables** contenant des données
   utilisateur. Chaque utilisateur ne voit et modifie que ses propres données, sauf
   les tables `portfolios`, `portfolio_services`, `portfolio_projects`,
   `portfolio_testimonials` qui sont lisibles publiquement quand `is_published = true`.
4. **`portfolio_leads` accepte les insertions anonymes** (le formulaire public de
   demande de devis doit fonctionner sans authentification) mais seul le propriétaire
   peut les lire.

## Langue

Toute l'interface est en français. Les commentaires de code peuvent être en français
ou anglais, à ta convenance, mais rester cohérent.

## Schéma de base de données

Le schéma Supabase complet est dans `04-supabase-schema-v2.sql` à la racine du projet
(ou dans `/docs` si tu préfères l'y déplacer). Tables principales :

- `profiles` — infos utilisateur + statut de paiement (`has_paid`, `paid_at`, etc.)
- `payments` — historique des paiements (écriture réservée à la service_role key)
- `prospects`, `interactions`, `actions`, `meetings` — cœur du CRM
- `goals`, `goal_progress`, `daily_routines` — module "Ma routine" (optionnel/désactivable)
- `templates`, `discovery_questions`, `objection_responses` — Ressources
- `portfolios`, `portfolio_services`, `portfolio_projects`, `portfolio_testimonials`,
  `portfolio_leads` — module Portfolio (fonctionnalité phare)
- `ai_generations` — historique des générations de contenu IA

## Priorité de développement recommandée

1. Auth Supabase (signup/login) + structure de routing protégé
2. Onboarding (reprendre la logique du prototype existant)
3. Dashboard
4. Portfolio (éditeur privé + page publique + QR code + compteur de vues)
5. CRM (prospects, pipeline kanban, rendez-vous)
6. Générateur de contenu IA
7. Ma routine (module désactivable)
8. Ressources, Statistiques, Paramètres
9. Flow de paiement (webhook + gating) — peut être développé en parallèle mais
   activé/testé en dernier
