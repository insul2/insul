-- =============================================================================
-- Migration 005 — Perfil de Saúde Pessoal (App Pessoal — Simplificado)
-- Sem médicos, sem CRM, sem permissões clínicas.
-- O diabético registra suas próprias informações de saúde.
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- =============================================================================
-- PARTE 1: Insulinas que o usuário usa
-- "Que insulinas você toma?"
-- =============================================================================
CREATE TABLE IF NOT EXISTS patient_insulins (
    id              CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id      CHAR(36)     NOT NULL,

    -- Papel no esquema
    role            ENUM(
        'BASAL',            -- Insulina de fundo (ex: Lantus, Tresiba, NPH)
        'BOLUS',            -- Insulina de refeição/correção (ex: NovoRapid, Humalog)
        'PREMIX',           -- Pré-mistura (ex: NovoMix 30)
        'PUMP_INSULIN'      -- Insulina usada na bomba (basal e bolus)
    ) NOT NULL,

    -- Identificação
    insulin_name    VARCHAR(100) NOT NULL COMMENT 'Nome comercial (ex: Lantus, NovoRapid)',
    generic_name    VARCHAR(100) NULL     COMMENT 'Nome genérico (ex: Glargina, Asparte)',
    manufacturer    VARCHAR(100) NULL     COMMENT 'Fabricante (ex: Sanofi, Novo Nordisk)',

    insulin_type    ENUM(
        'ULTRA_RAPID',  -- Lispro, Aspart, Glulisina, Fiasp, Lyumjev
        'RAPID',        -- Regular Humana
        'INTERMEDIATE', -- NPH
        'LONG_ACTING',  -- Glargina U100, Detemir
        'ULTRA_LONG',   -- Glargina U300 (Toujeo), Degludeca (Tresiba)
        'PREMIX'        -- Misturas pré-prontas
    ) NOT NULL,

    concentration   ENUM('U-100', 'U-200', 'U-300', 'U-500') NOT NULL DEFAULT 'U-100',

    -- Como aplica
    delivery_device ENUM(
        'PEN_DISPOSABLE',
        'PEN_REUSABLE',
        'PUMP',
        'SYRINGE'
    ) NOT NULL DEFAULT 'PEN_DISPOSABLE',

    -- Dose diária (informativa — para referência do usuário)
    fixed_dose_units    DECIMAL(6,2) NULL
        COMMENT 'Dose fixa diária em U (para basal). Ex: 20U de Lantus à noite.',
    administration_time VARCHAR(100) NULL
        COMMENT 'Horário(s) de aplicação. Ex: 22:00 ou 08:00 e 22:00',
    administration_site ENUM('ABDOMEN', 'THIGH', 'ARM', 'BUTTOCK', 'PUMP', 'VARIES') NULL,

    -- Rastreamento do frasco/caneta
    vial_opened_at  DATE NULL COMMENT 'Data que abriu o frasco/caneta atual',
    vial_lot_number VARCHAR(50) NULL COMMENT 'Número do lote (para notificações de recall)',

    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    started_at      DATE NULL,
    stopped_at      DATE NULL,
    notes           TEXT NULL COMMENT 'Anotações pessoais (ex: reação no local, troca por outro)',

    created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_insulins_patient  (patient_id),
    KEY idx_insulins_active   (patient_id, is_active, role),

    CONSTRAINT fk_insulins_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Insulinas que o usuário usa. Basal e bolus com dados de rastreamento.';

-- =============================================================================
-- PARTE 2: Medicamentos e suplementos que o usuário toma
-- "Que remédios você toma além da insulina?"
-- =============================================================================
CREATE TABLE IF NOT EXISTS patient_medications (
    id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id          CHAR(36)     NOT NULL,

    medication_name     VARCHAR(200) NOT NULL COMMENT 'Ex: Metformina, Jardiance, Ozempic',
    active_ingredient   VARCHAR(200) NULL     COMMENT 'Ex: Metformina, Empagliflozina',

    medication_class    ENUM(
        'BIGUANIDE',                -- Metformina (Glifage)
        'SULFONYLUREA',             -- Glibenclamida, Glicazida, Glimepirida
        'DPP4_INHIBITOR',           -- Januvia, Galvus, Onglyza
        'GLP1_AGONIST',             -- Ozempic, Victoza, Wegovy, Mounjaro
        'SGLT2_INHIBITOR',          -- Jardiance, Forxiga, Invokana
        'TZD_GLITAZONE',            -- Pioglitazona (Actos)
        'ALPHA_GLUCOSIDASE_INH',    -- Acarbose (Glucobay)
        'MEGLITINIDE',              -- Repaglinida, Nateglinida
        'ANTIHYPERTENSIVE',         -- Anti-hipertensivos
        'STATIN',                   -- Sinvastatina, Rosuvastatina, Atorvastatina
        'THYROID',                  -- Levotiroxina (Synthroid, Puran T4)
        'CORTICOSTEROID',           -- Prednisona, Dexametasona (cuidado: eleva glicemia)
        'CONTRACEPTIVE',            -- Pílula anticoncepcional (pode alterar ISF)
        'SUPPLEMENT',               -- Magnésio, Cromo, Vitamina D, Berberina
        'OTHER'
    ) NOT NULL DEFAULT 'OTHER',

    -- Impacto na glicemia (contexto para o usuário entender variações)
    glycemic_impact     ENUM(
        'LOWERS_BG',             -- Reduz glicemia (Metformina, GLP-1, SGLT2)
        'RAISES_BG',             -- Eleva glicemia (Corticoides, alguns antipsicóticos)
        'INCREASES_SENSITIVITY', -- Melhora sensibilidade (Pioglitazona)
        'DECREASES_SENSITIVITY', -- Reduz sensibilidade (Corticoides, pílula)
        'NEUTRAL',
        'UNKNOWN'
    ) NOT NULL DEFAULT 'UNKNOWN',

    -- Posologia
    dose_amount         VARCHAR(50)  NOT NULL COMMENT 'Ex: 500mg, 10mg, 1x caneta semanal',
    dose_frequency      ENUM(
        'ONCE_DAILY', 'TWICE_DAILY', 'THREE_TIMES_DAILY',
        'FOUR_TIMES_DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'AS_NEEDED'
    ) NOT NULL DEFAULT 'ONCE_DAILY',
    administration_time VARCHAR(100) NULL COMMENT 'Ex: 07:00 com café ou 13:00 com almoço',
    take_with_food      BOOLEAN      NULL,
    route               ENUM('ORAL', 'SUBCUTANEOUS', 'TOPICAL', 'OTHER') NOT NULL DEFAULT 'ORAL',

    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    started_at          DATE NULL,
    stopped_at          DATE NULL,
    indication          VARCHAR(255) NULL COMMENT 'Para que serve (ex: Controle glicêmico, Pressão)',
    notes               TEXT NULL,

    created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_meds_patient  (patient_id),
    KEY idx_meds_active   (patient_id, is_active),

    CONSTRAINT fk_meds_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Medicamentos e suplementos do usuário além da insulina.';

-- =============================================================================
-- PARTE 3: Histórico de métricas de saúde
-- "Registre sua HbA1c, peso, pressão e outros exames ao longo do tempo"
-- =============================================================================
CREATE TABLE IF NOT EXISTS patient_health_metrics (
    id              CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id      CHAR(36)     NOT NULL,

    metric_type     ENUM(
        'HBA1C',                -- HbA1c (%) — principal marcador de controle
        'FASTING_GLUCOSE',      -- Glicemia em Jejum (mg/dL)
        'POSTPRANDIAL_GLUCOSE', -- Glicemia 2h após refeição (mg/dL)
        'BLOOD_PRESSURE_SYS',   -- Pressão Sistólica (mmHg)
        'BLOOD_PRESSURE_DIA',   -- Pressão Diastólica (mmHg)
        'TOTAL_CHOLESTEROL',    -- Colesterol Total (mg/dL)
        'LDL_CHOLESTEROL',      -- LDL — colesterol "ruim" (mg/dL)
        'HDL_CHOLESTEROL',      -- HDL — colesterol "bom" (mg/dL)
        'TRIGLYCERIDES',        -- Triglicerídeos (mg/dL)
        'CREATININE',           -- Creatinina (mg/dL) — rim
        'EGFR',                 -- Filtração glomerular (mL/min)
        'TSH',                  -- TSH — tireoide (µUI/mL)
        'WEIGHT_KG',            -- Peso ao longo do tempo (kg)
        'WAIST_CM',             -- Circunferência abdominal (cm)
        'KETONES_BLOOD',        -- Cetona capilar (mmol/L)
        'KETONES_URINE',        -- Cetona urinária (+, ++, +++)
        'VITAMIN_D',            -- Vitamina D (ng/mL)
        'C_PEPTIDE',            -- Peptídeo C — reserva pancreática (ng/mL)
        'OTHER'
    ) NOT NULL,

    value_numeric   DECIMAL(10,4) NULL,
    value_text      VARCHAR(50)   NULL COMMENT 'Para valores não numéricos (ex: cetona +++)',
    unit            VARCHAR(30)   NULL COMMENT 'Unidade (mg/dL, %, kg, etc.)',

    -- Meta pessoal (o usuário pode registrar sua meta)
    my_target       VARCHAR(50)   NULL COMMENT 'Meta pessoal (ex: HbA1c < 7%)',
    is_within_target BOOLEAN      NULL COMMENT 'Estava na meta?',

    measured_at     DATETIME(3)   NOT NULL COMMENT 'Data/hora da medição ou do exame',
    lab_name        VARCHAR(100)  NULL COMMENT 'Nome do laboratório',
    notes           TEXT          NULL COMMENT 'Observações pessoais sobre este resultado',

    created_at      DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_metrics_patient_type (patient_id, metric_type, measured_at DESC),

    CONSTRAINT fk_metrics_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Histórico de exames e métricas de saúde. Registro pessoal ao longo do tempo.';

-- =============================================================================
-- PARTE 4: Condições de saúde associadas
-- "Você tem outras condições de saúde?"
-- =============================================================================
CREATE TABLE IF NOT EXISTS patient_comorbidities (
    id              CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id      CHAR(36)     NOT NULL,

    condition_name  VARCHAR(200) NOT NULL COMMENT 'Ex: Hipertensão, Hipotireoidismo',

    condition_type  ENUM(
        -- Complicações do diabetes
        'DIABETIC_NEUROPATHY',
        'DIABETIC_RETINOPATHY',
        'DIABETIC_NEPHROPATHY',
        'DIABETIC_FOOT',
        -- Condições cardiovasculares
        'HYPERTENSION',
        'CORONARY_ARTERY_DISEASE',
        'HEART_FAILURE',
        -- Endócrinas
        'HYPOTHYROIDISM',
        'HYPERTHYROIDISM',
        'POLYCYSTIC_OVARY',         -- SOP
        -- Metabólicas
        'OBESITY',
        'DYSLIPIDEMIA',
        'METABOLIC_SYNDROME',
        -- Gastrointestinais (importantes: afetam absorção de carbs)
        'GASTROPARESIS',            -- Atrasa esvaziamento gástrico
        'CELIAC_DISEASE',
        -- Outras
        'DEPRESSION',
        'ANXIETY',
        'CHRONIC_KIDNEY_DISEASE',
        'OTHER'
    ) NOT NULL DEFAULT 'OTHER',

    severity        ENUM('MILD', 'MODERATE', 'SEVERE', 'UNKNOWN') NULL,
    diagnosed_at    DATE    NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT    NULL,

    created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_comorbidities_patient (patient_id),
    KEY idx_comorbidities_active  (patient_id, is_active),

    CONSTRAINT fk_comorbidities_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON DELETE CASCADE ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Outras condições de saúde do usuário. Contexto clínico pessoal.';
