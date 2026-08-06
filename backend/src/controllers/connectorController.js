/**
 * Controller para Integrações de CGM e Conectores Externos — LEBEN Engine V4.0
 * Suporta:
 * 1. LibreLinkUp (Abbott Cloud Real-Time Sync & 12h Historical Backfill)
 * 2. Background Sync Engine (Sincronização Contínua Automática a cada 5~15 min)
 * 3. Nightscout / xDrip+ Webhook Connector
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

// Armazenamento em memória das conexões ativas para o Worker de Segundo Plano (Background Sync)
const activeSyncJobs = new Map();

/**
 * Função Auxiliar Interna para Buscar Dados da Nuvem da Abbott e Importar Histórico de 12h + Leitura Atual
 */
export async function performAbbottSync({ username, password, region = 'la', user }) {
  let baseUrl = REGION_URLS[region] || REGION_URLS.la;

  // 1. Autenticação na Nuvem da Abbott
  let loginRes = await fetch(`${baseUrl}/llu/auth/login`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ email: username, password })
  });
  let loginJson = await loginRes.json();

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
    throw new Error(`Falha no login com a Abbott LibreView: ${errMsg}`);
  }

  const token = loginJson.data.authTicket.token;
  const accountId = loginJson.data.user.id;
  const accountIdHash = crypto.createHash('sha256').update(accountId).digest('hex');

  const authHeaders = {
    ...DEFAULT_HEADERS,
    'version': '4.16.0',
    'account-id': accountIdHash,
    'Authorization': `Bearer ${token}`
  };

  // 2. Obter Conexões e Sensores
  const connectionsRes = await fetch(`${baseUrl}/llu/connections`, { headers: authHeaders });
  const connectionsJson = await connectionsRes.json();

  if (!connectionsRes.ok || !connectionsJson.data || !Array.isArray(connectionsJson.data) || connectionsJson.data.length === 0) {
    throw new Error('Nenhum paciente ou sensor associado a esta conta do LibreLinkUp.');
  }

  const patientConnection = connectionsJson.data[0];
  const patientId = patientConnection.patientId || accountId;
  const patientName = `${patientConnection.firstName || ''} ${patientConnection.lastName || ''}`.trim() || 'Paciente';

  // 3. Buscar Gráfico e Histórico Completo de 12h~24h
  const graphRes = await fetch(`${baseUrl}/llu/connections/${patientId}/graph`, { headers: authHeaders });
  const graphJson = await graphRes.json();

  let importedCount = 0;
  let latestGlucose = null;
  let latestTrend = '➡️ Estável';
  let latestTimestamp = new Date().toISOString();

  // A) Processar a leitura live mais recente
  if (patientConnection.glucoseMeasurement) {
    latestGlucose = patientConnection.glucoseMeasurement.ValueInMgPerDl || patientConnection.glucoseMeasurement.Value;
    latestTrend = LIBRE_TREND_MAP[patientConnection.glucoseMeasurement.TrendArrow] || '➡️ Estável';
    latestTimestamp = patientConnection.glucoseMeasurement.Timestamp || latestTimestamp;
  } else if (graphJson.data && graphJson.data.connection && graphJson.data.connection.glucoseMeasurement) {
    const m = graphJson.data.connection.glucoseMeasurement;
    latestGlucose = m.ValueInMgPerDl || m.Value;
    latestTrend = LIBRE_TREND_MAP[m.TrendArrow] || '➡️ Estável';
    latestTimestamp = m.Timestamp || latestTimestamp;
  }

  // B) Importar histórico retroativo completo (array graphData das últimas 12h~24h)
  const historyPoints = (graphJson.data && graphJson.data.graphData) ? graphJson.data.graphData : [];
  for (const point of historyPoints) {
    const bg = point.ValueInMgPerDl || point.Value;
    if (bg && bg >= 40 && bg <= 500) {
      const ptTrend = LIBRE_TREND_MAP[point.TrendArrow] || '➡️ Estável';
      const ptTime = point.Timestamp || new Date().toISOString();

      const internalReq = {
        user,
        headers: { 'x-idempotency-key': `librelinkup_hist_${patientId}_${ptTime}` },
        body: {
          glucoseMgDl: Number(bg),
          trend: ptTrend,
          record_type: 'LIBRE_LINK_UP'
        }
      };

      const internalRes = {
        status(c) { this.statusCode = c; return this; },
        json(d) { return this; }
      };

      await logGlucoseReadingHandler(internalReq, internalRes);
      importedCount++;
    }
  }

  // C) Salvar a leitura live mais recente
  if (latestGlucose) {
    const internalReq = {
      user,
      headers: { 'x-idempotency-key': `librelinkup_live_${patientId}_${latestTimestamp}` },
      body: {
        glucoseMgDl: Number(latestGlucose),
        trend: latestTrend,
        record_type: 'LIBRE_LINK_UP'
      }
    };

    const internalRes = {
      status(c) { this.statusCode = c; return this; },
      json(d) { return this; }
    };

    await logGlucoseReadingHandler(internalReq, internalRes);
  }

  return {
    patientName,
    glucoseMgDl: Number(latestGlucose),
    trend: latestTrend,
    timestamp: latestTimestamp,
    importedCount
  };
}

/**
 * Conector HTTP Manual/Trigger
 * POST /api/v1/connectors/librelinkup/sync
 */
export async function syncLibreLinkUpHandler(req, res) {
  try {
    const { username, password, region = 'la', autoSync = true } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Credenciais do LibreLinkUp (e-mail e senha) são obrigatórias.'
      });
    }

    // Executa a primeira sincronização completa
    const result = await performAbbottSync({ username, password, region, user: req.user });

    // Registra a sincronização contínua em segundo plano a cada 5 minutos
    if (autoSync && !activeSyncJobs.has(req.user.id)) {
      const intervalId = setInterval(async () => {
        try {
          console.log(`🔄 [BACKGROUND SYNC LEBEN] Atualizando glicemia da Abbott para ${req.user.name || req.user.email}...`);
          const bgResult = await performAbbottSync({ username, password, region, user: req.user });
          console.log(`✅ [BACKGROUND SYNC LEBEN] Sucesso! Nova Glicemia: ${bgResult.glucoseMgDl} mg/dL (${bgResult.trend})`);
        } catch (bgErr) {
          console.error('⚠️ [BACKGROUND SYNC LEBEN] Erro ao sincronizar em segundo plano:', bgErr.message);
        }
      }, 5 * 60 * 1000); // 5 minutos

      activeSyncJobs.set(req.user.id, { intervalId, username, region });
    }

    return res.status(200).json({
      status: 'success',
      message: `Sincronização em tempo real concluída! ${result.importedCount} pontos das últimas 12h importados! Sincronização contínua ativa.`,
      source: 'Abbott LibreLinkUp Cloud API',
      data: result
    });

  } catch (error) {
    console.error('❌ Erro no Conector LibreLinkUp:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Erro ao sincronizar com a Abbott LibreView.'
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
