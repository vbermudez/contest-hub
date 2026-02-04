import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Contest } from '../lib/supabase';
import './HomePage.css';

const HomePage: React.FC = () => {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContests();
  }, []);

  const loadContests = async () => {
    try {
      const { data, error } = await supabase
        .from('contests')
        .select('*')
        .order('end_date', { ascending: false });

      if (error) throw error;
      setContests(data || []);
    } catch (error) {
      console.error('Error loading contests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { text: '🔥 Active', className: 'badge-active' },
      upcoming: { text: '🧪 Upcoming', className: 'badge-upcoming' },
      completed: { text: '🏁 Completed', className: 'badge-completed' },
    };
    return badges[status as keyof typeof badges] || badges.completed;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return <div className="loading">Summoning contests from the void…</div>;
  }

  return (
    <div className="container">
      <div className="hero">
        <img src="/images/big-logo.png" alt="Contest Hub" className="hero-logo" />
        <p>Where dignity goes to die, and engineering titles are born.</p>
      </div>

      {contests.length === 0 ? (
        <div className="card">
          <p>No contests yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid">
          {contests.map((contest) => {
            const badge = getStatusBadge(contest.status);
            return (
              <Link
                key={contest.id}
                to={`/contests/${contest.id}`}
                className="contest-card"
              >
                <div className="contest-header">
                  <h2>{contest.title}</h2>
                  <span className={`badge ${badge.className}`}>
                    {badge.text}
                  </span>
                </div>
                <div
                  className="rich-text"
                  dangerouslySetInnerHTML={{ __html: contest.description }}
                />
                <p className="contest-dates">
                  ⏳ {formatDate(contest.start_date)} → {formatDate(contest.end_date)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HomePage;
