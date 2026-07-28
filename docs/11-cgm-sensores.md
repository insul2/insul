# Documento 11 — CGM: Sensores Contínuos de Glicose

> [!WARNING]
> **AVISO MÉDICO IMPORTANTE**
> Este documento técnico descreve o funcionamento, as métricas e a aplicação clínica de dispositivos de Monitorização Contínua de Glicose (CGM) no contexto de sistemas de suporte à decisão para o manejo do diabetes. As informações e diretrizes aqui contidas (incluindo cálculos e metas) baseiam-se nos consensos da American Diabetes Association (ADA), International Society for Pediatric and Adolescent Diabetes (ISPAD) e Sociedade Brasileira de Diabetes (SBD). No entanto, toda decisão terapêutica deve ser validada por um profissional de saúde capacitado. Em caso de divergência entre os sintomas do paciente e os dados do CGM, o paciente deve sempre confirmar a glicemia capilar antes de administrar insulina.

## Introdução

O controle moderno do Diabetes Mellitus tipo 1 (DM1) e do DM2 insulinodependente é amplamente amparado pela tecnologia de Monitorização Contínua da Glicose (CGM, do inglês *Continuous Glucose Monitoring*). O objetivo deste documento é fornecer a arquitetura conceitual e clínica dos sensores CGM, detalhando suas métricas, limitações biológicas (como o atraso intersticial), interferentes bioquímicos, além das formas como os dados emitidos por estes dispositivos interagem com sistemas de alça fechada e calculadoras de *bolus*.

---

## 1. Princípio de Funcionamento

O funcionamento de um CGM é fundamentalmente diferente do teste capilar convencional. Compreender esta distinção é vital para qualquer sistema automatizado de decisão clínica.

### 1.1 Glicose Intersticial vs. Glicemia Capilar

Enquanto a glicemia pontual mede a concentração de glicose no sangue (sangue capilar), o sensor do CGM mede a concentração de glicose no **líquido intersticial** — o fluido que envolve as células nos tecidos subcutâneos.

1.  **Transporte Fisiológico:** A glicose flui primeiro pelo sistema vascular (vasos sanguíneos) e só depois difunde-se pelas paredes dos capilares para o fluido intersticial, onde é captada pelas células.
2.  **Gradiente de Concentração:** O gradiente entre sangue e líquido intersticial é dinâmico. Na estabilidade, as duas concentrações são muito similares. No entanto, quando há rápida variação (pós-prandial ou após administração de insulina), cria-se um atraso temporal (delay).

### 1.2 O Sensor Eletroquímico e a Glicose Oxidase

A imensa maioria dos sensores comerciais utiliza um filamento flexível recoberto por uma enzima chamada **Glicose Oxidase (GOx)**.
- A glicose do fluido intersticial reage com a GOx.
- Essa reação gera peróxido de hidrogênio.
- O peróxido sofre oxidação no eletrodo de platina do sensor, gerando uma corrente elétrica ultrabaixa (em nanoamperes, nA).
- O transmissor capta esta corrente elétrica e a converte em um valor de glicose (mg/dL ou mmol/L) por meio de algoritmos de calibração proprietários.

**Fórmula básica simplificada da reação:**
```text
Glicose + O2 --(Glicose Oxidase)--> Ácido Glicônico + H2O2
H2O2 --(Eletrodo)--> O2 + 2H+ + 2e- (Corrente detectada)
```

### 1.3 Calibração (Calibrado vs. Não Calibrado)

- **Calibrados pelo usuário (Legacy):** Exigem punção capilar (1 a 2 vezes ao dia) para que o algoritmo do transmissor crie a curva de correlação entre nA e mg/dL. Se a calibração for feita enquanto a glicose varia rápido, o sensor pode gerar falsas medições.
- **Calibrados de fábrica (Factory-Calibrated):** O algoritmo de conversão já vem embutido a partir da fabricação (ex: FreeStyle Libre, Dexcom G6). Possuem estabilidade e reprodutibilidade superiores na camada sensora.

### 1.4 Atraso (Delay) Intersticial

O *Lag Time* ou *Delay* intersticial representa o tempo que a alteração da glicose sanguínea leva para ser detectada no líquido intersticial.
- **Fisiológico:** Tempo para a difusão capilar-interstício (cerca de 5 a 10 minutos).
- **Processamento:** Tempo que o transmissor e o algoritmo demoram para filtrar o sinal ruidoso (filtros de Kalman, médias móveis), adicionando 2 a 5 minutos extras.
- **Total:** O atraso prático varia de **5 a 15 minutos**.

