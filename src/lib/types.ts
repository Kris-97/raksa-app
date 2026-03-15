export type UserRole = "admin" | "manager" | "worker";

export type ProjectStatus = "suunnittelu" | "käynnissä" | "valmis" | "keskeytetty";

export type CostStatus = "pending" | "approved" | "rejected";

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  hourly_rate: number | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  code: string;
  client: string;
  address: string | null;
  total_budget: number;
  start_date: string;
  end_date: string | null;
  status: ProjectStatus;
  description: string | null;
  created_at: string;
}

export interface BudgetCategory {
  id: string;
  project_id: string;
  name: string;
  budgeted_amount: number;
  sort_order: number;
}

export interface Cost {
  id: string;
  project_id: string;
  budget_category_id: string | null;
  description: string;
  amount: number;
  vat_percent: number;
  amount_with_vat: number;
  vendor: string | null;
  invoice_date: string;
  receipt_url: string | null;
  status: CostStatus;
  ai_extracted: boolean;
  ai_confidence: number | null;
  created_by: string;
  created_at: string;
  // Joined fields
  budget_category?: BudgetCategory;
  creator?: Profile;
}

export interface TimeEntry {
  id: string;
  project_id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  description: string | null;
  is_approved: boolean;
  approved_by: string | null;
  created_at: string;
  // Joined fields
  project?: Project;
  user?: Profile;
}

export interface DailyLog {
  id: string;
  project_id: string;
  log_date: string;
  weather: string | null;
  temperature: number | null;
  workers_on_site: number | null;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface ProjectBudgetSummary {
  project_id: string;
  project_name: string;
  project_code: string;
  project_status: ProjectStatus;
  total_budget: number;
  total_spent: number;
  budget_remaining: number;
  used_percent: number;
  start_date: string;
  end_date: string | null;
  client: string;
}
