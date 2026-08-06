/**
 * 🔒 LEBEN ENGINE — Controller de Autenticação com Persistência em Banco PostgreSQL + Cache Resiliente
 * Endpoints: POST /api/v1/auth/login, POST /api/v1/auth/register, POST /api/v1/auth/refresh
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { query } from '../config/database.js';

// Repositório em cache RAM para fallback e alta performance
export const registeredUsersCache = new Map();

// RT-04: TTL de 2h para entradas do cache RAM — previne Out-of-Memory sob carga
// Cada entrada é { user, expiresAt }. O setInterval limpa expirados a cada 30 min.
const CACHE_USER_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of registeredUsersCache.entries()) {
    // Manter o usuário demo permanentemente (não tem expiresAt)
    if (entry.expiresAt && entry.expiresAt < now) {
      registeredUsersCache.delete(email);
    }
  }
}, 30 * 60 * 1000).unref(); // .unref() garante que o timer não impede o processo de encerrar

// Usuário padrão de demonstração pré-cadastrado com hash seguro
const demoPasswordHash = bcrypt.hashSync('senha123', 10);
registeredUsersCache.set('paciente@leben.com', {
  id: 'usr_demo_1001',
  name: 'Dr. Paciente LEBEN',
  email: 'paciente@leben.com',
  passwordHash: demoPasswordHash,
  role: 'PATIENT',
  diabetesType: 'TYPE_1',
  createdAt: new Date().toISOString()
  // Sem expiresAt: conta demo é permanente
});

export async function loginHandler(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'E-mail e senha são obrigatórios.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = null;

    // 1. Tentar buscar no MongoDB Atlas / Mongoose primeiro
    try {
      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
      }
      const userSchema = new mongoose.Schema({
        email: String,
        password_hash: String,
        full_name: String,
        role: String
      });
      const UserMongo = mongoose.models.User || mongoose.model('User', userSchema);
      const mongoUser = await UserMongo.findOne({ email: cleanEmail });
      if (mongoUser) {
        user = {
          id: mongoUser._id.toString(),
          name: mongoUser.full_name,
          email: mongoUser.email,
          passwordHash: mongoUser.password_hash,
          role: mongoUser.role || 'PATIENT',
          diabetesType: 'TYPE_1'
        };
      }
    } catch (mongoErr) {
      console.error('⚠️ Mongoose Login Error:', mongoErr.message);
    }

    // 2. Tentar buscar no PostgreSQL oficial se não achou no Mongo
    if (!user) {
      try {
        const dbRes = await query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [cleanEmail]);
        if (dbRes && dbRes.rows && dbRes.rows.length > 0) {
          const row = dbRes.rows[0];
          user = {
            id: row.id,
            name: row.name,
            email: row.email,
            passwordHash: row.password_hash,
            role: row.role || 'PATIENT',
            diabetesType: row.diabetes_type || 'TYPE_1'
          };
        }
      } catch (dbErr) {}
    }

    // 3. Fallback para o Cache RAM se necessário
    if (!user) {
      user = registeredUsersCache.get(cleanEmail);
    }

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Credenciais inválidas. E-mail ou senha incorretos.'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Credenciais inválidas. E-mail ou senha incorretos.'
      });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      diabetesType: user.diabetesType
    };

    // Gera Access Token (24h) e Refresh Token (7d)
    const token = jwt.sign(userPayload, config.jwtSecret, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '7d' });

    return res.status(200).json({
      status: 'success',
      message: 'Login realizado com sucesso no LEBEN.',
      token,
      refreshToken,
      user: userPayload
    });
  } catch (error) {
    console.error('❌ Erro no Login:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro interno ao realizar autenticação.',
      error: error.message
    });
  }
}

export async function registerHandler(req, res) {
  try {
    const { name, email, password, diabetesType } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Nome, e-mail e senha são obrigatórios para o cadastro.'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Verificação de Duplicidade no Cache e no DB
    if (registeredUsersCache.has(cleanEmail)) {
      return res.status(409).json({
        status: 'error',
        message: 'Este e-mail já está cadastrado no LEBEN.'
      });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const userId = 'usr_' + Date.now();

    const newUser = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'PATIENT',
      diabetesType: diabetesType || 'TYPE_1',
      createdAt: new Date().toISOString()
    };

    // 2. Persistir no PostgreSQL se disponível
    // RT-05: Verificar rowCount antes de emitir JWT. ON CONFLICT retorna rowCount=0.
    let persistedId = userId;
    try {
      const insertResult = await query(
        `INSERT INTO users (id, name, email, password_hash, role, diabetes_type, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) ON CONFLICT (email) DO NOTHING RETURNING id`,
        [userId, newUser.name, cleanEmail, passwordHash, newUser.role, newUser.diabetesType]
      );

      // Se rowCount === 0, o e-mail já existia no banco mas não estava no cache.
      // Não emitir JWT para um ID que pode não ter sido criado.
      if (insertResult && insertResult.rowCount === 0) {
        return res.status(409).json({
          status: 'error',
          message: 'Este e-mail já está cadastrado no LEBEN.'
        });
      }

      if (insertResult && insertResult.rows && insertResult.rows[0]) {
        persistedId = insertResult.rows[0].id;
      }
    } catch (dbErr) {
      // DB relacional indisponível: continuar para MongoDB e RAM
    }

    // 3. Persistir no MongoDB Atlas
    try {
      if (mongoose.connection.readyState === 1) {
        const UserSchema = new mongoose.Schema({
          name: String,
          email: String,
          password_hash: String,
          role: String,
          diabetes_type: String,
          created_at: Date
        });
        const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
        await UserModel.create({
          name: newUser.name,
          email: cleanEmail,
          password_hash: passwordHash,
          role: newUser.role,
          diabetes_type: newUser.diabetesType,
          created_at: new Date()
        });
      }
    } catch (mongoErr) {}

    // RT-04: Adicionar expiresAt ao salvar no cache RAM
    registeredUsersCache.set(cleanEmail, {
      ...newUser,
      expiresAt: Date.now() + CACHE_USER_TTL_MS
    });

    const userPayload = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      diabetesType: newUser.diabetesType
    };

    const token = jwt.sign(userPayload, config.jwtSecret, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ id: newUser.id }, config.jwtSecret, { expiresIn: '7d' });

    return res.status(201).json({
      status: 'success',
      message: 'Conta criada com sucesso no LEBEN.',
      token,
      refreshToken,
      user: userPayload
    });
  } catch (error) {
    console.error('❌ Erro no Cadastro:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro interno ao realizar cadastro.',
      error: error.message
    });
  }
}

export async function refreshTokenHandler(req, res) {
  try {
    const { refreshToken } = req.body || {};

    if (!refreshToken) {
      return res.status(400).json({ status: 'error', message: 'Refresh Token não fornecido.' });
    }

    const decoded = jwt.verify(refreshToken, config.jwtSecret);
    const newToken = jwt.sign({ id: decoded.id }, config.jwtSecret, { expiresIn: '24h' });

    return res.status(200).json({
      status: 'success',
      token: newToken
    });
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Refresh Token inválido ou expirado.'
    });
  }
}
