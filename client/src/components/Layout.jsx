import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import NotificationBell from './NotificationBell';

const MENUS = {
  STUDENT: [
    ['/home', 'Home'],
    ['/listings', 'Internships'],
    ['/saved', 'Saved'],
    ['/applications', 'My Applications'],
    ['/tests', 'Tests'],
    ['/progress', 'Progress'],
  ],
  RECRUITER: [
    ['/recruiter/listings', 'My Listings'],
    ['/recruiter/listings/new', 'Post Listing'],
  ],
  ADMIN: [
    ['/admin/recruiters', 'Users'],
    ['/admin/questions', 'Question Bank'],
    ['/admin/tests', 'Tests'],
    ['/admin/statistics', 'Statistics'],
    ['/admin/settings', 'Settings'],
  ],
};

function ProfileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="profile-menu" ref={box}>
      <button type="button" className="avatar" aria-haspopup="true" aria-expanded={open}
        aria-label={`Account menu for ${user.name}`} onClick={() => setOpen((v) => !v)}>
        {user.name?.[0]?.toUpperCase() || '?'}
      </button>
      {open && (
        <div className="dropdown">
          <p className="dropdown-title">{user.name}</p>
          <p className="muted small">{user.email}</p>
          <p className="muted small">{user.role.charAt(0) + user.role.slice(1).toLowerCase()}</p>
          {user.role === 'STUDENT' && <Link to="/profile" onClick={() => setOpen(false)}>My profile</Link>}
          <Link to="/help" onClick={() => setOpen(false)}>Help</Link>
          <button type="button" className="btn btn-secondary btn-block" onClick={onLogout}>Log out</button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = user ? MENUS[user.role] || [] : [];

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  function onLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="logo" aria-label="OIPPP home">
            <span className="logo-mark" aria-hidden="true">♛</span> OIPPP
          </Link>
          {user && (
            <>
              <button type="button" className="menu-toggle" aria-expanded={menuOpen} aria-controls="main-menu"
                onClick={() => setMenuOpen((v) => !v)}>
                Menu
              </button>
              <nav id="main-menu" className={`mainnav${menuOpen ? ' open' : ''}`} aria-label="Main">
                {menu.map(([to, label]) => (
                  <NavLink key={to} to={to} end>{label}</NavLink>
                ))}
              </nav>
              <div className="topbar-right">
                <NotificationBell />
                <ProfileMenu user={user} onLogout={onLogout} />
              </div>
            </>
          )}
          {!user && (
            <nav className="mainnav open guest" aria-label="Main">
              <NavLink to="/login">Log in</NavLink>
              <NavLink to="/register">Register</NavLink>
            </nav>
          )}
        </div>
      </header>
      <main id="main" className="container">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="footer-inner">
          <span>Online Internship &amp; Placement Preparation Portal</span>
          <Link to="/help">Help</Link>
        </div>
      </footer>
    </div>
  );
}
