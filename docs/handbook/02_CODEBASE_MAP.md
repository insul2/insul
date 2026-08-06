# LEBEN Engineering Handbook — Volume 02: Codebase Map & Level-3 Audit

**Projeto:** LEBEN — Plataforma de Gestão de Diabetes & Motor Clínico de Bolus  
**Versão:** 4.0.0  

---

## 1. Inventário Geral da Estrutura de Diretórios

```
projetoinsu/
├── backend/
│   ├── prisma/schema.prisma         # Definidor do Banco de Dados PostgreSQL
│   ├── src/
│   │   ├── app.js                   # Instanciação do Express, CORS e Estáticos
│   │   ├── server.js                # Bootstrap do Servidor e Migrações
│   │   ├── config/                  # env.js, database.js, migrate.js, seed_mongo.js
│   │   ├── controllers/             # authController, bolusController, foodController, glucoseController
│   │   ├── core/glucose_engine/     # Módulos puros: bolus.js, iob.js, safety.js
│   │   ├── middlewares/             # authMiddleware.js (JWT Bearer)
│   │   ├── routes/index.js          # Roteamento Central REST v1
│   │   └── services/                # glucoseEngineService, foodService, aiService
├── frontend/
│   ├── src/
│   │   ├── App.jsx / main.jsx       # Ponto de Entrada React
│   │   ├── components/              # AppLayout, Sidebar, Topbar, GlucoseChart24h, XiviaAIFloating
│   │   ├── context/AuthContext.jsx   # Estado de Login e Autenticação Local
│   │   ├── pages/                   # BolusCalculatorPage, DashboardPage, FoodSearchPage, GlucoseLogPage, etc.
│   │   ├── routes/AppRoutes.jsx     # Definição de Rotas e Rota Protegida
│   │   └── utils/iobCalculator.js   # Utilitário Duplicado de IOB no Frontend
├── tests/
│   └── test_engine.js               # Suíte Automatizada (36 Testes de Unidade)
└── [Arquivos Órfãos na Raiz]        # server.js, src/, core/ (Código duplicado/desatualizado)
```

---

## 2. Engenharia Reversa Nível 3 — Análise Detalhada Arquivo por Arquivo

### 🔹 Backend Core (Motor Clínico)

