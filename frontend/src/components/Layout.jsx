import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { currentTheme, setTheme } from '../lib/theme.js';

const ROLE_LABEL = { auctioneer: 'Leiloeiro', bidder: 'Licitante' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setThemeState] = useState(currentTheme);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand">🔨 Casa de Leilões</Link>

          <nav className="nav">
            <NavLink to="/" end>Vitrine</NavLink>
            {/* Os links das outras páginas entram aqui conforme forem criadas */}
          </nav>

          <div className="header-user">
            <button className="btn" onClick={toggleTheme} aria-label="Alternar tema claro/escuro">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {user ? (
              <>
                <span>
                  {user.name} <span className="muted">({ROLE_LABEL[user.role]})</span>
                </span>
                <button className="btn" onClick={handleLogout}>Sair</button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </>
  );
}
