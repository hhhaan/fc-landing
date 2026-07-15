export type AdminUser = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  provider: string;
  display_name: string | null;
  business_name: string | null;
  plan: string;
  polar_customer_id: string | null;
  roast_count: number;
  /** Billing-cycle month number (1-based) from started_at → current_period_start. Null if no sub / trial. */
  billing_months: number | null;
  /** Day-of-month of billing anchor (UTC). */
  billing_day: number | null;
  subscription_status: string | null;
  recurring_interval: string | null;
};
