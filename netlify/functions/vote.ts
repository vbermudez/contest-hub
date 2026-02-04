import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const VOTE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Fingerprint',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method not allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { submissionId } = body;
    const userFingerprint = event.headers['x-user-fingerprint'] || 'anonymous';

    if (!submissionId) {
      return { statusCode: 400, headers, body: 'Submission ID required' };
    }

    // Check if user has already voted for this submission in the last 24h
    const { data: existingVote } = await supabase
      .from('votes')
      .select('voted_at')
      .eq('submission_id', submissionId)
      .eq('user_fingerprint', userFingerprint)
      .single();

    if (existingVote) {
      const timeSinceVote = Date.now() - new Date(existingVote.voted_at).getTime();
      if (timeSinceVote < VOTE_WINDOW_MS) {
        return {
          statusCode: 429,
          headers,
          body: 'You already voted for this submission in the last 24 hours',
        };
      }
    }

    // Increment vote count
    const { error: updateError } = await supabase
      .from('submissions')
      .update({ votes: supabase.sql`votes + 1` })
      .eq('id', submissionId);

    if (updateError) throw updateError;

    // Record the vote
    const { error: voteError } = await supabase
      .from('votes')
      .upsert([
        {
          submission_id: submissionId,
          user_fingerprint: userFingerprint,
          voted_at: new Date().toISOString(),
        },
      ]);

    if (voteError) throw voteError;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true }),
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
