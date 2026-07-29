import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './src/routes/apiRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para tratamento de JSON e arquivos estáticos
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Integrar rotas da API REST V1
app.use('/api/v1', apiRoutes);

// Rota principal (Servir o frontend SPA)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Health check para o Render / monitoramento
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    system: 'Insul V4 Engine',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Insul V4 rodando na porta ${PORT}`);
  console.log(`📡 Endpoints ativos:`);
  console.log(`   - POST http://localhost:${PORT}/api/v1/bolus/calculate`);
  console.log(`   - GET  http://localhost:${PORT}/api/v1/foods/search?q=arroz`);
  console.log(`   - GET  http://localhost:${PORT}/health`);
});
