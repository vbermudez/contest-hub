import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      // List all contests
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('end_date', { ascending: false });

      if (error) throw error;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data),
      };
    }

    if (event.httpMethod === 'POST') {
      // Create a new contest (admin only)
      const authHeader = event.headers.authorization;
      if (!authHeader) {
        return { statusCode: 401, headers, body: 'Unauthorized' };
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return { statusCode: 401, headers, body: 'Unauthorized' };
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        return { statusCode: 403, headers, body: 'Forbidden: Admin access required' };
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

      if (!title || !description || !start_date || !end_date || !status) {
        return { statusCode: 400, headers, body: 'Missing required fields' };
      }

      if (!['completed', 'active', 'upcoming'].includes(status)) {
        return { statusCode: 400, headers, body: 'Invalid status' };
      }

      const { data, error } = await supabase
        .from('contests')
        .insert([
          {
            title,
            description,
            start_date,
            end_date,
            status,
            jury_mode: jury_mode || false,
            badge_gold: badge_gold || null,
            badge_silver: badge_silver || null,
            badge_copper: badge_copper || null,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return {
        statusCode: 201,
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