**Diagrama de Atraso Intersticial:**
```ascii
Concentração de Glicose (mg/dL)
|
|     Sangue (Capilar)
|      / \
|     /   \           Interstício (Sensor CGM)
|    /     \           / \
|   /       \         /   \
|  /         \       /     \
| /           \     /       \
|/             \   /         \
+--------------------------------------- Tempo
       <---- Delay ---->
      (5 a 15 min)
```

### 1.5 Quando o Delay Importa

Para algoritmos de suporte à decisão, o atraso é um fator crítico em situações de alta variação (ΔG > 2 mg/dL/min):
- **Queda rápida:** O sensor pode marcar 90 mg/dL ↓↓, mas o sangue já estar em 65 mg/dL. Risco de hipoglicemia severa.
- **Exercício Físico Aeróbico:** Causa um "gap" enorme entre sangue e interstício devido a mudanças no fluxo sanguíneo periférico.
- **Tratamento de Hipoglicemia:** Após ingerir carboidrato rápido, o sangue reverte a queda em 10 minutos, mas o sensor pode demorar até 20 minutos para refletir a melhora. Isso costuma gerar supercorreção por parte do paciente (o chamado "efeito rebote" ou hioglicemia seguida de hiperglicemia reativa).

---

## 2. FGM vs. rtCGM

O mercado divide os dispositivos em duas classes principais de transmissão. O sistema deve suportar as lógicas intrínsecas a cada um.

### 2.1 FGM: Flash Glucose Monitoring

Monitorização "Flash".
- O transmissor capta e armazena os dados, mas só envia ao leitor/smartphone quando o usuário aproxima o dispositivo (via NFC - Near Field Communication).
- O dispositivo deve ser escaneado a cada 8 horas (no caso do Libre 1), ou há perda de dados.
- **Exemplo Clássico:** FreeStyle Libre 1.

### 2.2 rtCGM: Real-Time Continuous Glucose Monitoring

Monitorização Contínua em Tempo Real.
- O transmissor envia pacotes de dados periodicamente (ex: a cada 1 a 5 minutos) de forma autônoma via Bluetooth Low Energy (BLE).
- O dispositivo conectado recebe os dados em *background*.
- **Exemplo:** Dexcom G6, Guardian 4.
- **Alarms:** Como os dados são contínuos, é possível configurar alarmes preditivos (ex: "Hipoglicemia iminente em 20 min").

### 2.3 Diferenças Práticas na Arquitetura de Sistemas

Para um sistema de decisão:
- **Para rtCGM:** O fluxo de dados é um *stream* perene. O sistema sempre tem o valor atual (com delay de até 5 min). Ideal para algoritmos de malha fechada (Closed Loop).
- **Para FGM restrito (NFC):** O fluxo é *batch* (lote). O sistema não sabe o valor da glicose até que o usuário decida medir. O cálculo de bolus precisa prever um valor pontual.
- **Integração com Bombas:** rtCGMs integram nativamente com bombas de insulina (Dexcom-Tandem, Guardian-Medtronic). FGMs puros tradicionalmente requerem intervenção, exceto quando transformados por hardware extra ou nas versões modernizadas (Libre 2 e 3) que se comportam como rtCGMs.

---

## 3. Setas de Tendência (Trend Arrows)

As setas de tendência informam não apenas para onde a glicose está indo, mas a que velocidade. Isso é revolucionário para a determinação de dose (Ajuste de Bolus Baseado em Tendência).

### 3.1 Significado e Velocidade

O fabricante Dexcom estabeleceu um padrão de setas e variações que foi adotado por sistemas de decisão:

| Seta (Dexcom) | Descrição | Taxa de Variação (RoC) | Impacto em 30 min |
| :---: | :--- | :--- | :--- |
| **↑↑** | Subindo rápido | > 3 mg/dL/min | > 90 mg/dL |
| **↑** | Subindo | 2 a 3 mg/dL/min | 60 a 90 mg/dL |
| **↗** | Subindo levemente | 1 a 2 mg/dL/min | 30 a 60 mg/dL |
| **→** | Estável | -1 a 1 mg/dL/min | -30 a 30 mg/dL |
| **↘** | Descendo levemente | -1 a -2 mg/dL/min | -30 a -60 mg/dL |
| **↓** | Descendo | -2 a -3 mg/dL/min | -60 a -90 mg/dL |
| **↓↓** | Descendo rápido | < -3 mg/dL/min | < -90 mg/dL |

*Obs: A Abbott (FreeStyle Libre) utiliza menos setas (apenas 5 estados: ↑, ↗, →, ↘, ↓), com interpretações análogas de velocidade.*

### 3.2 Impacto das Setas no Bolus (Método Bergenstal e Outros)

Quando o paciente vai administrar insulina, a seta altera a matemática do cálculo. O método Endocrine Society/Bergenstal recomenda adicionar ou subtrair insulina baseando-se na seta e no Fator de Sensibilidade à Insulina (FSI/ISF).

