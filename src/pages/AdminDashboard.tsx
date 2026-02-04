import React, { useEffect, useState } from 'react';
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
    badge_gold: '',
    badge_silver: '',
    badge_copper: '',
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
      if (editingContest) {
        const { error } = await supabase
          .from('contests')
          .update(contestForm)
          .eq('id', editingContest.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('contests')
          .insert([contestForm]);

        if (error) throw error;
      }

      setShowContestForm(false);
      setEditingContest(null);
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
      badge_gold: '',
      badge_silver: '',
      badge_copper: '',
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
      badge_gold: contest.badge_gold || '',
      badge_silver: contest.badge_silver || '',
      badge_copper: contest.badge_copper || '',
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

                <label className="label">Description (HTML)</label>
                <textarea
                  className="textarea"
                  value={contestForm.description}
                  onChange={(e) =>
                    setContestForm({ ...contestForm, description: e.target.value })
                  }
                  required
                  rows={6}
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
                  </div>
                </div>
              ))}
            </div>
          </div>
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
