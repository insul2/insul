-- =============================================================================
-- Migration 003 — Glicemia, Refeições e Bolus
-- Tabelas de série temporal clínica: leituras de glicemia (CGM/capilar),
-- refeições registradas e eventos de bolus calculados e administrados.
--
-- NOTA DE PERFORMANCE (MySQL):
-- O MySQL 8.0 suporta particionamento de tabelas por RANGE.
-- Para glucose_readings (alto volume CGM: ~288 leituras/paciente/dia),
-- particionamento mensal é recomendado.
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- -----------------------------------------------------------------------------
-- Tabela 5: glucose_readings
-- Série temporal de glicemia. Fonte pode ser CGM, glicosímetro ou manual.
-- Volume esperado: ~288 leituras/dia/paciente (CGM a cada 5 minutos).
-- Particionada por mês para performance de queries históricas.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS glucose_readings (
    id              CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id      CHAR(36)     NOT NULL,

    -- Valor da Leitura
    glucose_value   DECIMAL(5,2) NOT NULL COMMENT 'Glicemia em mg/dL',
    reading_time    DATETIME(3)  NOT NULL COMMENT 'Timestamp exato da leitura (UTC)',
    local_time      DATETIME(3)  NULL     COMMENT 'Horário local do paciente (para exibição)',

    -- Fonte e Qualidade
    source          ENUM('CGM', 'BGM', 'MANUAL') NOT NULL DEFAULT 'MANUAL',
    device_id       VARCHAR(100) NULL COMMENT 'ID do sensor/glicosímetro (para rastreabilidade)',
    is_calibration  BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Leitura de calibração do CGM',
    is_noise        BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Marcada como ruído/artifact pelo sistema',

    -- Tendência (CGM)
    trend_arrow     ENUM(
        'RAPID_RISE',    -- ↑↑ > +3 mg/dL/min
        'RISE',          -- ↑  +2 a +3 mg/dL/min
        'SLOW_RISE',     -- ↗  +1 a +2 mg/dL/min
        'FLAT',          -- →  -1 a +1 mg/dL/min
        'SLOW_FALL',     -- ↘  -1 a -2 mg/dL/min
        'FALL',          -- ↓  -2 a -3 mg/dL/min
        'RAPID_FALL'     -- ↓↓ < -3 mg/dL/min
    ) NULL COMMENT 'Seta de tendência — apenas para leituras CGM',

    rate_of_change  DECIMAL(5,2) NULL COMMENT 'Taxa de variação em mg/dL/min (calculada)',

    created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id, reading_time),
    KEY idx_glucose_patient_time  (patient_id, reading_time DESC),
    KEY idx_glucose_source        (patient_id, source, reading_time DESC),
    KEY idx_glucose_noise         (patient_id, is_noise, reading_time DESC),

    CONSTRAINT fk_glucose_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT chk_glucose_value
        CHECK (glucose_value BETWEEN 20.0 AND 700.0),
    CONSTRAINT chk_rate_of_change
        CHECK (rate_of_change IS NULL OR rate_of_change BETWEEN -20.0 AND 20.0)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Série temporal de glicemia. Alta frequência. Particionamento recomendado em produção.';

-- Nota: Particionamento RANGE por YEAR-MONTH em MySQL requer que a coluna de
-- partição faça parte da PRIMARY KEY. Em produção, adicionar:
-- ALTER TABLE glucose_readings PARTITION BY RANGE (TO_DAYS(reading_time)) (
--     PARTITION p_2026_01 VALUES LESS THAN (TO_DAYS('2026-02-01')),
--     ...
-- );

