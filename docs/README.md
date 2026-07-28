# 📚 Base Documental Técnica — Sistema de Cálculo de Insulina

> ⚠️ **AVISO MÉDICO-LEGAL**: Este sistema é um **software de apoio à decisão clínica**. Todos os parâmetros de dosagem DEVEM ser configurados exclusivamente pelo endocrinologista responsável pelo paciente. O sistema não substitui avaliação médica profissional.

---

## Índice de Documentos

| # | Documento | Descrição |
|---|-----------|-----------|
| 01 | [Fundamentos do Diabetes](./01-fundamentos-diabetes.md) | Fisiopatologia, tipos, complicações e monitoramento |
| 02 | [Catálogo de Insulinas](./02-catalogo-insulinas.md) | Todas as insulinas disponíveis com perfis farmacológicos completos |
| 03 | [Algoritmos Matemáticos](./03-algoritmos-matematicos.md) | ICR, ISF, bolus alimentar, corretivo, IOB, COB e modelos internacionais |
| 04 | [Contagem de Carboidratos](./04-contagem-carboidratos.md) | IG, CG, fibras, proteínas, gorduras, FPU e método Pankowska |
| 05 | [Banco de Alimentos](./05-banco-alimentos.md) | Tabela com milhares de alimentos (TACO + USDA + fontes científicas) |
| 06 | [Banco de Refeições](./06-banco-refeicoes.md) | Refeições completas com perfil de absorção e estratégia de bolus |
| 07 | [Sensibilidade à Insulina](./07-sensibilidade-insulina.md) | Variação circadiana, hormonal, por doença e condição fisiológica |
| 08 | [Exercício Físico](./08-exercicio-fisico.md) | Impacto de cada modalidade na glicemia e ajuste de insulina |
| 09 | [IOB — Insulina Ativa](./09-iob-insulina-ativa.md) | Modelos matemáticos completos de decaimento de insulina ativa |
| 10 | [Bombas de Insulina](./10-bombas-insulina.md) | Funcionamento, tipos de bolus, basal temporária e microbolus |
| 11 | [CGM — Sensores Contínuos](./11-cgm-sensores.md) | Todos os sensores disponíveis, delay, setas de tendência e taxa de mudança |
| 12 | [Segurança e Validação](./12-seguranca-validacao.md) | Regras obrigatórias, validações e alertas clínicos críticos |
| 13 | [Protocolos Clínicos](./13-protocolos-clinicos.md) | Diretrizes ADA, ISPAD e SBD para metas, ajustes e CGM |
| 14 | [Arquitetura do Sistema](./14-arquitetura-sistema.md) | Banco de dados, API, frontend, logs, LGPD e segurança |
| 15 | [Motor Matemático](./15-motor-matematico.md) | Especificação técnica do núcleo de cálculo isolado |

---

## Os 3 Pilares Fundamentais do Sistema

Este sistema é estruturado em três pilares indissociáveis. Cada pilar corresponde a uma camada de responsabilidade e um conjunto de documentos técnicos:

```
┌────────────────────────────────────────────────────────────────────────────┐
│  PILAR 1: LÓGICA DO CÁLCULO (Algoritmo do Bolus)                         │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Dose = Carbs/ICR + MAX(0, (BG_atual - BG_alvo)/ISF - IOB)              │
│                                                                          │
│  Documentos: 01 (Fundamentos) • 03 (Algoritmos) • 09 (IOB) • 15 (Motor) │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  PILAR 2: PARÂMETROS E REGRAS DO USUÁRIO                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  • Tabelas por horário: ICR e ISF para café, almoço, jantar, madrugada   │
│  • Curva de decaimento da insulina (DIA): 3–5 horas para cálculo de IOB  │
│  • Banco de alimentos: TACO + USDA para contagem de carboidratos          │
│  • Todos os parâmetros definidos EXCLUSIVAMENTE pelo endocrinologista      │
│                                                                          │
│  Documentos: 02 (Insulinas) • 05 (Alimentos) • 07 (Sensibilidade)        │
│              08 (Exercício) • 14 (Arquitetura/DB)                        │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  PILAR 3: REQUISITOS TÉCNICOS E DE SEGURANÇA                             │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  • Validações estritas: nunca dividir por zero, sem glicemia impossível  │
│  • Arredondamento personalizado por dispositivo (0,05U • 0,5U • 1U)       │
│  • Disclaimer médico-legal explícito em toda sugestão de dose            │
│  • IEC 62304 Classe C • ISO 14971 • LGPD • ANVISA                        │
│  • Auditoria imutável de cada cálculo (SHA-256 snapshot)                 │
│                                                                          │
│  Documentos: 12 (Segurança) • 13 (Protocolos) • 14 (Arquitetura)         │
└────────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Regra de Ouro:** Os parâmetros (ICR, ISF, Alvo, DIA) são definidos pelo **endocrinologista**. O sistema calcula com base nesses parâmetros — nunca os altera automaticamente. Toda sugestão de dose é um **apoio à decisão**, não uma ordem.

---

## Próximos Passos de Implementação

A documentação está completa. A ordem recomendada de implementação é:

### Fase 1 — Motor Matemático (core isolado)
```
core/glucose_engine/
  validation/      ← Primeiro: validações e safety rules
  safety_rules/    ← Segundo: alertas e bloqueios
  iob_engine/      ← Terceiro: cálculo de IOB (linear + exponencial)
  insulin_math/    ← Quarto: fórmulas de bolus
  carb_engine/     ← Quinto: COB e FPU
  exercise_engine/ ← Sexto: modificadores de exercício
