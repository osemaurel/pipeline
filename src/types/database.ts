export type ProspectStatus =
  | 'new'
  | 'contacted'
  | 'replied'
  | 'meeting_scheduled'
  | 'meeting_done'
  | 'proposal_sent'
  | 'won'
  | 'lost'

export type Channel = 'linkedin' | 'email' | 'phone' | 'whatsapp' | 'other'

export interface Profile {
  user_id: string
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  company_name: string | null
  job_title: string | null
  business_type: string | null
  business_description: string | null
  main_offer: string | null
  pitch_problem: string | null
  pitch_solution: string | null
  pitch_proposition: string | null
  icp_sectors: string[]
  icp_company_size: string | null
  icp_regions: string[]
  icp_decision_maker_role: string | null
  icp_main_problem: string | null
  icp_budget_range: string | null
  active_channels: string[]
  timezone: string
  theme: string
  onboarding_completed: boolean
  has_paid: boolean
  paid_at: string | null
  payment_provider: string | null
  payment_reference: string | null
  amount_paid: number | null
  currency: string | null
  is_suspended: boolean
  suspended_at: string | null
  suspension_reason: string | null
  created_at: string
  updated_at: string
}
