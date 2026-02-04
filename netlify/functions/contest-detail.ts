import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const contestId = event.path.split('/contests/')[1]?.split('/')[0];
  if (!contestId) {
    return { statusCode: 400, headers, body: 'Contest ID required' };
  }

  try {
    if (event.httpMethod === 'GET') {
      // Get contest with submissions and winners
      const { data: contest, error: contestError } = await supabase
        .from('contests')
        .select('*')
        .eq('id', contestId)
        .single();

      if (contestError) throw contestError;

      const orderBy = contest.jury_mode
        ? 'admin_score.desc.nullslast, votes.desc, created_at.asc'
        : 'votes.desc, created_at.asc';

      const { data: submissions, error: subsError } = await supabase
        .from('submissions')
        .select('*')
        .eq('contest_id', contestId)
        .order(orderBy);

      if (subsError) throw subsError;

      const { data: winners, error: winnersError } = await supabase
        .from('submissions')
        .select('*')
        .eq('contest_id', contestId)
        .not('winner_rank', 'is', null)
        .order('winner_rank', { ascending: true });

      if (winnersError) throw winnersError;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          contest,
          submissions,
          winners,
        }),
      };
    }

    if (event.httpMethod === 'PUT') {
      // Update contest (admin only)
      const authHeader = event.headers.authorization;
      if (!authHeader) {
        return { statusCode: 401, headers, body: 'Unauthorized' };
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return { statusCode: 401, headers, body: 'Unauthorized' };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        return { statusCode: 403, headers, body: 'Forbidden' };
      }

      const body = JSON.parse(event.body || '{}');
      const {
        title,
        description,
        start_date,
        end_date,
        status,
        jury_mode,
        badge_gold,
        badge_silver,
        badge_copper,
      } = body;

      const { data, error } = await supabase
        .from('contests')
        .update({
          title,
          description,
          start_date,
          end_date,
          status,
          jury_mode,
          badge_gold,
          badge_silver,
          badge_copper,
        })
        .eq('id', contestId)
        .select()
        .single();

      if (error) throw error;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: 'Method not allowed',
    };
  } catch (error: any) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
