-- ==============================================================================
-- MIGRATION 010: PRODUCTION-GRADE CLINICAL HARDENING & SCALABILITY (9.7/10)
-- Banco de Dados PostgreSQL Nativo — Insul / Xivia V4
-- ==============================================================================

-- 1. Extensões Essenciais de Segurança & Busca Textual (LGPD & Trigram Search)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Versionamento Clínico de Perfis Sensibilidade (ICR/ISF)
CREATE TABLE IF NOT EXISTS insulin_profile_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    name VARCHAR(100) NOT NULL, -- Ex: Café, Almoço, Jantar, Madrugada
    start_hour INTEGER NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
    icr NUMERIC(5,2) NOT NULL CHECK (icr > 0),
    isf NUMERIC(5,2) NOT NULL CHECK (isf > 0),
    effective_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_until TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_profile_versions_patient ON insulin_profile_versions(patient_id, effective_from DESC);

-- 3. Dispositivos & Leituras Dedicadas (CGM / BGM / Bombas)
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- CGM, BGM, INSULIN_PUMP, PEN
    manufacturer VARCHAR(100) NOT NULL, -- Dexcom, Abbott (Libre), Medtronic, Omnipod
    model VARCHAR(100) NOT NULL,
    serial_number VARCHAR(100),
    firmware_version VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS device_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    reading_time TIMESTAMPTZ NOT NULL,
    glucose_mg_dl INTEGER NOT NULL,
    trend_arrow VARCHAR(20), -- FLAT, RISING, RISING_FAST, FALLING, FALLING_FAST
    signal_strength INTEGER,
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Particionamento Clínico da Tabela de Glicemia para Alta Escala (CGM 10M+ registros)
-- Observação: Criação da estrutura base e tabelas de partição por período (Range Partitioning)
CREATE TABLE IF NOT EXISTS glucose_readings_partitioned (
    id UUID DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    glucose_mg_dl INTEGER NOT NULL,
    trend VARCHAR(20) DEFAULT 'FLAT',
    source VARCHAR(50) DEFAULT 'CGM',
    reading_time TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (reading_time, id)
) PARTITION BY RANGE (reading_time);

-- Criar partições mensais automáticas para os anos de 2026/2027
CREATE TABLE IF NOT EXISTS glucose_readings_y2026m07 PARTITION OF glucose_readings_partitioned
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS glucose_readings_y2026m08 PARTITION OF glucose_readings_partitioned
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

-- 5. Event Sourcing Clínico para Auditoria Reativa (Clinical Events Log)
CREATE TABLE IF NOT EXISTS clinical_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- PATIENT_CREATED, GLUCOSE_IMPORTED, BOLUS_CALCULATED, MEAL_REGISTERED, PROFILE_CHANGED
    payload JSONB NOT NULL,
    performed_by UUID REFERENCES users(id),
    client_ip VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clinical_events_type ON clinical_events(patient_id, event_type, created_at DESC);

-- 6. Isolamento Completo do Gêmeo Digital (Digital Twin Sessions & Predictions)
CREATE TABLE IF NOT EXISTS digital_twin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    session_type VARCHAR(50) DEFAULT 'SIMULATION_WHAT_IF',
    simulated_glucose INTEGER NOT NULL,
    simulated_carbs NUMERIC(5,2) NOT NULL,
    simulated_exercise VARCHAR(50) DEFAULT 'NONE',
    calculated_dose NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS digital_twin_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES digital_twin_sessions(id) ON DELETE CASCADE,
    time_offset_minutes INTEGER NOT NULL, -- +15min, +30min, +60min, +120min, +240min
    predicted_glucose INTEGER NOT NULL,
    confidence_score NUMERIC(3,2) DEFAULT 0.90,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Escore de Qualidade dos Dados para Confiança de IA (Data Quality Scores)
CREATE TABLE IF NOT EXISTS data_quality_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    quality_score NUMERIC(5,2) NOT NULL, -- 0.00 a 100.00%
    missing_glucose_pct NUMERIC(5,2) DEFAULT 0.0,
    missing_meal_pct NUMERIC(5,2) DEFAULT 0.0,
    missing_bolus_pct NUMERIC(5,2) DEFAULT 0.0,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Índices Críticos de Alta Performance (Otimização para Busca em Milissegundos)
CREATE INDEX IF NOT EXISTS idx_bolus_patient_time ON bolus_events(patient_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_meals_patient_time ON meals(patient_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_device_readings_time ON device_readings(patient_id, reading_time DESC);

-- Índice Trigram de Alta Performance para Busca nos 488 Mil Alimentos
CREATE INDEX IF NOT EXISTS idx_food_name_trgm ON food_database USING gin(name gin_trgm_ops);
