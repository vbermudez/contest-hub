import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

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

  const contestId = event.path.split('/contests/')[1]?.split('/')[0];
  if (!contestId) {
    return { statusCode: 400, headers, body: 'Contest ID required' };
  }

  try {
    // Parse multipart form data
    const contentType = event.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return { statusCode: 400, headers, body: 'Invalid content type' };
    }

    // In a real implementation, you'd parse the multipart data properly
    // For now, we'll assume the data is passed as JSON for simplicity
    const body = JSON.parse(event.body || '{}');
    const { name, note, filename, fileData } = body;

    if (!name || !filename || !fileData) {
      return { statusCode: 400, headers, body: 'Missing required fields' };
    }

    // Check if contest exists
    const { data: contest, error: contestError } = await supabase
      .from('contests')
      .select('id')
      .eq('id', contestId)
      .single();

    if (contestError || !contest) {
      return { statusCode: 404, headers, body: 'Contest not found' };
    }

    // Upload file to Supabase Storage
    const fileBuffer = Buffer.from(fileData, 'base64');
    const filePath = `${contestId}/${Date.now()}_${filename}`;
    
    const { error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(filePath, fileBuffer, {
        contentType: 'application/zip',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Create submission record
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .insert([
        {
          contest_id: contestId,
          name,
          note: note || null,
          filename,
          file_path: filePath,
          votes: 0,
        },
      ])
      .select()
      .single();

    if (submissionError) throw submissionError;

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify(submission),
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
