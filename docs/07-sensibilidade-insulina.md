# Documento 07 — Sensibilidade à Insulina e Fatores Modificadores

> [!WARNING]
> **AVISO MÉDICO E RESPONSABILIDADE CLÍNICA**
> Este documento integra a base de conhecimento de um Sistema de Suporte à Decisão Clínica (CDSS - *Clinical Decision Support System*). Todas as informações, fórmulas e diretrizes aqui descritas são baseadas nas recomendações da *American Diabetes Association* (ADA), *International Society for Pediatric and Adolescent Diabetes* (ISPAD) e Sociedade Brasileira de Diabetes (SBD).
> Nenhuma das orientações contidas neste documento substitui a avaliação clínica individualizada por um endocrinologista ou médico assistente. O CDSS atua apenas como ferramenta de sugestão algorítmica, cabendo ao profissional de saúde ou ao paciente validamente instruído a decisão final sobre a dosagem de insulina.

---

## Índice Clínico-Técnico
1. [Conceito de Sensibilidade à Insulina](#1-conceito-de-sensibilidade-a-insulina)
2. [Variação Circadiana](#2-variacao-circadiana)
3. [Exercício Físico](#3-exercicio-fisico)
4. [Estresse](#4-estresse)
5. [Infecções e Doenças](#5-infeccoes-e-doencas)
6. [Ciclo Menstrual](#6-ciclo-menstrual)
7. [Gravidez](#7-gravidez)
8. [Sono e Privação de Sono](#8-sono-e-privacao-de-sono)
9. [Alimentação e Dieta](#9-alimentacao-e-dieta)
10. [Implicações e Modelagem no Sistema](#10-implicacoes-e-modelagem-no-sistema)

---

## 1. Conceito de Sensibilidade à Insulina

A sensibilidade à insulina determina o quão responsivas as células (principalmente musculares, hepáticas e adiposas) são à ação do hormônio insulina. No manejo clínico do Diabetes Mellitus tipo 1 (DM1) e no Diabetes Mellitus tipo 2 (DM2) insulinodependente, a métrica primária que quantifica essa sensibilidade é o **Fator de Sensibilidade à Insulina (ISF - *Insulin Sensitivity Factor*)**.

### 1.1. Definição do ISF (Insulin Sensitivity Factor)
O ISF, também conhecido como Fator de Correção (FC), representa a queda esperada na glicemia capilar (em mg/dL ou mmol/L) em resposta à administração de 1 (uma) unidade de insulina de ação rápida ou ultrarrápida.

**Exemplo Prático:**
Se o ISF de um paciente é 50 mg/dL, significa que a injeção de 1 Unidade (U) de insulina ultrarrápida irá reduzir a glicose no sangue em aproximadamente 50 mg/dL.

### 1.2. Diferença entre ISF e Resistência à Insulina
Embora interligados, os conceitos possuem aplicações distintas:
- **Resistência à Insulina (RI):** Uma condição fisiopatológica onde uma quantidade normal de insulina produz uma resposta biológica subnormal nas células-alvo. Ocorre deficiência na sinalização intracelular após a ligação ao receptor (IRS-1, via PI3K/Akt).
- **ISF:** É o parâmetro matemático, linearizado, utilizado para o cálculo da dose de correção no dia a dia. Uma alta resistência à insulina implica, matematicamente, um baixo ISF (e.g., 1 U baixa apenas 15 mg/dL). Uma alta sensibilidade resulta em um alto ISF (e.g., 1 U baixa 80 mg/dL).

### 1.3. Cálculo Teórico do ISF (Regras Globais)

Os métodos tradicionais para estabelecimento do ISF inicial são baseados na Dose Total Diária (TDD - *Total Daily Dose*), que inclui a soma da insulina basal e da insulina em bolus.

#### A Regra dos 1800 (Para Análogos Ultrarrápidos)
Utilizada para insulinas como Lispro (Humalog), Asparte (Novorapid) e Glulisina (Apidra). Assume que as insulinas análogas têm uma farmacodinâmica mais aguda.

$$ISF_{1800} = \frac{1800}{TDD}$$

#### A Regra dos 1500 (Para Insulina Regular)
Utilizada para insulinas humanas regulares. O valor é menor porque a insulina regular tem uma cauda de ação mais longa e um pico menos proeminente.

$$ISF_{1500} = \frac{1500}{TDD}$$

**Cenário Numérico:**
* Paciente adulto: TDD = 45 U/dia
* Utiliza insulina ultrarrápida (Asparte).
* Cálculo: 1800 / 45 = 40.
* Portanto, ISF = 40 mg/dL/U.

### 1.4. ISF Múltiplo
Na prática clínica moderna e nos sistemas de pâncreas artificial (AID - *Automated Insulin Delivery*), um único ISF para as 24 horas do dia é insuficiente e perigoso. O corpo humano possui variações endócrinas ao longo do dia, o que obriga a utilização de uma matriz de fatores de sensibilidade.

O CDSS deve suportar perfis circadianos de ISF, divididos em blocos de horas (e.g., meia-noite às 6h, 6h às 10h, etc.), refletindo a verdadeira fisiologia do paciente.

---

## 2. Variação Circadiana

A sensibilidade à insulina sofre profunda influência do relógio biológico central, localizado no núcleo supraquiasmático (hipotálamo), que orquestra a liberação de hormônios contrarregulatórios (GH, cortisol, glucagon, catecolaminas).

### 2.1. Dinâmica Diária (Blocos de Período)

#### Manhã (6h-9h): O Fenômeno do Amanhecer
Neste período, há um pico na secreção de Cortisol (hormônio do despertar) e Hormônio do Crescimento (GH). Ambos promovem intensa glicogenólise e neoglicogênese hepática, além de bloquearem a ação da insulina nos tecidos periféricos (resistência hepática e muscular).
- **Impacto no ISF:** Redução de 20% a 40% em relação à sensibilidade média do dia. O ISF numérico é mais baixo (ex: de 50 para 35).
- **Impacto na Relação Insulina-Carboidrato (ICR):** A ICR costuma ser mais agressiva (ex: de 1/15g para 1/10g) devido à resistência matinal.
- **Exemplo:** Acordar com 150 mg/dL às 7h pode requerer o dobro da dose de correção se comparado a um valor de 150 mg/dL às 16h.

#### Café da Manhã Tardio (9h-12h)
Fase de transição. Os níveis séricos de cortisol e GH começam a decair para os níveis basais do meio-dia. A sensibilidade à insulina começa a se normalizar progressivamente. 

#### Almoço (12h-15h)
Sensibilidade "Média". É geralmente o padrão de referência (baseline) do paciente. Neste período, o sistema gastrointestinal está muito ativo, mas sem a oposição dos hormônios contrarregulatórios matutinos.

#### Tarde (15h-18h)
Frequentemente reportado como o período de **maior sensibilidade à insulina do dia (fase ativa do dia)**, excetuando a madrugada. Com o declínio total do cortisol matinal e maior atividade física incidental, os músculos captam glicose de forma otimizada. Risco moderado de hipoglicemia se a dose do almoço tiver sido exagerada (sobreposição de insulina).

#### Jantar (18h-21h)
A sensibilidade sofre um leve declínio. O cansaço diário e a ingestão de refeições muitas vezes mais gordurosas podem retardar o esvaziamento gástrico. 

#### Madrugada (0h-4h)
O nadir (ponto mais baixo) das necessidades basais e a fase de maior sensibilidade à insulina real. O risco de hipoglicemia severa não percebida é máximo neste período. Em sistemas de bomba de insulina, a taxa basal frequentemente é reduzida a partir das 1h da manhã para prever e mitigar esse pico de sensibilidade.

### 2.2. Gráfico ASCII da Variação do ISF (Curva Circadiana)

O gráfico abaixo ilustra a variação matemática do Fator de Sensibilidade à Insulina (quanto maior a barra, MAIOR o número do ISF, o que significa MAIOR sensibilidade - 1U reduz mais mg/dL).

```text
ISF (mg/dL/U)
80 |                                  ******** 
   |                                 *        *
70 |                                *          *
   |                               *            *
60 |                              *              *
   |           *******           *                *          ********
50 |         **       **        *                  *       **        **
   |        *           *      *                    *     *            *
40 |       *             *    *                      *   *              *
   |      *               *  *                        * *                *
30 |     *                 **                          *                  *
   |    *                                                                  *
20 | ***                                                                    ***
   +----------------------------------------------------------------------------> Hora do Dia
     00h    04h    08h    12h    16h    20h    24h

Resumo Clínico:
- 00h às 04h: Alta sensibilidade (ISF elevado, ex: 80 mg/dL)
- 06h às 10h: Baixa sensibilidade (ISF reduzido, ex: 25-30 mg/dL) - Fenômeno do Amanhecer
- 15h às 17h: Pico da sensibilidade diurna
```

---

## 3. Exercício Físico

O músculo esquelético é o principal tecido responsável pelo clearence (limpeza) da glicose plasmática estimulado pela insulina. O exercício altera drasticamente as regras matemáticas do diabetes.

### 3.1. Mecanismo Fisiológico: GLUT4 Independente de Insulina
Em repouso, o transportador de glicose (GLUT4) fica armazenado em vesículas dentro da célula muscular. Sob ação da insulina, estas vesículas se fundem à membrana, permitindo a entrada de glicose.
Durante o exercício físico, a **contração muscular per se** promove a translocação do GLUT4 para a membrana através de vias mediadas pela AMP-Kinase, *independente* da presença de insulina.
O resultado? A sensibilidade global à insulina exógena circulante é massivamente ampliada, e a glicose despenca se não houver ajuste.

### 3.2. Diferentes Tipos de Exercícios

| Tipo de Exercício | Características Clínicas | Efeito na Glicemia | Impacto no ISF | Ação Sugerida no Sistema |
|-------------------|-------------------------|--------------------|----------------|--------------------------|
| **Aeróbico (LISS)** | Caminhada, corrida leve, ciclismo longo | **Queda acentuada** e contínua durante a prática | Aumento de 30-50% na sensibilidade | Reduzir basal (-50 a -80%) e ISF |
| **Anaeróbico** | Musculação pesada, levantamento de peso | Pode causar **elevação transitória** (pico de adrenalina) | Redução temporária, depois aumento posterior | Possível micro-bolus; cuidado com o efeito tardio |
| **HIIT / Sprint** | Intervalado de alta intensidade | **Elevação aguda** seguida de queda severa na recuperação | Variação extrema em curtos prazos | Observação; não corrigir a alta aguda do exercício |

### 3.3. Janela de Sensibilidade Tardia (Efeito Cauda do Exercício)
O efeito do exercício aeróbico na restauração do glicogênio muscular não termina no momento do banho. O corpo permanece em estado de altíssima sensibilidade à insulina por **12 a 24 horas** após uma atividade vigorosa, a fim de refazer os estoques de glicogênio ("janela anabólica").

**O Perigo Oculto:** Hipoglicemia pós-exercício noturna.
Um paciente que corre às 18h tem enorme risco de hipoglicemia severa às 03h da manhã.
*Recomendação para o CDSS:* Quando um evento de exercício longo for detectado à tarde/noite, o sistema deve sugerir um Fator de Modificação (ex: reduzir basal noturna em 20% e aumentar o alvo glicêmico em +20 mg/dL).

---

## 4. Estresse

Fatores psicológicos (prova escolar, reunião tensa, problemas familiares) disparam o eixo Hipotálamo-Pituitária-Adrenal (HPA) e o Sistema Nervoso Simpático.

### 4.1. Fisiopatologia
A resposta ao estresse de luta ou fuga lança **catecolaminas (adrenalina, noradrenalina)** e **cortisol** na corrente sanguínea.
- **Adrenalina:** Estimula glicogenólise imediata hepática (joga açúcar no sangue rápido).
- **Cortisol:** Induz resistência insulínica severa em tecidos periféricos, limitando a captação de glicose.

### 4.2. Estresse Agudo vs. Crônico
- **Agudo (Susto, Briga):** Pico hiperglicêmico em 15-30 minutos. Pode ceder rápido, não sendo seguro corrigir agressivamente com insulina (risco de hipoglicemia rebote).
- **Crônico (Luto, Síndrome de Burnout, Período de Provas):** Produz uma resistência insulínica basal basal alta, contínua. 
  - Estimativa de Impacto: Redução do ISF em 20% a 50% (necessita de 1.2x a 1.5x mais insulina do que o normal).

### 4.3. Documentação no Sistema
No CDSS, o evento de estresse deve ser uma flag (marcador temporal) configurada pelo usuário. Como é puramente subjetivo, o sistema deve aplicar um modificador gradual e requerer acompanhamento com Libre/Dexcom para validar se a resistência se confirmou antes de recomendar bolus automáticos massivos.

---

## 5. Infecções e Doenças (Sick Day Rules)

Estar doente causa o maior estado de resistência à insulina previsível na vida de um paciente com diabetes, superando até mesmo a gravidez.

### 5.1. A Tempestade de Citocinas
Infecções (virais, bacterianas) ativam o sistema imune inato. Macrófagos secretam interleucinas (IL-1, IL-6) e TNF-alfa. Essas citocinas inflamatórias bloqueiam fortemente os receptores de insulina.
Mesmo que o paciente não esteja comendo nada (anorexia da doença), as necessidades de insulina basal podem *dobrar*. A falta da aplicação correta leva rapidamente à Cetoacidose Diabética (CAD).

### 5.2. Impacto da Febre
O metabolismo basal humano aumenta entre 10% e 12% para cada 1°C acima de 37°C.
- Paciente com 39°C de febre: Metabolismo hiper-acelerado, resistência máxima. Necessidade de insulina basal aumentada em até 30-50%. ISF fortemente comprometido (fator numérico deve ser dividido).

### 5.3. Protocolos Práticos (Sick Day Rules)
O CDSS deve estar preparado para aplicar um "Perfil de Doença".
1. Aumentar checagem de glicemia (a cada 2-3h).
2. Checar cetonas na urina ou sangue se glicemia > 250 mg/dL.
3. Se cetonas +, aumentar insulina de correção usando um ISF mais agressivo.
   - Fórmula Modificada sugerida: `Dose Correção (Doença) = (Glicemia - Alvo) / (ISF * 0.7)`
4. Se vômitos repetidos e incapacidade de manter líquidos: **Risco Iminente de CAD ou Hipoglicemia Severa → Orientar visita imediata ao Pronto-Socorro.**

---

## 6. Ciclo Menstrual

Nas mulheres com diabetes, a flutuação dos hormônios sexuais (Estrogênio e Progesterona) desempenha um papel crítico e, muitas vezes, negligenciado, na estabilidade glicêmica ao longo do mês.

### 6.1. Fases e Impacto
- **Fase Folicular (Início até a ovulação):** Os níveis de estrogênio estão subindo e a progesterona está baixa. O estrogênio costuma ter um efeito sensibilizador da insulina. A sensibilidade volta ao "normal" ou até se torna maior do que o basal diário. As dosagens convencionais funcionam bem.
- **Ovulação (aprox. dia 14):** Pode haver um pico isolado e agudo dos hormônios que causa um pico passageiro (1-2 dias) de resistência à insulina acompanhado de instabilidade.
- **Fase Lútea e TPM (Dias 21-28):** Este é o pior momento metabólico. A progesterona atinge o pico. A progesterona induz resistência à insulina profunda (efeito "anti-insulínico"). 
  - *Impacto Clínico:* As mulheres reportam um aumento na necessidade de insulina de 10% a 30%. O ISF precisa ser diminuído (ex: cai de 50 para 40). O ICR fica mais rígido.
- **Início da Menstruação (Dia 1):** Os hormônios caem drasticamente. A sensibilidade à insulina retorna abruptamente. **Perigo:** Se o paciente e o sistema não removerem o aumento de dose da fase lútea rapidamente, ocorrerão hipoglicemias severas nos primeiros dias da menstruação.

### 6.2. Uso de Anticoncepcionais
Pílulas de estrogênio/progesterona podem criar um estado de leve resistência à insulina constante, atenuando os picos da fase lútea, mas subindo a linha basal. O sistema deve rastrear essas informações no cadastro do paciente.

---

## 7. Gravidez

A gravidez é o cenário extremo do manejo do diabetes. As metas de HbA1c caem de < 7.0% (adulto normal) para < 6.0% a 6.5%, devido aos graves riscos teratogênicos da hiperglicemia fetal.

### 7.1. Dinâmica por Trimestres
- **Primeiro Trimestre (0-12 semanas):** Paradoxo fisiológico. Há um aumento drástico da sensibilidade à insulina. As mulheres frequentemente sofrem hipoglicemias graves (especialmente noturnas). A necessidade de insulina cai cerca de 10-20%.
- **Segundo Trimestre (13-26 semanas):** O desenvolvimento da placenta leva à produção maciça de Lactogênio Placentário Humano (hPL), cortisol e prolactina. Todos causam hiper-resistência. As necessidades de insulina aumentam semana a semana de forma linear, exigindo constante revisão do ISF.
- **Terceiro Trimestre (27-40 semanas):** Resistência insulínica maciça. Muitas pacientes chegam a dobrar ou triplicar (200-300%) suas necessidades totais de insulina pré-gravidez. 
- **Pós-Parto Imediato:** Com a saída da placenta (o órgão causador da resistência), a sensibilidade à insulina retorna de forma violenta ao estado pré-gravídico (ou até maior) em questão de horas. O sistema deve cortar as doses imediatamente em cerca de 50% para prevenir hipoglicemia severa fatal materna.

### 7.2. Metas Glicêmicas (ADA/SBD para Gravidez)
| Momento | Alvo Glicêmico (mg/dL) |
|---------|------------------------|
| Jejum / Pré-prandial | < 95 |
| 1 hora pós-prandial | < 140 |
| 2 horas pós-prandial | < 120 |

---

## 8. Sono e Privação de Sono

A qualidade e a duração do sono são métricas frequentemente ignoradas, mas vitais para o CDSS.

### 8.1. Impacto da Privação
Uma única noite de sono ruim (menos de 5 horas ou fragmentado) é o suficiente para induzir resistência à insulina celular no dia seguinte, assemelhando-se aos perfis do DM2. O corpo compensa o cansaço secretando mais cortisol, elevando as glicemias de jejum e dificultando a correção ao longo do dia.
- Impacto numérico: O ISF pode sofrer uma redução de 10-20% em dias relatados como "privação de sono".

### 8.2. Apneia Obstrutiva do Sono (AOS)
Muito prevalente em portadores de DM2, a AOS causa hipóxia (falta de oxigênio) intermitente e micro-despertares, mantendo os níveis de adrenalina noturna disparados. Tais pacientes acordam frequentemente com glicemias inexplicavelmente altas, mesmo possuindo taxas basais noturnas pesadas.

---

## 9. Alimentação e Dieta

Diferentes abordagens macro-nutricionais alteram a farmacodinâmica esperada e a mecânica do Fator de Sensibilidade.

### 9.1. Refeições Ricas em Gordura (High-Fat)
Uma pizza ou um churrasco não afetam a glicemia da mesma forma que um pão simples, mesmo que tenham os mesmos carboidratos.
A gordura em excesso causa a lipotoxidade temporária celular (aumento dos Ácidos Graxos Livres no sangue), que interfere na via de sinalização da insulina no músculo (bloqueio do IRS-1).
- **A consequência:** Resistência à insulina pós-prandial tardia. A glicemia não sobe rápido, mas após 4-8 horas, ela sobe e estaciona, tornando-se imune às correções normais. O ISF falha e o paciente precisa do dobro da dose de correção para baixar um valor que normalmente cairia com metade.

### 9.2. Dietas Low-Carb e Jejum Intermitente (JI)
- **Low-Carb:** Em adaptação crônica, a dependência global de insulina basal cai, mas o corpo se adapta com resistência fisiológica à insulina celular para poupar glicose para o cérebro (gliconeogênese). Paradoxo: quando o paciente ingere carboidrato, o pico pode ser desproporcional.
- **Jejum (JI):** Longas horas sem comer podem exacerbar o fenômeno do amanhecer ou criar fases de extrema sensibilidade onde um micro-bolus derruba a glicemia abruptamente.

### 9.3. Bebidas Alcoólicas
O álcool é processado exclusivamente pelo fígado. Enquanto o fígado metaboliza o etanol, ele desliga sua fábrica de produção de glicose (neoglicogênese).
- **Risco Primário:** Hipoglicemia severa tardia (até 12h-24h após consumo).
- O paciente pode ir dormir alcoolizado, e o sistema (que não tem como saber), ao aplicar a insulina basal para o que seria uma madrugada normal, causará hipoglicemia severa, pois o fígado não vai defender o organismo liberando glicose como de costume.
- **CDSS Ajuste:** Sempre que houver flag "Álcool", o Alvo de glicemia do sistema à noite deve ser elevado (ex: 150 mg/dL) e o ISF afrouxado.

---

## 10. Implicações e Modelagem no Sistema

Para que o CDSS da *Amanda Bot V4* funcione corretamente com um contexto de inteligência agnóstica de ponta, a estrutura de banco de dados deve modelar o ISF não como um inteiro estático, mas como um objeto temporal cruzado com eventos modificadores (Fuzzy Logic ou regras estritas).

### 10.1. Estrutura de Dados: Perfil Circadiano
O perfil de sensibilidade do paciente deve ser um vetor de blocos horários contíguos (somando 24 horas).

```json
{
  "pacienteId": "user-123456",
  "dataAtualizacao": "2026-07-28T00:00:00Z",
  "isfProfile": [
    {
      "start_time": "00:00",
      "end_time": "05:59",
      "isf_value_mgdl": 60,
      "description": "Madrugada / Alta Sensibilidade"
    },
    {
      "start_time": "06:00",
      "end_time": "09:59",
      "isf_value_mgdl": 35,
      "description": "Amanhecer / Resistência Matinal"
    },
    {
      "start_time": "10:00",
      "end_time": "15:59",
      "isf_value_mgdl": 50,
      "description": "Padrão Diurno"
    },
    {
      "start_time": "16:00",
      "end_time": "23:59",
      "isf_value_mgdl": 45,
      "description": "Entardecer / Leve resistência"
    }
  ]
}
```

### 10.2. Registro de Eventos Modificadores
Um evento de contexto que altera o algoritmo temporariamente de forma percentual. A engine do bot irá multiplicar o `isf_value_mgdl` atual pelo multiplicador e usar o novo ISF no cálculo de bolus sugerido.

```json
{
  "eventType": "ILLNESS",
  "severity": "HIGH",
  "active_start": "2026-07-28T08:00:00Z",
  "active_end": "2026-07-31T08:00:00Z",
  "isf_modifier_percentage": 0.70, 
  "icr_modifier_percentage": 0.80,
  "basal_modifier_percentage": 1.30,
  "notes": "Febre 39C + Garganta"
}
```

*Cálculo pelo Bot:*
Se for 12h (ISF Base = 50).
Doente Severity High (Modificador ISF 0.70).
`ISF de uso real = 50 * 0.70 = 35 mg/dL por Unidade.`
Uma correção para baixar 100 mg/dL que custaria 2.0U, passará a custar quase 2.85U.

### 10.3. Tratamento de Colisões
O sistema de decisão deve prever regras quando múltiplos eventos ocorrem. 
*Exemplo complexo: Paciente em Fase Lútea (resistência) + Praticou Exercício Aeróbico (sensibilização).*
A regra clínica sugere que o evento de maior peso temporal (Exercício Agudo) prevaleça ou neutralize parcialmente o fator basal de longo prazo (Fase Lútea). 
O motor lógico do bot não deve sobrepor indiscriminadamente os multiplicadores (ex: `0.80 * 1.5`), o que resultaria em flutuações perigosas sem validação do log glicêmico. A segurança do paciente vem sempre em primeiro lugar. 
Quando a engine do CDSS identificar dados paradoxais, ela deve acionar o estado de alerta e sugerir ao paciente cautela ou leitura frequente (CGM) em vez de ordens matemáticas cegas.

---

*Fim do Documento 07 - Revisão C24-03 / CDSS v4.0 Arquitetura Clínica*
