import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Contest {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'completed' | 'active' | 'upcoming';
  jury_mode: boolean;
  badge_gold: string | null;
  badge_silver: string | null;
  badge_copper: string | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  contest_id: string;
  name: string;
  note: string | null;
  filename: string;
  file_path: string;
  votes: number;
  admin_score: number | null;
  jury_score: number | null;
  is_winner: boolean;
  winner_rank: number | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}
