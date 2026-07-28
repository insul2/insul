-- =============================================================================
-- Migration 004 — Exercício, Alertas, Auditoria e Banco de Alimentos
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- -----------------------------------------------------------------------------
-- Tabela 8: exercise_events
-- Registro de atividades físicas. Usadas pelo motor para ajustar ISF/ICR
-- durante e após exercício (janela de sensibilidade de 12-24h).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exercise_events (
    id                  CHAR(36)    NOT NULL DEFAULT (UUID()),
    patient_id          CHAR(36)    NOT NULL,

    exercise_type       ENUM(
        'AEROBIC_LOW',      -- Caminhada leve, yoga
        'AEROBIC_MEDIUM',   -- Corrida leve, bicicleta
        'AEROBIC_HIGH',     -- Corrida intensa, natação
        'ANAEROBIC',        -- Musculação, sprints
        'HIIT',             -- Treino intervalado de alta intensidade
        'MIXED'             -- Combinação
    ) NOT NULL DEFAULT 'AEROBIC_MEDIUM',

    intensity           ENUM('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH') NOT NULL DEFAULT 'MEDIUM',
    duration_minutes    SMALLINT UNSIGNED NOT NULL COMMENT 'Duração total em minutos',

    start_time          DATETIME(3) NOT NULL COMMENT 'Início do exercício (UTC)',
    end_time            DATETIME(3) NULL     COMMENT 'Fim do exercício (NULL se em andamento)',

    -- Impacto no Cálculo
    isf_adjustment_pct  DECIMAL(5,2) NULL COMMENT 'Ajuste percentual no ISF sugerido pelo motor (%)',
    icr_adjustment_pct  DECIMAL(5,2) NULL COMMENT 'Ajuste percentual no ICR (%)',
    sensitivity_window_ends DATETIME(3) NULL COMMENT 'Até quando a janela de sensibilidade pós-exercício está ativa',

    -- Glicemia pré/pós (para análise retrospectiva)
    glucose_pre_mg_dl   DECIMAL(5,2) NULL,
    glucose_post_mg_dl  DECIMAL(5,2) NULL,

    notes               TEXT NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_exercise_patient_time (patient_id, start_time DESC),
    KEY idx_exercise_window       (patient_id, sensitivity_window_ends),

    CONSTRAINT fk_exercise_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT chk_duration
        CHECK (duration_minutes BETWEEN 1 AND 600)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Atividades físicas. Impacto no ISF/ICR por janela de sensibilidade pós-exercício.';

-- -----------------------------------------------------------------------------
-- Tabela 9: alerts
-- Alertas clínicos gerados pelo sistema (hipoglicemia, hiperglicemia, etc.)
-- Matriz de 3 níveis: INFO (azul), WARNING (amarelo), CRITICAL (vermelho).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id              CHAR(36)    NOT NULL DEFAULT (UUID()),
    patient_id      CHAR(36)    NOT NULL,

    alert_type      ENUM(
        'HYPOGLYCEMIA_LEVEL1',       -- BG < 70 mg/dL
        'HYPOGLYCEMIA_LEVEL2',       -- BG < 54 mg/dL (crítico)
        'HYPERGLYCEMIA_MODERATE',    -- BG > 250 mg/dL
        'HYPERGLYCEMIA_SEVERE',      -- BG > 400 mg/dL
        'RAPID_FALL',                -- RoC < -3 mg/dL/min
        'RAPID_RISE',                -- RoC > +3 mg/dL/min
        'KETONE_ELEVATED',           -- Cetona > 0.6 mmol/L
        'KETONE_CRITICAL',           -- Cetona > 3.0 mmol/L (CAD risk)
        'INSULIN_STACKING',          -- IOB alto, risco de empilhamento
        'DOSE_CAPPED',               -- Dose limitada pelo max_single_dose
        'CALCULATION_BLOCKED',       -- Cálculo bloqueado (hipo ativa)
        'SENSOR_LOST',               -- CGM sem sinal
        'INSULIN_EXPIRED',           -- Frasco de insulina possivelmente vencido
        'CGM_NOISE',                 -- Leitura espúria detectada
        'CLOCK_DRIFT'                -- Divergência de fuso/horário no dispositivo
    ) NOT NULL,

    severity        ENUM('INFO', 'WARNING', 'CRITICAL') NOT NULL,

    -- Contexto clínico no momento do alerta
    triggered_value DECIMAL(8,2) NULL COMMENT 'Valor que disparou o alerta (BG, cetona, etc.)',
    triggered_unit  VARCHAR(20)  NULL COMMENT 'Unidade do valor (mg/dL, mmol/L, etc.)',

    message         TEXT         NOT NULL COMMENT 'Mensagem exibida ao usuário',
    action_required TEXT         NULL     COMMENT 'Ação recomendada pelo sistema',

    -- Status
    is_acknowledged BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Usuário confirmou leitura do alerta',
    acknowledged_at DATETIME(3) NULL,
    resolved_at     DATETIME(3) NULL COMMENT 'Quando a condição foi resolvida',

    created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_alerts_patient_time   (patient_id, created_at DESC),
    KEY idx_alerts_unread         (patient_id, is_acknowledged, severity),
    KEY idx_alerts_type           (patient_id, alert_type),

    CONSTRAINT fk_alerts_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Alertas clínicos. Matriz 3 níveis: INFO/WARNING/CRITICAL. Rastreabilidade de segurança.';

-- -----------------------------------------------------------------------------
-- Tabela 10: audit_log
-- Trilha de auditoria imutável. APPEND-ONLY. Nunca deletar ou atualizar.
-- Registra TODA alteração de parâmetros clínicos (ICR, ISF, Alvo, etc.)
-- Exigência: IEC 62304, ISO 14971, LGPD Art. 37 (registro de operações).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id              CHAR(36)    NOT NULL DEFAULT (UUID()),

    -- Ator
    actor_id        CHAR(36)    NOT NULL COMMENT 'user_id do executor (paciente, médico ou sistema)',
    actor_type      ENUM('PATIENT', 'DOCTOR', 'CAREGIVER', 'SYSTEM', 'ADMIN') NOT NULL,

    -- Ação
    action          VARCHAR(100) NOT NULL COMMENT 'Ex: PROFILE_UPDATED, BOLUS_CALCULATED, ICR_CHANGED',
    entity          VARCHAR(100) NOT NULL COMMENT 'Tabela/entidade afetada: insulin_profile_segments',
    entity_id       CHAR(36)    NOT NULL COMMENT 'ID do registro afetado',

    -- Estado antes/depois (JSONB-style — MySQL usa JSON)
    old_state       JSON NULL   COMMENT 'Estado anterior do registro (null para CREATE)',
    new_state       JSON NULL   COMMENT 'Novo estado (null para DELETE)',

    -- Hash de integridade (impede adulteração retroativa)
    state_hash      CHAR(64)    NULL COMMENT 'SHA-256(old_state + new_state + actor_id + timestamp)',

    -- Contexto de rede
    ip_address      VARCHAR(45) NULL COMMENT 'IPv4 ou IPv6 do cliente',
    user_agent      VARCHAR(500) NULL,

    -- Timestamp imutável
    created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    -- NÃO HÁ updated_at — esta tabela é somente de leitura após INSERT

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Auditoria imutável. APPEND-ONLY. IEC 62304 + LGPD. NUNCA alterar ou deletar registros.';

-- Índices de auditoria
CREATE INDEX idx_audit_actor       ON audit_log (actor_id, created_at DESC);
CREATE INDEX idx_audit_entity      ON audit_log (entity, entity_id, created_at DESC);
CREATE INDEX idx_audit_action      ON audit_log (action, created_at DESC);
CREATE INDEX idx_audit_timestamp   ON audit_log (created_at DESC);

-- -----------------------------------------------------------------------------
-- Tabela 11: food_database
-- Banco de alimentos com dados nutricionais.
-- Fonte primária: TACO (Tabela Brasileira de Composição de Alimentos — UNICAMP)
-- Fonte secundária: USDA FoodData Central (API pública)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS food_database (
    id                  CHAR(36)     NOT NULL DEFAULT (UUID()),

    -- Identificação
    name                VARCHAR(255) NOT NULL COMMENT 'Nome do alimento em português',
    name_en             VARCHAR(255) NULL     COMMENT 'Nome em inglês (USDA)',
    brand               VARCHAR(100) NULL     COMMENT 'Marca (NULL para alimentos naturais)',
    barcode             VARCHAR(30)  NULL     COMMENT 'Código de barras EAN-13 para busca por câmera',

    -- Fonte dos Dados
    source              ENUM('TACO', 'USDA', 'OPEN_FOOD_FACTS', 'MANUAL') NOT NULL DEFAULT 'TACO',
    source_id           VARCHAR(50)  NULL COMMENT 'ID do alimento na fonte original (ex: TACO code)',

    -- Categorização
    category            VARCHAR(100) NULL COMMENT 'Ex: Cereais, Carnes, Laticínios, Frutas',
    subcategory         VARCHAR(100) NULL,

    -- Porção de Referência
    portion_size_g      DECIMAL(7,2) NOT NULL COMMENT 'Tamanho da porção em gramas',
    portion_description VARCHAR(100) NULL     COMMENT 'Ex: 1 xícara, 1 fatia, 100g',

    -- Macronutrientes por porção
    calories_kcal       DECIMAL(8,2) NULL,
    carbs_g             DECIMAL(7,2) NOT NULL DEFAULT 0.00 COMMENT 'Carboidratos totais (g)',
    net_carbs_g         DECIMAL(7,2) NULL     COMMENT 'Carboidratos líquidos (carbs - fibras)',
    fiber_g             DECIMAL(7,2) NULL     COMMENT 'Fibras alimentares (g)',
    proteins_g          DECIMAL(7,2) NULL     COMMENT 'Proteínas (g)',
    fats_g              DECIMAL(7,2) NULL     COMMENT 'Gorduras totais (g)',
    saturated_fats_g    DECIMAL(7,2) NULL,
    sodium_mg           DECIMAL(8,2) NULL,

    -- Índice Glicêmico
    glycemic_index      TINYINT UNSIGNED NULL COMMENT 'IG de 0 a 100. NULL se não disponível.',
    glycemic_load       DECIMAL(5,2)     NULL COMMENT 'Carga Glicêmica = (IG × carbs) / 100',
    gi_source           VARCHAR(100)     NULL COMMENT 'Fonte do dado de IG (ex: Atkinson et al. 2008)',

    -- FPU Estimado por porção
    fpu_per_portion     DECIMAL(5,2)     NULL COMMENT '(kcal_prot + kcal_gord) / 100 por porção',

    -- Controle de qualidade
    is_verified         BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Dado verificado por nutricionista',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    UNIQUE KEY uq_food_barcode  (barcode),
    FULLTEXT KEY ft_food_name   (name, name_en) COMMENT 'Busca textual por nome',
    KEY idx_food_category       (category),
    KEY idx_food_source         (source, source_id),
    KEY idx_food_gi             (glycemic_index)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Banco de alimentos TACO+USDA. Macronutrientes e IG para cálculo de bolus prandial.';

-- -----------------------------------------------------------------------------
-- Tabela 12: meal_templates (Refeições Favoritas)
-- Refeições pré-definidas pelo paciente para re-uso rápido.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_templates (
    id              CHAR(36)    NOT NULL DEFAULT (UUID()),
    patient_id      CHAR(36)    NOT NULL,

    name            VARCHAR(100) NOT NULL COMMENT 'Nome da refeição favorita (ex: Almoço Padrão)',
    description     TEXT         NULL,

    -- Snapshot dos macros totais (desnormalizado para performance)
    total_carbs_g   DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    total_proteins_g DECIMAL(7,2) NULL,
    total_fats_g    DECIMAL(7,2) NULL,
    total_calories  DECIMAL(8,2) NULL,
    fpu_value       DECIMAL(5,2) NULL,

    -- Itens da refeição (JSON array de {food_id, quantity_g})
    items           JSON NOT NULL COMMENT '[{"food_id": "uuid", "quantity_g": 150.0, "food_name": "Arroz"}]',

    use_count       INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Quantas vezes o template foi usado',
    last_used_at    DATETIME(3) NULL,

    created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_templates_patient   (patient_id),
    KEY idx_templates_usage     (patient_id, use_count DESC),

    CONSTRAINT fk_templates_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Refeições favoritas do paciente para re-uso rápido no registro de bolus.';
