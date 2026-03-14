import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <p style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
      </div>
    );
  }

  const isActive = (path: string) => location.pathname === path;

  const closeSidebar = () => setSidebarOpen(false);

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="app-layout">
      {/* Mobile header */}
      <header className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            {sidebarOpen ? (
              <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            ) : (
              <path d="M3 5h14a1 1 0 110 2H3a1 1 0 010-2zm0 4h14a1 1 0 110 2H3a1 1 0 110-2zm0 4h14a1 1 0 110 2H3a1 1 0 110-2z" />
            )}
          </svg>
        </button>
        <Link to="/" className="mobile-header-logo" onClick={handleNavClick}>
          <div className="sidebar-logo-icon" style={{ width: 28, height: 28, fontSize: 14 }}>C</div>
          ClipLab
        </Link>
      </header>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo" onClick={handleNavClick}>
            <div className="sidebar-logo-icon">C</div>
            ClipLab
          </Link>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Menu</div>

          <Link to="/" className={`sidebar-link ${isActive('/') ? 'active' : ''}`} onClick={handleNavClick}>
            <span className="sidebar-link-icon">~</span>
            Home
          </Link>

          {user && (
            <Link to="/my-clips" className={`sidebar-link ${isActive('/my-clips') ? 'active' : ''}`} onClick={handleNavClick}>
              <span className="sidebar-link-icon">*</span>
              My Clips
            </Link>
          )}

          <div className="sidebar-nav-label">Account</div>

          {user ? (
            <button
              onClick={() => { logout(); handleNavClick(); }}
              className="sidebar-link"
              style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}
            >
              <span className="sidebar-link-icon">-</span>
              Sign Out
            </button>
          ) : (
            <>
              <Link to="/login" className={`sidebar-link ${isActive('/login') ? 'active' : ''}`} onClick={handleNavClick}>
                <span className="sidebar-link-icon">+</span>
                Sign In
              </Link>
              <Link to="/register" className={`sidebar-link ${isActive('/register') ? 'active' : ''}`} onClick={handleNavClick}>
                <span className="sidebar-link-icon">@</span>
                Register
              </Link>
            </>
          )}
        </nav>

        {user && (
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.username}</div>
                <div className="sidebar-user-label">Member</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}
