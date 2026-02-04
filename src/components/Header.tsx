import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import './Header.css';

const Header: React.FC = () => {
  const { user, profile, signOut, isAdmin } = useAuth();

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <h1>Contest Hub</h1>
        </Link>

        <nav className="nav">
          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin" className="nav-link">
                  Admin Dashboard
                </Link>
              )}
              <span className="user-info">
                {profile?.full_name || user.email}
                {isAdmin && <span className="admin-badge">Admin</span>}
              </span>
              <button onClick={signOut} className="btn btn-secondary">
                Sign Out
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary">
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
