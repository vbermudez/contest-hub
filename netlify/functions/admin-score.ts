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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method not allowed' };
  }

  try {
    // Verify admin access
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
      return { statusCode: 403, headers, body: 'Forbidden: Admin access required' };
    }

    const body = JSON.parse(event.body || '{}');
    const { submissionId, score } = body;

    if (!submissionId || !score || score < 1 || score > 10) {
      return { statusCode: 400, headers, body: 'Valid submission ID and score (1-10) required' };
    }

    const { data, error } = await supabase
      .from('submissions')
      .update({ admin_score: score })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
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