-- -----------------------------------------------------------------------------
-- Tabela 6: meals
-- Refeições registradas pelo paciente. Contém macro-nutrientes e horário.
-- FPU (Fat-Protein Units) é calculado e armazenado para bolus estendido.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meals (
    id                  CHAR(36)    NOT NULL DEFAULT (UUID()),
    patient_id          CHAR(36)    NOT NULL,

    -- Identificação
    meal_label          VARCHAR(100) NULL COMMENT 'Nome ou descrição da refeição',
    meal_time           DATETIME(3)  NOT NULL COMMENT 'Horário da refeição (UTC)',

    -- Macronutrientes (gramas)
    total_carbs_g       DECIMAL(7,2) NOT NULL DEFAULT 0.00 COMMENT 'Carboidratos totais em gramas',
    net_carbs_g         DECIMAL(7,2) NULL     COMMENT 'Carbs líquidos (total - fibras)',
    total_proteins_g    DECIMAL(7,2) NULL     COMMENT 'Proteínas em gramas',
    total_fats_g        DECIMAL(7,2) NULL     COMMENT 'Gorduras em gramas',
    total_fiber_g       DECIMAL(7,2) NULL     COMMENT 'Fibras em gramas',
    total_calories      DECIMAL(8,2) NULL     COMMENT 'Calorias totais (kcal)',

    -- FPU — Fat-Protein Units (Método Pankowska)
    -- FPU = (kcal_prot + kcal_gord) / 100
    fpu_value           DECIMAL(5,2) NULL     COMMENT 'Unidades de Gordura-Proteína calculadas',
    fpu_absorption_hours DECIMAL(4,2) NULL    COMMENT 'Horas de absorção estimadas pelo FPU',
    requires_extended_bolus BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'TRUE se FPU ≥ 1 e bolus estendido indicado',

    -- Absorção
    glycemic_profile    ENUM('FAST', 'MEDIUM', 'SLOW', 'VERY_SLOW') NOT NULL DEFAULT 'MEDIUM',
    absorption_minutes  SMALLINT UNSIGNED NOT NULL DEFAULT 180 COMMENT 'Duração estimada de absorção (min)',

    -- Foto da refeição (URL S3 presigned)
    photo_url           VARCHAR(500) NULL COMMENT 'URL presigned S3 — expira em 24h',

    -- Dados do template (se usou refeição salva)
    template_id         CHAR(36) NULL COMMENT 'FK para meal_templates.id se veio de um favorito',

    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_meals_patient_time  (patient_id, meal_time DESC),

    CONSTRAINT fk_meals_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT chk_total_carbs
        CHECK (total_carbs_g BETWEEN 0.0 AND 500.0),
    CONSTRAINT chk_total_proteins
        CHECK (total_proteins_g IS NULL OR total_proteins_g BETWEEN 0.0 AND 500.0),
    CONSTRAINT chk_total_fats
        CHECK (total_fats_g IS NULL OR total_fats_g BETWEEN 0.0 AND 500.0)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Refeições registradas. Macro-nutrientes e FPU para cálculo de bolus prandial e estendido.';

-- -----------------------------------------------------------------------------
-- Tabela 7: bolus_events
-- Registro imutável de CADA cálculo de dose gerado pelo sistema.
-- Armazena o snapshot completo dos parâmetros usados no cálculo (ICR, ISF, IOB,
-- BG atual) para rastreabilidade clínica e auditoria (IEC 62304).
--
-- REGRA CRÍTICA DE SEGURANÇA: Esta tabela é APPEND-ONLY.
-- Nenhum registro de bolus_events é deletado ou alterado após INSERT.
-- Cancelamentos criam novos registros com status = 'CANCELLED'.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bolus_events (
    id                  CHAR(36)    NOT NULL DEFAULT (UUID()),
    patient_id          CHAR(36)    NOT NULL,
    meal_id             CHAR(36)    NULL COMMENT 'FK opcional — NULL para bolus de correção puro',

    -- === SNAPSHOT DOS PARÂMETROS NO MOMENTO DO CÁLCULO ===
    -- Estes valores são IMUTÁVEIS após INSERT. Refletem o estado exato
    -- dos parâmetros quando o cálculo foi realizado.
    icr_used            DECIMAL(6,2) NOT NULL COMMENT 'ICR aplicado neste cálculo (g/U)',
    isf_used            DECIMAL(6,2) NOT NULL COMMENT 'ISF aplicado (mg/dL/U)',
    target_glucose_used DECIMAL(5,2) NOT NULL COMMENT 'Glicemia alvo usada no cálculo (mg/dL)',
    dia_hours_used      DECIMAL(4,2) NOT NULL COMMENT 'DIA usado para cálculo de IOB (horas)',
    profile_segment_id  CHAR(36)    NULL     COMMENT 'FK para o segmento horário aplicado',

    -- === ENTRADAS DO CÁLCULO ===
    glucose_at_time     DECIMAL(5,2) NOT NULL COMMENT 'Glicemia no momento do cálculo (mg/dL)',
    glucose_source      ENUM('CGM', 'BGM', 'MANUAL') NOT NULL DEFAULT 'MANUAL',
    carbs_input_g       DECIMAL(7,2) NOT NULL DEFAULT 0.00 COMMENT 'Carboidratos informados pelo usuário (g)',
    iob_at_time         DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'IOB calculado no momento (U)',
    iob_model_used      ENUM('LINEAR', 'BILINEAR', 'EXPONENTIAL_OREF') NOT NULL DEFAULT 'LINEAR',

    -- === RESULTADO DO CÁLCULO (breakdown) ===
    bolus_food_u        DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Componente alimentar: carbs_g / ICR (U)',
    bolus_correction_u  DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Componente corretivo bruto: (BG - alvo) / ISF (U)',
    correction_after_iob DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Correção após desconto do IOB: MAX(0, corr - IOB) (U)',
    calculated_dose_u   DECIMAL(5,2) NOT NULL COMMENT 'Dose total calculada antes de arredondamento (U)',
    rounded_dose_u      DECIMAL(5,2) NOT NULL COMMENT 'Dose final após arredondamento para o dispositivo (U)',
    dose_was_capped     BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'TRUE se dose foi limitada ao max_single_dose',

    -- === DECISÃO DO USUÁRIO ===
    override_dose_u     DECIMAL(5,2) NULL COMMENT 'Dose alterada pelo usuário (se diferente da calculada)',
    override_reason     VARCHAR(255) NULL COMMENT 'Motivo do override (campo livre)',
    delivered_dose_u    DECIMAL(5,2) NULL COMMENT 'Dose efetivamente administrada (confirmada pelo usuário)',

    -- === HASH DE AUDITORIA ===
    -- SHA-256 de todos os parâmetros do cálculo. Garante integridade e
    -- impossibilidade de adulteração retroativa. (IEC 62304 + ISO 14971)
    calculation_hash    CHAR(64)    NULL COMMENT 'SHA-256 do snapshot de parâmetros + resultado',

    -- === STATUS E TIMESTAMPS ===
    status              ENUM('CALCULATED', 'CONFIRMED', 'DELIVERED', 'CANCELLED', 'BLOCKED') NOT NULL DEFAULT 'CALCULATED',
    blocked_reason      VARCHAR(100) NULL COMMENT 'Se status=BLOCKED: motivo (ex: HYPOGLYCEMIA_ACTIVE)',
    event_time          DATETIME(3)  NOT NULL COMMENT 'Quando o cálculo foi solicitado (UTC)',
    confirmed_at        DATETIME(3)  NULL COMMENT 'Quando o usuário confirmou a dose',
    delivered_at        DATETIME(3)  NULL COMMENT 'Quando o usuário marcou como administrada',

    created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_bolus_patient_time  (patient_id, event_time DESC),
    KEY idx_bolus_status        (patient_id, status),
    KEY idx_bolus_meal          (meal_id),
    KEY idx_bolus_iob_calc      (patient_id, event_time DESC, delivered_dose_u),

    CONSTRAINT fk_bolus_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_bolus_meal
        FOREIGN KEY (meal_id) REFERENCES meals(id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    CONSTRAINT chk_calculated_dose
        CHECK (calculated_dose_u >= 0.0 AND calculated_dose_u <= 30.0),
    CONSTRAINT chk_rounded_dose
        CHECK (rounded_dose_u >= 0.0 AND rounded_dose_u <= 30.0),
    CONSTRAINT chk_iob_positive
        CHECK (iob_at_time >= 0.0),
    CONSTRAINT chk_glucose_input
        CHECK (glucose_at_time BETWEEN 20.0 AND 700.0)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Registro imutável de cálculos de bolus. APPEND-ONLY. Auditoria clínica IEC 62304.';
