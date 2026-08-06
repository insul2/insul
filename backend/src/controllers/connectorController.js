/**
 * Controller para Integrações de CGM e Conectores Externos — LEBEN Engine V4.0
 * Conexão Real HTTP com a Nuvem da Abbott (LibreLinkUp API)
 */

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
  'version': '4.7.0',
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Linux; Android 13)'
};

/**
 * Conector REAL para a nuvem do LibreLinkUp (Abbott)
 * POST /api/v1/connectors/librelinkup/sync
 */
export async function syncLibreLinkUpHandler(req, res) {
  try {
    const { username, password, region = 'us' } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Credenciais do LibreLinkUp (e-mail e senha) são obrigatórias.'
      });
    }

    const baseUrl = REGION_URLS[region] || REGION_URLS.us;

    // ── ETAPA 1: Autenticação na Nuvem da Abbott (Login) ─────────────────────
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
        message: 'Não foi possível conectar aos servidores da Abbott LibreView. Verifique sua conexão com a internet.'
      });
    }

    const loginJson = await loginRes.json();

    if (!loginRes.ok || loginJson.status !== 0 || !loginJson.data || !loginJson.data.authTicket) {
      const errMsg = loginJson?.error?.message || 'E-mail ou senha do LibreLinkUp incorretos.';
      return res.status(401).json({
        status: 'error',
        message: `Falha no login com a Abbott LibreView: ${errMsg}`
      });
    }

    const token = loginJson.data.authTicket.token;
    const accountId = loginJson.data.user.id;

    // Headers Autenticados da Abbott
    const authHeaders = {
      ...DEFAULT_HEADERS,
      'Authorization': `Bearer ${token}`
    };

    // ── ETAPA 2: Obter Lista de Pacientes/Conexões de Sensores ───────────────
    const connectionsRes = await fetch(`${baseUrl}/llu/connections`, {
      headers: authHeaders
    });
    const connectionsJson = await connectionsRes.json();

    if (!connectionsRes.ok || !connectionsJson.data || connectionsJson.data.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Nenhum paciente ou sensor associado a esta conta do LibreLinkUp.'
      });
    }

    // Seleciona a primeira conexão/sensor ativo do paciente
    const patientConnection = connectionsJson.data[0];
    const patientId = patientConnection.patientId;

    // ── ETAPA 3: Buscar Última Medição de Glicemia em Tempo Real ──────────────
    const graphRes = await fetch(`${baseUrl}/llu/connections/${patientId}/graph`, {
      headers: authHeaders
    });
    const graphJson = await graphRes.json();

    let glucoseVal = null;
    let trendCode = 3;
    let timestamp = new Date().toISOString();

    if (graphJson.data && graphJson.data.connection && graphJson.data.connection.glucoseMeasurement) {
      const measurement = graphJson.data.connection.glucoseMeasurement;
      glucoseVal = measurement.Value;
      trendCode = measurement.TrendArrow || 3;
      timestamp = measurement.Timestamp || timestamp;
    } else if (graphJson.data && graphJson.data.graphData && graphJson.data.graphData.length > 0) {
      const lastPoint = graphJson.data.graphData[graphJson.data.graphData.length - 1];
      glucoseVal = lastPoint.Value;
      trendCode = lastPoint.TrendArrow || 3;
      timestamp = lastPoint.Timestamp || timestamp;
    }

    if (!glucoseVal) {
      return res.status(404).json({
        status: 'error',
        message: 'Nenhuma medição recente encontrada na sua conta LibreLinkUp.'
      });
    }

    const formattedTrend = LIBRE_TREND_MAP[trendCode] || '➡️ Estável';

    // ── ETAPA 4: Salvar a Glicemia Real no Banco de Dados do LEBEN ─────────────
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

    return res.status(200).json({
      status: 'success',
      message: 'Sincronizado em tempo real com a Nuvem LibreLinkUp da Abbott!',
      source: 'Abbott LibreLinkUp Cloud API',
      data: {
        patientName: `${patientConnection.firstName || ''} ${patientConnection.lastName || ''}`.trim(),
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
