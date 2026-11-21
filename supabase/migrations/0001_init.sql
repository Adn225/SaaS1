-- =============================================================================
-- Relancia — schéma initial
-- À exécuter dans Supabase : SQL Editor > New query > coller > Run
-- (ou `supabase db push` avec la CLI Supabase)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Profils (1 ligne par utilisateur, créée automatiquement à l'inscription)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  email                   text not null,
  company_name            text,                 -- Raison sociale affichée dans les emails
  siret                   text,
  address                 text,                 -- Adresse postale (pour la mise en demeure)
  signature               text,                 -- Signature des emails
  late_penalty_rate       text not null default 'trois fois le taux d''intérêt légal',
  -- Abonnement
  trial_ends_at           timestamptz not null default (now() + interval '14 days'),
  stripe_customer_id      text unique,
  stripe_subscription_id  text,
  subscription_status     text,                 -- statut Stripe : trialing, active, past_due, canceled…
  current_period_end      timestamptz,
  created_at              timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. Clients
-- -----------------------------------------------------------------------------
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  email       text not null,
  phone       text,
  address     text,
  created_at  timestamptz not null default now()
);
create index clients_user_id_idx on public.clients (user_id);
create unique index clients_user_email_uniq on public.clients (user_id, lower(email));

-- -----------------------------------------------------------------------------
-- 3. Factures
-- -----------------------------------------------------------------------------
create table public.invoices (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  client_id         uuid not null references public.clients (id) on delete restrict,
  number            text not null,
  amount            numeric(12, 2) not null check (amount > 0),   -- montant TTC en euros
  issue_date        date,
  due_date          date not null,
  status            text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  paid_at           timestamptz,
  pdf_path          text,                                        -- chemin dans le bucket "invoices"
  reminders_paused  boolean not null default false,
  created_at        timestamptz not null default now(),
  unique (user_id, number)
);
create index invoices_user_status_idx on public.invoices (user_id, status);
create index invoices_due_date_idx on public.invoices (due_date) where status = 'unpaid';

-- -----------------------------------------------------------------------------
-- 4. Scénario de relance (étapes modifiables par l'utilisateur)
--    offset_days : décalage par rapport à l'échéance (-3 = J-3, 10 = J+10)
--    kind        : 'reminder' (email simple) ou 'formal_notice' (email + PDF de mise en demeure)
-- -----------------------------------------------------------------------------
create table public.reminder_steps (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  offset_days  integer not null check (offset_days between -60 and 365),
  kind         text not null default 'reminder' check (kind in ('reminder', 'formal_notice')),
  label        text not null,
  subject      text not null,
  body         text not null,
  enabled      boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (user_id, offset_days)
);

-- -----------------------------------------------------------------------------
-- 5. Historique des relances envoyées
-- -----------------------------------------------------------------------------
create table public.reminder_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  invoice_id   uuid not null references public.invoices (id) on delete cascade,
  step_id      uuid references public.reminder_steps (id) on delete set null,
  offset_days  integer not null,
  kind         text not null,
  label        text not null,
  email_to     text not null,
  subject      text not null,
  status       text not null check (status in ('sent', 'failed')),
  error        text,
  provider_id  text,                    -- identifiant Resend
  sent_at      timestamptz not null default now()
);
create index reminder_logs_invoice_idx on public.reminder_logs (invoice_id, sent_at desc);
-- Garantit qu'une même étape n'est envoyée avec succès qu'une seule fois par facture
create unique index reminder_logs_once_uniq on public.reminder_logs (invoice_id, offset_days) where status = 'sent';

-- =============================================================================
-- Row Level Security : chaque utilisateur ne voit que ses propres données
-- (le service role utilisé par la tâche planifiée contourne RLS)
-- =============================================================================
alter table public.profiles       enable row level security;
alter table public.clients        enable row level security;
alter table public.invoices       enable row level security;
alter table public.reminder_steps enable row level security;
alter table public.reminder_logs  enable row level security;

create policy "profil: lecture"  on public.profiles for select using (auth.uid() = id);
create policy "profil: édition"  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "clients: tout"   on public.clients        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "factures: tout"  on public.invoices       for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scénario: tout"  on public.reminder_steps for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "historique: lecture" on public.reminder_logs for select using (auth.uid() = user_id);

