-- =============================================================================
-- Migration 006 — Otimizações Avançadas de Segurança, Auditoria e Experiência
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- -----------------------------------------------------------------------------
-- Tabela 13: glycemic_index_load (Índice e Carga Glicêmica dos Alimentos)
-- Relação de IG/CG para alertas de absorção rápida/lenta no cálculo de bolus
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS glycemic_index_load (
    id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
    food_id             CHAR(36)     NOT NULL,
    
    glycemic_index      TINYINT UNSIGNED NULL COMMENT 'Índice Glicêmico (0 a 100)',
    glycemic_load       DECIMAL(5,2) NULL COMMENT 'Carga Glicêmica por porção',
    category            VARCHAR(100) NULL COMMENT 'Categoria de busca inteligente (ex: Frutas, Massas, Pães)',
    
    created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_glycemic_food (food_id),
    KEY idx_glycemic_index (glycemic_index),
    KEY idx_food_category (category),
    
    CONSTRAINT fk_glycemic_food
        FOREIGN KEY (food_id) REFERENCES food_database(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Índice e Carga Glicêmica dos alimentos para refinamento do bolus estendido/dual.';

-- -----------------------------------------------------------------------------
-- Tabela 14: favorite_foods (Alimentos Favoritos do Paciente)
-- Agiliza a busca dos alimentos mais consumidos no dia a dia
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorite_foods (
    id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
    patient_id          CHAR(36)     NOT NULL,
    food_id             CHAR(36)     NOT NULL,
    
    custom_name         VARCHAR(255) NULL COMMENT 'Nome personalizado/apelido do alimento dado pelo paciente',
    custom_portion_g    DECIMAL(8,2) NULL COMMENT 'Porção personalizada em gramas',
    times_used          INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Contador de uso para ordenação por frequência',
    last_used_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    created_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_patient_favorite_food (patient_id, food_id),
    KEY idx_favorite_frequency (patient_id, times_used DESC, last_used_at DESC),
    
    CONSTRAINT fk_favorite_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_favorite_food
        FOREIGN KEY (food_id) REFERENCES food_database(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Alimentos favoritos e frequentes por paciente.';

-- -----------------------------------------------------------------------------
-- Tabela 15: user_patient_permissions (Multi-Perfil: Médicos, Pais e Cuidadores)
-- Permite que um mesmo usuário (médico, pai ou cuidador) gerencie múltiplos pacientes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_patient_permissions (
    id                  CHAR(36)     NOT NULL DEFAULT (UUID()),
    user_id             CHAR(36)     NOT NULL,
    patient_id          CHAR(36)     NOT NULL,
    
    permission_level    ENUM('OWNER', 'GUARDIAN', 'DOCTOR', 'READ_ONLY') NOT NULL DEFAULT 'READ_ONLY',
    granted_at          DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expires_at          DATETIME(3)  NULL COMMENT 'Validade da permissão (para médicos/pesquisadores)',
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_patient_perm (user_id, patient_id),
    KEY idx_permission_patient (patient_id, permission_level),
    
    CONSTRAINT fk_perm_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_perm_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Controle de permissões multi-perfil (Médicos, Pais e Cuidadores).';

-- -----------------------------------------------------------------------------
-- 🚀 Adição de FULLTEXT INDEX na tabela food_database para busca ultra-rápida
-- -----------------------------------------------------------------------------
ALTER TABLE food_database ADD FULLTEXT INDEX ft_idx_food_search (name, brand);
