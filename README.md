# Relancia

Application SaaS de **relance automatique des factures impayées** pour les TPE, PME, PMI et indépendants.

- Inscription / connexion par email et mot de passe (Supabase Auth)
- Gestion des clients et des factures (PDF joint, import CSV)
- Tableau de bord : total impayé, factures en retard, encaissements du mois
- Scénario de relance modifiable : J-3 rappel courtois · J+3 première relance · J+10 relance ferme · J+20 mise en demeure PDF
- Envoi automatique des emails chaque matin (Vercel Cron + Resend)
- « Marquer comme payée » arrête les relances ; historique complet par facture
- Abonnement Stripe à 19 €/mois avec 14 jours d'essai gratuit (sans carte bancaire)

**Stack** : Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Supabase · Resend · Stripe · pdf-lib

---

## Structure du projet

```
relancia/
├── supabase/migrations/0001_init.sql   Schéma SQL, sécurité RLS, triggers, bucket de stockage
├── vercel.json                         Tâche planifiée quotidienne (7 h UTC ≈ 8 h/9 h à Paris)
├── tests/                              Tests unitaires (moteur de relance, import CSV)
└── src/
    ├── middleware.ts                   Rafraîchit la session et protège les pages privées
    ├── lib/
    │   ├── supabase/                   Clients Supabase (navigateur, serveur, service role)
    │   ├── reminders/schedule.ts       Choix de l'étape à envoyer (logique pure, testée)
    │   ├── reminders/templates.ts      Variables {{...}} et mise en forme HTML des emails
    │   ├── reminders/engine.ts         Envoi des relances + historique
    │   ├── pdf/mise-en-demeure.ts      Génération du PDF de mise en demeure
    │   ├── csv.ts                      Lecture des CSV (format Excel français)
    │   └── stripe.ts, resend.ts, subscription.ts, dates.ts, format.ts
    ├── components/                     Composants d'interface
    └── app/
        ├── page.tsx                    Page d'accueil publique
        ├── connexion/, inscription/, auth/
        ├── (app)/                      Espace connecté (barre latérale)
        │   ├── abonnement/, parametres/    Toujours accessibles
        │   └── (gated)/                    Réservé aux comptes en essai ou abonnés
        │       ├── tableau-de-bord/, clients/, factures/, scenario/
        └── api/
            ├── cron/relances/          Tâche planifiée
            ├── stripe/webhook/         Synchronisation de l'abonnement
            └── factures/[id]/pdf | mise-en-demeure
```

## Schéma de la base de données