#### [`backend/src/core/glucose_engine/insulin_math/bolus.js`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/core/glucose_engine/insulin_math/bolus.js)
- **Responsabilidade:** Cálculo determinístico principal de Bolus prandial e corretivo (Hovorka 2.1), aplicação de offsets de tendência CGM, descontos de IOB e exercício, e geração do hash SHA-256.
- **Quem chama:** [`glucoseEngineService.js:L9`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/services/glucoseEngineService.js#L9), [`test_engine.js:L7`](file:///c:/Users/Well/Desktop/projetoinsu/tests/test_engine.js#L7).
- **Quem é chamado:** [`safety.js:L28`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/core/glucose_engine/validation/safety.js#L28) (`validateBolusInput`), [`iob.js:L28`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/core/glucose_engine/iob_engine/iob.js#L28) (`calculateIOBFraction`), `crypto.createHash`.
- **Estado:** Ativo / Produção.
- **Complexidade:** Alta ($\mathcal{O}(1)$ tempo execution, mas alta densidade de regras clínicas).
- **Risco:** Crítico (erros alteram doses de insulina de pacientes reais).
- **Dependências:** `crypto`, `safety.js`, `iob.js`.
- **Possíveis Bugs:** Nível de tolerância para arredondamentos com decrementos personalizados não padrão.
- **Possíveis Melhorias:** Extrair simulação preditiva para um arquivo `prediction.js` dedicado.
- **Cobertura de Testes:** Alta (Blocos 1, 2, 3, 4, 5 e 6 de `test_engine.js`).
- **Duplicações:** Duplicado na pasta órfã `core/glucose_engine/insulin_math/bolus.js` na raiz.

#### [`backend/src/core/glucose_engine/iob_engine/iob.js`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/core/glucose_engine/iob_engine/iob.js)
- **Responsabilidade:** Cálculo da fração de Insulina Ativa (IOB) restante com base em equações diferenciais para Humalog, Fiasp e Regular.
- **Quem chama:** [`bolus.js:L8`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/core/glucose_engine/insulin_math/bolus.js#L8), [`test_engine.js:L8`](file:///c:/Users/Well/Desktop/projetoinsu/tests/test_engine.js#L8).
- **Quem é chamado:** Funções matemáticas internas (`curveHumalog`, `curveFiasp`, `curveRegular`).
- **Estado:** Ativo / Produção.
- **Complexidade:** Média ($\mathcal{O}(1)$ equações de 4º grau).
- **Risco:** Alto (superestimar IOB pode causar hiperglicemia; subestimar causa hipoglicemia).
- **Dependências:** Nenhuma (Módulo puro).
- **Possíveis Bugs:** Nenhum detectado.
- **Possíveis Melhorias:** Adicionar suporte dinâmico para novos análogos (Ex: Tresiba/Toujeo para basal).
- **Cobertura de Testes:** Alta (Bloco 7 de `test_engine.js`).
- **Duplicações:** Duplicado integralmente em [`frontend/src/utils/iobCalculator.js`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/utils/iobCalculator.js) e na raiz `core/`.

#### [`backend/src/core/glucose_engine/validation/safety.js`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/core/glucose_engine/validation/safety.js)
- **Responsabilidade:** Validação de segurança fisiológica de inputs (Glicemia de 20 a 600, ICR de 1 a 150, ISF de 5 a 300) e travamento de hipoglicemia ($<70$ mg/dL).
- **Quem chama:** [`bolus.js:L7`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/core/glucose_engine/insulin_math/bolus.js#L7), [`test_engine.js:L9`](file:///c:/Users/Well/Desktop/projetoinsu/tests/test_engine.js#L9).
- **Quem é chamado:** Nenhum.
- **Estado:** Ativo / Produção.
- **Complexidade:** Baixa.
- **Risco:** Crítico (Linha de defesa contra overdoses).
- **Dependências:** Nenhuma.
- **Possíveis Bugs:** Nenhum.
- **Possíveis Melhorias:** Permitir limites de segurança configuráveis por perfil endocrinológico do paciente.
- **Cobertura de Testes:** Alta (Blocos 1 e 9 em `test_engine.js`).
- **Duplicações:** Duplicado na raiz `core/glucose_engine/validation/safety.js`.

---

### 🔹 Backend API & Controladores

#### [`backend/src/controllers/authController.js`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/controllers/authController.js)
- **Responsabilidade:** Login, registro de usuários, renovação de tokens JWT e gestão do cache RAM fallback de autenticação.
- **Quem chama:** [`routes/index.js:L11-13`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/routes/index.js#L11-L13).
- **Quem é chamado:** `bcrypt`, `jwt`, `mongoose`, `query` (`database.js`).
- **Estado:** Ativo com alta fragmentação.
- **Complexidade:** Alta (tenta buscar no Mongoose, depois no PostgreSQL nativo, depois no `registeredUsersCache`).
- **Risco:** Crítico.
- **Dependências:** `jsonwebtoken`, `bcryptjs`, `mongoose`, `database.js`, `env.js`.
- **Possíveis Bugs:** Inconsistência de IDs se o usuário for cadastrado em um banco e consultado em outro.
- **Possíveis Melhorias:** Refatorar para usar unicamente o Prisma Client.
- **Cobertura de Testes:** Nenhuma (Falta teste de integração de API).
- **Duplicações:** Parcialmente duplicado em `src/controllers/` na raiz.

#### [`backend/src/controllers/bolusController.js`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/controllers/bolusController.js)
- **Responsabilidade:** Normalização dos dados de requisição HTTP e delegação do cálculo para o `GlucoseEngineService`.
- **Quem chama:** [`routes/index.js:L16`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/routes/index.js#L16).
- **Quem é chamado:** [`glucoseEngineService.js`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/services/glucoseEngineService.js).
- **Estado:** Ativo.
- **Complexidade:** Baixa.
- **Risco:** Médio.
- **Dependências:** `glucoseEngineService.js`.
- **Possíveis Bugs:** Nenhum.
- **Possíveis Melhorias:** Adicionar sanitização de tipos com biblioteca de validação (ex: `zod` ou `joi`).
- **Cobertura de Testes:** Nenhuma (Apenas testes de unidade do motor sem HTTP).
- **Duplicações:** Duplicado na raiz em `src/controllers/bolusController.js`.

#### [`backend/src/middlewares/authMiddleware.js`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/middlewares/authMiddleware.js)
- **Responsabilidade:** Interceptar requisições HTTP protegidas, validar token Bearer JWT e injetar `req.tenantId`.
- **Quem chama:** [`routes/index.js:L16-19`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/routes/index.js#L16-L19).
- **Quem é chamado:** `jwt.verify`.
- **Estado:** Ativo.
- **Complexidade:** Baixa.
- **Risco:** Alto.
- **Dependências:** `jsonwebtoken`, `env.js`.
- **Possíveis Bugs:** Não verifica se o token está em uma blacklist de revogação.
- **Possíveis Melhorias:** Adicionar validação de escopo de permissões (RBAC).
- **Cobertura de Testes:** Ausente.
- **Duplicações:** Nenhuma.

---

### 🔹 Frontend React

#### [`frontend/src/context/AuthContext.jsx`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/context/AuthContext.jsx)
- **Responsabilidade:** Fornecer contexto global de autenticação (`user`, `isAuthenticated`, `login`, `register`, `logout`).
- **Quem chama:** [`AppRoutes.jsx`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/routes/AppRoutes.jsx), componentes da UI.
- **Quem é chamado:** `fetch('/api/v1/auth/login')`, `localStorage`.
- **Estado:** Contém falha crítica de segurança.
- **Complexidade:** Média.
- **Risco:** Crítico.
- **Dependências:** React `createContext`.
- **Possíveis Bugs:** **Bypass de Autenticação**: O bloco `catch` efetua login com token fake em erros de rede ([L33-45](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/context/AuthContext.jsx#L33-L45)).
- **Possíveis Melhorias:** Remover totalmente o fallback sintético do `catch`.
- **Cobertura de Testes:** Ausente.

#### [`frontend/src/utils/iobCalculator.js`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/utils/iobCalculator.js)
- **Responsabilidade:** Cálculo local do IOB ativo para exibição no frontend com base no histórico local.
- **Quem chama:** [`BolusCalculatorPage.jsx`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/pages/Bolus/BolusCalculatorPage.jsx), [`test_engine.js:L10`](file:///c:/Users/Well/Desktop/projetoinsu/tests/test_engine.js#L10).
- **Quem é chamado:** Funções matemáticas internas de caimento.
- **Estado:** Duplicado em relação ao backend.
- **Complexidade:** Média.
- **Risco:** Médio (Risco de desincronização em relação ao backend).
- **Dependências:** Nenhuma.
- **Possíveis Bugs:** Se o motor do backend for alterado, o frontend exibirá IOB divergente.
- **Possíveis Melhorias:** Consumir o IOB diretamente do endpoint do backend.
- **Cobertura de Testes:** Parcial (testado em `test_engine.js`).

---

### 🔹 Arquivos Órfãos na Raiz (Marcar para Remoção)

1. [`server.js`](file:///c:/Users/Well/Desktop/projetoinsu/server.js) — Servidor legado que aponta para `src/routes/apiRoutes.js`.
2. `src/routes/apiRoutes.js` — Roteador desatualizado na raiz.
3. `src/controllers/bolusController.js` — Controller duplicado desincronizado.
4. `src/controllers/foodController.js` — Controller duplicado desincronizado.
5. `core/glucose_engine/` — Pasta duplicada do motor clínico na raiz.