```
- Testes unitários com 100% de cobertura antes de avançar
- Ver: **Doc 15** (especificação completa)

### Fase 2 — Banco de Dados
- Schema PostgreSQL (já documentado no Doc 14)
- Migrações com Flyway ou Liquibase
- `insulin_profile_segments` (ICR/ISF por horário) como prioridade
- Ver: **Doc 14** (arquitetura)

### Fase 3 — API REST
- `POST /api/v1/bolus/calculate` — endpoint principal
- Validação de schema com Zod
- Auditoria automática em middleware
- Ver: **Doc 14** (endpoints)

### Fase 4 — Banco de Alimentos
- Importar TACO (tabela brasileira, domínio público)
- Complementar com USDA FoodData Central (API pública)
- Busca por nome + código de barras (Open Food Facts)
- Ver: **Doc 05** (banco de alimentos)

### Fase 5 — Frontend
- Calculadora de bolus (tela principal)
- Registro de refeição com busca de alimentos
- Dashboard de glicemia + Time in Range
- Ver: **Doc 14** (frontend)

---

## Princípios Fundamentais do Projeto

### 1. Segurança Acima de Tudo
- Todo cálculo passa por validação antes de ser exibido ao usuário
- Nenhuma dose pode ser sugerida sem parâmetros configurados por médico
- Alertas de segurança são inegociáveis e não podem ser desativados

### 2. Transparência Total
- Todas as fórmulas são documentadas e rastreáveis
- Cada sugestão exibe a fórmula utilizada e os parâmetros aplicados
- Log de auditoria completo de todas as operações

### 3. Parametrização Médica
- ICR, ISF, alvo glicêmico e duração da insulina são definidos pelo endocrinologista
- O sistema não sugere nem altera parâmetros clínicos automaticamente
- Qualquer ajuste requer confirmação e registro do profissional

### 4. Base Científica
- Fórmulas baseadas em ADA, ISPAD, OpenAPS, Loop e AndroidAPS
- Banco de alimentos baseado em TACO e USDA FoodData Central
- Curvas farmacológicas baseadas em literatura revisada por pares

---

## Estrutura de Diretórios do Projeto

```
projetoinsu/
├── docs/                          # Esta documentação técnica
│   ├── README.md                  # Este arquivo
│   ├── 01-fundamentos-diabetes.md
│   ├── 02-catalogo-insulinas.md
│   ├── 03-algoritmos-matematicos.md
│   ├── 04-contagem-carboidratos.md
│   ├── 05-banco-alimentos.md
│   ├── 06-banco-refeicoes.md
│   ├── 07-sensibilidade-insulina.md
│   ├── 08-exercicio-fisico.md
│   ├── 09-iob-insulina-ativa.md
│   ├── 10-bombas-insulina.md
│   ├── 11-cgm-sensores.md
│   ├── 12-seguranca-validacao.md
│   ├── 13-protocolos-clinicos.md
│   ├── 14-arquitetura-sistema.md
│   └── 15-motor-matematico.md
├── core/
│   └── glucose_engine/
│       ├── insulin_math/
│       ├── iob_engine/
│       ├── carb_engine/
│       ├── exercise_engine/
│       ├── meal_prediction/
│       ├── validation/
│       └── safety_rules/
├── src/                           # Código-fonte da aplicação
├── api/                           # Camada de API
├── frontend/                      # Interface do usuário
└── tests/                         # Testes automatizados
```

---

*Versão da documentação: 1.0.0 — Julho de 2026*
*Status: Base inicial — Em desenvolvimento*
