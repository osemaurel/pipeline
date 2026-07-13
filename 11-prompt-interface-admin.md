# Interface d'administration — Prompt pour Claude Code

## Avant d'envoyer ce prompt

1. Place le fichier `10-supabase-schema-v5-admin.sql` à la racine du projet
2. MCP Supabase connecté
3. Tu dois avoir déjà un compte utilisateur normal créé dans l'app (via la page
   de signup). Note ton email — tu en auras besoin après pour te promouvoir admin.

---

## Le prompt à coller

Je veux ajouter une **interface d'administration complète** à Pipeline, accessible
via la route `/admin` de la même application (pas de sous-domaine séparé pour
l'instant).

Le contexte général du projet est dans CLAUDE.md. Voici les spécifications
détaillées de ce module.

### Le schéma de données

Utilise `10-supabase-schema-v5-admin.sql` (à exécuter via MCP). Il crée :
- `admin_users` (les comptes qui ont les droits admin, plusieurs possibles)
- `admin_action_logs` (traçabilité de toutes les actions admin sensibles)
- Colonnes ajoutées sur `profiles` : `is_suspended`, `suspended_at`,
  `suspended_by`, `suspension_reason`
- Fonction `is_admin()` utilisée dans les policies RLS pour donner l'accès admin
- Vue `admin_dashboard_stats` pour les KPIs globaux
- Nouvelles policies sur les tables existantes pour permettre à un admin de tout
  lire (les modifications passent toujours par Edge Functions)

**Note importante sur la sécurité** : la promotion d'un utilisateur au rang d'admin
se fait **uniquement en SQL direct** (Supabase Dashboard), pas depuis l'interface.
Ça évite qu'un admin compromis puisse en promouvoir d'autres. Le script SQL contient
la requête commentée à exécuter — j'exécuterai cette requête moi-même après le
développement.

### Structure de l'interface admin

**Route** : `/admin` (et sous-routes `/admin/users`, `/admin/users/:id`,
`/admin/activity`, `/admin/logs`)

**Protection d'accès** :
- Un utilisateur non authentifié → redirection vers `/login`
- Un utilisateur authentifié mais qui n'est pas dans `admin_users` → page 403
  avec message clair "Accès réservé aux administrateurs" et bouton retour au
  dashboard normal
- Un utilisateur dans `admin_users` → accès aux pages `/admin/*`

**Layout dédié** :
- Layout visuellement distinct de l'app utilisateur (par ex. sidebar avec fond
  plus sombre, badge "Admin" en haut, palette légèrement différente) pour que
  l'admin sache toujours où il se trouve
- Sidebar avec les sections : Dashboard, Utilisateurs, Activité, Logs
- Bouton "Retourner à l'app utilisateur" bien visible en haut pour repasser
  facilement en mode utilisateur normal

### Page 1 — Dashboard admin (`/admin`)

Vue d'ensemble avec les KPIs récupérés depuis la vue `admin_dashboard_stats` :
- Utilisateurs total / payants / suspendus
- Nouveaux utilisateurs 7 jours / 30 jours
- Total prospects créés
- Total services générés
- Total propositions Upwork générées
- Total recherches de leads effectuées
- Total crédits consommés
- Revenus totaux (paiements confirmés)

Sous les KPIs, deux graphiques simples (recharts) :
- Évolution du nombre d'inscriptions sur les 30 derniers jours (courbe)
- Répartition des utilisateurs (payants / non payants / suspendus) — donut

Et un tableau des **5 derniers utilisateurs inscrits** avec lien vers leur fiche.

### Page 2 — Liste utilisateurs (`/admin/users`)

Tableau paginé avec les colonnes :
- Avatar + nom complet + email
- Date d'inscription
- Statut (Payant / Non payant / Suspendu — badges de couleur distincts)
- Crédits restants
- Nombre de prospects
- Nombre de services générés
- Bouton "Voir la fiche"

