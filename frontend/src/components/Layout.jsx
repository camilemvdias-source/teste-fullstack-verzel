import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { HeartIcon, UserIcon, HomeIcon, GavelIcon } from './Icons.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  const roleLink = user?.role === 'bidder'
    ? { to: '/meus-lances', label: 'Meus lances' }
    : user?.role === 'auctioneer'
      ? { to: '/meus-lotes', label: 'Meus lotes' }
      : null;

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand">Aurelia</Link>

          <nav className="nav" aria-label="Principal">
            <NavLink to="/" end>Leilões</NavLink>
            {roleLink && <NavLink to={roleLink.to}>{roleLink.label}</NavLink>}
            {user && <NavLink to="/carteira">Carteira</NavLink>}
          </nav>

          <div className="header-user">
            {user ? (
              <>
                <span className="user-name">{user.name}</span>
                <NavLink to="/carteira" className="icon-btn" aria-label="Minha conta"><UserIcon /></NavLink>
                <button className="btn btn-dark" onClick={handleLogout}>Sair</button>
              </>
            ) : (
              <>
                <Link to="/login" className="icon-btn" aria-label="Entrar"><UserIcon /></Link>
                <Link to="/login" className="btn btn-dark">Entrar</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>

      <footer className="footer">
        <span className="brand-small">Aurelia · Leilões de Arte</span>
        <span className="quote">Arte é mais do que se vê. É o que se sente.</span>
      </footer>

      <nav className="bottom-nav" aria-label="Navegação móvel">
        <NavLink to="/" end><HomeIcon /><span>Início</span></NavLink>
        {roleLink
          ? <NavLink to={roleLink.to}><GavelIcon /><span>{user.role === 'bidder' ? 'Lances' : 'Lotes'}</span></NavLink>
          : <NavLink to="/" end className="x"><GavelIcon /><span>Leilões</span></NavLink>}
        {user && <NavLink to="/carteira"><HeartIcon /><span>Carteira</span></NavLink>}
        <NavLink to={user ? '/carteira' : '/login'}><UserIcon /><span>{user ? 'Perfil' : 'Entrar'}</span></NavLink>
      </nav>
    </>
  );
}
