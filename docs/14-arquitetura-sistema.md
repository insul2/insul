# Documento 14 — Arquitetura do Sistema: Plataforma de Gerenciamento de Diabetes e Cálculo de Insulina

> **AVISO MÉDICO E LEGAL IMPORTANTE**
> Este documento descreve a arquitetura de um software de suporte à decisão clínica (Clinical Decision Support System - CDSS). O sistema calcula doses de insulina (substância potencialmente letal se administrada incorretamente). A arquitetura aqui descrita prioriza tolerância a falhas, resiliência, segurança da informação e auditoria. Qualquer implementação derivada desta arquitetura DEVE ser submetida a validação clínica rigorosa e aprovação de órgãos regulatórios (como ANVISA no Brasil, FDA nos EUA, ou marcação CE na Europa) antes do uso em pacientes reais.

---

## Índice
1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Banco de Dados](#2-banco-de-dados)
3. [API e Integrações](#3-api)
4. [Frontend e Aplicação Cliente](#4-frontend)
5. [Motor Matemático de Cálculo clínico](#5-motor-matemático)
6. [Logs, Observabilidade e Auditoria](#6-logs-e-auditoria)
7. [LGPD, Privacidade e Conformidade](#7-lgpd-e-conformidade)
8. [Criptografia e Proteção de Dados](#8-criptografia)
9. [Backup, Continuidade de Negócios e Recuperação](#9-backup-e-recuperação)
10. [Deploys, DevOps e SRE](#10-deploys-e-devops)
11. [Roadmap e Funcionalidades Futuras](#11-funcionalidades-futuras)

---

## 1. Visão Geral da Arquitetura

O sistema adota uma arquitetura orientada a microsserviços para o backend, com uma aplicação cliente progressiva (PWA) no frontend. O **Motor Matemático** é estritamente isolado da lógica de negócios e rede, atuando como o "cérebro" clínico determinístico e imutável do sistema.

### 1.1 Diagrama de Componentes (ASCII Art)

```text
                               +-------------------------------------------------+
                               |                   CLIENTES                      |
                               |                                                 |
                               |  +---------------+       +-------------------+  |
                               |  | Web App (PWA) |       | Mobile App (React)|  |
                               |  | React/Next.js |       | Native (Offline)  |  |
                               |  +-------+-------+       +---------+---------+  |
                               +----------|-------------------------|------------+
                                          |                         |
                                          | HTTPS / WSS             | HTTPS
                                          v                         v
+------------------------------------------------------------------------------------+
|                                    EDGE / CDN                                      |
|  +--------------------+   +-------------------------+   +-----------------------+  |
|  | Web Application    |   | API Gateway / API Mgt   |   | DDoS Protection &     |  |
|  | Firewall (WAF)     |-->| Kong / AWS API Gateway  |<--| Rate Limiting         |  |
|  +--------------------+   +------------+------------+   +-----------------------+  |
+----------------------------------------|-------------------------------------------+
                                         |
                                         v
+------------------------------------------------------------------------------------+
|                                CLOUD / BACKEND                                     |
|                                                                                    |
|  +------------------+     +-----------------------+      +----------------------+  |
|  | Auth Service     |     | Clinical Data API     |      | Logging / Audit API  |  |
|  | (OIDC/OAuth2)    |     | (Node.js/Go)          |      | (Append-only)        |  |
|  +------------------+     +---------+-------------+      +----------+-----------+  |
|                                     |                               |              |
|                                     v                               |              |
|                     +-------------------------------+               |              |
|                     | MOTOR MATEMÁTICO (NPM Pkg)    |               |              |
|                     | (Isolado, 100% Cobertura)     |               |              |
|                     +-------------------------------+               |              |
|                                     |                               |              |
|       +-----------------------------+-----------------------+       |              |
|       |                             |                       |       |              |
|       v                             v                       v       v              |
| +-----------+                 +------------+         +-------------+ +----------+  |
| | REDIS     |                 | PostgreSQL |         | S3 Storage  | | ELK /    |  |
| | (Cache,   |                 | (Relacional|         | (Arquivos,  | | Datadog  |  |
| |  IOB,     |                 |  Dados     |         |  Backups,   | | (Logs,   |  |
| |  Sessão)  |                 |  Clínicos) |         |  Fotos)     | | Alertas) |  |
| +-----------+                 +------------+         +-------------+ +----------+  |
+------------------------------------------------------------------------------------+
```

### 1.2 Separação do Motor Matemático
O motor de cálculo de insulina (Motor Matemático) não é um microsserviço que responde a chamadas de rede. Ele é um módulo/pacote interno (ex: pacote NPM privado) importado pelos serviços que precisam dele. 
**Justificativa:** Remover latência de rede em cálculos críticos, evitar falhas de comunicação durante cálculos de dosagem e garantir versionamento semântico rígido do algoritmo clínico independente da infraestrutura web.

### 1.3 Edge Computing vs. Cloud Computing
- **Cloud Computing:** Utilizado para armazenamento de longo prazo (PostgreSQL), treinamento de modelos preditivos, consolidação de logs e relatórios complexos.
- **Edge / Client Computing:** O Web App PWA embute uma versão compilada do *Motor Matemático* em WebAssembly ou JavaScript obfuscado. Isso permite que, em caso de perda de conectividade com a Cloud, o paciente ainda consiga calcular doses de insulina (Bolus) localmente usando os últimos perfis sincronizados no IndexedDB, garantindo disponibilidade contínua (Life-Critical High Availability).

---

## 2. Banco de Dados

A arquitetura de dados exige integridade relacional forte para registros clínicos, alta performance para séries temporais (CGM), e armazenamento flexível para arquivos.

### 2.1 Banco Relacional (PostgreSQL)

O PostgreSQL é a fonte de verdade (Source of Truth). Foi escolhido por sua aderência a ACID, suporte a JSONB (para templates flexíveis) e capacidade de particionamento.

#### Schema Proposto (DDL Examples)

```sql
-- 1. users (Dados Pessoais e de Acesso - Sujeito a forte criptografia)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    two_factor_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete para conformidade LGPD
);

-- 2. patients (Dados Clínicos Básicos)
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    diagnosis_date DATE,
    diabetes_type VARCHAR(20) CHECK (diabetes_type IN ('TYPE_1', 'TYPE_2', 'LADA', 'MODY', 'GESTATIONAL')),
    target_glucose_min NUMERIC(5,2) NOT NULL DEFAULT 70.0,
    target_glucose_max NUMERIC(5,2) NOT NULL DEFAULT 180.0
);

-- 3. insulin_profiles (Perfis Clínicos de Insulina do Paciente)
-- Contém a relação Carboidrato/Insulina, Fator de Sensibilidade, etc.
CREATE TABLE insulin_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    profile_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    timezone VARCHAR(50) NOT NULL,
    dia_hours NUMERIC(4,2) NOT NULL DEFAULT 4.0, -- Duration of Insulin Action
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. insulin_profile_segments (Segmentos horários do perfil)
CREATE TABLE insulin_profile_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES insulin_profiles(id) ON DELETE CASCADE,
    start_time TIME NOT NULL, -- Ex: '00:00:00'
    end_time TIME NOT NULL,   -- Ex: '06:00:00'
    icr NUMERIC(5,2) NOT NULL, -- Insulin to Carb Ratio (g/U)
    isf NUMERIC(5,2) NOT NULL, -- Insulin Sensitivity Factor (mg/dL/U)
    target_glucose NUMERIC(5,2) NOT NULL, -- mg/dL
    basal_rate NUMERIC(5,2) -- U/h (Opcional, para usuários de bomba)
);

-- 5. glucose_readings (Série temporal de glicemia - Usa Partitioning)
CREATE TABLE glucose_readings (
    id UUID NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id),
    glucose_value NUMERIC(5,2) NOT NULL, -- em mg/dL
    reading_time TIMESTAMP WITH TIME ZONE NOT NULL,
    source VARCHAR(50) CHECK (source IN ('CGM', 'BGM', 'MANUAL')),
    trend_arrow VARCHAR(20),
    PRIMARY KEY (id, reading_time)
) PARTITION BY RANGE (reading_time);

-- Exemplo de partição por mês
CREATE TABLE glucose_readings_2024_01 PARTITION OF glucose_readings
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- 6. meals (Refeições)
CREATE TABLE meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    total_carbs NUMERIC(6,2) NOT NULL,
    total_proteins NUMERIC(6,2),
    total_fats NUMERIC(6,2),
    absorption_time_minutes INTEGER DEFAULT 180,
    meal_time TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 7. bolus_events (Cálculos e Administrações de Bolus)
CREATE TABLE bolus_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    meal_id UUID REFERENCES meals(id), -- Opcional, pode ser bolus de correção
    calculated_dose NUMERIC(5,2) NOT NULL,
    override_dose NUMERIC(5,2), -- Se o usuário alterou a dose calculada
    delivered_dose NUMERIC(5,2),
    iob_at_time NUMERIC(5,2) NOT NULL, -- Insulin On Board naquele exato instante
    glucose_at_time NUMERIC(5,2),
    event_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('CALCULATED', 'DELIVERED', 'CANCELLED'))
);

-- 8. exercise_events (Atividades Físicas)
CREATE TABLE exercise_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    intensity VARCHAR(20) CHECK (intensity IN ('LOW', 'MEDIUM', 'HIGH')),
    duration_minutes INTEGER NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    notes TEXT
);

-- 9. alerts (Alertas Médicos)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- Ex: 'HYPOGLYCEMIA_PREDICTION', 'RAPID_DROP'
    severity VARCHAR(20) CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    message TEXT NOT NULL,
    is_acknowledged BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. audit_log (Trilha de Auditoria Clínica - Imutável)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL, -- user_id, system, ou admin
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    old_state JSONB,
    new_state JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. food_database & meal_templates (Banco de Alimentos)
CREATE TABLE food_database (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    portion_size NUMERIC(6,2) NOT NULL,
    portion_unit VARCHAR(20) NOT NULL,
    carbs_per_portion NUMERIC(6,2) NOT NULL,
    glycemic_index VARCHAR(20)
);

CREATE TABLE meal_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id),
    name VARCHAR(100) NOT NULL,
    items JSONB NOT NULL -- Array de {food_id, quantity}
);
```

#### Índices Críticos
```sql
CREATE INDEX idx_glucose_patient_time ON glucose_readings (patient_id, reading_time DESC);
CREATE INDEX idx_bolus_patient_time ON bolus_events (patient_id, event_time DESC);
CREATE INDEX idx_audit_entity ON audit_log (entity, entity_id);
```

### 2.2 Cache (Redis)

O Redis opera como camada de alta velocidade (L1 Cache) para operações críticas e efêmeras.

1. **Deduplication de Eventos CGM:**
   - Sensores CGM enviam dados a cada 5 minutos. O Redis usa chaves como `cgm:dedup:{patient_id}:{timestamp}` com TTL de 15 minutos para ignorar retransmissões do mesmo dado.
2. **IOB Atual (Insulin On Board) Cacheado:**
   - Calcular o IOB exige somar decaimentos de múltiplos bolus nas últimas 4-6 horas. O valor consolidado a cada 5 minutos é salvo no Redis:
     `SET iob:{patient_id} "3.45" EX 300` (TTL 5 min).
3. **Sessões e Rate Limiting:**
   - Armazenamento de JWT Refresh Tokens revogados (Blacklist).
   - Contadores do algoritmo Token Bucket para Rate Limiting da API.
4. **Perfil de Configuração em Memória:**
   - `HASH profile:{patient_id}` contendo os parâmetros atuais de ICR e ISF, recarregado no Redis via eventos do Postgres/CDC (Change Data Capture) sempre que alterado.

### 2.3 Storage de Arquivos (AWS S3 ou similar)

Arquivos estáticos e binários são delegados ao Object Storage.

- **Buckets Separados:**
  - `diab-public-assets`: Assets do frontend, logos, ícones.
  - `diab-patient-media`: Fotos de pratos de comida (privado, presigned URLs curtas).
  - `diab-reports-archive`: PDFs gerados de relatórios AGP (Ambulatory Glucose Profile).
  - `diab-db-backups`: Dumps diários criptografados do PostgreSQL.
- **Política de Retenção (Lifecycle Rules):**
  - Fotos de alimentos: Transição para Glacier após 90 dias, exclusão após 1 ano (redução de risco LGPD e custo).
  - Relatórios PDFs: Mantidos em Standard por 30 dias, transição para Glacier Deep Archive por 5 anos (obrigação médica legal).

---

## 3. API e Integrações

### 3.1 Design
Recomenda-se a adoção primária de **RESTful API** sobre GraphQL para os core flows (Cálculo de Bolus, Ingestão CGM).
- **Justificativa:** APIs médicas exigem previsibilidade estrita de payloads, facilidade de implementação de WAF estrito (regras HTTP tradicionais), e caching HTTP semântico. GraphQL pode ser oferecido apenas no BFF (Backend For Frontend) para renderização complexa de dashboards.
- **Versionamento:** A API será versionada pela URL (`/api/v1/`). Versões antigas terão política rigorosa de *Sunset* (depreciação de 6 meses) devido a mudanças em normativas clínicas.

### 3.2 Endpoints Principais (OpenAPI/Swagger Snippets)

#### `POST /api/v1/bolus/calculate`
Endpoint crítico de decisão. Aciona o Motor Matemático.
**Request Payload:**
```json
{
  "target_glucose": 100,
  "current_glucose": 185,
  "carbs_grams": 45,
  "iob": 1.2,
  "meal_type": "DINNER",
  "exercise_intensity": "NONE"
}
```
**Response Payload:**
```json
{
  "recommended_bolus": 4.5,
  "breakdown": {
    "correction_dose": 1.7,
    "food_dose": 3.0,
    "iob_subtraction": -1.2,
    "exercise_adjustment": 0,
    "trend_adjustment": 1.0
  },
  "warnings": [
    "High IOB detected. Ensure previous bolus was > 2h ago."
  ],
  "calculation_id": "uuid-a1b2-c3d4",
  "timestamp": "2026-07-28T16:05:00Z"
}
```

#### Outros Endpoints vitais:
- `POST /api/v1/glucose/reading` - Ingestão de dados contínuos. Requer validação estrita de timestamps no passado/futuro.
- `POST /api/v1/meal` - Registra refeições consumidas.
- `GET /api/v1/patient/profile` - Retorna os dados clínicos, ICR, ISF.
- `GET /api/v1/reports/agp` - Aciona job assíncrono que gera um relatório estatístico padrão internacional (AGP) e devolve URL do S3.

### 3.3 Segurança da API
- **Autenticação:** JWT de curta duração (15 minutos) + Refresh Tokens estatais (guardados e revogáveis no banco).
- **Rate Limiting:** 100 requisições / minuto por IP/Usuário no WAF/Gateway, mitigando ataques de exaustão e scraping.
- **CORS:** Restrito estritamente aos domínios da PWA (ex: `https://app.projetoinsu.com.br`).
- **Validação de Schema:** Todo payload de entrada é validado por uma biblioteca de Parsing e Validação (como **Zod** ou **AJV**).
  - *Se um endpoint espera "carbs_grams" numérico, a injeção de strings falha no middleware, não chegando à camada clínica.*

---

## 4. Frontend e Aplicação Cliente

### 4.1 Stack Recomendada
- **React com Next.js** (App Router) para PWA. Next.js permite pre-renderização de painéis estáticos e rotas dinâmicas API.
- **Gerenciamento de Estado:** Zustand ou Redux Toolkit, com persistência local criptografada.
- **Offline Storage:** IndexedDB (via Dexie.js) para guardar perfis temporários e sincronizar leituras manuais de glicemia feitas enquanto offline.

### 4.2 PWA para Uso Offline (Local-First Architecture)
O manejo da diabetes não para sem internet. O frontend registra um *Service Worker* que faz cache dos assets críticos e da versão WebAssembly/JS compilada do **Motor Matemático**.
- Se o celular do usuário perder o sinal e ele for almoçar, ele pode abrir o app, inserir 45g de carboidratos, e o *Service Worker* intercepta a chamada de `/bolus/calculate`, executa o motor matemático localmente (usando o perfil cacheado mais recente) e exibe a dose recomendada. Ao retornar online, a operação é sincronizada via *Background Sync API*.

### 4.3 Acessibilidade e Design System
A diabetes pode causar problemas visuais (retinopatia diabética).
- Conformidade estrita com **WCAG 2.1 Nível AA**.
- Contraste alto obrigatório em todos os textos (mínimo 4.5:1).
- Suporte a leitores de tela (ARIA labels claros em gráficos de glicemia).
- Zonas de toque (Touch Targets) amplas em botões de administração de insulina (evitar "fat finger errors" que levam a sobredosagem).

### 4.4 Telas Principais
1. **Dashboard de Glicemia:** Gráfico de série temporal (Time In Range - TIR), seta de tendência, IOB atual.
2. **Calculadora de Bolus (Módulo Principal):** Formulário de entrada dupla (Carboidratos + Glicose), slider de ajuste (Override) e botão gigante de submissão dupla ("Deslize para Confirmar Bolus").
3. **Registro de Refeição:** Busca no banco de alimentos (autocomplete), fotos.
4. **Configurações Médicas:** Tela bloqueada por Biometria/FaceID. Edição de ICR, ISF, Alvos (geralmente gerida pelo Endocrinologista).

---

## 5. Motor Matemático de Cálculo Clínico

Este é o coração do sistema, responsável por modelar a fisiologia humana.

### 5.1 Isolamento Completo
O motor é um pacote npm (`@projetoinsu/clinical-math-engine`).
- **Sem dependências externas:** Nenhuma dependência do ecossistema NodeJS (sem Axios, sem FS). Puramente funções TypeScript baseadas em entradas e saídas.
- **Idempotência:** Para os mesmos parâmetros (Glicose, Carboidratos, ICR, ISF, IOB, Target), o resultado é matematicamente garantido ser exatamente o mesmo.

### 5.2 Interface Pública (Exemplo)
```typescript
export interface BolusParameters {
    currentGlucose: number;
    targetGlucose: number;
    carbohydrates: number;
    insulinToCarbRatio: number;
    insulinSensitivityFactor: number;
    activeInsulinOnBoard: number;
    trendMultiplier?: number;
}

export interface BolusResult {
    totalDose: number;
    foodBolus: number;
    correctionBolus: number;
    safetyWarnings: string[];
}

export declare function calculateRecommendedBolus(params: BolusParameters): BolusResult;
export declare function calculateIOB(bolusHistory: BolusEvent[], actionCurve: 'RAPID' | 'ULTRA_RAPID'): number;
```

### 5.3 Testes e Validação
- **Cobertura Exigida:** 100% Branch/Line/Function Coverage obrigatória via Jest.
- **Mutation Testing:** Uso do *Stryker* para garantir que não há falsos positivos nos testes. Se um mutante sobreviver no código de cálculo, o CI/CD bloqueia o deploy.
- **Casos de Borda Testados Exaustivamente:** Glicose < 70 (Hipoglicemia -> deve recomendar 0 U de correção e sugerir carboidratos), IOB alto (evitar *Insulin Stacking*).

### 5.4 Versionamento Semântico (Semver) Clínico
- Qualquer mudança em constantes, curvas de decaimento de insulina, ou algoritmos gera um `MAJOR` version bump (ex: de v1.x para v2.0).
- Requer revisão em pares (Peer Review) por dois engenheiros sêniores e aprovação do Comitê Clínico/Endocrinologista consultor.

---

## 6. Logs, Observabilidade e Auditoria

Em um sistema médico, o que não está logado, não aconteceu. Logs protegem a empresa contra litígios (ex: o usuário alega que o sistema sugeriu 50 Unidades, mas o log mostra que ele alterou manualmente - Override).

### 6.1 Log Estruturado
Todos os logs são emitidos em JSON, contendo contexto de execução, trace IDs e timestamp UTC.
**Exemplo (Node.js Pino):**
```json
{
  "level": "info",
  "time": "2026-07-28T19:04:02.000Z",
  "trace_id": "req-9876-uuid",
  "user_id": "usr-1234",
  "event_type": "BOLUS_CALCULATION",
  "message": "Bolus calculated successfully",
  "clinical_context": {
    "inputs": {"carbs": 45, "bg": 210},
    "output_dose": 5.2
  }
}
```

### 6.2 Imutabilidade (Audit Log)
A tabela `audit_log` no PostgreSQL opera em modo *Append-Only* (apenas inserções).
- Gatilhos (Triggers) no banco de dados previnem `UPDATE` ou `DELETE` nessa tabela, mesmo para usuários DBA (Data Base Administrator).

### 6.3 Centralização e Alertas
- Logs são enviados via agent (ex: Filebeat ou Datadog Agent) para uma stack ELK ou Datadog.
- **Alertas de Log Anômalo:** Se os logs identificarem a emissão de cálculos de Bolus > 30 Unidades (incomum para a maioria dos casos de DM1) ou falhas de autenticação sucessivas (força bruta), um alerta P1 (Prioridade 1) é disparado no PagerDuty/Slack da equipe de SRE.

---

## 7. LGPD e Conformidade Legal

Por lidar com métricas corporais, dosagens e doenças crônicas, este sistema lida 100% com **Dados Pessoais Sensíveis** (Artigo 11 da LGPD Brasileira / GDPR Art. 9).

### 7.1 Classificação e Base Legal
- **Base Legal:** O processamento ocorre via *Consentimento Explícito e Destacado*. O paciente deve aceitar ativamente os Termos (opt-in explícito, sem checkboxes pré-marcados).
- Caso o usuário seja menor de idade (comum em DM1), há fluxo de aprovação parental associada.

### 7.2 Direitos do Titular Implementados na Arquitetura
- **Transparência:** Endpoint para gerar um PDF consolidado de tudo o que o sistema sabe sobre o usuário.
- **Portabilidade de Dados:** Endpoint de exportação completa do perfil, leituras e refeições em formato interoperável (CSV ou JSON).
- **Direito ao Apagamento (Direito ao Esquecimento):**
  - Botão "Excluir Conta".
  - Dispara um processo de *Soft Delete* inicial (bloqueio de acesso, 30 dias de carência).
  - Após 30 dias, um worker background executa o *Hard Delete* ou a *Anonimização Definitiva*. Os dados do banco relacional têm PIIs (nomes, emails, IPs) apagados, e dados clínicos são mantidos dissociados do indivíduo, usados apenas para estatística geral (se consentido).

### 7.3 Data Protection Officer (DPO) e RIPD
O projeto deve manter um DPO nomeado, com contato público (ex: `dpo@projetoinsu.com.br`).
O RIPD (Relatório de Impacto à Proteção de Dados) deve documentar cada tabela, propósito, risco e mitigação (ex: Criptografia KMS).

---

## 8. Criptografia e Proteção de Dados

### 8.1 Dados em Trânsito (Data in Transit)
- Toda e qualquer comunicação, seja entre usuário e CDN, ou entre microsserviços na VPN da nuvem (VPC), exige **TLS 1.3**.
- Bloqueio sumário de suítes de cifras fracas e SSLv3/TLS 1.0/1.1.

### 8.2 Dados em Repouso (Data at Rest)
- Os volumes EBS do banco de dados e os buckets do S3 são criptografados via **AES-256-GCM**.
- **KMS (Key Management Service):** Utiliza chaves gerenciadas em nuvem (ex: AWS KMS) com **Rotação Automática** a cada ano.
- Criptografia a Nível de Aplicação (Application-Level Encryption) é aplicada para campos altamente confidenciais no banco, usando chaves envelopadas (Envelope Encryption), de modo que um vazamento de banco via SQL Injection não exponha o campo, pois o DB não possui a chave de descriptografia.

### 8.3 Senhas e Hash
- Proibido o armazenamento de senhas em texto puro, MD5 ou SHA1.
- Hash gerado através de algoritmos adaptativos lentos: **Argon2id** (preferencial) ou **Bcrypt** (cost >= 12). Adição de sal (Salt) dinâmico gerado pelo próprio algoritmo.

---

## 9. Backup, Continuidade de Negócios e Recuperação

A perda de dados de perfil de um paciente pode levar à administração incorreta de insulina no dia seguinte se ele confiar na memória do sistema. Tolerância zero à perda de dados.

### 9.1 Estratégia de Backup (PostgreSQL)
- **Point-In-Time Recovery (PITR):** Ativado através do arquivamento contínuo do Write-Ahead Logging (WAL) a cada 5 minutos no S3. Permite recuperar o banco de dados exatamente como estava às "14:35 de terça-feira".
- **Backup Completo:** Dump integral diário rodando às 03:00 da madrugada, criptografado e enviado para S3.

### 9.2 RTO e RPO Definidos
- **RPO (Recovery Point Objective):** Máximo de perda de dados aceitável = **5 Minutos** (baseado no intervalo dos WALs e transmissão de sensores CGM).
- **RTO (Recovery Time Objective):** Tempo máximo até o sistema voltar online = **1 Hora** (restauração automatizada de snapshot em região de disaster recovery).

### 9.3 Multi-Region e Failover
O banco de dados de produção roda em Multi-AZ (Zonas de Disponibilidade Múltiplas) síncrono. Em caso de perda do Data Center A (ex: incêndio ou falha de rede), o Data Center B assume como primário automaticamente em menos de 60 segundos.

---

## 10. Deploys, DevOps e SRE

Qualidade médica exige controle de pipeline extremo. Nada entra em produção manualmente.

### 10.1 CI/CD Pipeline (GitHub Actions ou GitLab CI)
1. **Fase de Build:** Linting restrito, compilação de TypeScript.
2. **Fase de Testes:** 
   - Testes Unitários do Motor Matemático.
   - Testes de Integração da API.
   - Cypress/Playwright E2E Test (Simulação de clique no frontend: colocar carb, checar se tela exibe dose calculada certa).
3. **Fase de Segurança:**
   - Varredura de Código (SAST) com SonarQube.
   - Auditoria de Dependências (NPM Audit, Dependabot). O pipeline falha se houver pacote com CVE (Common Vulnerabilities and Exposures) crítico conhecido.
4. **Fase de Deploy (Produção):** Deploy Blue/Green em clusters Kubernetes ou AWS ECS. Sem downtime (Zero Downtime Deployment).

### 10.2 Feature Flags e Rollback Instantâneo
- O uso de ferramentas como *LaunchDarkly* ou equivalentes para liberar algoritmos novos. Se um ajuste fino no motor matemático for lançado, ele é ativado via flag apenas para pacientes "Beta Testers" primeiro.
- Em caso de anomalias (spike em alertas de hipoglicemia pós-deploy detectado pelo Datadog), um kill-switch no Feature Flag reverte todo o tráfego para a lógica matemática antiga instantaneamente.

### 10.3 SLA e Monitoramento
- **SLA de API (Service Level Agreement):** 99.99% de Uptime (Cerca de 4 minutos de downtime permitido por mês).
- Monitoramento Sintético: Um bot simula um fluxo de login e cálculo de bolus a cada 1 minuto de vários locais geográficos. Se o cálculo falhar, o plantão é acionado.

---

## 11. Roadmap e Funcionalidades Futuras

A arquitetura base (v1.0) permite evolução segura para os seguintes módulos nos próximos 2-4 anos:

### 11.1 Inteligência Artificial e Reconhecimento (Vision API)
- Integração no PWA para tirar foto do prato.
- O app envia para um backend serveless que roteia para um modelo de Visão Computacional (ex: AWS Rekognition ou custom YOLO) que identifica proporções de alimentos, estimando o total de carboidratos, proteínas e gorduras (Macronutrientes).
- *Implicação Arquitetural:* Exige adição de fila de eventos assíncronos (SQS/RabbitMQ), pois inferência ML pode levar segundos, não cabendo em API REST síncrona.

### 11.2 Integração Contínua com CGM Open Source (Nightscout)
- Pacientes avançados sobem dados em instâncias Nightscout próprias.
- A API receberá Webhooks nativos para sincronização passiva de dados Nightscout em tempo real, sem o paciente precisar abrir o app (Server-to-Server).

### 11.3 Alertas Preditivos com Machine Learning
- **O Desafio:** Hipoglicemias e Hiperglicemias noturnas.
- **Solução Arquitetural:** Uma pipeline de Big Data (Data Lakehouse) que treina um modelo XGBoost individualizado para cada paciente, analisando padrões de 30 dias.
- **Resultado:** O celular recebe uma notificação Push às 21:00: *"Alto risco (85%) de hipoglicemia nesta madrugada com base em seu exercício de hoje à tarde e insulina atual. Recomendado lanche de 15g de carboidrato preventivo."*

### 11.4 Integração com Bombas de Insulina (Loop / OpenAPS)
- Em fases maduras da regulação do sistema, a arquitetura abrirá APIs Bluetooth LE (Low Energy) no PWA (via Web Bluetooth API) ou no App Nativo para enviar comandos diretos de Basal Temporário e micro-bolus para bombas de insulina *off-label* ou parcerias comerciais, atuando como um *Closed-Loop System* híbrido.

---
**Fim do Documento 14**
*(Revisão de Arquitetura - Versão 1.0. Aprovado pelo Comitê Técnico)*
