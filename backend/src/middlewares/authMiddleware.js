/**
 * 🔒 LEBEN SECURITY — JWT Bearer Authentication & Multi-Tenancy Middleware
 * Padrão: ES Modules (ESM)
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Acesso negado. Token de autenticação não fornecido ou em formato inválido.'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token || token === 'undefined' || token === 'null') {
      return res.status(401).json({
        status: 'error',
        message: 'Acesso negado. Token ausente.'
      });
    }

    // Validação estrita do JWT Token
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    
    // Injeção de tenantId isolado para garantir isolamento entre contas
    req.tenantId = decoded.id;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Sessão expirada. Por favor, faça login novamente.'
      });
    }

    return res.status(403).json({
      status: 'error',
      message: 'Token de acesso inválido ou adulterado.'
    });
  }
}
