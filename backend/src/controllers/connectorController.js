/**
 * Controller para Integrações de CGM e Conectores Externos — LEBEN Engine V4.0
 * Conexão REAL HTTP com a Nuvem da Abbott (LibreLinkUp API)
 * Suporta SHA-256 account-id hashing e version header 4.16.0 para bypass de status 430/403.
 */

import crypto from 'crypto';
import { logGlucoseReadingHandler } from './glucoseController.js';

// Mapeamento das setas de tendência oficiais da Abbott LibreLinkUp
const LIBRE_TREND_MAP = {
  1: '⬇️ Caindo Rápido',
  2: '↘️ Caindo',
  3: '➡️ Estável',
  4: '↗️ Subindo',
  5: '⬆️ Subindo Rápido'
};

// Endpoints da Nuvem da Abbott por Região
const REGION_URLS = {
  la: 'https://api-la.libreview.io',
  br: 'https://api-la.libreview.io',
  us: 'https://api-us.libreview.io',
  eu: 'https://api-eu.libreview.io',
  de: 'https://api-de.libreview.io',
  fr: 'https://api-fr.libreview.io',
  jp: 'https://api-jp.libreview.io',
  ap: 'https://api-ap.libreview.io',
  ae: 'https://api-ae.libreview.io'
};

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'product': 'llu.android',
  'version': '4.12.0',
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

/**
 * Conector REAL para a nuvem do LibreLinkUp (Abbott)
 * POST /api/v1/connectors/librelinkup/sync
 */
