# LEBEN — Master Execution Backlog (Auditoria Técnica Fases 1 a 5)

> Documento vivo. Atualizar conforme as correções forem executadas.  
> Última atualização: 06 de Agosto de 2026  

---

## 🔴 CRÍTICO — Executar Esta Semana

| # | Achado | Arquivo | Esforço | Responsável |
|---|--------|---------|---------|------------|
| 1 | `targetGlucose` ignorado pelo motor — superdosagem em idosos e gestantes | [`bolusController.js:L10`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/controllers/bolusController.js#L10) + [`bolus.js:L80`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/core/glucose_engine/insulin_math/bolus.js#L80) | 15 min | Motor |
| 2 | `carbs: "string"` gera NaN e crash do servidor | [`safety.js`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/core/glucose_engine/validation/safety.js) | 30 min | Motor/Safety |
| 3 | Login sintético no `catch` do `AuthContext.jsx` | [`AuthContext.jsx:L33`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/context/AuthContext.jsx#L33) | 5 min | Frontend |
| 4 | Credenciais do MongoDB Atlas e JWT Secret no Git | [`.env`](file:///c:/Users/Well/Desktop/projetoinsu/.env) + [`env.js`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/config/env.js) + [`render.yaml`](file:///c:/Users/Well/Desktop/projetoinsu/render.yaml) | 30 min | DevOps |
| 5 | NoSQL Injection em `glucoseController` — `{ "$ne": null }` | [`glucoseController.js:L32`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/controllers/glucoseController.js#L32) | 15 min | Backend |
| 6 | Fallback `'anonymous'` vaza dados entre usuários | [`glucoseController.js:L15`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/controllers/glucoseController.js#L15) | 15 min | Backend |
| 7 | Maps sem TTL causam Heap Out-of-Memory sob carga | [`authController.js:L13`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/controllers/authController.js#L13) + [`glucoseController.js:L11`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/controllers/glucoseController.js#L11) | 2 horas | SRE |
| 8 | Migração SQL cria `bolus_logs`; Prisma espera `BolusEvent` | [`migrate.js:L49`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/config/migrate.js#L49) + [`schema.prisma:L91`](file:///c:/Users/Well/Desktop/projetoinsu/backend/prisma/schema.prisma#L91) | 2 horas | Backend |
| 9 | `Patient.diaHours` nunca consumido — IOB subestimado | [`iob.js:L30`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/core/glucose_engine/iob_engine/iob.js#L30) | 1 hora | Motor |

---

## 🟠 ALTO — Executar no Próximo Sprint (2 semanas)

| # | Achado | Arquivo | Esforço |
|---|--------|---------|---------|
| 10 | `InsulinProfile` no banco nunca consultada — ICR/ISF são hardcoded no frontend | [`BolusCalculatorPage.jsx:L10`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/pages/Bolus/BolusCalculatorPage.jsx#L10) | 2 dias |
| 11 | Race condition no cadastro — token emitido para ID não persistido | [`authController.js:L170`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/controllers/authController.js#L170) | 1 hora |
| 12 | `roundingStep = 0` não validado — crash por NaN em `bolus.js:L147` | [`safety.js`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/core/glucose_engine/validation/safety.js) | 30 min |
| 13 | Request thrashing — `useEffect` dispara `fetch` HTTP a cada tecla | [`BolusCalculatorPage.jsx:L82`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/pages/Bolus/BolusCalculatorPage.jsx#L82) | 1 hora |
| 14 | Loop N+1 de 8.053 INSERTs no startup — RTO > 30 min | [`migrate.js:L97`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/config/migrate.js#L97) | 2 horas |
| 15 | Pool de 20 conexões `pg` estoura sob 1.000 usuários simultâneos | [`database.js:L13`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/config/database.js#L13) | 1 dia |
| 16 | `POST /glucose` não idempotente — duplica registros em retry | [`glucoseController.js:L84`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/controllers/glucoseController.js#L84) | 1 dia |
| 17 | Arquivos órfãos na raiz (`server.js`, `src/`, `core/`) | Raiz do projeto | 10 min |

---

## 🟡 MÉDIO — Backlog de Arquitetura (Próximo Mês)

| # | Achado | Arquivo | Esforço |
|---|--------|---------|---------|
| 18 | FPU (Gordura/Proteína) documentada mas ignorada no cálculo de dose | [`bolus.js:L105`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/core/glucose_engine/insulin_math/bolus.js#L105) | 1 dia |
| 19 | Cobertura de testes 0% em Controllers, Middlewares e E2E | [`tests/`](file:///c:/Users/Well/Desktop/projetoinsu/tests/) | 1 semana |
| 20 | Observabilidade ausente — sem logs estruturados, APM ou tracing | Todos os arquivos de backend | 1 semana |
