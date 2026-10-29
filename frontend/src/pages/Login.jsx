import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { ApiError } from '../api/client.js';

// A API de cadastro devolve { details: { campo: ["mensagem"] } }. Pegamos a primeira mensagem.
function firstMessage(err) {
  if (err instanceof ApiError && err.details) {
    const first = Object.values(err.details).flat()[0];
    if (first) return first;
  }
  return err.message;
}

export default function Login() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('bidder');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Ainda confirmando quem é a pessoa (há token guardado): não mostra o formulário por engano
  if (loading) return <p className="center muted">Carregando…</p>;

  // Já está logado: não faz sentido ver esta tela
  if (user) return <Navigate to="/" replace />;

  const isRegister = mode === 'register';

  function switchMode(next) {
    setMode(next);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isRegister) {
        await register({ name, email, password, role });
      } else {
        await login(email, password);
      }
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(firstMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card">
        <h1>{isRegister ? 'Criar conta' : 'Entrar'}</h1>

        <div className="tabs" role="tablist">
          <button type="button" className={`tab ${!isRegister ? 'active' : ''}`} onClick={() => switchMode('login')}>
            Entrar
          </button>
          <button type="button" className={`tab ${isRegister ? 'active' : ''}`} onClick={() => switchMode('register')}>
            Cadastrar
          </button>
        </div>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="field">
              <label htmlFor="name">Nome</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" />
            </div>
          )}

          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>

          <div className="field">
            <label htmlFor="password">Senha</label>
            <input
              id="password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              required minLength={isRegister ? 6 : 1}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
            {isRegister && <small className="muted">Mínimo de 6 caracteres.</small>}
          </div>

          {isRegister && (
            <div className="roles">
              <label className={`role-option ${role === 'bidder' ? 'selected' : ''}`}>
                <input type="radio" name="role" value="bidder" checked={role === 'bidder'} onChange={() => setRole('bidder')} />
                <strong>Licitante</strong>
                <small>Dá lances e arremata</small>
              </label>
              <label className={`role-option ${role === 'auctioneer' ? 'selected' : ''}`}>
                <input type="radio" name="role" value="auctioneer" checked={role === 'auctioneer'} onChange={() => setRole('auctioneer')} />
                <strong>Leiloeiro</strong>
                <small>Cria e gerencia lotes</small>
              </label>
            </div>
          )}

          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Aguarde…' : isRegister ? 'Criar conta' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
