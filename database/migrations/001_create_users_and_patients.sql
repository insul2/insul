-- =============================================================================
-- Migration 001 — Usuários e Perfil do Paciente (App Pessoal)
-- Sistema: Calculadora de Bolus de Insulina — Uso Pessoal
-- Banco:   MySQL 8.0+
--
-- App pessoal: um usuário = um paciente. Sem médicos vinculados.
-- O próprio diabético cadastra seus dados e parâmetros de insulina
-- (que ele já conhece da prescrição do seu médico).
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- -----------------------------------------------------------------------------
-- Tabela 1: users
-- Conta de acesso ao aplicativo. Um único usuário = um único paciente.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              CHAR(36)     NOT NULL DEFAULT (UUID()),
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL COMMENT 'bcrypt/argon2id — nunca texto plano',
    two_factor_enabled BOOLEAN   NOT NULL DEFAULT FALSE,
    two_factor_secret  VARCHAR(64) NULL   COMMENT 'TOTP secret (criptografado)',
    last_login_at   DATETIME(3)  NULL,
    failed_login_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
    locked_until    DATETIME(3)  NULL,
    created_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at      DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at      DATETIME(3)  NULL COMMENT 'Soft delete — LGPD',

    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Conta de acesso. App pessoal: 1 conta = 1 perfil de diabético.';

-- -----------------------------------------------------------------------------
-- Tabela 2: patients
-- Perfil completo do diabético. Preenchido pelo próprio usuário.
-- IMC é calculado automaticamente ao salvar peso e altura.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
    user_id             CHAR(36)     NOT NULL UNIQUE COMMENT '1 usuário = 1 perfil',

    -- Dados Pessoais (opcionais — o app funciona sem eles)
    display_name        VARCHAR(100) NULL COMMENT 'Nome ou apelido exibido no app',
    date_of_birth       DATE         NULL,
    gender              ENUM('M', 'F', 'OTHER', 'PREFER_NOT_TO_SAY') NULL,

    -- Dados Físicos (usados para contexto e estimativa de TDD inicial)
    weight_kg           DECIMAL(5,2) NULL COMMENT 'Peso em kg',
    height_cm           DECIMAL(5,2) NULL COMMENT 'Altura em cm',
    bmi                 DECIMAL(5,2) NULL COMMENT 'IMC — calculado automaticamente',
    waist_cm            DECIMAL(5,2) NULL COMMENT 'Circunferência abdominal (opcional)',

    -- Tipo de Diabetes
    diabetes_type       ENUM(
        'TYPE_1',
        'TYPE_2',
        'LADA',
        'MODY',
        'GESTATIONAL',
        'OTHER'
    ) NOT NULL DEFAULT 'TYPE_1',

    diagnosis_date      DATE         NULL COMMENT 'Data do diagnóstico (opcional)',

    -- Tipo de Terapia com Insulina
    insulin_therapy     ENUM(
        'BASAL_BOLUS',   -- Basal + bolus separados (esquema mais comum)
        'PUMP',          -- Bomba de infusão
        'BASAL_ONLY',    -- Apenas basal (DM2 iniciando)
        'PREMIX'         -- Pré-mistura (NPH+Regular, NovoMix)
    ) NOT NULL DEFAULT 'BASAL_BOLUS',

    -- Dispositivo de aplicação do bolus (define o arredondamento de dose)
    bolus_device        ENUM(
        'PUMP',             -- Bomba: incremento de 0.05U
        'PEN_HALF_UNIT',    -- Caneta meia unidade: incremento 0.5U
        'PEN_FULL_UNIT',    -- Caneta unidade inteira: incremento 1.0U
        'SYRINGE'           -- Seringa: incremento 0.5U ou 1.0U
    ) NOT NULL DEFAULT 'PEN_HALF_UNIT',

    pump_model          VARCHAR(100) NULL COMMENT 'Modelo da bomba (se aplicável)',
    cgm_model           VARCHAR(100) NULL COMMENT 'Modelo do sensor CGM (ex: FreeStyle Libre 3)',

    -- Alergias e Observações Pessoais
    known_allergies     TEXT NULL,
    personal_notes      TEXT NULL COMMENT 'Anotações pessoais livres',

    -- Configurações do App
    timezone            VARCHAR(50)  NOT NULL DEFAULT 'America/Sao_Paulo',
    glucose_unit        ENUM('mg_dL', 'mmol_L') NOT NULL DEFAULT 'mg_dL',

    created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    deleted_at          DATETIME(3)  NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_patients_user (user_id),

    CONSTRAINT fk_patients_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT chk_weight
        CHECK (weight_kg IS NULL OR weight_kg BETWEEN 5.0 AND 500.0),
    CONSTRAINT chk_height
        CHECK (height_cm IS NULL OR height_cm BETWEEN 50.0 AND 250.0)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Perfil do diabético. Preenchido pelo próprio usuário. App pessoal.';

-- Trigger: calcular IMC automaticamente
DELIMITER $$
CREATE TRIGGER trg_patients_bmi_insert
BEFORE INSERT ON patients FOR EACH ROW
BEGIN
    IF NEW.weight_kg IS NOT NULL AND NEW.height_cm IS NOT NULL AND NEW.height_cm > 0 THEN
        SET NEW.bmi = ROUND(NEW.weight_kg / POW(NEW.height_cm / 100, 2), 2);
    END IF;
END$$

CREATE TRIGGER trg_patients_bmi_update
BEFORE UPDATE ON patients FOR EACH ROW
BEGIN
    IF NEW.weight_kg IS NOT NULL AND NEW.height_cm IS NOT NULL AND NEW.height_cm > 0 THEN
        SET NEW.bmi = ROUND(NEW.weight_kg / POW(NEW.height_cm / 100, 2), 2);
    END IF;
END$$
DELIMITER ;
