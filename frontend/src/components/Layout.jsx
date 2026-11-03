import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';
import { api } from '../api/client.js';
import { useCountdown } from '../hooks/useCountdown.js';
import { UserIcon, HomeIcon, GavelIcon, MoonIcon, SunIcon, WalletIcon } from './Icons.jsx';
import { currentTheme, setTheme } from '../lib/theme.js';
import { brl } from '../lib/format.js';
import Logo from './Logo.jsx';

const YEAR = new Date().getFullYear();

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
  const initials = user?.name?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <UtilityBar />

      <header className="header">
        <div className="wrap header-inner">
          <Link to="/" className="brand" aria-label="Aurelia, página inicial"><Logo tagline /></Link>

          <nav className="nav" aria-label="Principal">
            <NavLink to="/" end>Leilões</NavLink>
            <a href="/#catalogo">Catálogo</a>
            {roleLink && <NavLink to={roleLink.to}>{roleLink.label}</NavLink>}
            {user && <NavLink to="/carteira">Carteira</NavLink>}
          </nav>

          <div className="header-user">
            {user?.role === 'bidder' && user.balance && (
              <Link to="/carteira" className="balance-pill" title="Saldo disponível para lances">{brl(user.balance.available)}</Link>
            )}
            <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            {user ? (
              <>
                <span className="user-chip"><span className="avatar" aria-hidden="true">{initials}</span><span>{user.name.split(' ')[0]}</span></span>
                <button className="btn btn-sm btn-ghost" onClick={handleLogout}>Sair</button>
              </>
            ) : (
              <Link to="/login" className="btn btn-sm btn-primary">Entrar</Link>
            )}
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="wrap">
          <div className="footer-inner">
            <div>
              <Logo tagline />
              <p>Leilões de obras-primas em domínio público. Cada lance é selado e pode ser auditado por qualquer pessoa.</p>
            </div>
            <nav aria-label="Leilões">
              <h4>Leilões</h4>
              <Link to="/">Em leilão agora</Link>
              <a href="/#catalogo">Catálogo completo</a>
              {user?.role === 'auctioneer' && <Link to="/meus-lotes/novo">Criar lote</Link>}
            </nav>
            <nav aria-label="Sua conta">
              <h4>Sua conta</h4>
              {user ? <Link to="/carteira">Carteira</Link> : <Link to="/login">Entrar ou criar conta</Link>}
              {roleLink && <Link to={roleLink.to}>{roleLink.label}</Link>}
            </nav>
            <nav aria-label="Confiança">
              <h4>Confiança</h4>
              <a href="/#como-funciona">Como funciona</a>
              <a href="https://www.artic.edu/open-access" target="_blank" rel="noreferrer">Acervo aberto do museu</a>
            </nav>
          </div>
          <div className="footer-legal">
            <span>© {YEAR} Aurelia · Casa de leilões de arte</span>
            <span>Imagens: Art Institute of Chicago (CC0)</span>
          </div>
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

// Barra escura no topo: quantos lotes estão ao vivo e qual fecha primeiro
function UtilityBar() {
  const [live, setLive] = useState(null);

  useEffect(() => {
    let active = true;
    const load = () => api('/lots?status=live', { auth: false })
      .then((d) => { if (active) setLive(d.items); })
      .catch(() => {});
    const first = setTimeout(load, 0);
    const t = setInterval(load, 30000);
    window.addEventListener('api:ready', load);
    return () => { active = false; clearTimeout(first); clearInterval(t); window.removeEventListener('api:ready', load); };
  }, []);

  const next = live?.slice().sort((a, b) => Date.parse(a.endsAt) - Date.parse(b.endsAt))[0];
  const { label } = useCountdown(next?.endsAt);

  return (
    <div className="utility" aria-label="Situação dos leilões">
      <div className="wrap utility-inner">
        {next ? (
          <Link to={`/lotes/${next.id}`} className="live">
            <span className="live-dot" aria-hidden="true" />
            <span>{live.length} {live.length === 1 ? 'lote' : 'lotes'} em leilão · encerra primeiro</span>
            <span className="serif-it">{next.title}</span>
            <span className="clock-inline">{label}</span>
          </Link>
        ) : (
          <span>{live ? 'Nenhum lote em leilão agora · veja os próximos no catálogo' : 'Aurelia · Casa de leilões de arte'}</span>
        )}
        <span className="utility-links">
          <a href="/#como-funciona">Como funciona</a>
          <span aria-hidden="true">·</span>
          <span>Lances auditáveis</span>
        </span>
      </div>
    </div>
  );
}
