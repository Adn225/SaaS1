/** Types des lignes de la base de données (voir supabase/migrations/0001_init.sql). */

export type Profile = {
  id: string;
  email: string;
  company_name: string | null;
  siret: string | null;
  address: string | null;
  signature: string | null;
  late_penalty_rate: string;
  trial_ends_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  created_at: string;
};

export type Client = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  created_at: string;
};

export type InvoiceStatus = "unpaid" | "paid";

export type Invoice = {
  id: string;
  user_id: string;
  client_id: string;
  number: string;
  amount: number;
  issue_date: string | null;
  due_date: string; // AAAA-MM-JJ
  status: InvoiceStatus;
  paid_at: string | null;
  pdf_path: string | null;
  reminders_paused: boolean;
  created_at: string;
};

export type StepKind = "reminder" | "formal_notice";

export type ReminderStep = {
  id: string;
  user_id: string;
  offset_days: number;
  kind: StepKind;
  label: string;
  subject: string;
  body: string;
  enabled: boolean;
};

export type ReminderLog = {
  id: string;
  invoice_id: string;
  step_id: string | null;
  offset_days: number;
  kind: StepKind;
  label: string;
  email_to: string;
  subject: string;
  status: "sent" | "failed";
  error: string | null;
  sent_at: string;
};
