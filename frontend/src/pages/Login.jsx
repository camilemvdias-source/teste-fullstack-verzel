import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';
import { ApiError } from '../api/client.js';
import { Notice } from '../components/States.jsx';

// A API de cadastro devolve { details: { campo: ["mensagem"] } }. Pegamos a primeira mensagem.
function firstMessage(err) {
  if (err instanceof ApiError && err.details) {
    const first = Object.values(err.details).flat()[0];
    if (first) return first;
  }
  return err.message;
}

const DEMO = [
  { email: 'licitante1@teste.com', role: 'Licitante' },
  { email: 'licitante2@teste.com', role: 'Licitante' },
  { email: 'leiloeiro@teste.com', role: 'Leiloeiro' },
];
const DEMO_PASSWORD = 'Leilao@2026';

export default function Login() {
  const { user, loading, login, register } = useAuth();
  const location = useLocation();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('bidder');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Ainda confirmando quem é a pessoa (há token guardado): não mostra o formulário por engano
  if (loading) return <div className="page"><div className="skeleton" style={{ height: 420, maxWidth: 440, margin: '0 auto' }} /></div>;

  // Já está logado (ou acabou de entrar): volta para a página que pediu o login.
  // É o único redirecionamento: um navigate() no submit competia com este e a pessoa ia para o início.
  if (user) return <Navigate to={location.state?.from || '/'} replace />;

  const isRegister = mode === 'register';

  function switchMode(next) {
    setMode(next);
    setError('');
  }

  async function submit(fn) {
    setError('');
    setSubmitting(true);
    try {
      await fn();
    } catch (err) {
      setError(firstMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    submit(() => (isRegister ? register({ name, email, password, role }) : login(email, password)));
  }

  return (
    <div className="auth">
      <div className="auth-art">
        <blockquote>“Cada lance fica selado. Qualquer pessoa pode conferir que ninguém mexeu no histórico.”</blockquote>
        <ul>
          <li>Obras em domínio público do Art Institute of Chicago</li>
          <li>Seu saldo fica reservado só enquanto você lidera</li>
          <li>Lances nos últimos 2 minutos prorrogam o leilão</li>
        </ul>
      </div>

      <div className="auth-form">
        <div className="segmented" role="tablist" aria-label="Entrar ou criar conta" style={{ alignSelf: 'flex-start' }}>
          <button type="button" role="tab" aria-selected={!isRegister} onClick={() => switchMode('login')}>Entrar</button>
          <button type="button" role="tab" aria-selected={isRegister} onClick={() => switchMode('register')}>Criar conta</button>
        </div>
        <h1>{isRegister ? 'Crie sua conta' : 'Bem-vindo de volta'}</h1>

        {error && <Notice kind="error">{error}</Notice>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <span className="eyebrow" style={{ marginBottom: 8 }}>Você vai</span>
              <div className="roles" role="radiogroup" aria-label="Tipo de conta">
                <label className={`role-option ${role === 'bidder' ? 'selected' : ''}`}>
                  <input type="radio" name="role" value="bidder" checked={role === 'bidder'} onChange={() => setRole('bidder')} />
                  <strong>Dar lances</strong>
                  <small>Conta de licitante</small>
                </label>
                <label className={`role-option ${role === 'auctioneer' ? 'selected' : ''}`}>
                  <input type="radio" name="role" value="auctioneer" checked={role === 'auctioneer'} onChange={() => setRole('auctioneer')} />
                  <strong>Leiloar obras</strong>
                  <small>Conta de leiloeiro</small>
                </label>
              </div>
              <div className="field">
                <label htmlFor="name">Nome</label>
                <input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" />
              </div>
            </>
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
            {isRegister && <span className="hint">Mínimo de 6 caracteres.</span>}
          </div>

          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={submitting}>
            {submitting ? 'Aguarde…' : isRegister ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        {!isRegister && (
          <div className="demo">
            <span className="eyebrow">Contas de demonstração · senha <span className="mono">{DEMO_PASSWORD}</span></span>
            <div className="demo-list">
              {DEMO.map((d) => (
                <button key={d.email} type="button" disabled={submitting} onClick={() => submit(() => login(d.email, DEMO_PASSWORD))}>
                  <code>{d.email}</code><span className="muted small">{d.role} →</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