export async function syncLibreLinkUpHandler(req, res) {
  try {
    const { username, password, region = 'la' } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Credenciais do LibreLinkUp (e-mail e senha) são obrigatórias.'
      });
    }

    let baseUrl = REGION_URLS[region] || REGION_URLS.la;

    // ── ETAPA 1: Autenticação na Nuvem da Abbott (Login Inicial) ──────────────
    let loginRes;
    try {
      loginRes = await fetch(`${baseUrl}/llu/auth/login`, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ email: username, password })
      });
    } catch (netErr) {
      return res.status(502).json({
        status: 'error',
        message: 'Não foi possível conectar aos servidores da Abbott LibreView. Verifique sua conexão.'
      });
    }

    let loginJson = await loginRes.json();

    // Tratamento de Redirecionamento de Região da Abbott (ex: US -> LA)
    if (loginJson.data && loginJson.data.redirect && loginJson.data.region) {
      const redirectedRegion = loginJson.data.region;
      baseUrl = `https://api-${redirectedRegion}.libreview.io`;
      loginRes = await fetch(`${baseUrl}/llu/auth/login`, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ email: username, password })
      });
      loginJson = await loginRes.json();
    }

    if (!loginRes.ok || loginJson.status !== 0 || !loginJson.data || !loginJson.data.authTicket) {
      const errMsg = loginJson?.error?.message || 'E-mail ou senha do LibreLinkUp incorretos.';
      return res.status(401).json({
        status: 'error',
        message: `Falha no login com a Abbott LibreView: ${errMsg}`
      });
    }

    const token = loginJson.data.authTicket.token;
    const accountId = loginJson.data.user.id;
    const accountIdHash = crypto.createHash('sha256').update(accountId).digest('hex');

    // Headers Autenticados com SHA-256 account-id (Requisito Abbott 2026 / LLU 4.16.0)
    const authHeaders = {
      ...DEFAULT_HEADERS,
      'version': '4.16.0',
      'account-id': accountIdHash,
      'Authorization': `Bearer ${token}`
    };

    // ── ETAPA 2: Obter Lista de Pacientes/Conexões de Sensores ───────────────
    const connectionsRes = await fetch(`${baseUrl}/llu/connections`, {
      headers: authHeaders
    });
    const connectionsJson = await connectionsRes.json();

    if (!connectionsRes.ok || !connectionsJson.data || !Array.isArray(connectionsJson.data) || connectionsJson.data.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Nenhum paciente ou sensor associado a esta conta do LibreLinkUp. Verifique se o convite foi aceito no app LibreLinkUp.'
      });
    }

    // Seleciona a primeira conexão/sensor ativo do paciente
    const patientConnection = connectionsJson.data[0];
    const patientId = patientConnection.patientId || accountId;

    // ── ETAPA 3: Extrair Glicemia em Tempo Real da Conexão ────────────────────
    let glucoseVal = null;
    let trendCode = 3;
    let timestamp = new Date().toISOString();

    if (patientConnection.glucoseMeasurement) {
      glucoseVal = patientConnection.glucoseMeasurement.ValueInMgPerDl || patientConnection.glucoseMeasurement.Value;
      trendCode = patientConnection.glucoseMeasurement.TrendArrow || 3;
      timestamp = patientConnection.glucoseMeasurement.Timestamp || timestamp;
    } else {
      // Fallback: Busca via endpoint de gráfico da conexão
      const graphRes = await fetch(`${baseUrl}/llu/connections/${patientId}/graph`, {
        headers: authHeaders
      });
      const graphJson = await graphRes.json();

      if (graphJson.data && graphJson.data.connection && graphJson.data.connection.glucoseMeasurement) {
        const measurement = graphJson.data.connection.glucoseMeasurement;
        glucoseVal = measurement.ValueInMgPerDl || measurement.Value;
        trendCode = measurement.TrendArrow || 3;
        timestamp = measurement.Timestamp || timestamp;
      }
    }

    if (!glucoseVal) {
      return res.status(404).json({
        status: 'error',
        message: 'Nenhuma medição recente encontrada para este sensor na nuvem da Abbott.'
      });
    }

    const formattedTrend = LIBRE_TREND_MAP[trendCode] || '➡️ Estável';

    // ── ETAPA 4: Salvar a Glicemia Real no Banco do LEBEN ─────────────────────
    const internalReq = {
      user: req.user,
      headers: { 'x-idempotency-key': `librelinkup_${patientId}_${timestamp}` },
      body: {
        glucoseMgDl: Number(glucoseVal),
        trend: formattedTrend,
        record_type: 'LIBRE_LINK_UP'
      }
    };

    let responseData = null;
    const internalRes = {
      status(code) { this.statusCode = code; return this; },
      json(data) { responseData = data; return this; }
    };

    await logGlucoseReadingHandler(internalReq, internalRes);

    const patientName = `${patientConnection.firstName || ''} ${patientConnection.lastName || ''}`.trim() || 'Paciente';

    return res.status(200).json({
      status: 'success',
      message: 'Sincronizado em tempo real com a Nuvem LibreLinkUp da Abbott!',
      source: 'Abbott LibreLinkUp Cloud API',
      data: {
        patientName,
        glucoseMgDl: Number(glucoseVal),
        trend: formattedTrend,
        timestamp: timestamp
      }
    });

  } catch (error) {
    console.error('❌ Erro no Conector Real LibreLinkUp:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro interno ao processar sincronização com a Abbott LibreView.',
      error: error.message
    });
  }
}

/**
 * Conector Webhook para Nightscout / xDrip+
 * POST /api/v1/connectors/nightscout/entries
 */
export async function syncNightscoutHandler(req, res) {
  try {
    const entries = Array.isArray(req.body) ? req.body : [req.body];

    if (!entries || entries.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Payload Nightscout vazio.' });
    }

    const processed = [];
    for (const entry of entries) {
      const sgv = entry.sgv || entry.mbg || entry.glucose;
      if (sgv && sgv >= 40 && sgv <= 500) {
        const trendStr = entry.direction ? `📊 ${entry.direction}` : '➡️ Estável';
        const timestamp = entry.dateString || (entry.date ? new Date(entry.date).toISOString() : new Date().toISOString());

        processed.push({
          glucoseMgDl: Number(sgv),
          trend: trendStr,
          timestamp
        });
      }
    }

    return res.status(200).json({
      status: 'success',
      message: `${processed.length} medições importadas do Nightscout/xDrip+`,
      count: processed.length,
      data: processed
    });

  } catch (error) {
    console.error('❌ Erro no Conector Nightscout:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro ao processar pacote do Nightscout.',
      error: error.message
    });
  }
}
