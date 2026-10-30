// Cria os lotes de demonstração direto no banco (src/services/demo.js), com pinturas
// em domínio público do Art Institute of Chicago (src/db/demo-artworks.js):
// 6 ao vivo (4 com lances), 3 agendados e 4 encerrados (3 vendidos, com comprovante).
// Rode DEPOIS de npm run migrate e npm run seed, com o mesmo AUDIT_SECRET da API.
//
//   node scripts/seed-demo.js           -> só cria se o leiloeiro de teste ainda não tem lotes
//   node scripts/seed-demo.js --force   -> cria de novo mesmo assim
//
// Não precisa da API no ar. A internet só é usada para copiar as imagens para o banco.
// Para apagar tudo e recomeçar: node scripts/clear-lots.js --confirm
import 'dotenv/config';
import { assertAuditSecret } from '../src/services/hashChain.js';
import { pool } from '../src/db/pool.js';
import { seedDemo } from '../src/services/demo.js';

assertAuditSecret();

try {
  const result = await seedDemo({ force: process.argv.includes('--force') });
  if (result.skipped) {
    console.log('O leiloeiro de teste já tem lotes: nada foi criado (use --force para criar mesmo assim).');
  } else {
    console.log(`Lotes de demonstração criados: ${result.created}`);
    if (result.imagesFailed > 0) {
      console.log(`${result.imagesFailed} imagem(ns) não vieram do museu agora; serão copiadas na primeira visita.`);
    }
  }
} catch (err) {
  console.error('Erro na semente de demonstração:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
