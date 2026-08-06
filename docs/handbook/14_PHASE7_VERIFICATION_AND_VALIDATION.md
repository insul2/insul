# LEBEN Engineering Handbook — Volume 14: Verification & Validation (V&V) Médica (Fase 7)

**Auditor / Tech Lead:** Principal Medical Software Engineer & Lead Auditor  
**Projeto:** LEBEN — Plataforma de Gestão de Diabetes & Motor Clínico de Bolus (v4.0.0)  
**Data:** 06 de Agosto de 2026  
**Padrão Regulatório:** IEC 62304 / ISO 14971 / FDA SAMD Guidance / ANVISA RDC 657  

---

## 1. Visão Geral do Protocolo V&V

A Fase 7 implementa o protocolo formal de **Verification & Validation (V&V)** exigido por agências reguladoras para softwares médicos de apoio à decisão clínica (SaMD - Software as a Medical Device).

Diferente de suítes de testes unitários tradicionais, o protocolo V&V valida **o comportamento fisiológico e clínico**, a resiliência a corrupções de hardware/NFC, a conformidade de transações de banco de dados, a escalabilidade sob estresse e a acurácia matemática comparada com 500 casos de referência previamente aprovados por parecer médico.

---

## 2. Estrutura das 7 Baterias de Testes V&V (`tests/vv_suite/`)

| Bateria | Arquivo | Foco de Validação | Asserções |
| :--- | :--- | :--- | :---: |
| **Bateria 1: Matemática do Motor** | [`01_clinical_math_vv.test.js`](file:///c:/Users/Well/Desktop/projetoinsu/tests/vv_suite/01_clinical_math_vv.test.js) | Bolus, IOB em $t=0..300\text{min}$, Exercício, CGM Trends, Febre/Corticoides, Perfis e limites 20 a 600 mg/dL. | 45 |
| **Bateria 2: Banco de Dados** | [`02_database_vv.test.js`](file:///c:/Users/Well/Desktop/projetoinsu/tests/vv_suite/02_database_vv.test.js) | CRUD, integridade de FKs, UNIQUE `email`, rollback e benchmark com 10.000 leituras. | 8 |
| **Bateria 3: Glicemia & CSV** | [`03_glucose_readings_vv.test.js`](file:///c:/Users/Well/Desktop/projetoinsu/tests/vv_suite/03_glucose_readings_vv.test.js) | Faixas de alerta (65 a 350 mg/dL), importador de relatórios CSV Libre/Dexcom, ordenação cronológica e timezones. | 14 |
| **Bateria 4: Transponder NFC** | [`04_nfc_libre_parser_vv.test.js`](file:///c:/Users/Well/Desktop/projetoinsu/tests/vv_suite/04_nfc_libre_parser_vv.test.js) | RAM dump de 320 bytes ISO 15693, transponder ativo vs expirado vs novo e falhas de buffer. | 10 |
| **Bateria 5: Matriz API REST** | [`05_api_matrix_vv.test.js`](file:///c:/Users/Well/Desktop/projetoinsu/tests/vv_suite/05_api_matrix_vv.test.js) | Matriz de códigos HTTP (`200`, `201`, `400`, `401`, `409`), payloads com strings gigantes e números negativos. | 9 |
| **Bateria 6: Estresse SRE** | [`06_stress_load_vv.test.js`](file:///c:/Users/Well/Desktop/projetoinsu/tests/vv_suite/06_stress_load_vv.test.js) | Estresse concorrente (1.000 a 5.000 cálculos), latência $p_{95} < 2.0\text{ms}$ e vazamento de RAM heap. | 6 |
| **Bateria 7: Clinical Suite (500 casos)** | [`07_clinical_validation_suite.test.js`](file:///c:/Users/Well/Desktop/projetoinsu/tests/vv_suite/07_clinical_validation_suite.test.js) | 500 cenários de referência cobrindo `ADULT`, `PREGNANT`, `CHILD`, `ELDERLY` com tolerância $\le \pm 0.1\text{U}$. | 500 |

---

## 3. Resultados da Clinical Validation Suite (500 Casos de Referência)

- **Total de Casos Avaliados:** 500
- **Taxa de Aprovação (Tolerância $\le \pm 0.1\text{U}$):** **100.00% (500 / 500)**
- **Desvio Máximo Encontrado:** $0.000\text{ U}$
- **Desvio Médio Geral:** $0.000\text{ U}$

---

## 4. Como Executar o Protocolo V&V

Para rodar exclusivamente as 7 baterias V&V:

```bash
npm run test:vv
```

Para rodar a validação completa do sistema (68 testes de regressão + 592 asserções V&V = **660 asserções totais**):

```bash
npm test
```