**Tabela Simplificada de Ajuste de Bolus por Seta (Regra do FSI ~ 50 mg/dL):**
- **↑↑** : Adicionar 2,0 U ou 20% ao bolus
- **↑** : Adicionar 1,0 a 1,5 U
- **↗** : Adicionar 0,5 a 1,0 U
- **→** : Manter cálculo original
- **↘** : Subtrair 0,5 a 1,0 U
- **↓** : Subtrair 1,0 a 1,5 U
- **↓↓** : Subtrair 2,0 U (ou aborte bolus e coma carboidrato rápido)

Para cálculo exato de software:
```text
GlicoseProjetada = GlicoseAtual + (RoC_em_mg/dL/min * 30 min)
BolusCorretivo = (GlicoseProjetada - Alvo) / FSI
```

---

## 4. Métricas do CGM e Metas (Guidelines)

O Consenso Internacional sobre Tempo no Alvo padronizou a análise dos perfis ambulatoriais de glicose.

### 4.1 TIR (Time In Range / Tempo na Faixa)
- **Faixa:** 70 a 180 mg/dL.
- **Meta Clínica ADA/ISPAD:** > **70%**.
- **Gestantes com DM1:** Faixa mais estrita (63 a 140 mg/dL), meta >70%.

### 4.2 TAF (Tempo Abaixo da Faixa - Nível 1 e Nível 2)
- **TAF1 (Nível 1 - < 70 mg/dL e >= 54 mg/dL):** Meta < **4%**.
- **TAF2 (Nível 2 - < 54 mg/dL):** Meta < **1%**.

### 4.3 TSF (Tempo Sobre a Faixa - Nível 1 e Nível 2)
- **TSF1 (Nível 1 - > 180 e <= 250 mg/dL):** Meta < **25%**.
- **TSF2 (Nível 2 - > 250 mg/dL):** Meta < **5%**.

### 4.4 Resumo Gráfico das Metas de Barras

```ascii
      +-------------------------------------------------+
      |                 > 250 mg/dL (Nível 2) : < 5%    | TSF
 100% |  > 180 mg/dL                                    |
      +-------------------------------------------------+
      |             181 - 250 mg/dL (Nível 1) : < 25%   | TSF
  70% +=================================================+
      |         70 a 180 mg/dL (TIR - Alvo)   : > 70%   | TIR
   4% +=================================================+
      |               54 - 69 mg/dL (Nível 1) : < 4%    | TAF
   1% +-------------------------------------------------+
      |                 < 54 mg/dL  (Nível 2) : < 1%    | TAF
   0% +-------------------------------------------------+
```

### 4.5 GMI, CV e eAG
- **GMI (Glucose Management Indicator):** `3.31 + (0.02392 * Glicose Média)`. Estima a HbA1c a partir dos dados contínuos.
- **CV (Coeficiente de Variação):** (Desvio Padrão / Glicose Média) * 100. **Meta:** < **36%**. CV alto indica alto risco de hipoglicemia.
- **eAG:** Estimativa direta da glicose média (não tão comum nos novos relatórios quanto o GMI).

---

## 5. Sensores Disponíveis

### 5.1 Abbott FreeStyle Libre 2 / Libre 3
- **Fabricante:** Abbott.
- **Tipo:** Libre 2 (FGM com alarmes BLE / semi-rtCGM), Libre 3 (rtCGM real).
- **MARD:** Libre 2 (~9.2%), Libre 3 (~7.9%).
- **Duração:** 14 dias.
- **Calibração:** Nenhuma (calibrado de fábrica).
- **Delay:** ~ 5 minutos.
- **Compatibilidade Smartphone:** iOS / Android via NFC+BLE.
- **Alarmes:** Alta, baixa e perda de sinal.
- **Disponibilidade BR:** Libre 1 domina, Libre 2/3 com entradas graduais ou via importação/clínicas específicas.
- **Preço:** R$ 300 - R$ 400 por unidade.

### 5.2 Dexcom G6
- **Fabricante:** Dexcom.
- **Tipo:** rtCGM puro.
- **MARD:** ~9.0%.
- **Duração:** 10 dias (sensor), 90 dias (transmissor).
- **Calibração:** Calibrado de fábrica ("zero fingersticks").
- **Compatibilidade Bomba:** Nativo na Tandem t:slim X2, Omnipod 5, YpsoPump.
- **Disponibilidade BR:** Presente, mas altíssimo custo.

### 5.3 Dexcom G7 / G7 ONE
- **Fabricante:** Dexcom.
- **Tipo:** rtCGM descartável "all-in-one". 60% menor.
- **MARD:** ~8.2%.
- **Duração:** 10 dias. Warm-up super rápido (30min).
- **Disponibilidade BR:** Não consolidado (depende da evolução regulatória recente), mas altamente desejado.

