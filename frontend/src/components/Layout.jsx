import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { UserIcon, HomeIcon, GavelIcon, MoonIcon, SunIcon, WalletIcon } from './Icons.jsx';
import { currentTheme, setTheme } from '../lib/theme.js';
import { brl } from '../lib/format.js';
import Logo from './Logo.jsx';

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

  const roleLink = user?.role === 'bidder'
    ? { to: '/meus-lances', label: 'Meus lances', short: 'Lances' }
    : user?.role === 'auctioneer'
      ? { to: '/meus-lotes', label: 'Meus lotes', short: 'Lotes' }
      : null;

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand" aria-label="Aurelia, página inicial"><Logo /></Link>

          <nav className="nav" aria-label="Principal">
            <NavLink to="/" end>Leilões</NavLink>
            {roleLink && <NavLink to={roleLink.to}>{roleLink.label}</NavLink>}
            {user && <NavLink to="/carteira">Carteira</NavLink>}
          </nav>

          <div className="header-user">
            {user?.role === 'bidder' && user.balance && (
              <Link to="/carteira" className="balance-link" title="Saldo disponível">{brl(user.balance.available)}</Link>
            )}
            <button type="button" className="theme-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            {user ? (
              <>
                <span className="user-name">{user.name}</span>
                <button className="btn btn-sm" onClick={handleLogout}>Sair</button>
              </>
            ) : (
              <Link to="/login" className="btn btn-dark btn-sm">Entrar</Link>
            )}
          </div>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Logo />
          </div>
          <nav aria-label="Leilões">
            <h4>Leilões</h4>
            <Link to="/">Ao vivo</Link>
            <Link to="/">Próximos leilões</Link>
            <Link to="/">Resultados</Link>
          </nav>
          <nav aria-label="Sua conta">
            <h4>Sua conta</h4>
            {user ? <Link to="/carteira">Carteira</Link> : <Link to="/login">Entrar</Link>}
            {user?.role === 'bidder' && <Link to="/meus-lances">Meus lances e arremates</Link>}
            {user?.role === 'auctioneer' && <Link to="/meus-lotes">Meus lotes</Link>}
            {!user && <Link to="/login">Criar conta</Link>}
          </nav>
        </div>
        <div className="footer-legal">
          <span>© {new Date().getFullYear()} Aurelia Leilões de Arte</span>
          <span>Imagens: Art Institute of Chicago (CC0)</span>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="Navegação móvel">
        <NavLink to="/" end><HomeIcon /><span>Leilões</span></NavLink>
        {roleLink && <NavLink to={roleLink.to}><GavelIcon /><span>{roleLink.short}</span></NavLink>}
        {user && <NavLink to="/carteira"><WalletIcon /><span>Carteira</span></NavLink>}
        {!user && <NavLink to="/login"><UserIcon /><span>Entrar</span></NavLink>}
      </nav>
    </>
  );
}
