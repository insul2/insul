-- =============================================================================
-- Migration 009 — Módulo de Simulador de Bolus e Digital Twin (Gêmeo Digital)
-- Suporta o Recurso de Simulação de Cenários ("What-If"), Predição de Curva Glicêmica,
-- e Aprendizado Contínuo por Inteligência Artificial (Gêmeo Digital).
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- -----------------------------------------------------------------------------
-- Tabela 24: bolus_simulations (Simulador de Bolus & Cenários "What-If")
-- Armazena cenários de teste simulados pelo usuário sem gravar eventos clínicos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bolus_simulations (
    id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id          CHAR(36)     NOT NULL,
    
    simulation_name     VARCHAR(150) NULL COMMENT 'Ex: E se eu comer pizza no jantar e caminhar 30min?',
    
    -- Variáveis de Entrada da Simulação
    simulated_bg_mg_dl  DECIMAL(5,2) NOT NULL COMMENT 'Glicemia simulada em mg/dL',
    simulated_carbs_g   DECIMAL(7,2) NOT NULL DEFAULT 0.00 COMMENT 'Carboidratos simulados',
    simulated_proteins_g DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    simulated_fats_g    DECIMAL(7,2) NOT NULL DEFAULT 0.00,
    simulated_iob       DECIMAL(6,2) NOT NULL DEFAULT 0.00 COMMENT 'IOB ativo no momento',
    
    simulated_exercise_type ENUM('NONE', 'AEROBIC', 'ANAEROBIC', 'HIIT') NOT NULL DEFAULT 'NONE',
    simulated_exercise_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    
    -- Resultados Simulados
    calculated_dose_units DECIMAL(6,2) NOT NULL COMMENT 'Dose sugerida simulada',
    estimated_post_bg_2h  DECIMAL(5,2) NULL COMMENT 'Glicemia prevista após 2h',
    estimated_post_bg_4h  DECIMAL(5,2) NULL COMMENT 'Glicemia prevista após 4h',
    predicted_curve_json  JSON         NULL COMMENT 'Curva prevista a cada 15min: [{"time_min": 15, "bg": 160}]',
    
    created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (id),
    KEY idx_simulations_patient (patient_id, created_at DESC),
    CONSTRAINT fk_simulations_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Simuladores de cenários "What-If" e estimativas de curva sem registro no histórico real.';

-- -----------------------------------------------------------------------------
-- Tabela 25: digital_twin_profiles (Gêmeo Digital & Aprendizado Contínuo por IA)
-- Modelo de Inteligência Artificial que aprende a sensibilidade individual do paciente
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS digital_twin_profiles (
    id                      CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id              CHAR(36)     NOT NULL,
    
    -- Parâmetros Dinâmicos Aprendidos pela IA (Refinamento Contínuo)
    learned_icr_modifier    DECIMAL(5,2) NOT NULL DEFAULT 1.00 COMMENT 'Multiplicador do ICR (ex: 0.9 = 10% mais resistente)',
    learned_isf_modifier    DECIMAL(5,2) NOT NULL DEFAULT 1.00 COMMENT 'Multiplicador do ISF',
    
    -- Respostas Individuais Aprendidas por Categoria de Alimento
    food_response_json      JSON         NULL COMMENT '{"arroz_branco": {"avg_spike_mg_dl": 42}, "pizza": {"absorption_delay_hours": 3.5}}',
    
    -- Sensibilidade ao Exercício e Estresse
    exercise_sensitivity_index DECIMAL(5,2) NOT NULL DEFAULT 1.00 COMMENT 'Fator de queda de glicemia por min de treino',
    stress_resistance_index   DECIMAL(5,2) NOT NULL DEFAULT 1.00 COMMENT 'Fator de elevação de glicemia por evento de estresse',
    
    -- Confiança e Atualização do Modelo
    model_confidence_score DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Confiança do modelo IA (0 a 100%)',
    total_records_analyzed INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Total de eventos históricos analisados',
    last_trained_at        DATETIME(3)  NULL COMMENT 'Data do último treinamento da IA',
    
    created_at              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_digital_twin_patient (patient_id),
    CONSTRAINT fk_digital_twin_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Gêmeo Digital (Digital Twin): Perfil metabólico preditivo e personalizado por IA.';
