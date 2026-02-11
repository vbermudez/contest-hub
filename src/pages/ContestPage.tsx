import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase, Contest, Submission } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import './ContestPage.css';

const ContestPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, session } = useAuth();
  const [contest, setContest] = useState<Contest | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [winners, setWinners] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload form state
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    loadContest();
  }, [id]);

  const loadContest = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setContest(data);

      await loadSubmissions(data);
    } catch (error) {
      console.error('Error loading contest:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async (contestData: Contest) => {
    if (!id) return;

    try {
      const orderBy = contestData.jury_mode
        ? 'admin_score.desc.nullslast,votes.desc,created_at.asc'
        : 'votes.desc,created_at.asc';

      const { data: subs, error: subsError } = await supabase
        .from('submissions')
        .select('*')
        .eq('contest_id', id)
        .order('admin_score', { ascending: false, nullsFirst: false })
        .order('votes', { ascending: false })
        .order('created_at', { ascending: true });

      if (subsError) throw subsError;
      setSubmissions(subs || []);

      const { data: wins, error: winsError } = await supabase
        .from('submissions')
        .select('*')
        .eq('contest_id', id)
        .not('winner_rank', 'is', null)
        .order('winner_rank', { ascending: true });

      if (winsError) throw winsError;
      setWinners(wins || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!file && !link.trim()) {
      setUploadError('Please provide either a file or a link');
      return;
    }

    if (!session) {
      setUploadError('You must be logged in to submit entries');
      return;
    }

    if (contest?.status === 'completed') {
      setUploadError('This contest has ended and is no longer accepting submissions');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      let filePath = null;
      let filename = null;

      if (file) {
        filePath = `${id}/${Date.now()}_${file.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('submissions')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        filename = file.name;
      }

      const { error: insertError } = await supabase
        .from('submissions')
        .insert([{
          contest_id: id,
          name: name.trim(),
          note: note.trim() || null,
          link: link.trim() || null,
          filename: filename,
          file_path: filePath,
        }]);

      if (insertError) throw insertError;

      setName('');
      setNote('');
      setLink('');
      setFile(null);
      await loadContest();
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadError(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleVote = async (submissionId: string) => {
    if (!session) {
      alert('You must be logged in to vote');
      return;
    }

    try {
      // Generate a simple fingerprint
      const fingerprint = localStorage.getItem('user_fingerprint') || Math.random().toString(36);
      localStorage.setItem('user_fingerprint', fingerprint);

      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Fingerprint': fingerprint,
        },
        body: JSON.stringify({ submissionId }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }

      await loadContest();
    } catch (error: any) {
      alert(error.message || 'Vote failed');
    }
  };

  const handleSetWinner = async (submissionId: string, rank: number) => {
    if (!session) {
      alert('You must be logged in as an admin to set winners');
      return;
    }

    try {
      const response = await fetch('/api/set-winner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          contestId: id,
          submissionId,
          rank: rank || null // Send null if rank is 0 (None selected)
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }

      await loadContest();
    } catch (error: any) {
      alert(error.message || 'Failed to set winner');
    }
  };

  const downloadSubmission = async (submission: Submission) => {
    try {
      if (submission.link) {
        window.open(submission.link, '_blank');
        return;
      }

      if (!submission.file_path) {
        alert('No file or link available');
        return;
      }

      const { data, error } = await supabase.storage
        .from('submissions')
        .download(submission.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = submission.filename || 'download.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed');
    }
  };

  if (loading) {
    return <div className="loading">Loading… (please bribe the database gnomes)</div>;
  }

  if (!contest) {
    return <div className="container"><div className="card">Contest not found</div></div>;
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="container">
      <Link to="/" className="back-link">← Back</Link>

      <div className="card">
        <h1>{contest.title}</h1>
        <div className="contest-meta">
          <span className={`badge badge-${contest.status}`}>
            {contest.status === 'active' ? '🔥 Active' :
             contest.status === 'upcoming' ? '🧪 Upcoming' : '🏁 Completed'}
          </span>
          <span>⏳ {formatDate(contest.start_date)} → {formatDate(contest.end_date)}</span>
          {contest.jury_mode && <span className="badge">👨‍⚖️ Jury Mode</span>}
        </div>
        <div className="challenge-description">
          <div
            className="rich-text"
            dangerouslySetInnerHTML={{ __html: contest.description }}
          />
        </div>
      </div>

      {winners.length > 0 && (
        <div className="card">
          <h2>🏆 Winners</h2>
          <div className="winners-grid">
            {winners.map((winner) => {
              const positionName = winner.winner_rank === 1 ? contest.position_1_name :
                                  winner.winner_rank === 2 ? contest.position_2_name :
                                  winner.winner_rank === 3 ? contest.position_3_name :
                                  contest.position_4_name || 'Winner';
              const positionImage = winner.winner_rank === 1 ? contest.position_1_image :
                                   winner.winner_rank === 2 ? contest.position_2_image :
                                   winner.winner_rank === 3 ? contest.position_3_image :
                                   contest.position_4_image;
              
              return (
                <div key={winner.id} className="winner-card">
                  {positionImage && (
                    <img src={positionImage} alt={positionName || 'Winner'} className="winner-badge" />
                  )}
                  <div className="winner-position">{positionName}</div>
                  <h3>{winner.name}</h3>
                  {winner.note && <p>{winner.note}</p>}
                  <button
                    onClick={() => downloadSubmission(winner)}
                    className="btn btn-secondary"
                  >
                    {winner.link ? 'View Link' : 'Download'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {contest.status !== 'completed' && (
        <div className="card">
          <h2>Submit Entry</h2>
          {!session && (
            <div className="error" style={{ marginBottom: '16px' }}>
              Please log in to submit an entry
            </div>
          )}
          <form onSubmit={handleUpload}>
          <label className="label">Your Name</label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Enter your name"
          />

          <label className="label">Note (optional)</label>
          <textarea
            className="textarea"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about your submission"
          />

          <label className="label">Link (optional)</label>
          <input
            type="url"
            className="input"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Or provide a link to your submission"
          />

          <label className="label">Upload ZIP file (optional if link provided)</label>
          <input
            type="file"
            accept=".zip"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          {uploadError && <div className="error">{uploadError}</div>}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={uploading || (!file && !link.trim())}
            style={{ marginTop: '16px' }}
          >
            {uploading ? 'Uploading...' : 'Submit'}
          </button>
        </form>
      </div>
      )}

      <div className="card">
        <h2>Submissions ({submissions.length})</h2>
        {submissions.length === 0 ? (
          <p>No submissions yet. Be the first!</p>
        ) : (
          <div className="submissions-list">
            {submissions.map((sub) => (
              <div key={sub.id} className="submission-item">
                <div className="submission-info">
                  <h3>{sub.name}</h3>
                  {sub.note && <p className="submission-note">{sub.note}</p>}
                  <div className="submission-meta">
                    <span>👍 {sub.votes} votes</span>
                    {contest.jury_mode && sub.admin_score && (
                      <span>⭐ Score: {sub.admin_score}/10</span>
                    )}
                    <span>{formatDate(sub.created_at)}</span>
                  </div>
                </div>
                <div className="submission-actions">
                  <button
                    onClick={() => downloadSubmission(sub)}
                    className="btn btn-secondary"
                  >
                    {sub.link ? 'View Link' : 'Download'}
                  </button>
                  {contest.jury_mode ? (
                    // Jury mode: Only admins can set positions
                    isAdmin ? (
                      <div className="position-selector">
                        <label className="label" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>Position:</label>
                        <select
                          className="select"
                          value={sub.winner_rank || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value) {
                              handleSetWinner(sub.id, parseInt(value));
                            } else {
                              // Clear winner status when "None" is selected
                              handleSetWinner(sub.id, 0);
                            }
                          }}
                          style={{ minWidth: '140px' }}
                        >
                          <option value="">None</option>
                          <option value="1">{contest.position_1_name}</option>
                          <option value="2">{contest.position_2_name}</option>
                          {contest.position_3_name && (
                            <option value="3">{contest.position_3_name}</option>
                          )}
                          {contest.position_4_name && (
                            <option value="4">{contest.position_4_name}</option>
                          )}
                        </select>
                      </div>
                    ) : (
                      <div className="jury-mode-notice" style={{ fontSize: '0.85rem', color: '#666' }}>
                        Admin only
                      </div>
                    )
                  ) : (
                    // Normal mode: Everyone can vote
                    <button
                      onClick={() => handleVote(sub.id)}
                      className="btn btn-primary"
                    >
                      Vote
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContestPage;
