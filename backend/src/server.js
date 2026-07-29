import app from './app.js';
import { config } from './config/env.js';
import { runProductionMigrations } from './config/migrate.js';

app.listen(config.port, async () => {
  console.log(`🌿 LEBEN Backend Engine rodando na porta ${config.port}`);
  console.log(`📡 Endpoints disponíveis em http://localhost:${config.port}/api/v1/`);

  // Executa migrações de tabela e seed automático no banco PostgreSQL do Render
  await runProductionMigrations();
});
