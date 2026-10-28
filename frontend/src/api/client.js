// Único lugar que fala com a API. Coloca o token JWT no header Authorization.
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const TOKEN_KEY = 'leilao_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignora */
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignora */
  }
}

// Erro com os dados que a API devolveu (status, code, details)
export class ApiError extends Error {
  constructor(message, { status = 0, code = null, details = null, data = null } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.data = data;
  }
}

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const token = auth ? getToken() : null;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      'Não foi possível falar com o servidor. Se ele estava parado, pode levar cerca de 1 minuto para acordar. Tente de novo.'
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* resposta sem JSON */
  }

  if (!res.ok) {
    // Token vencido ou inválido: limpa e avisa o app para voltar ao login
    if (res.status === 401 && token) {
      clearToken();
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw new ApiError(data?.error || 'Erro inesperado. Tente novamente.', {
      status: res.status,
      code: data?.code ?? null,
      details: data?.details ?? null,
      data,
    });
  }

  return data;
}
