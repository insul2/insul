import app from './app.js';
import { config } from './config/env.js';
import { runProductionMigrations } from './config/migrate.js';
import { seedMongoDatabase } from './config/seed_mongo.js';

app.listen(config.port, async () => {
  console.log(`🌿 LEBEN Backend Engine rodando na porta ${config.port}`);
  console.log(`📡 Endpoints disponíveis em http://localhost:${config.port}/api/v1/`);

  // Executa migrações de tabela e seed automático no banco PostgreSQL do Render
  await runProductionMigrations();

  // Executa checagem e população automática no MongoDB Atlas
  await seedMongoDatabase();
});

