import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega .env da raiz do projeto ou da pasta backend
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 10000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'leben_super_secret_jwt_key_v4_production',
  auditSecret: process.env.AUDIT_SECRET || 'LEBEN_CLINICAL_SAFETY_AUDIT_KEY_V4',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://leben_user:password@localhost:5432/leben',
  mongoUri: process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://midiasperformancevips_db_user:admin123123@leben.gniuszr.mongodb.net/leben?retryWrites=true&w=majority&appName=leben'
};
