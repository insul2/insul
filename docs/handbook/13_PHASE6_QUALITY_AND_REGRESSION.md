# LEBEN Engineering Handbook — Volume 13: Quality Assurance, Automated Regression & CI/CD (Fase 6)

**Auditor / Tech Lead:** Principal Software Engineer & Lead QA  
**Projeto:** LEBEN — Plataforma de Gestão de Diabetes & Motor Clínico de Bolus (v4.0.0)  
**Data:** 06 de Agosto de 2026  
**Padrão:** IEC 62304 / ISO 14971 / ADA / SBD  

---

## 1. Visão Geral da Fase 6 — Engenharia de Regressão Zero

A Fase 6 formaliza a transição de um modelo de auditoria pontual para um **sistema de qualidade e regressão contínua**. Nenhuma alteração futura no motor de cálculo, nas rotas Express ou nas migrações do banco de dados poderá ser integrada sem passar 100% pelas suítes automatizadas.

---

## 2. Estrutura das Suítes de Teste

| Suíte | Arquivo | Responsabilidade | Total de Asserções |
| :--- | :--- | :--- | :---: |
| **Suíte de Produção do Motor** | [`tests/test_engine.js`](file:///c:/Users/Well/Desktop/projetoinsu/tests/test_engine.js) | Algoritmo Hovorka 2.1, regras de trava de hipoglicemia, decaimento IOB, CGM trends e imutabilidade SHA-256. | 36 |
| **Suíte de Regressão Automatizada** | [`tests/regression_suite.js`](file:///c:/Users/Well/Desktop/projetoinsu/tests/regression_suite.js) | Validação permanente de todos os 11 achados auditados nas Fases 1-5 (`RT-02`, `RT-06`, `RT-07`, `CROSS-01`, `CROSS-03`, `GAP-03`, `IDEM-01`, `RT-05`, `RT-04`, `VULN-02`, `DRP-01`). | 16 |
| **Suíte de Integração de API HTTP** | [`api_integration.test.js`](file:///c:/Users/Well/Desktop/projetoinsu/tests/api_integration.test.js) | Contratos REST de `/bolus/calculate`, `/auth/login`, `/auth/refresh` e tratamento de erros. | 8 |

---

## 3. Matriz de Mapeamento: Achado Auditado vs. Teste Automatizado de Regressão

| ID Achado | Descrição da Regressão Prevenida | Asserção no Código (`regression_suite.js`) |
| :--- | :--- | :--- |
| **RT-02** | Injeção de string em `carbs` (`"trinta"`) | `res.validation.errors.some(e => e.includes('Carboidratos inválidos'))` |
| **GAP-03** | `roundingStep = 0` causava divisão por zero e `NaN` | `assert(!isNaN(res.recommendedDose))` com `roundingStep: 0` |
| **CROSS-01** | `targetGlucose` customizado ignorado | `calculateBolus({ targetGlucose: 140 }).recommendedDose === 6.5` vs `7.5U` |
| **CROSS-03** | DIA estático ignorava `Patient.diaHours` | `calculateIOBFraction(120, 'HUMALOG', 6.0) > calculateIOBFraction(120, 'HUMALOG', null)` |
| **RT-07** | Chamada sem token expunha dados no tenant `anonymous` | `getGlucoseReadingsHandler({ user: null })` retorna `HTTP 401` |
| **RT-06** | NoSQL Injection via objeto em `req.user.id` | `sanitizeUserId({ $ne: null })` rejeita com `HTTP 400`/`401` |
| **IDEM-01** | Retries de rede duplicavam leitura de glicemia no DB | Retry com `X-Idempotency-Key` responde `HTTP 200` com `idempotent: true` |
| **RT-05** | Token JWT emitido mesmo com colisão de e-mail | `registerHandler` com e-mail cadastrado responde `HTTP 409 Conflict` |
| **RT-04** | Heap Out-of-Memory por Maps sem expiração | Expiração automática de entradas no `registeredUsersCache` |
| **VULN-02** | Falha de rede autenticava usuário fake | Remoção de fallbacks no `catch` do `AuthContext.jsx` |
| **DRP-01** | Loop N+1 de 8.053 INSERTs individuais | Batch INSERT em chunks de 100 itens no `migrate.js` |

---

## 4. Pipeline de CI/CD (GitHub Actions)

A pipeline automatizada definida em [`.github/workflows/ci.yml`](file:///c:/Users/Well/Desktop/projetoinsu/.github/workflows/ci.yml) é disparada em todo `push` e `pull_request` para os branches `main` e `master`:

```yaml
name: LEBEN Clinical Engine CI/CD Pipeline (Fase 6)
on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test-and-verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm test
```

---

## 5. Como Executar a Suíte Localmente

Para rodar **todas as 60 asserções automatizadas** (Suíte Principal + Regressão + Integração) com um único comando:

```bash
npm test
```

Saída esperada:
```
🧪 Iniciando Suíte Completa de Produção (36 Testes Clínicos)...
🛡️  INICIANDO SUÍTE DE TESTES DE REGRESSÃO AUTOMATIZADA (FASE 6)...
🌐 INICIANDO SUÍTE DE TESTES DE INTEGRAÇÃO DE API (FASE 6)...

📊 TOTAL: 60 TESTES EXECUTADOS | 0 FALHAS
```