### 5.4 Medtronic Guardian 4 / Simplera
- **Fabricante:** Medtronic.
- **Tipo:** rtCGM (focado em integração SmartGuard).
- **MARD:** ~8.7% (Guardian 4).
- **Duração:** 7 dias.
- **Calibração:** Guardian 4 não exige capilar rotineira.
- **Compatibilidade Bomba:** Somente Medtronic (Minimed 780G).
- **Simplera:** Versão all-in-one de menor perfil, substituto futuro.

### 5.5 e 5.6 Senseonics Eversense / Eversense E3 (implantável)
- **Fabricante:** Senseonics.
- **Tipo:** Sensor subcutâneo fluorescente + Transmissor externo.
- **Duração:** 90 dias (Padrão) a 180 dias (E3).
- **MARD:** ~8.5%.
- **Calibração:** Requer punção capilar (1 a 2x dia).
- **Vantagem:** O transmissor externo vibra (alarmes sem celular) e pode ser retirado momentaneamente.
- **Disponibilidade BR:** Geralmente inexistente por canais formais.

---

## 6. Interferentes e Limitações

- **Paracetamol (Acetaminofeno):** Historicamente causa falsa elevação (oxida no platina do sensor). Dexcom G6 e mais modernos possuem membranas protetoras, mas Libre antigos podem sofrer.
- **Ácido Ascórbico (Vitamina C):** Altas doses (>1g/dia) causam falso positivo em alguns sensores Libre.
- **Hidroxiureia:** Causa falsa elevação acentuada no Dexcom G6/Guardian.
- **Hematócrito:** Pode impactar as reações químicas da glicose oxidase.
- **Compressão do Sensor (Compression Low):** Ao deitar por cima do sensor durante o sono, diminui-se o fluxo de líquido intersticial. O sensor registra hipoglicemia rápida ("↓↓"), formando um "V" irreal no gráfico.
- **Sinal Perdido (Dropout):** Bloqueio Bluetooth pelo corpo, causa vácuo de dados.
- **Sensor Falhando (Sensor Error):** Ruído excessivo nos nanoamperes (fim da vida útil) causa o algoritmo pausar a exibição para segurança por até 3h.

---

## 7. Calibração e MARD

- **O que é MARD:** A Diferença Percentual Absoluta Média. É o padrão-ouro de avaliação. Um MARD < 10% é considerado bom o bastante para algoritmos de bolus fechados sem necessidade de validação no dedo.
- **Valores:** Variam de ~7.9% (melhor) a 10% nos sensores de nova geração.
- **Regra de Ouro (Sintomas > CGM):** **NUNCA** confie apenas no sensor se os sintomas divergirem. Hipoglicemias sentidas mas não mostradas, ou mostradas mas não sentidas, exigem capilar.

---

## 8. Integração com o Sistema

- **APIs e Protocolos:** BLE (para emissão contínua), NFC (para pareamento e escaneamento). APIs nas nuvens proprietárias (Dexcom Clarity API, LibreView) protegem os dados.
- **xDrip+:** Solução open-source Android que atua como *middleware*, lendo o BLE diretamente via engenharias reversas e transmitindo os dados em modo local *broadcast* para outros apps sem nuvem.
- **Nightscout:** Ponto central de dados na web para pacientes e cuidadores.
- **Formato de Dados CGM:** O padrão comum é o JSON SGV (*Sensor Glucose Value*), contendo `sgv` (valor), `date` (timestamp UNIX) e `trend` (direção/seta).
- **Como o app consome e delay:** O sistema deve calcular o *Delta Time* (Tempo Atual - Timestamp SGV). Se > 15 min, os dados são tidos como obsoletos.
- **Ajuste de Bolus:** O App usa o SGV recente + trend logic para aumentar ou reduzir os cálculos finais sugeridos ao usuário.

---

## 9. CGM e Alça Fechada (Closed Loop)

- **O Papel do CGM:** Os "olhos" do pâncreas artificial (ex: AndroidAPS, Loop iOS). Ele dita os *rates* basais temporários (TBR) a cada 5 minutos.
- **Latência Total:** O loop lida com a soma do delay vascular/intersticial (10 min) + delay de absorção da insulina subcutânea (45-60 min). Portanto, o CGM previsor precisa ser cirúrgico nas tendências para não criar ciclos de supercorreção oscilatórios (efeito *Rollercoaster*).
- **Calibração no Loop:** O loop prefere sensores *Factory Calibrated*. Uma calibração errada (medir no dedo com resíduo de açúcar) enviará uma alta leitura falsa, fazendo o loop ejetar insulina potencialmente letal num paciente que estava, na verdade, com 90 mg/dL.
