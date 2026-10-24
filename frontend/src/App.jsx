import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

export default function App() {
  const [status, setStatus] = useState('carregando...');

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data) => setStatus(JSON.stringify(data)))
      .catch(() => setStatus('erro ao falar com a API'));
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Casa de Leilões</h1>
      <p>Resposta da API: {status}</p>
    </div>
  );
}