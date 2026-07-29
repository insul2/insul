-- =============================================================================
-- Migration 007 — Módulo de Recursos Avançados e Plataforma Completa
-- Suporta IA Nutricional/Hábitos, Carrinho de Compras, Prescrição Nutricional,
-- Metas Gamificadas, Integrações CGM/Bomba e Predição Glicêmica.
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- -----------------------------------------------------------------------------
-- Tabela 16: ai_photo_logs (Reconhecimento Nutricional por Foto / Visão Computacional)
-- Suporta o Recurso 3 (IA que reconhece alimentos no prato)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_photo_logs (
    id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id          CHAR(36)     NOT NULL,
    meal_id             CHAR(36)     NULL COMMENT 'Vínculo com a refeição confirmada',
    
    image_url           VARCHAR(512) NOT NULL COMMENT 'URL/Path da foto enviada',
    detected_items      JSON         NOT NULL COMMENT '[{"item": "Arroz branco", "est_weight_g": 150, "carbs_g": 42.0, "confidence": 0.95}]',
    
    total_carbs_g       DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    total_proteins_g    DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    total_fats_g        DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    calculated_fpu      DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    
    user_confirmed      BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'Se o usuário aceitou a estimativa da IA',
    ai_model_version    VARCHAR(50)  NOT NULL DEFAULT 'gemini-vision-v2',
    
    created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (id),
    KEY idx_ai_photo_patient (patient_id, created_at DESC),
    CONSTRAINT fk_ai_photo_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Logs de análise nutricional por imagem via IA.';

-- -----------------------------------------------------------------------------
-- Tabela 17: ai_habit_insights (IA que Aprende Hábitos & Padrões Glicêmicos)
-- Suporta o Recurso 6 e Recursos Premium (Padrões recorrentes e predições)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_habit_insights (
    id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id          CHAR(36)     NOT NULL,
    
    insight_type        ENUM('RECURRING_MEAL', 'FOOD_GLUCOSE_SPIKE', 'EXERCISE_HYPO_RISK', 'CIRCADIAN_VARIATION') NOT NULL,
    title               VARCHAR(255) NOT NULL COMMENT 'Ex: Alerta de Pizza no Sábado ou Arroz com Pico Alto',
    description         TEXT         NOT NULL COMMENT 'Explicativo pedagógico para o usuário',
    suggested_action    TEXT         NULL     COMMENT 'Sugestão para discussão médica (ex: Testar pré-bolus de 20min)',
    
    trigger_data        JSON         NULL     COMMENT 'Dados brutos que fundamentaram o insight',
    is_dismissed        BOOLEAN      NOT NULL DEFAULT FALSE,
    doctor_reviewed     BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'Marcado se o endocrinologista analisou',
    
    created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (id),
    KEY idx_insights_patient (patient_id, is_dismissed, created_at DESC),
    CONSTRAINT fk_insights_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Insights e padrões comportamentais e glicêmicos identificados pela IA.';

-- -----------------------------------------------------------------------------
-- Tabela 18: device_integrations (Integrações com Sensores CGM, Bombas e Smartwatches)
-- Suporta o Recurso 9 (Dexcom, Freestyle Libre, Omnipod, Apple Health, Nightscout)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_integrations (
    id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id          CHAR(36)     NOT NULL,
    
    provider            ENUM('DEXCOM', 'LIBRE_LINK', 'NIGHTSCOUT', 'OMNIPOD', 'MEDTRONIC', 'APPLE_HEALTH', 'GOOGLE_FIT') NOT NULL,
    access_token        TEXT         NULL COMMENT 'Criptografado AES-256',
    refresh_token       TEXT         NULL,
    api_url             VARCHAR(255) NULL COMMENT 'Para instâncias privadas do Nightscout',
    
    last_sync_at        DATETIME(3)  NULL,
    sync_status         ENUM('ACTIVE', 'ERROR', 'PAUSED') NOT NULL DEFAULT 'ACTIVE',
    last_error_msg      VARCHAR(255) NULL,
    
    created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_patient_provider (patient_id, provider),
    CONSTRAINT fk_devices_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Credenciais de sincronização e pontes de API com dispositivos médicos e wearables.';

-- -----------------------------------------------------------------------------
-- Tabela 19: shopping_lists (Lista de Compras Automática)
-- Suporta o Recurso 11 (Geração automática baseada nas refeições)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shopping_lists (
    id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id          CHAR(36)     NOT NULL,
    
    title               VARCHAR(150) NOT NULL DEFAULT 'Lista de Compras da Semana',
    items               JSON         NOT NULL COMMENT '[{"item": "Leite desnatado", "qty": "2 L", "purchased": false}]',
    is_completed        BOOLEAN      NOT NULL DEFAULT FALSE,
    
    created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (id),
    KEY idx_shopping_patient (patient_id, is_completed, created_at DESC),
    CONSTRAINT fk_shopping_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Listas de compras semanais geradas por planejamento nutricional.';

-- -----------------------------------------------------------------------------
-- Tabela 20: meal_plans (Planejamento Alimentar do Nutricionista)
-- Suporta o Recurso 12 (Cardápios prescritos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_plans (
    id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id          CHAR(36)     NOT NULL,
    prescribed_by_id    CHAR(36)     NULL COMMENT 'ID do Nutricionista/Endócrino',
    
    title               VARCHAR(150) NOT NULL COMMENT 'Ex: Dieta para Treino Hipertrofia',
    days_json           JSON         NOT NULL COMMENT '{"Segunda": {"Café": [{"food_id": "...", "qty_g": 100}]}}',
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    
    created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (id),
    KEY idx_plans_patient (patient_id, is_active),
    CONSTRAINT fk_plans_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Planos alimentares e cardápios prescritos.';

-- -----------------------------------------------------------------------------
-- Tabela 21: gamification_goals (Metas e Conquistas)
-- Suporta o Recurso 16 (Gamificação: 7 dias sem hipo, TIR > 80%)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gamification_goals (
    id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id          CHAR(36)     NOT NULL,
    
    badge_type          ENUM('NO_HYPO_7_DAYS', 'MEAL_LOG_30_DAYS', 'TIR_90_PCT', 'STREAK_STABLE') NOT NULL,
    title               VARCHAR(150) NOT NULL,
    description         VARCHAR(255) NOT NULL,
    achieved_at         DATETIME(3)  NULL,
    progress_pct        TINYINT UNSIGNED NOT NULL DEFAULT 0,
    
    created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_patient_badge (patient_id, badge_type),
    CONSTRAINT fk_goals_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Metas clínicas gamificadas e conquistas de aderência ao tratamento.';

-- -----------------------------------------------------------------------------
-- Tabela 22: ai_chat_sessions (Assistente IA Educacional / Chatbot)
-- Suporta o Recurso 20 (Assistente IA com disclaimers clínicos)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id          CHAR(36)     NOT NULL,
    
    session_title       VARCHAR(150) NOT NULL DEFAULT 'Conversa com Assistente IA',
    messages            JSON         NOT NULL COMMENT '[{"role": "user", "text": "Posso comer banana?"}, {"role": "assistant", "text": "Sim, uma banana média..."}]',
    
    created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (id),
    KEY idx_chat_patient (patient_id, updated_at DESC),
    CONSTRAINT fk_chat_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Histórico de conversas com a IA educacional de apoio ao diabético.';
