-- =============================================================================
-- Migration 002 — Perfil de Insulina (App Pessoal)
-- O usuário configura seus próprios parâmetros (ICR, ISF, Alvo)
-- que ele já conhece da sua consulta médica.
--
-- AVISO exibido no app ao configurar:
-- "Estes valores foram definidos pelo seu médico. Digite-os exatamente
--  como prescritos. Valores incorretos podem causar hipoglicemia grave."
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- -----------------------------------------------------------------------------
-- Tabela 3: insulin_profiles
-- Perfil de cálculo. O usuário pode ter múltiplos perfis
-- (ex: "Dia Normal", "Dia de Treino", "Viagem").
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS insulin_profiles (
    id              CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id      CHAR(36)     NOT NULL,

    profile_name    VARCHAR(100) NOT NULL COMMENT 'Ex: Meu Perfil, Dia de Treino, Fim de Semana',
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    timezone        VARCHAR(50)  NOT NULL DEFAULT 'America/Sao_Paulo',

    -- Tipo de insulina de bolus (define o modelo de IOB)
    insulin_type    ENUM(
        'ULTRA_RAPID',  -- Lispro, Aspart, Glulisina, Fiasp (onset 10-15min)
        'RAPID',        -- Regular Humana (onset 30-60min)
        'NPH'           -- Intermediária (pouco usado para bolus)
    ) NOT NULL DEFAULT 'ULTRA_RAPID',

    -- DIA — Duration of Insulin Action
    -- O usuário informa o tempo de ação da sua insulina.
    -- Padrão para análogos ultra-rápidos: 4h. Regular: 5-6h.
    dia_hours       DECIMAL(4,2) NOT NULL DEFAULT 4.00
        COMMENT 'Duração da ação da sua insulina de bolus em horas.',

    -- Dispositivo (herdado do patients.bolus_device, mas pode sobrescrever por perfil)
    device_increment DECIMAL(4,3) NOT NULL DEFAULT 0.500
        COMMENT '0.050 = bomba | 0.500 = caneta meia unidade | 1.000 = caneta inteira',

    -- Dose máxima de segurança (o usuário define com base no que usa no dia a dia)
    max_single_dose DECIMAL(5,2) NOT NULL DEFAULT 15.00
        COMMENT 'Maior dose que você costuma tomar de uma vez. Limita o cálculo.',

    created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_profiles_patient  (patient_id),
    KEY idx_profiles_active   (patient_id, is_active),

    CONSTRAINT fk_profiles_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT chk_dia_range
        CHECK (dia_hours BETWEEN 2.0 AND 8.0),
    CONSTRAINT chk_max_dose
        CHECK (max_single_dose BETWEEN 0.5 AND 25.0),
    CONSTRAINT chk_device_increment
        CHECK (device_increment IN (0.025, 0.050, 0.100, 0.500, 1.000))

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Perfis de cálculo de bolus. O usuário configura seus parâmetros prescritos.';

-- -----------------------------------------------------------------------------
-- Tabela 4: insulin_profile_segments
-- ICR, ISF e Alvo por período do dia.
-- O usuário digita os valores que seu médico prescreveu para cada horário.
-- Ex: "De manhã uso ICR 9 e ISF 32. À tarde uso ICR 13 e ISF 42."
-- Se tiver apenas um valor para o dia todo: criar 1 segmento de 00:00 a 23:59.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS insulin_profile_segments (
    id              CHAR(36)     NOT NULL DEFAULT (UUID()),
    profile_id      CHAR(36)     NOT NULL,

    segment_label   VARCHAR(50)  NOT NULL DEFAULT 'Período'
        COMMENT 'Ex: Café da Manhã, Almoço, Jantar, Madrugada',
    segment_order   TINYINT UNSIGNED NOT NULL DEFAULT 1,

    start_time      TIME         NOT NULL COMMENT 'Início. Ex: 06:00:00',
    end_time        TIME         NOT NULL COMMENT 'Fim. Ex: 11:59:59',

    -- ICR: quantos gramas de carb 1 unidade de insulina cobre
    -- "Meu médico disse que 1 unidade cobre X gramas de carb"
    icr             DECIMAL(6,2) NOT NULL
        COMMENT 'Relação Insulina:Carb (g/U). Ex: 10 = 1U cobre 10g de carb.',

    -- ISF: quantos mg/dL 1 unidade de insulina reduz a glicemia
    -- "Meu médico disse que 1 unidade baixa minha glicemia em X mg/dL"
    isf             DECIMAL(6,2) NOT NULL
        COMMENT 'Fator de Sensibilidade (mg/dL/U). Ex: 40 = 1U baixa 40 mg/dL.',

    -- Glicemia alvo desejada neste período
    target_glucose  DECIMAL(5,2) NOT NULL DEFAULT 100.00
        COMMENT 'Glicemia alvo (mg/dL). Geralmente 100 mg/dL.',

    -- Taxa basal para bomba (opcional)
    basal_rate_uph  DECIMAL(5,3) NULL
        COMMENT 'Taxa basal em U/hora (somente para usuários de bomba).',

    created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    KEY idx_segments_profile  (profile_id),
    KEY idx_segments_time     (profile_id, start_time),

    CONSTRAINT fk_segments_profile
        FOREIGN KEY (profile_id) REFERENCES insulin_profiles(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    -- Limites de segurança — protegem contra digitação errada
    CONSTRAINT chk_icr_range
        CHECK (icr BETWEEN 2.0 AND 100.0),
    CONSTRAINT chk_isf_range
        CHECK (isf BETWEEN 5.0 AND 200.0),
    CONSTRAINT chk_target_range
        CHECK (target_glucose BETWEEN 70.0 AND 200.0),
    CONSTRAINT chk_basal_rate
        CHECK (basal_rate_uph IS NULL OR basal_rate_uph BETWEEN 0.0 AND 35.0)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Parâmetros de cálculo por horário. Usuário digita o que o médico prescreveu.';