Filtres en haut :
- Recherche par nom/email (input avec debounce)
- Filtre par statut (Tous / Payants / Non payants / Suspendus)
- Tri (date d'inscription, crédits, activité)

Export CSV de la liste filtrée (bouton en haut à droite).

### Page 3 — Fiche utilisateur (`/admin/users/:id`)

Vue détaillée avec plusieurs sections en onglets :

**Onglet "Profil"**
- Toutes les infos du profil (nom, email, entreprise, pitch, ICP, canaux actifs)
- Date d'inscription, dernière activité
- Statut de paiement (avec date et montant si payé)
- Statut de suspension (si suspendu : date, raison, admin qui a suspendu)

**Actions disponibles sur le profil** :
- **Ajouter des crédits** (modale avec input numérique + raison → Edge Function
  `admin-add-credits`)
- **Retirer des crédits** (modale similaire → Edge Function `admin-remove-credits`)
- **Suspendre le compte** (modale avec input raison obligatoire → Edge Function
  `admin-suspend-user`)
- **Réactiver le compte** (si déjà suspendu → Edge Function `admin-unsuspend-user`)
- **Envoyer un email** (juste ouvre `mailto:` avec l'email de l'utilisateur, pas
  d'envoi depuis l'app)
- **Se connecter en tant que cet utilisateur (impersonation)** —
  ⚠️ **NE PAS IMPLÉMENTER pour l'instant, on verra plus tard**

**Onglet "Activité"**
- Timeline des actions récentes de l'utilisateur : prospects créés, services
  générés, recherches lancées, connexions, etc.
- Limité aux 50 derniers événements pour la performance

**Onglet "Contenu"**
- Portfolio de l'utilisateur (lien public + aperçu si publié)
- Liste des services générés (titre, plateforme, date, miniature en petit)
- Liste des propositions Upwork générées

**Onglet "Historique admin"**
- Toutes les actions admin effectuées sur ce compte (qui, quand, quoi)
- Filtrable par admin qui a fait l'action

### Page 4 — Activité globale (`/admin/activity`)

Feed en temps réel (rafraîchi toutes les 30 secondes) des dernières actions
utilisateurs sur toute la plateforme :
- Nouveau signup
- Nouveau paiement
- Nouveau prospect créé
- Nouveau service généré
- Nouvelle recherche lancée

Filtres par type d'événement et par période. Utile pour "prendre le pouls" de la
plateforme.

### Page 5 — Logs admin (`/admin/logs`)

Tableau paginé de tous les logs de `admin_action_logs` :
- Colonnes : Date, Admin (avatar + nom), Action, Utilisateur cible, Détails
- Filtres : par admin, par type d'action, par période
- Export CSV

C'est l'audit trail — critique pour retracer qui a fait quoi.

### Consignes techniques transverses

**Toutes les actions admin sensibles passent par des Edge Functions** avec la
`service_role` key, jamais depuis le frontend directement. Edge Functions à créer :

- `admin-add-credits` : ajoute des crédits à un utilisateur, logue l'action
- `admin-remove-credits` : retire des crédits (sans passer en dessous de 0)
- `admin-suspend-user` : passe `is_suspended = true`, remplit
  `suspended_at`, `suspended_by`, `suspension_reason`, logue
- `admin-unsuspend-user` : passe `is_suspended = false`, logue
- Chaque Edge Function doit :
  - Vérifier que l'appelant est bien dans `admin_users` (via son JWT)
  - Effectuer l'action avec la `service_role` key
  - Insérer une ligne dans `admin_action_logs` avec les détails

**Impact de la suspension côté utilisateur** :
- Modifier le flux d'auth de l'app utilisateur normale : si un utilisateur est
  `is_suspended = true`, à sa prochaine tentative de connexion, afficher un
  message "Votre compte a été suspendu. Contactez le support si vous pensez
  qu'il s'agit d'une erreur." avec l'email de contact, et logout immédiat
- Un utilisateur suspendu ne peut plus faire aucune action dans l'app (au niveau
  de la vérification côté frontend + policies RLS mises à jour si besoin)

**Design** :
- Reprendre le design system existant (cream / ink / accent)
- Layout admin légèrement plus dense que l'app utilisateur (tableaux plus
  compacts, plus d'info à l'écran) — c'est un outil de travail intensif, pas
  une interface grand public
- Badge "Mode Admin" toujours visible dans le header pour éviter les confusions

**Performance** :
- Utiliser la pagination côté serveur pour les listes utilisateurs et logs
- La vue `admin_dashboard_stats` évite les 10 requêtes séparées sur le dashboard

**Ne pas oublier** :
- Le premier admin est promu manuellement via SQL après le développement (la
  requête est commentée dans le fichier SQL)
- Tester le flux : créer un 2e compte utilisateur normal, vérifier qu'il n'a pas
  accès à `/admin` (page 403), puis le promouvoir admin en SQL et vérifier qu'il
  y accède
- Vérifier que le layout admin est bien différent visuellement du layout
  utilisateur normal

### Ce qui est HORS PÉRIMÈTRE

- Gestion des prix / abonnements / plans (on verra plus tard, actuellement le
  modèle est paiement unique)
- Impersonation (se connecter en tant qu'un utilisateur) — trop sensible à
  implémenter maintenant
- Système de tickets support intégré — les échanges support passent par email
  externe pour l'instant
- Notifications admin (emails automatiques quand tel événement se passe)

Commence par exécuter le schéma SQL via MCP, puis mets en place la protection
d'accès et le layout admin, puis développe page par page dans l'ordre :
Dashboard → Liste utilisateurs → Fiche utilisateur → Activité → Logs.

Pose-moi des questions si un point mérite précision.
