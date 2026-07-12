# Module "Recherche de prospects ciblée" — Prompt pour Claude Code

## Avant d'envoyer ce prompt

1. Place le fichier `06-supabase-schema-v3-recherche-prospects.sql` à la racine
   de ton projet (à côté des schémas v1 et v2 déjà utilisés)
2. Assure-toi que le MCP Supabase est toujours connecté (`/mcp` dans Claude Code
   si besoin de se reconnecter)

---

## Le prompt à coller

Je veux ajouter un nouveau module à Pipeline : la **recherche de prospects ciblée**.
Le contexte général du projet est toujours dans CLAUDE.md. Voici les spécifications
détaillées de ce nouveau module.

### Objectif fonctionnel

L'utilisateur doit pouvoir taper une recherche du type "restaurants à Paris sans
site web" et obtenir un tableau avec : nom de l'entreprise, nom du dirigeant,
téléphone, adresse, et deux boutons d'action (ouvrir un brouillon dans son propre
client email, contacter sur WhatsApp) qui créent automatiquement un prospect dans
son CRM une fois l'action faite.

### Schéma de données

Utilise le schéma dans `06-supabase-schema-v3-recherche-prospects.sql` (à exécuter
via MCP) : tables `search_credits`, `lead_searches`, `lead_search_results`.

Chaque utilisateur démarre avec 20 crédits de recherche (voir fonction
`init_search_credits`). Une recherche coûte 1 crédit par tranche de 10 résultats
retournés (arrondi au supérieur). Affiche le nombre de crédits restants dans
l'interface, et bloque la recherche si crédits insuffisants avec un message clair.

### Architecture technique — IMPORTANT

**Toute la logique d'appel aux APIs externes doit passer par des Supabase Edge
Functions, jamais depuis le frontend.** Crée les Edge Functions suivantes :

**1. `search-businesses`**
- Reçoit : ville, catégorie de commerce, filtre "sans site web uniquement"
- Appelle l'**Overpass API d'OpenStreetMap** (`https://overpass-api.de/api/interpreter`)
  pour chercher les commerces de la catégorie donnée dans la ville donnée
- Filtre les résultats sans champ `website` si le filtre est activé
- Pour chaque résultat, appelle l'**API annuaire-entreprises.data.gouv.fr**
  (`https://recherche-entreprises.api.gouv.fr/search`) en essayant de matcher
  par nom d'entreprise + ville pour récupérer le nom du dirigeant légal quand
  disponible
- Décrémente les crédits de l'utilisateur (vérifie le solde AVANT de lancer la
  recherche, jamais après)
- Enregistre les résultats dans `lead_search_results` liés à une nouvelle ligne
  dans `lead_searches`
- Retourne les résultats au frontend

**2. Pas d'Edge Function pour l'email — logique 100% côté client**

Il n'y a **aucun service d'envoi d'email côté serveur**. Quand l'utilisateur clique
sur "Envoyer un email" pour un résultat :
- Une modale s'ouvre avec un champ Objet et un champ Message, pré-remplis à partir
  d'un template choisi (réutilise la table `templates` existante, avec les
  variables `{prenom}`/`{entreprise}` etc. remplies avec les infos du résultat)
- L'utilisateur peut modifier librement le texte avant l'envoi
- Au clic sur "Ouvrir dans mon client mail", génère un lien `mailto:` avec le
  destinataire (si email connu, sinon champ libre à saisir), l'objet et le corps
  encodés en URL (`encodeURIComponent`), et ouvre ce lien — ça lance le client
  email par défaut de l'utilisateur (Gmail, Outlook, Mail...) avec tout pré-rempli.
  L'utilisateur envoie lui-même depuis sa propre adresse.
- Une fois ce lien ouvert, marque côté app `contacted = true`,
  `contacted_at = now()`, `contact_method = 'email'` sur le résultat (on ne peut
  pas savoir si l'email a réellement été envoyé, seulement que l'utilisateur a
  déclenché l'action — c'est un choix assumé, pas un tracking de délivrabilité)
- Crée automatiquement un prospect dans le CRM de l'utilisateur avec
  `source = 'lead_search'`, et lie `converted_to_prospect_id`

Si l'email du commerce n'est pas connu (cas fréquent, l'annuaire-entreprises ne
fournit pas toujours l'email), affiche un champ pour que l'utilisateur saisisse
lui-même l'adresse avant de générer le lien `mailto:`.

### Interface utilisateur

Ajoute un nouveau menu dans le sidebar : **"Recherche de prospects"** (icône
`Search` ou `Radar` de lucide-react), positionné après "Prospects" dans la
navigation.

**Page de recherche :**
- Formulaire simple : ville (texte libre), catégorie de commerce (select avec les
  catégories disponibles côté Overpass : restaurant, café, coiffeur, boulangerie,
  etc. — voir la liste de catégories OSM standard), toggle "Sans site web
  uniquement" (activé par défaut)
- Indicateur de crédits restants visible en permanence sur cette page
- Bouton "Lancer la recherche" désactivé si crédits insuffisants, avec message
  explicite

**Tableau de résultats :**
- Colonnes : Nom de l'entreprise, Dirigeant (si trouvé, sinon "—"), Téléphone,
  Adresse, Statut (contacté / pas encore)
- Bouton par ligne : "Envoyer un email" (ouvre une modale avec objet + message,
  pré-rempli avec un template au choix, puis génère un lien `mailto:` qui ouvre
  le client email de l'utilisateur — aucun envoi depuis un serveur), "WhatsApp"
  (ouvre `wa.me/{numéro}` dans un nouvel onglet si téléphone disponible),
  "Ajouter au CRM" (crée un prospect sans déclencher de contact, pour les cas où
  l'utilisateur préfère prospecter manuellement plus tard)
- Une fois qu'une ligne est "contactée" (email envoyé), elle passe visuellement
  en grisé/coché

**Historique des recherches :**
- Liste des recherches passées avec date, critères, nombre de résultats — permet
  de revenir sur une recherche précédente sans consommer de nouveaux crédits

### Points de sécurité à respecter scrupuleusement

1. Vérifier le solde de crédits côté serveur (Edge Function `search-businesses`)
   avant toute recherche, jamais faire confiance à une vérification côté frontend
2. RLS déjà en place sur les nouvelles tables — vérifie qu'elles sont bien
   actives après exécution du schéma SQL
3. Gérer proprement les cas d'erreur de l'Overpass API (timeout fréquent sur
   les grosses villes) — afficher un message clair à l'utilisateur plutôt qu'un
   écran blanc

### Ce qui est HORS PÉRIMÈTRE pour ce module

- Pas de scraping LinkedIn ou Google Maps (violerait leurs conditions
  d'utilisation)
- Pas d'intégration Google Places API pour l'instant (coût trop élevé, on reste
  sur Overpass/OpenStreetMap qui est gratuit)
- Pas de système d'achat de crédits supplémentaires pour l'instant (juste les
  20 crédits offerts au départ) — ce sera une itération future une fois le
  besoin confirmé

Commence par créer les Edge Functions, teste-les indépendamment (tu peux simuler
un appel), puis construis l'interface. Pose-moi des questions si un point n'est
pas clair.

---

## Notes après développement

- Teste la fonctionnalité toi-même avec une vraie recherche ("boulangerie à
  Cotonou" par exemple) avant de considérer le module terminé
- Si l'Overpass API renvoie peu de résultats pour certaines villes africaines
  (couverture OpenStreetMap parfois plus faible qu'en Europe), c'est une
  limite connue à ce stade — on pourra évaluer une API payante plus tard si
  ça bloque vraiment l'usage
