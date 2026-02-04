import React, { useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { supabase, Contest, Profile } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import './AdminDashboard.css';

const AdminDashboard: React.FC = () => {
  const { session } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contests' | 'users'>('contests');

  // Contest form state
  const [showContestForm, setShowContestForm] = useState(false);
  const [editingContest, setEditingContest] = useState<Contest | null>(null);
  const [contestForm, setContestForm] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    status: 'upcoming' as 'upcoming' | 'active' | 'completed',
    jury_mode: false,
    position_1_name: 'Winner',
    position_1_image: null as string | null,
    position_2_name: 'Second Place',
    position_2_image: null as string | null,
    position_3_name: '',
    position_3_image: null as string | null,
    position_4_name: '',
    position_4_image: null as string | null,
  });

  const [positionImages, setPositionImages] = useState<{
    pos1?: File;
    pos2?: File;
    pos3?: File;
    pos4?: File;
  }>({});

  // Submission form state
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [selectedContestForSubmission, setSelectedContestForSubmission] = useState<string | null>(null);
  const [submissionForm, setSubmissionForm] = useState({
    name: '',
    note: '',
    file: null as File | null,
    link: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadContests(), loadUsers()]);
    } finally {
      setLoading(false);
    }
  };

  const loadContests = async () => {
    const { data, error } = await supabase
      .from('contests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading contests:', error);
      return;
    }
    setContests(data || []);
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading users:', error);
      return;
    }
    setUsers(data || []);
  };

  const handleContestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Upload position images if provided
      const updatedForm = { ...contestForm };
      
      for (const [key, file] of Object.entries(positionImages)) {
        if (file) {
          const posNum = key.replace('pos', '');
          const filePath = `positions/${Date.now()}_${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from('submissions')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('submissions')
            .getPublicUrl(filePath);

          (updatedForm as any)[`position_${posNum}_image`] = publicUrl;
        }
      }

      if (editingContest) {
        const { error } = await supabase
          .from('contests')
          .update(updatedForm)
          .eq('id', editingContest.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contests')
          .insert([updatedForm]);

        if (error) throw error;
      }

      setShowContestForm(false);
      setEditingContest(null);
      setPositionImages({});
      resetContestForm();
      await loadContests();
    } catch (error: any) {
      console.error('Error saving contest:', error);
      alert(error.message || 'Failed to save contest');
    }
  };

  const resetContestForm = () => {
    setContestForm({
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      status: 'upcoming',
      jury_mode: false,
      position_1_name: 'Winner',
      position_1_image: null,
      position_2_name: 'Second Place',
      position_2_image: null,
      position_3_name: '',
      position_3_image: null,
      position_4_name: '',
      position_4_image: null,
    });
  };

  const editContest = (contest: Contest) => {
    setEditingContest(contest);
    setContestForm({
      title: contest.title,
      description: contest.description,
      start_date: contest.start_date.split('T')[0],
      end_date: contest.end_date.split('T')[0],
      status: contest.status,
      jury_mode: contest.jury_mode,
      position_1_name: contest.position_1_name,
      position_1_image: contest.position_1_image,
      position_2_name: contest.position_2_name,
      position_2_image: contest.position_2_image,
      position_3_name: contest.position_3_name || '',
      position_3_image: contest.position_3_image,
      position_4_name: contest.position_4_name || '',
      position_4_image: contest.position_4_image,
    });
    setShowContestForm(true);
  };

  const toggleUserAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      await loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      alert(error.message || 'Failed to update user');
    }
  };

  const handleSubmissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContestForSubmission) return;

    try {
      let filePath = null;
      let filename = null;

      if (submissionForm.file) {
        filename = submissionForm.file.name;
        filePath = `${selectedContestForSubmission}/${Date.now()}_${filename}`;
        
        const { error: uploadError } = await supabase.storage
          .from('submissions')
          .upload(filePath, submissionForm.file);

        if (uploadError) throw uploadError;
      }

      const { error } = await supabase
        .from('submissions')
        .insert([{
          contest_id: selectedContestForSubmission,
          name: submissionForm.name,
          note: submissionForm.note || null,
          filename,
          file_path: filePath,
          link: submissionForm.link || null,
        }]);

      if (error) throw error;

      setShowSubmissionForm(false);
      setSelectedContestForSubmission(null);
      setSubmissionForm({ name: '', note: '', file: null, link: '' });
      alert('Submission added successfully!');
    } catch (error: any) {
      console.error('Error adding submission:', error);
      alert(error.message || 'Failed to add submission');
    }
  };

  if (loading) {
    return <div className="loading">Loading admin dashboard...</div>;
  }

  return (
    <div className="container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === 'contests' ? 'active' : ''}`}
            onClick={() => setActiveTab('contests')}
          >
            Contests
          </button>
          <button
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
        </div>
      </div>

      {activeTab === 'contests' && (
        <>
          <div className="card">
            <div className="card-header">
              <h2>Contests</h2>
              <button
                className="btn btn-primary"
                onClick={() => {
                  resetContestForm();
                  setEditingContest(null);
                  setShowContestForm(true);
                }}
              >
                + New Contest
              </button>
            </div>

            {showContestForm && (
              <form onSubmit={handleContestSubmit} className="contest-form">
                <h3>{editingContest ? 'Edit Contest' : 'Create Contest'}</h3>

                <label className="label">Title</label>
                <input
                  type="text"
                  className="input"
                  value={contestForm.title}
                  onChange={(e) =>
                    setContestForm({ ...contestForm, title: e.target.value })
                  }
                  required
                />

                <label className="label">Description</label>
                <ReactQuill
                  theme="snow"
                  value={contestForm.description}
                  onChange={(value) =>
                    setContestForm({ ...contestForm, description: value })
                  }
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['blockquote', 'code-block'],
                      ['link'],
                      ['clean']
                    ]
                  }}
                  placeholder="Enter contest description..."
                  style={{ marginBottom: '16px' }}
                />

                <div className="form-row">
                  <div className="form-col">
                    <label className="label">Start Date</label>
                    <input
                      type="date"
                      className="input"
                      value={contestForm.start_date}
                      onChange={(e) =>
                        setContestForm({ ...contestForm, start_date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-col">
                    <label className="label">End Date</label>
                    <input
                      type="date"
                      className="input"
                      value={contestForm.end_date}
                      onChange={(e) =>
                        setContestForm({ ...contestForm, end_date: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <label className="label">Status</label>
                <select
                  className="select"
                  value={contestForm.status}
                  onChange={(e) =>
                    setContestForm({
                      ...contestForm,
                      status: e.target.value as any,
                    })
                  }
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={contestForm.jury_mode}
                    onChange={(e) =>
                      setContestForm({ ...contestForm, jury_mode: e.target.checked })
                    }
                  />
                  <span>Enable Jury Mode</span>
                </label>

                <h3 style={{ marginTop: '24px', marginBottom: '16px' }}>Winner Positions</h3>

                <div className="position-group">
                  <label className="label">Position 1 Name (Required)</label>
                  <input
                    type="text"
                    className="input"
                    value={contestForm.position_1_name}
                    onChange={(e) =>
                      setContestForm({ ...contestForm, position_1_name: e.target.value })
                    }
                    required
                  />
                  <label className="label">Position 1 Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPositionImages({ ...positionImages, pos1: file });
                    }}
                  />
                  {contestForm.position_1_image && (
                    <img src={contestForm.position_1_image} alt="Position 1" style={{ maxWidth: '100px', marginTop: '8px' }} />
                  )}
                </div>

                <div className="position-group">
                  <label className="label">Position 2 Name (Required)</label>
                  <input
                    type="text"
                    className="input"
                    value={contestForm.position_2_name}
                    onChange={(e) =>
                      setContestForm({ ...contestForm, position_2_name: e.target.value })
                    }
                    required
                  />
                  <label className="label">Position 2 Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPositionImages({ ...positionImages, pos2: file });
                    }}
                  />
                  {contestForm.position_2_image && (
                    <img src={contestForm.position_2_image} alt="Position 2" style={{ maxWidth: '100px', marginTop: '8px' }} />
                  )}
                </div>

                <div className="position-group">
                  <label className="label">Position 3 Name (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    value={contestForm.position_3_name}
                    onChange={(e) =>
                      setContestForm({ ...contestForm, position_3_name: e.target.value })
                    }
                  />
                  <label className="label">Position 3 Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPositionImages({ ...positionImages, pos3: file });
                    }}
                  />
                  {contestForm.position_3_image && (
                    <img src={contestForm.position_3_image} alt="Position 3" style={{ maxWidth: '100px', marginTop: '8px' }} />
                  )}
                </div>

                <div className="position-group">
                  <label className="label">Position 4 Name (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    value={contestForm.position_4_name}
                    onChange={(e) =>
                      setContestForm({ ...contestForm, position_4_name: e.target.value })
                    }
                  />
                  <label className="label">Position 4 Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPositionImages({ ...positionImages, pos4: file });
                    }}
                  />
                  {contestForm.position_4_image && (
                    <img src={contestForm.position_4_image} alt="Position 4" style={{ maxWidth: '100px', marginTop: '8px' }} />
                  )}
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    {editingContest ? 'Update' : 'Create'} Contest
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowContestForm(false);
                      setEditingContest(null);
                      setPositionImages({});
                      resetContestForm();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="contests-table">
              {contests.map((contest) => (
                <div key={contest.id} className="table-row">
                  <div className="table-cell">
                    <strong>{contest.title}</strong>
                    <span className={`badge badge-${contest.status}`}>
                      {contest.status}
                    </span>
                  </div>
                  <div className="table-cell">
                    {new Date(contest.start_date).toLocaleDateString()} →{' '}
                    {new Date(contest.end_date).toLocaleDateString()}
                  </div>
                  <div className="table-cell">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => editContest(contest)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setSelectedContestForSubmission(contest.id);
                        setShowSubmissionForm(true);
                      }}
                    >
                      Add Submission
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showSubmissionForm && (
            <div className="card">
              <form onSubmit={handleSubmissionSubmit} className="contest-form">
                <h3>Add Submission</h3>

                <label className="label">Participant Name</label>
                <input
                  type="text"
                  className="input"
                  value={submissionForm.name}
                  onChange={(e) =>
                    setSubmissionForm({ ...submissionForm, name: e.target.value })
                  }
                  required
                  placeholder="Enter participant name"
                />

                <label className="label">Note (optional)</label>
                <textarea
                  className="textarea"
                  value={submissionForm.note}
                  onChange={(e) =>
                    setSubmissionForm({ ...submissionForm, note: e.target.value })
                  }
                  placeholder="Add a note about this submission"
                  rows={3}
                />

                <label className="label">Upload ZIP file</label>
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSubmissionForm({ ...submissionForm, file, link: file ? '' : submissionForm.link });
                  }}
                />

                <div style={{ textAlign: 'center', margin: '16px 0', color: '#666' }}>
                  - OR -
                </div>

                <label className="label">External Link</label>
                <input
                  type="url"
                  className="input"
                  value={submissionForm.link}
                  onChange={(e) =>
                    setSubmissionForm({ ...submissionForm, link: e.target.value, file: e.target.value ? null : submissionForm.file })
                  }
                  placeholder="https://example.com/submission"
                />

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!submissionForm.file && !submissionForm.link}
                  >
                    Add Submission
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowSubmissionForm(false);
                      setSelectedContestForSubmission(null);
                      setSubmissionForm({ name: '', note: '', file: null, link: '' });
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {activeTab === 'users' && (
        <div className="card">
          <h2>Users</h2>
          <div className="users-table">
            {users.map((user) => (
              <div key={user.id} className="table-row">
                <div className="table-cell">
                  <strong>{user.full_name || 'No name'}</strong>
                  <span className="user-email">{user.email}</span>
                </div>
                <div className="table-cell">
                  {user.is_admin && (
                    <span className="badge badge-active">Admin</span>
                  )}
                </div>
                <div className="table-cell">
                  <button
                    className={`btn btn-sm ${
                      user.is_admin ? 'btn-danger' : 'btn-primary'
                    }`}
                    onClick={() => toggleUserAdmin(user.id, user.is_admin)}
                  >
                    {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
