-- =============================================================================
-- Migration 008 — Módulo de Estatísticas Clínicas Avançadas
-- Suporta o cálculo e armazenamento de métricas da ADA/ISPAD:
-- TIR, Hypo/Hyper Levels, Variabilidade (CV%), GMI, eAG, Médias por Horário e Refeição.
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- -----------------------------------------------------------------------------
-- Tabela 23: patient_glycemic_statistics (Estatísticas Agregadas Diárias/Semanais/Mensais)
-- Armazena o fechamento estatístico calculado a partir de glucose_readings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_glycemic_statistics (
    id                      CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id              CHAR(36)     NOT NULL,
    
    period_type             ENUM('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY') NOT NULL DEFAULT 'WEEKLY',
    start_date              DATE         NOT NULL COMMENT 'Início do período analisado',
    end_date                DATE         NOT NULL COMMENT 'Fim do período analisado',
    
    -- Volume de Dados
    total_readings          INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Total de leituras de glicemia analisadas',
    cgm_active_time_pct     DECIMAL(5,2) NULL COMMENT '% de tempo que o CGM esteve ativo (Meta >70%)',
    
    -- Métricas Principais (Tempo na Faixa / Consensus ADA 2024)
    tir_pct                 DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'TIR — Tempo na Faixa 70-180 mg/dL (Meta >70%)',
    tar_level1_pct          DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'TAR Nível 1 — Acima da Faixa 181-250 mg/dL (Meta <25%)',
    tar_level2_pct          DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'TAR Nível 2 — Hiperglicemia Grave >250 mg/dL (Meta <5%)',
    tbr_level1_pct          DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'TBR Nível 1 — Hipoglicemia 54-69 mg/dL (Meta <4%)',
    tbr_level2_pct          DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'TBR Nível 2 — Hipoglicemia Grave <54 mg/dL (Meta <1%)',
    
    -- Médias e Variabilidade
    average_glucose_mg_dl   DECIMAL(6,2) NOT NULL DEFAULT 0.00 COMMENT 'Média glicêmica do período',
    standard_deviation      DECIMAL(6,2) NULL COMMENT 'Desvio Padrão (SD)',
    coefficient_of_variation DECIMAL(5,2) NULL COMMENT 'CV% — Coeficiente de Variação (Meta <=36%)',
    
    -- Indicadores de HbA1c
    eag_mg_dl               DECIMAL(6,2) NULL COMMENT 'eAG — Glicemia Média Estimada (Nathan Equation)',
    gmi_pct                 DECIMAL(4,2) NULL COMMENT 'GMI — Glucose Management Indicator (% HbA1c estimada = 3.31 + 0.02392 * avg_bg)',
    
    -- Médias por Horário do Dia
    avg_fasting_mg_dl       DECIMAL(6,2) NULL COMMENT 'Média Glicemia em Jejum (04h - 08h)',
    avg_morning_mg_dl       DECIMAL(6,2) NULL COMMENT 'Média Manhã (08h - 12h)',
    avg_afternoon_mg_dl     DECIMAL(6,2) NULL COMMENT 'Média Tarde (12h - 18h)',
    avg_night_mg_dl         DECIMAL(6,2) NULL COMMENT 'Média Noite/Madrugada (18h - 04h)',
    
    -- Médias Pré e Pós-Prandial (Refeições)
    avg_pre_breakfast_mg_dl DECIMAL(6,2) NULL,
    avg_post_breakfast_mg_dl DECIMAL(6,2) NULL,
    avg_pre_lunch_mg_dl     DECIMAL(6,2) NULL,
    avg_post_lunch_mg_dl     DECIMAL(6,2) NULL,
    avg_pre_dinner_mg_dl    DECIMAL(6,2) NULL,
    avg_post_dinner_mg_dl    DECIMAL(6,2) NULL,
    
    created_at              DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_patient_period (patient_id, period_type, start_date, end_date),
    KEY idx_stats_patient_date (patient_id, end_date DESC),
    
    CONSTRAINT fk_stats_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Estatísticas agregadas de controle glicêmico (TIR, CV%, HbA1c estimada, médias).';

-- -----------------------------------------------------------------------------
-- Stored Procedure: sp_calculate_patient_statistics
-- Calcula automaticamente todas as estatísticas para um paciente e período
-- -----------------------------------------------------------------------------
DELIMITER //

CREATE PROCEDURE sp_calculate_patient_statistics(
    IN p_patient_id CHAR(36),
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_period_type VARCHAR(20)
)
BEGIN
    DECLARE v_avg_bg DECIMAL(6,2);
    DECLARE v_sd DECIMAL(6,2);
    DECLARE v_cv DECIMAL(5,2);
    DECLARE v_total INT;
    DECLARE v_tir DECIMAL(5,2);
    DECLARE v_tar1 DECIMAL(5,2);
    DECLARE v_tar2 DECIMAL(5,2);
    DECLARE v_tbr1 DECIMAL(5,2);
    DECLARE v_tbr2 DECIMAL(5,2);
    DECLARE v_gmi DECIMAL(4,2);
    DECLARE v_eag DECIMAL(6,2);

    -- 1. Obter total de leituras
    SELECT COUNT(*) INTO v_total
    FROM glucose_readings
    WHERE patient_id = p_patient_id
      AND DATE(reading_time) BETWEEN p_start_date AND p_end_date
      AND is_noise = FALSE;

    IF v_total > 0 THEN
        -- 2. Calcular Média, Desvio Padrão e CV%
        SELECT 
            AVG(glucose_value),
            STDDEV(glucose_value)
        INTO v_avg_bg, v_sd
        FROM glucose_readings
        WHERE patient_id = p_patient_id
          AND DATE(reading_time) BETWEEN p_start_date AND p_end_date
          AND is_noise = FALSE;

        SET v_cv = (v_sd / v_avg_bg) * 100;

        -- 3. Percentuais na Faixa (TIR, TAR, TBR)
        SELECT 
            (COUNT(CASE WHEN glucose_value BETWEEN 70 AND 180 THEN 1 END) * 100.0 / v_total),
            (COUNT(CASE WHEN glucose_value BETWEEN 181 AND 250 THEN 1 END) * 100.0 / v_total),
            (COUNT(CASE WHEN glucose_value > 250 THEN 1 END) * 100.0 / v_total),
            (COUNT(CASE WHEN glucose_value BETWEEN 54 AND 69 THEN 1 END) * 100.0 / v_total),
            (COUNT(CASE WHEN glucose_value < 54 THEN 1 END) * 100.0 / v_total)
        INTO v_tir, v_tar1, v_tar2, v_tbr1, v_tbr2
        FROM glucose_readings
        WHERE patient_id = p_patient_id
          AND DATE(reading_time) BETWEEN p_start_date AND p_end_date
          AND is_noise = FALSE;

        -- 4. GMI (Fórmula Padrão ADA: 3.31 + 0.02392 * avg_bg)
        SET v_gmi = 3.31 + (0.02392 * v_avg_bg);
        SET v_eag = v_avg_bg;

        -- 5. Gravar ou atualizar estatística
        INSERT INTO patient_glycemic_statistics (
            patient_id, period_type, start_date, end_date,
            total_readings, tir_pct, tar_level1_pct, tar_level2_pct,
            tbr_level1_pct, tbr_level2_pct, average_glucose_mg_dl,
            standard_deviation, coefficient_of_variation, eag_mg_dl, gmi_pct
        ) VALUES (
            p_patient_id, p_period_type, p_start_date, p_end_date,
            v_total, v_tir, v_tar1, v_tar2,
            v_tbr1, v_tbr2, v_avg_bg,
            v_sd, v_cv, v_eag, v_gmi
        ) ON DUPLICATE KEY UPDATE
            total_readings = v_total,
            tir_pct = v_tir,
            tar_level1_pct = v_tar1,
            tar_level2_pct = v_tar2,
            tbr_level1_pct = v_tbr1,
            tbr_level2_pct = v_tbr2,
            average_glucose_mg_dl = v_avg_bg,
            standard_deviation = v_sd,
            coefficient_of_variation = v_cv,
            eag_mg_dl = v_eag,
            gmi_pct = v_gmi;
    END IF;
END //

DELIMITER ;
