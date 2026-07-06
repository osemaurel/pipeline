# Prompt de démarrage — à coller dans Claude Code

# Prompt de démarrage — à coller dans Claude Code

## Étape 0 — Connecter Supabase via MCP (avant de lancer le prompt)

Dans le dossier de ton projet, lance :
```bash
claude mcp add --transport http supabase "https://mcp.supabase.com/mcp?project_ref=TON_PROJECT_REF"
```
(remplace `TON_PROJECT_REF` par la Reference ID trouvable dans Supabase →
Project Settings → General)

Puis dans Claude Code, lance `/mcp` et autorise la connexion via la fenêtre de
navigateur qui s'ouvre.

Vérifie que ça marche en demandant : *"Liste les tables de la base de données avec
les outils MCP"*.

---

## Étape 1 — Le prompt à coller

Copie-colle ce message dans Claude Code une fois le MCP connecté, après avoir placé
les fichiers `CLAUDE.md` et `04-supabase-schema-v2.sql` à la racine de ton projet.

---

Je veux construire "Pipeline", une plateforme pour freelances combinant portfolio
public, CRM de prospection, et génération de contenu IA. Le contexte complet du
projet est dans CLAUDE.md à la racine — lis-le en entier avant de commencer.

IMPORTANT : ne développe PAS de landing page marketing pour le moment. On se
concentre uniquement sur l'interface applicative (après connexion, on va directement
vers l'onboarding puis le dashboard, pas de page d'accueil publique à construire
maintenant).

Tu es connecté à mon projet Supabase via MCP. Le schéma de base de données complet
à créer est dans 04-supabase-schema-v2.sql à la racine. Utilise les outils MCP pour :
1. Vérifier l'état actuel de la base (tables déjà existantes ou non)
2. Exécuter le schéma SQL fourni s'il n'est pas déjà en place
3. Récupérer l'URL et la clé anon du projet directement via MCP pour configurer le
   client Supabase côté frontend (pas besoin que je te les donne manuellement)

Commence par :
1. Initialiser un projet Vite + React + TypeScript + Tailwind
2. Installer et configurer le client Supabase (avec les infos récupérées via MCP)
3. Mettre en place le design system (couleurs, fonts) tel que décrit dans CLAUDE.md
4. Construire l'authentification (signup/login) avec Supabase Auth
5. Construire la structure de routing avec routes protégées

Une fois cette base posée, on avancera fonctionnalité par fonctionnalité en suivant
l'ordre de priorité indiqué dans CLAUDE.md (Onboarding → Dashboard → Portfolio → CRM
→ Générateur IA → Ma routine → Ressources/Stats/Paramètres → Paiement).

Pose-moi des questions si un point du cahier des charges n'est pas clair avant de
te lancer dans le code.

---

## Notes

- Le MCP donne à Claude Code des droits élevés sur ta base (il peut tout modifier,
  pas seulement lire). C'est volontaire pour cette phase de construction.
- Une fois l'app en production avec de vraies données utilisateurs, pense à
  déconnecter le MCP ou à le repasser en mode plus restreint pour éviter tout
  risque de modification accidentelle.
- Si Claude Code te pose des questions de clarification avant de coder, c'est normal
  et souhaitable — réponds-y avant de le laisser continuer
