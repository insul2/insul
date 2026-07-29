import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Montagem das rotas REST
app.use('/api/v1', routes);

// Health check endpoint para monitoramento do Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'LEBEN Unified Web Service',
    timestamp: new Date().toISOString()
  });
});

// SERVIR FRONTEND ESTÁTICO COMPILADO (MONÓLITO UNIFICADO NO RENDER)
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

export default app;
