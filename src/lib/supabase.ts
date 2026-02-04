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
  position_1_name: string;
  position_1_image: string | null;
  position_2_name: string;
  position_2_image: string | null;
  position_3_name: string | null;
  position_3_image: string | null;
  position_4_name: string | null;
  position_4_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  contest_id: string;
  name: string;
  note: string | null;
  filename: string | null;
  file_path: string | null;
  link: string | null;
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