| Table | Rôle | Colonnes principales |
|---|---|---|
| `profiles` | 1 ligne par utilisateur (créée par trigger à l'inscription) | `company_name`, `siret`, `address`, `signature`, `late_penalty_rate`, `trial_ends_at`, `stripe_customer_id`, `subscription_status`, `current_period_end` |
| `clients` | Clients de l'utilisateur | `name`, `email` (unique par utilisateur), `phone`, `address` |
| `invoices` | Factures | `number` (unique par utilisateur), `client_id`, `amount`, `issue_date`, `due_date`, `status` (`unpaid`/`paid`), `paid_at`, `pdf_path`, `reminders_paused` |
| `reminder_steps` | Étapes du scénario (4 créées par défaut) | `offset_days` (-3, 3, 10, 20), `kind` (`reminder`/`formal_notice`), `label`, `subject`, `body`, `enabled` |
| `reminder_logs` | Historique des envois | `invoice_id`, `offset_days`, `label`, `email_to`, `subject`, `status` (`sent`/`failed`), `error`, `sent_at` |

Toutes les tables sont protégées par **Row Level Security** : chaque utilisateur n'accède qu'à ses données. Les colonnes d'abonnement ne sont modifiables que par le webhook Stripe (service role). Les PDF sont stockés dans un bucket privé `invoices`, dans un dossier par utilisateur.

## Fonctionnement des relances

Chaque matin, `/api/cron/relances` parcourt les factures impayées (non mises en pause) des comptes actifs :

1. Une étape est due quand `aujourd'hui ≥ échéance + décalage`.
2. Seule l'étape due **la plus avancée** est envoyée : une facture saisie avec 12 jours de retard reçoit la relance J+10, pas trois emails d'un coup.
3. Une étape n'est jamais envoyée deux fois (index unique en base). Un envoi en échec est retenté le lendemain.
4. Une mise en demeure n'est jamais le premier contact : sans relance préalable, la relance la plus avancée est envoyée à la place.
5. Le rappel J-3 n'est plus envoyé une fois l'échéance passée.

Les emails partent depuis `RESEND_FROM_EMAIL` avec la raison sociale de l'utilisateur comme nom d'expéditeur ; les réponses du client arrivent directement chez l'utilisateur (`reply-to`). Le PDF de la facture est joint s'il existe, et la mise en demeure est générée et jointe à l'étape J+20.

> **Mentions légales.** Les modèles mentionnent les pénalités de retard (art. L441-10 C. com.) et l'indemnité forfaitaire de 40 € pour frais de recouvrement (art. D441-5 C. com.). Ces mentions concernent les relations **entre professionnels** : pour un client particulier, adaptez les messages dans « Scénario de relance ». Les modèles fournis sont une base et ne remplacent pas un conseil juridique.

---

## Installation en local

Prérequis : Node.js 22+ et des comptes gratuits Supabase, Resend et Stripe.

```bash
git clone <votre-depot> relancia && cd relancia
npm install
cp .env.example .env.local
```

### 1. Supabase

1. Créez un projet sur [supabase.com](https://supabase.com).
2. **SQL Editor** → New query → collez le contenu de `supabase/migrations/0001_init.sql` → **Run**.
3. **Project Settings → API** : copiez l'URL, la clé `anon` et la clé `service_role` dans `.env.local`.
4. **Authentication → URL Configuration** :
   - Site URL : `http://localhost:3000` (puis l'URL de production)
   - Redirect URLs : ajoutez `http://localhost:3000/auth/callback` et `https://<votre-domaine>/auth/callback`
5. (Optionnel) **Authentication → Emails** : traduisez les emails de confirmation en français. En développement, vous pouvez désactiver « Confirm email » dans Authentication → Providers → Email.

### 2. Resend

1. Créez une clé API sur [resend.com/api-keys](https://resend.com/api-keys) → `RESEND_API_KEY`.
2. Ajoutez et vérifiez votre domaine (enregistrements DNS SPF/DKIM) dans **Domains**.
3. Renseignez `RESEND_FROM_EMAIL`, par ex. `relances@votre-domaine.fr`.

> Sans domaine vérifié, Resend n'autorise l'envoi qu'à votre propre adresse (`onboarding@resend.dev` comme expéditeur), ce qui suffit pour tester.

### 3. Stripe

1. **Catalogue de produits** → créez le produit « Relancia Pro » avec un prix **récurrent mensuel de 19 €** → copiez l'identifiant `price_...` dans `STRIPE_PRICE_ID`.
2. **Développeurs → Clés API** → `STRIPE_SECRET_KEY`.
3. **Paramètres → Billing → Portail client** : activez le portail (résiliation, moyen de paiement, factures).
4. Webhook en local avec la [CLI Stripe](https://docs.stripe.com/stripe-cli) :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

   Copiez le secret `whsec_...` affiché dans `STRIPE_WEBHOOK_SECRET`.

**Essai gratuit** : les 14 jours démarrent à l'inscription, sans carte bancaire (`profiles.trial_ends_at`). Si l'utilisateur s'abonne pendant l'essai, Stripe reçoit un `trial_end` égal à la fin de l'essai : le premier prélèvement n'a lieu qu'à cette date. Après l'essai sans abonnement, l'accès aux pages métier est bloqué et les relances sont suspendues.

### 4. Lancer l'application

```bash
npm run dev
```

Ouvrez http://localhost:3000, créez un compte, ajoutez un client et une facture.

Déclencher manuellement la tâche de relance :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/relances
```

Tests unitaires et vérification des types :

```bash
npm test
```

```bash
npm run typecheck
```

---

## Déploiement sur Vercel

1. Poussez le projet sur GitHub, GitLab ou Bitbucket.
2. Sur [vercel.com/new](https://vercel.com/new), importez le dépôt (framework détecté automatiquement : Next.js).
3. **Environment Variables** : ajoutez toutes les variables de `.env.example`, avec `NEXT_PUBLIC_APP_URL=https://<votre-domaine>` et un `CRON_SECRET` aléatoire, par exemple généré avec :

```bash
openssl rand -hex 32
```

4. Déployez. La tâche planifiée de `vercel.json` est créée automatiquement (onglet **Settings → Cron Jobs**). Vercel envoie `Authorization: Bearer <CRON_SECRET>` à chaque appel.
5. **Stripe** → Développeurs → Webhooks → Ajouter un endpoint :
   - URL : `https://<votre-domaine>/api/stripe/webhook`
   - Événements : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copiez le secret de signature dans `STRIPE_WEBHOOK_SECRET` sur Vercel, puis redéployez.
6. **Supabase** → Authentication → URL Configuration : mettez à jour Site URL et Redirect URLs avec votre domaine.
7. Passez Stripe en mode live (clés `sk_live_`, prix et webhook live) lorsque tout est validé.

> Le plan Vercel Hobby autorise un cron quotidien, suffisant ici. La route de relance peut tourner jusqu'à 300 s (`maxDuration`) ; au-delà de quelques milliers de factures par jour, prévoyez un traitement par lots ou une file d'attente.

## Variables d'environnement

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APP_URL` | URL publique de l'application |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète (cron + webhook uniquement) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Envoi des emails |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID` | Abonnement |
| `CRON_SECRET` | Protège la route de la tâche planifiée |

## Pistes pour la suite

- Envoi de la mise en demeure en lettre recommandée électronique (API AR24, Merci Facteur…)
- Connexion aux logiciels de facturation (Pennylane, Sellsy, Axonaut…)
- Lien de paiement Stripe dans les relances
- Relances par SMS