-- Les colonnes d'abonnement ne doivent être modifiées que par le webhook Stripe (service role)
revoke update on public.profiles from authenticated;
grant update (company_name, siret, address, signature, late_penalty_rate) on public.profiles to authenticated;

-- =============================================================================
-- Création automatique du profil + scénario par défaut à l'inscription
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, company_name)
  values (new.id, new.email, nullif(trim(new.raw_user_meta_data ->> 'company_name'), ''));

  insert into public.reminder_steps (user_id, offset_days, kind, label, subject, body) values
  (new.id, -3, 'reminder', 'Rappel courtois avant échéance',
   'Rappel : facture {{numero_facture}} à échéance le {{date_echeance}}',
   E'Bonjour {{client_nom}},\n\nSauf erreur de notre part, la facture n° {{numero_facture}} d''un montant de {{montant}} arrivera à échéance le {{date_echeance}}.\n\nNous vous remercions par avance de bien vouloir procéder à son règlement à cette date. Si celui-ci est déjà en cours, nous vous prions de ne pas tenir compte de ce message.\n\nNous restons à votre disposition pour toute question.\n\nBien cordialement,\n{{signature}}'),

  (new.id, 3, 'reminder', 'Première relance',
   'Facture {{numero_facture}} en attente de règlement',
   E'Bonjour {{client_nom}},\n\nSauf erreur ou omission de notre part, nous n''avons pas encore reçu le règlement de la facture n° {{numero_facture}} d''un montant de {{montant}}, arrivée à échéance le {{date_echeance}}.\n\nNous vous serions reconnaissants de bien vouloir procéder à son paiement dans les meilleurs délais. Si vous l''avez déjà effectué, merci de ne pas tenir compte de ce message.\n\nPour rappel, conformément à l''article L441-10 du Code de commerce, tout retard de paiement entraîne de plein droit l''application de pénalités de retard ({{taux_penalites}}) ainsi qu''une indemnité forfaitaire pour frais de recouvrement de 40 €.\n\nBien cordialement,\n{{signature}}'),

  (new.id, 10, 'reminder', 'Relance ferme',
   'Deuxième relance : facture {{numero_facture}} impayée depuis {{jours_retard}} jours',
   E'Bonjour {{client_nom}},\n\nMalgré notre précédent rappel, la facture n° {{numero_facture}} d''un montant de {{montant}}, échue depuis le {{date_echeance}}, demeure impayée à ce jour, soit {{jours_retard}} jours de retard.\n\nNous vous demandons de bien vouloir régulariser cette situation sous huit jours.\n\nNous vous rappelons qu''en application des articles L441-10 et D441-5 du Code de commerce, ce retard rend exigibles de plein droit des pénalités de retard ({{taux_penalites}}) ainsi qu''une indemnité forfaitaire pour frais de recouvrement de 40 €.\n\nÀ défaut de règlement, nous serons contraints de vous adresser une mise en demeure.\n\nCordialement,\n{{signature}}'),

  (new.id, 20, 'formal_notice', 'Mise en demeure',
   'Mise en demeure de payer — facture {{numero_facture}}',
   E'Bonjour {{client_nom}},\n\nMalgré nos relances, la facture n° {{numero_facture}} d''un montant de {{montant}}, échue le {{date_echeance}}, reste impayée.\n\nVous trouverez ci-joint une mise en demeure de payer, valant interpellation suffisante au sens de l''article 1344 du Code civil.\n\nSans règlement de votre part sous huit jours à compter de la réception de la présente, nous nous réservons le droit d''engager toute procédure de recouvrement, sans autre préavis.\n\nNous vous prions d''agréer nos salutations distinguées.\n{{signature}}');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Stockage des PDF de factures (bucket privé, un dossier par utilisateur)
-- Chemin des fichiers : <user_id>/<invoice_id>.pdf
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invoices', 'invoices', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

create policy "pdf: lecture"   on storage.objects for select using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pdf: ajout"     on storage.objects for insert with check (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pdf: remplacement" on storage.objects for update using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pdf: suppression"  on storage.objects for delete using (bucket_id = 'invoices' and (storage.foldername(name))[1] = auth.uid()::text);
