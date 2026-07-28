# Documento 12 — Segurança e Validação

> **Aviso Legal (Disclaimer Médico):** Este documento detalha a arquitetura e as regras de segurança e validação para um sistema de suporte à decisão clínica no manejo do Diabetes Mellitus. O software aqui descrito não substitui, em hipótese alguma, a avaliação médica, o diagnóstico profissional e o julgamento clínico humano. O sistema atua como uma ferramenta auxiliar e de recomendação. Toda e qualquer sugestão de dose de insulina deve ser conferida, validada e aprovada pelo paciente ou por um profissional de saúde capacitado antes de sua administração.

A segurança do paciente é a prioridade absoluta, inegociável e primária de qualquer sistema de saúde, e este sistema não é exceção. Este documento define de maneira exaustiva os limites, os alertas, as validações e as travas de segurança que compõem a camada de proteção (Safety Layer) da plataforma.

---

## 1. Princípios de Segurança em Software Médico

O desenvolvimento de um sistema que calcula doses de insulina ou sugere intervenções terapêuticas deve ser pautado em normas internacionais rigorosas, visando a minimização sistemática de riscos aos pacientes.

### 1.1 Normas e Diretrizes Internacionais

- **IEC 62304 (Ciclo de Vida de Software Médico):** Estabelece o framework para o processo de ciclo de vida do software para equipamentos eletromédicos. A norma requer processos rigorosos de desenvolvimento, documentação, resolução de problemas, manutenção e gerenciamento de configuração. Este software segue os padrões para a rastreabilidade completa desde a concepção dos requisitos de segurança até o teste final.
- **ISO 14971 (Gestão de Riscos em Dispositivos Médicos):** Define um processo para identificar os perigos associados a dispositivos médicos, para estimar e avaliar os riscos correspondentes, controlar esses riscos e monitorar a eficácia dos controles adotados. Nosso sistema emprega análises FMEA (Failure Mode and Effects Analysis) para antecipar falhas de cálculo e cenários anômalos.

### 1.2 Classificação de Risco do Software (Software Safety Class)

De acordo com a IEC 62304, softwares médicos são classificados com base no impacto de uma falha:
- **Classe A:** Nenhuma lesão ou dano à saúde é possível.
- **Classe B:** Lesão não grave é possível.
- **Classe C:** Morte ou lesão grave é possível.

**O Motor de Cálculo de Insulina se enquadra primariamente como CLASSE C**, visto que a recomendação errônea de uma superdose de insulina pode causar hipoglicemia severa, resultando em coma, convulsões ou fatalidade. Assim, os rigorosos protocolos de teste exigidos para a Classe C são mandatórios, bem como a validação independente da arquitetura (Independent Verification and Validation - IV&V).

### 1.3 Responsabilidade do Fabricante vs. Configurador (Médico)

- **Fabricante (Desenvolvedor):** É responsável por garantir que o algoritmo calcule corretamente com base nos parâmetros inseridos e que as regras absolutas (limites rígidos ou hard-coded) impeçam entradas biologicamente impossíveis.
- **Configurador (Equipe Médica):** É responsável por inserir os parâmetros metabólicos corretos (ICR, ISF, Alvo) para o paciente específico. O sistema fornece alertas de limites flexíveis (soft limits) quando os valores parecem fora do padrão, exigindo uma segunda confirmação (double check) do profissional de saúde.

### 1.4 Defense in Depth (Defesa em Profundidade)

A arquitetura adota a estratégia de *Defense in Depth*, estabelecendo múltiplas camadas independentes de validação:
1. **Validação de Interface de Usuário (Client-side):** Impede o usuário de digitar dados inválidos no app (ex. letras em campos numéricos).
2. **Validação de API (Gateway/Middleware):** Rejeita requests com payloads malformados ou fora de tipo (Schema validation).
3. **Safety Layer Primário (Domain Logic):** Valida semanticamente as entradas contra os limites de segurança médicos antes do cálculo.
4. **Safety Layer Secundário (Pos-Cálculo):** Audita e valida o resultado gerado pelo algoritmo, garantindo que o *output* não excede as travas de segurança absolutas configuradas para o paciente, antes de devolvê-lo.
5. **Circuit Breaker / Anomaly Detection:** Em caso de erros contínuos ou picos estranhos (ex. múltiplas requisições de bolus num curto espaço de tempo), corta o acesso à sugestão.

---

## 2. Regras Invioláveis de Validação de Entrada (Hard Limits)

O sistema possui "Hard Limits" ou limites absolutos/rígidos. Sob nenhuma circunstância (mesmo com configuração médica) o sistema aceitará entradas que violem estas regras. Caso um limite deste seja violado, a transação falha (Fail-Safe) imediatamente, não havendo processamento de cálculo, e um erro é retornado e logado.

### Regra 2.1: Glicemia Sanguínea (BG - Blood Glucose)
- **Descrição:** Limites absolutos para valores de glicemia inseridos ou recebidos.
- **Motivo Clínico:** Glicemias abaixo de 30 mg/dL ou acima de 600 mg/dL (frequentemente representadas como LO ou HI em glicosímetros) requerem intervenção médica de emergência, e não um simples cálculo de dose num aplicativo de rotina. Um valor abaixo de 30 mg/dL quase certamente significa perda de consciência, impedindo uso autônomo seguro.
- **Limites:**
  - **Mínimo Aceitável:** 30 mg/dL
  - **Máximo Aceitável:** 600 mg/dL
- **Comportamento em Violação:** O sistema rejeita o *input*, interrompe o cálculo, não sugere dose, e emite alerta de emergência médica.
- **Código de Erro:** `ERR_BG_OUT_OF_BOUNDS`

### Regra 2.2: Carboidratos (CHO)
- **Descrição:** Validação da entrada de ingestão de carboidratos.
- **Motivo Clínico:** Não existe ingestão de carboidrato negativa. Além disso, refeições contendo mais de 300 gramas de carboidrato num único momento são excepcionais e frequentemente associadas a erros de digitação (ex. digitar calorias ao invés de carboidratos). Refeições muito grandes também afetam drasticamente a absorção gástrica, tornando o cálculo de bolus simples inadequado.
- **Limites:**
  - **Mínimo Aceitável:** 0 g (valor negativo não permitido)
  - **Máximo Razoável:** 300 g/refeição
- **Comportamento em Violação:** Rejeição do cálculo. Exige correção explícita por parte do usuário.
- **Código de Erro:** `ERR_CHO_OUT_OF_BOUNDS`

### Regra 2.3: Dose Máxima por Bolus (Max Bolus)
- **Descrição:** O limite absoluto de insulina rápida ou ultrarrápida que pode ser sugerido em uma única transação de cálculo.
- **Motivo Clínico:** Uma superdose é o risco mais grave e letal na insulinoterapia. Evita que um erro nos parâmetros, ou no cálculo de carboidratos, resulte em recomendação de uma dose excessivamente perigosa.
- **Limites:**
  - O valor pode ser configurado pelo médico.
  - **Padrão Máximo Hard-coded:** 25 U (nenhum médico poderá configurar para um valor acima deste limite em pacientes ambulatoriais comuns, a menos sob supervisão de *override* de emergência muito específico).
- **Comportamento em Violação:** O sistema corta (clippa/capa) o resultado do cálculo ao valor do *Max Bolus* definido pelo usuário/médico, alertando na UI: "Dose reduzida devido ao limite máximo de segurança".
- **Código de Erro:** `ERR_MAX_BOLUS_EXCEEDED`

### Regra 2.4: Dose Mínima de Sugestão
- **Descrição:** O menor valor de insulina que faz sentido sugerir.
- **Motivo Clínico:** Dispositivos modernos, como as smart pens ou canetas de meia unidade, não permitem frações muito ínfimas. Além disso, calcular 0.01U de bolus gera uma falsa precisão clinicamente irrelevante. Bombas de insulina (em open loop) têm resoluções de 0.025U a 0.05U dependendo do modelo.
- **Limites:**
  - **Mínimo Aceitável:** A sugestão mínima de dose, caso > 0, é de 0.05U (ou a depender do *step* do hardware do paciente, ex. 0.5U para canetas).
- **Comportamento em Violação:** Qualquer dose calculada entre 0 e 0.05U será arredondada para 0 (zero) e o sistema emitirá a sugestão: "Nenhuma dose necessária".
- **Código de Erro:** `ERR_DOSE_TOO_SMALL`

### Regra 2.5: IOB Negativo (Insulina Ativa Negativa)
- **Descrição:** O cálculo do IOB pode subtrair déficits dependendo do modelo de *basal suspensa*. No entanto, IOB global negativo nunca pode ser aplicado.
- **Motivo Clínico:** Subtrair IOB negativo em cálculos de bolus pode resultar em adição paradoxal e excessiva de insulina (ou seja, compensar a "falta" de insulina prévia no bolus da refeição atual). Na prática, repor basal em falta é uma ação delicada e nunca deve ser injetada automaticamente como "super bolus".
- **Limites:**
  - O termo *Insulina Ativa* a ser abatido (IOB) deve ser restrito ao intervalo `[0, Infinity)`.
- **Comportamento em Violação:** Se a modelagem matemática de predição gerar `IOB < 0`, a variável IOB será cravada no piso de 0 (zero) para o cômputo da dose.
- **Código de Erro:** `ERR_NEGATIVE_IOB_ENFORCED_ZERO`

### Regra 2.6: Divisão por Zero em Parâmetros de Fatores
- **Descrição:** Fatores de correção e relação carboidrato.
- **Motivo Clínico:** Uma relação de carboidrato (ICR) de 0 ou um fator de sensibilidade (ISF) de 0 significa biologicamente que o paciente não responde à insulina (resistência infinita) ou que o pâncreas consome insulina sozinho. Matematicamente, geraria `Infinity` nas divisões do algoritmo.
- **Limites:**
  - ICR > 0 (na prática, o sistema obriga ICR >= 1 g/U)
  - ISF > 0 (na prática, ISF >= 1 mg/dL/U)
- **Comportamento em Violação:** Rejeita qualquer cálculo se os perfis do usuário estiverem mal configurados com 0 ou nulo.
- **Código de Erro:** `ERR_INVALID_FACTOR_DIV_ZERO`

### Regra 2.7: Alvo Glicêmico (Target Blood Glucose)
- **Descrição:** Validação do limite inferior e superior que o sistema almeja atingir após a correção.
- **Motivo Clínico:** Um alvo < 70 mg/dL programa o sistema para direcionar intencionalmente o paciente para um estado de hipoglicemia. Um alvo > 200 mg/dL mantém o paciente perenemente em risco de hiperglicemia e cetoacidose, não fazendo sentido clínico como meta de tratamento.
- **Limites:**
  - **Mínimo Aceitável:** 70 mg/dL (preferencialmente >= 90)
  - **Máximo Aceitável:** 200 mg/dL
- **Comportamento em Violação:** Perfil do paciente não pode ser salvo, cálculos são negados até que o alvo seja regularizado no perfil.
- **Código de Erro:** `ERR_TARGET_BG_OUT_OF_BOUNDS`

### Regra 2.8: Duração da Ação da Insulina (DIA)
- **Descrição:** O tempo definido para a insulina estar completamente absorvida e inativada no corpo.
- **Motivo Clínico:** Insulinas rápidas modernas (Lispro, Aspart) levam cerca de 4 a 6 horas para zerar sua cauda farmacodinâmica. Insulinas Fiasp/Lyumjev são mais rápidas, mas a cauda existe. Definir DIA < 2h é irreal (ignora a meia vida fisiológica do hormônio no subcutâneo) e levaria a grave e perigoso empilhamento (Insulin Stacking) com superdose. DIA > 8h também é clinicamente improvável para insulinas rápidas (exceto em casos raros de lipohipertrofia ou insuficiência renal gravíssima) e levaria o sistema a subdosar perpetuamente.
- **Limites:**
  - **Mínimo Aceitável:** 2.0 horas (120 minutos)
  - **Máximo Aceitável:** 8.0 horas (480 minutos)
- **Comportamento em Violação:** Configuração inválida recusada no momento de alteração de perfil do paciente.
- **Código de Erro:** `ERR_DIA_OUT_OF_BOUNDS`

### Regra 2.9: Glicemia Histórica e Falhas de Sensor (CGM)
- **Descrição:** O sistema pode ler histórico do CGM para projetar tendências. Leituras espúrias devem ser rejeitadas.
- **Motivo Clínico:** Sensores de CGM (Continuous Glucose Monitor) estão sujeitos a "compression lows" (quedas espúrias porque o paciente deitou em cima do sensor) ou saltos de calibração.
- **Limites:**
  - Diferenciais (taxas de variação) matematicamente impossíveis (> 5 mg/dL/min sem explicação ou saltos de > 30 mg/dL entre leituras de 5 min) deverão ser interpretados como "ruído".
- **Comportamento em Violação:** O sistema deve voltar ao modo "Manual" e solicitar ao paciente que meça no dedo (ponta de dedo - capilar). Rejeitar entradas do CGM como base de cálculo momentaneamente.
- **Código de Erro:** `ERR_CGM_NOISE_DETECTED`

### Regra 2.10: Validação de Data e Hora (Timestamps)
- **Descrição:** Para o cálculo de IOB, o momento exato das injeções prévias e o instante "agora" são críticos.
- **Motivo Clínico:** Mudanças acidentais de fuso horário no celular do paciente ou manipulação de horários podem resultar em um cálculo equivocado de IOB (ex: o sistema achar que uma dose de 10U foi dada há 5 horas quando na verdade foi dada há 10 minutos).
- **Limites:**
  - Timestamps de bolus no futuro nunca são aceitos.
  - Se detectado "time leap" no dispositivo superior a 5 minutos, o relógio do sistema exige sincronização em nuvem ou invalida cálculos IOB baseados em local time.
- **Comportamento em Violação:** Sistema entra em modo "Fall-Back", ignorando cálculos baseados em tempo e alertando discrepância no relógio, forçando a indicação de IOB como "Desconhecido - Verifique seu relógio".
- **Código de Erro:** `ERR_TIMESTAMP_INVALID`

---

## 3. Alertas Clínicos

O sistema possui uma matriz escalonada de alertas que monitoram proativamente o estado do paciente, divididos em três níveis de severidade. 
- **INFORMATIVO (Azul):** Situações que o paciente deve saber, mas não representam perigo.
- **AVISO (Amarelo):** Requer atenção ou cuidado redobrado; pode exigir ação.
- **CRÍTICO (Vermelho):** Situação de perigo iminente. Exige ação imediata, bloqueia funções ou induz rotinas de emergência.

### Alertas Críticos

#### 3.1 Hipoglicemia Grave
- **Condição de Disparo:** Glicemia (entrada) < 54 mg/dL.
- **Limiar Numérico:** `< 54 mg/dL`
- **Nível de Severidade:** CRÍTICO.
- **Mensagem ao Usuário:** "ALERTA VERMELHO: Sua glicemia está criticamente baixa. Consuma de 15g a 20g de carboidratos de ação rápida imediatamente (ex. suco de fruta, sachês de açúcar). Procure assistência se os sintomas não melhorarem em 15 minutos."
- **Ação do Sistema:** **BLOQUEIO ABSOLUTO**. Toda e qualquer sugestão de dose de insulina é suspensa/bloqueada. A UI da calculadora fica indisponível até uma nova leitura ser registrada acima de 70 mg/dL e pelo menos 15 minutos se passarem.

#### 3.2 Hiperglicemia Extrema
- **Condição de Disparo:** Glicemia (entrada) > 400 mg/dL.
- **Limiar Numérico:** `> 400 mg/dL`
- **Nível de Severidade:** CRÍTICO.
- **Mensagem ao Usuário:** "ALERTA DE EMERGÊNCIA: Sua glicose está perigosamente alta (acima de 400 mg/dL). Verifique seu equipamento de infusão, aplique a correção conforme orientação médica e, se sentir náuseas ou dores, procure um pronto-socorro IMEDIATAMENTE."
- **Ação do Sistema:** Gera um aviso sonoro intenso no app. Realiza o cálculo, mas com um overlay vermelho. Recomenda a troca de sítio de aplicação/cateter e medição imediata de cetonas.

#### 3.3 Cetona Muito Elevada
- **Condição de Disparo:** Entrada manual (ou via BLE de monitor dual) de cetonas capilares > 3.0 mmol/L.
- **Limiar Numérico:** `> 3.0 mmol/L`
- **Nível de Severidade:** CRÍTICO.
- **Mensagem ao Usuário:** "RISCO DE CETOACIDOSE DIABÉTICA (DKA). Cetonas acima de 3.0 mmol/L representam emergência médica. Dirija-a ao hospital imediatamente. Não hesite."
- **Ação do Sistema:** O sistema pode sugerir (sob diretriz e aprovação médica anterior) um bolus intramuscular ou intravenoso em protocolo emergencial, mas primariamente recomenda busca hospitalar.

#### 3.4 Queda Rápida (CGM Crash)
- **Condição de Disparo:** A primeira derivada da curva do sensor CGM (Rate of Change) for inferior a -3.0 mg/dL por minuto.
- **Limiar Numérico:** `RoC < -3.0 mg/dL/min`
- **Nível de Severidade:** CRÍTICO.
- **Mensagem ao Usuário:** "Sua glicemia está despencando rapidamente (duas setas para baixo). Aja agora com ingestão de carboidratos preventivos para evitar uma hipoglicemia severa."
- **Ação do Sistema:** Alerta. Se o sistema puder calcular "carbs de resgate" (Rescue Carbs), sugerirá (ex: "Sugestão: comer 12g de CHO imediatamente").

### Alertas de Aviso (Warnings)

#### 3.5 Hipoglicemia Leve
- **Condição de Disparo:** Glicemia (entrada) >= 54 mg/dL e < 70 mg/dL.
- **Limiar Numérico:** `[54, 70) mg/dL`
- **Nível de Severidade:** AVISO.
- **Mensagem ao Usuário:** "Glicemia baixa detectada. É recomendado consumir 15g de carboidratos e aguardar 15 minutos."
- **Ação do Sistema:** Permite calcular bolus (caso o paciente for consumir uma refeição enorme que vá gerar um saldo gigantesco de glicose), mas o bolus de correção será matematicamente **negativo** (abatendo a necessidade de insulina da refeição).

#### 3.6 Hiperglicemia Grave (Alerta de Cetona)
- **Condição de Disparo:** Glicemia entre 300 mg/dL e 400 mg/dL.
- **Limiar Numérico:** `(300, 400] mg/dL`
- **Nível de Severidade:** AVISO.
- **Mensagem ao Usuário:** "Glicemia elevada detectada. Faça a correção recomendada, beba muita água. É altamente recomendado medir as cetonas urinárias ou capilares."
- **Ação do Sistema:** Alerta no log e envia notificação de "Check Cetonas". O cálculo procede.

#### 3.7 IOB Elevado e Empilhamento de Insulina (Insulin Stacking)
- **Condição de Disparo:** Quando a nova sugestão de dose, somada ao IOB atual, ultrapassa 70% do Max Bolus configurado OU a dose calculada é primariamente cancelada por um grande IOB ainda ativo.
- **Limiar Numérico:** `(NovoBolus + IOB) > (MaxBolus * 0.7)` ou `IOB_Ativo > LimiarUsuario`
- **Nível de Severidade:** AVISO.
- **Mensagem ao Usuário:** "Atenção: Você tem grande quantidade de insulina ainda ativa em seu corpo devido a aplicações recentes. A nova dose foi reduzida e ajustada. Injetar insulina agora apresenta alto risco de empilhamento."
- **Ação do Sistema:** Destaca o valor do IOB na tela em laranja. Pede confirmação extra (checkbox: "Compreendo o risco de empilhamento") antes de seguir.

#### 3.8 Cetona Elevada
- **Condição de Disparo:** Cetonas medidas > 0.6 mmol/L e <= 3.0 mmol/L.
- **Limiar Numérico:** `[0.6, 3.0] mmol/L`
- **Nível de Severidade:** AVISO.
- **Mensagem ao Usuário:** "Cetonas detectadas. Pode indicar falta de insulina. Reforce a hidratação e acompanhe as medições."
- **Ação do Sistema:** (Opcionalmente, se configurado pelo médico) Pode aplicar um multiplicador temporário (fator percentual de acréscimo) para que as doses de correção sejam ligeiramente mais agressivas.

#### 3.9 Insulina Vencida (Inventory Management)
- **Condição de Disparo:** Sistema monitora data de abertura ou validade lote informada pelo usuário. Frasco aberto há > 28-30 dias.
- **Nível de Severidade:** AVISO.
- **Mensagem ao Usuário:** "O frasco atual de insulina parece ter excedido seu prazo de 30 dias após abertura. O risco de perda de potência é real, podendo levar a picos de hiperglicemia."
- **Ação do Sistema:** Alerta visual na tela inicial da aplicação.

#### 3.10 Sensor Desconectado
- **Condição de Disparo:** CGM sem enviar leituras novas há 30 minutos.
- **Limiar Numérico:** `DeltaT_LastCGM > 30 min`
- **Nível de Severidade:** AVISO.
- **Mensagem ao Usuário:** "Sinal do sensor perdido. Por favor, aproxime o dispositivo do corpo e do telefone, ou realize medições manuais de glicemia capilar enquanto o sinal não retorna."
- **Ação do Sistema:** O sistema oculta as setas de tendência e cessa de exibir o valor CGM, requisitando entrada de valor BG no dedo explicitamente para continuar com segurança.

#### 3.11 Bolus Suspeito (Anomalia Estocástica)
- **Condição de Disparo:** A sugestão calculada é superior a 150% do valor médio dos bolus realizados pelo paciente nos últimos 14 dias no mesmo horário.
- **Limiar Numérico:** `NovoBolus > 1.5 * MediaBolusWindow`
- **Nível de Severidade:** AVISO.
- **Mensagem ao Usuário:** "A dose calculada é significativamente superior ao seu padrão habitual. Verifique se os carboidratos e fatores inseridos estão corretos."
- **Ação do Sistema:** Solicita um "Segundo Olhar" (Double-check) antes de confirmar.

---

## 3.12. Referência Consolidada de Regras de Negócio — Implementação

> [!IMPORTANT]
> Esta seção consolida as regras de negócio críticas derivadas da referência clínica (ADA Standards of Care, Walsh & Roberts *Pumping Insulin*, prática clínica internacional). Serve como **checklist de implementação** para o motor matemático.

### RN-01: Suspensão de Cálculo por Hipoglicemia (Bloqueio Absoluto)

**Regra:** Se `Glicemia_Atual < 70 mg/dL`, o sistema **não deve calcular nem sugerir nenhuma dose de insulina**.

**Protocolo obrigatório exibido ao usuário:**
1. Consumir **15g a 20g de carboidratos de rápida absorção** imediatamente
2. Aguardar **15 minutos**
3. Medir glicemia novamente
4. Repetir o protocolo se ainda `< 70 mg/dL`
5. Se `BG >= 70 mg/dL` e houver refeição planejada, recalcular bolus

```javascript
// Regra RN-01: Bloqueio absoluto de hipoglicemia
export function checkHypoglycemiaBlock(currentBG) {
  if (currentBG < 70) {
    return {
      blocked: true,
      level: currentBG < 54 ? 'CRITICAL' : 'WARNING',
      protocol: {
        action: 'INGEST_CARBS',
        carbsGrams: currentBG < 54 ? 20 : 15,
        waitMinutes: 15,
        message: `Hipoglicemia detectada (${currentBG} mg/dL). Ingira ${currentBG < 54 ? 20 : 15}g de carboidratos e aguarde 15 minutos.`
      }
    };
  }
  return { blocked: false };
}
```

### RN-02: Validação de Dose Máxima por Aplicação

**Regra:** Estabelecer limite rígido de dose máxima por bolus para prevenir erros de digitação.

| Parâmetro | Valor Padrão | Configurável pelo Médico | Limite Absoluto (hard-coded) |
|----------|-------------|--------------------------|-----------------------------|
| Dose Máxima por Bolus | **15U** | Sim (entre 5U e 25U) | 25U (nunca ultrapassa) |
| Dose Mínima sugerível | 0,05U | Não | 0,05U |
| Bolus Negativo | Não permitido | Não | 0U mínimo absoluto |

**Justificativa clínica do limite padrão de 15U:**
- A maioria dos pacientes ambulatoriais com DM1 não ultrapassa 10–12U por bolus em condições normais
- Um limite de 15U permite flexibilidade para refeições maiores sem acobertar erros de digitação catastróficos
- O médico pode ampliar para até 25U em casos específicos (DM2 com resistência elevada)
- Acima de 25U: considera-se risco inaceitável em ambiente ambulatorial sem monitoramento

### RN-03: Arredondamento de Dose por Tipo de Dispositivo

A dose calculada deve ser arredondada de acordo com a resolução mínima do dispositivo do paciente:

| Dispositivo | Incremento Mínimo | Arredondamento |
|-------------|-------------------|----------------|
| Bomba de insulina (alta precisão) | 0,05U | Math.round(dose / 0.05) * 0.05 |
| Bomba de insulina (padrão) | 0,1U | Math.round(dose / 0.1) * 0.1 |
| Caneta (meia unidade) | 0,5U | Math.round(dose / 0.5) * 0.5 |
| Caneta (unidade inteira) | 1,0U | Math.round(dose) |
| Seringa | 0,5U ou 1U | Conforme capacidade da seringa |

```javascript
/**
 * Arredonda dose para o incremento do dispositivo do paciente
 * @param {number} dose - Dose calculada
 * @param {number} deviceIncrement - Incremento mínimo do dispositivo (ex: 0.05, 0.5, 1.0)
 * @returns {number} Dose arredondada
 */
export function roundDoseForDevice(dose, deviceIncrement) {
  if (dose <= 0) return 0;
  const rounded = Math.round(dose / deviceIncrement) * deviceIncrement;
  // Retorna com precisão adequada para evitar floating-point issues
  const decimals = String(deviceIncrement).split('.')[1]?.length ?? 0;
  return parseFloat(rounded.toFixed(decimals));
}
```

### RN-04: Comportamento Quando Glicemia Abaixo do Alvo com Refeição

Quando `Glicemia_Atual < Glicemia_Alvo` e há carboidratos sendo consumidos:
- `Bolus_Correção` será **negativo** (reduz a dose total)
- A dose final deve ser `max(0, Bolus_Alim + Bolus_Corr)`
- O sistema deve alertar: *"Glicemia abaixo do alvo. A dose foi reduzida. Monitore a glicemia após a refeição."*

### RN-05: Parâmetros do Usuário — Responsabilidade Médica

> [!CAUTION]
> Os parâmetros abaixo **jamais são sugeridos ou alterados pelo sistema automaticamente**. São configurados exclusivamente pelo endocrinologista:

| Parâmetro | Descrição | Estimativa teórica | Validação do sistema |
|----------|-----------|-------------------|-----------------------|
| **DTD** | Dose Total Diária | 0,4 a 1,0 U/kg/dia | 2U – 300U |
| **ICR** | Razão Insulina:Carb | Regra dos 500: `500/DTD` | 2 – 100 g/U |
| **ISF** | Fator de Sensibilidade | Regra dos 1800: `1800/DTD` | 5 – 200 mg/dL/U |
| **Alvo** | Glicemia Alvo | 100 mg/dL | 70 – 200 mg/dL |
| **DIA** | Duração da ação da insulina | 4h (análogos rápidos) | 2h – 8h |

---

## 4. Regras de Segurança do Motor Matemático

Para um sistema crítico como este, o próprio algoritmo (Motor Matemático) precisa ter defesas robustas contra comportamentos numéricos indeterminados ou falhas lógicas de software (como *overflows* ou vazamentos de tipagem em Javascript).

### 4.1 Sanitização de Todas as Entradas
Toda entrada externa (UI, API, IoT devices) deve ser processada através de um *Data Transfer Object* (DTO) restrito. As entradas que deveriam ser numéricas são parseadas rigorosamente, desconsiderando strings disfarçadas. Na implementação moderna em Javascript (TypeScript recomendado), utilizamos esquemas `Zod` ou `Joi`.

### 4.2 Proibição de NaN e Infinity
Nenhum resultado numérico dentro da máquina de estados do calculador pode ser `NaN` ou infinito (`Infinity` / `-Infinity`).
- **Bloqueios no Motor:**
  Antes de cada operação que puder gerar NaN (ex. `0/0`) ou infinito (ex. `1/0`), o denominador deve ser validado. Se, por qualquer defeito endêmico, o motor produzir NaN, a resposta é *Fail-Fast* com *Error Throw*, garantindo que a aplicação jamais mostre ao paciente a mensagem "Tome NaN unidades".

### 4.3 Limites Hard-coded vs Configuráveis
- **Hard-coded:** Escritos no próprio código da aplicação e impossíveis de serem adulterados, a não ser por um novo deploy ou atualização na loja de aplicativos. Exemplo: *Regra de max_bolus de emergência 25U*.
- **Configuráveis:** Ajustados pelo médico via plataforma web e restritos pela nuvem. Exemplo: *Target Range*. Mesmo que o usuário configure seu Target Range, o backend valida este novo range contra os "Hard Limits".

### 4.4 Auditoria de Cada Cálculo
A arquitetura funciona por um princípio "State-Snapshot": cada recomendação de dose gerada empacota todas as variáveis no exato estado em que se encontravam no momento (Glicemia atual, IOB calculado internamente, hora exata, ICR, ISF daquele minuto, Target). Este *snapshot* é um Hash (ex: SHA-256) garantindo a rastreabilidade exata do cálculo para o caso de auditorias e análises retrospectivas, essencial para aprovação na Anvisa/FDA.

### 4.5 Degradação Graciosa (Graceful Degradation)
Se o sistema falha em calcular IOB complexo usando curvas multi-exponenciais (por falha num módulo avançado, ou perda de conexão parcial num microserviço), ele deve "degradar" graciosamente para um cálculo mais conservador, avisando o usuário de maneira transparente (ex. "Modo de Segurança: o cálculo de insulina residual está operando de modo linear e simplificado, acompanhe").

---

## 5. Avisos e Isentos de Responsabilidade (Disclaimers)

Nenhuma tecnologia substitui a deliberação médica. Para cobrir aspectos médico-legais:

### 5.1 Texto Legal Obrigatório (Onboarding)
No primeiro uso, o usuário e seu médico são obrigados a rolar e aceitar um *End User License Agreement (EULA)* com Consentimento Informado explícito (Opt-in Digital). O documento estabelece com clareza:
- O software não é um dispositivo autônomo e cego; a decisão final de injeção é sempre do ser humano.
- O paciente compreende que parâmetros inseridos erroneamente resultarão em doses fatais ou errôneas.
- O paciente é instruído a sempre usar bom senso ("Se o aplicativo sugerir 20U e você costuma tomar 2U, não aplique e chame o médico").

### 5.2 Consentimento Informado Digital
Os Termos não são mostrados apenas uma vez. Qualquer mudança significativa de perfil médico ou atualização de segurança do app, os termos são exibidos novamente. O aceite digital inclui IP, Timestamp e ID do dispositivo para resguardo de auditoria (repúdio).

### 5.3 Avisos Antes de Cada Sugestão de Dose
A própria tela do calculador contém na parte inferior:
> "*Calculado via algoritmo padrão. Confirme se as informações condizem com o real, verifique o visor de sua bomba ou seringa. Consulte seu médico para dúvidas.*"

---

## 6. Auditoria e Logs de Segurança (Audit Trails)

O registro de dados em um software médico cumpre papel preventivo e pericial.

### 6.1 O que deve ser logado (Data Events)
- Cada acesso ao aplicativo (autenticação, falhas).
- Todas as alterações de Perfil Metabólico (quem mudou, de qual valor antigo para o valor novo, a que horas).
- O payload completo de cálculo: `[Timestamp, UserID, ISF, ICR, BG_atual, Target, CHO_input, IOB_calculado, Dose_Sugerida, Dose_Confirmada]`.
- Rejeições do Motor de Cálculo e Alertas Críticos disparados (importante para reportar uso anômalo pelo paciente à sua equipe clínica).

### 6.2 Formato do Log
Um sistema de eventos deve registrar logs centralizados em formato padronizado (JSON):
```json
{
  "timestamp": "2026-07-28T16:05:00-03:00",
  "eventType": "CALCULATION_EVENT",
  "userId": "uuid-1234",
  "algorithmVersion": "v4.2.1",
  "inputs": {
    "bg": 250,
    "cho": 45
  },
  "context": {
    "icr": 10,
    "isf": 40,
    "target": 100,
    "iob": 1.5,
    "dia": 4.0
  },
  "outputs": {
    "suggestedBolus": 6.75,
    "blocked": false,
    "warnings": ["HIGH_BG_CHECK_KETONES"]
  },
  "signature": "a823b1285c..."
}
```

### 6.3 Imutabilidade e Retenção
Logs são registrados em sistema Append-Only (como AWS CloudWatch, ElasticSearch ou block storages específicos para saúde). Os logs não podem ser modificados após gerados. Retenção de logs médicos e dados clínicos geralmente atende legislações (HIPAA, GDPR, LGPD), variando de 5 a 10 anos dependendo da jurisdição local.

---

## 7. Segurança de Rede e Dados (Data Privacy & Cyber Security)

A confidencialidade, integridade e disponibilidade formam o tripé (CIA Triad) indispensável.

### 7.1 Criptografia em Trânsito (TLS 1.3)
Todas as chamadas da UI para os serviços do Backend (sejam REST ou gRPC) devem trafegar obrigatoriamente sob TLS 1.3. Nenhum terminal (endpoint) da API expõe protocolos HTTP sem criptografia. 

### 7.2 Criptografia em Repouso (AES-256)
No banco de dados, informações pessoais identificáveis (PII) e todos os parâmetros clínicos metabólicos são criptografados em repouso. Uma invasão aos discos físicos de onde a base está hospedada não expõe perfis de glicemia e dose, evitando chantagem baseada em dados de saúde (Ransomware médico).

### 7.3 Autenticação e Autorização (JWT + 2FA)
- JSON Web Tokens (JWT) têm validade curta e são regenerados via Refresh Tokens, limitando ataques de roubo de sessão.
- Autenticação Multifator (2FA/MFA) é mandatória para a interface do médico e altamente recomendada para pacientes.
- Controle de Acesso Baseado em Função (RBAC): O paciente só vê seus dados. O médico não altera configurações sem senha reforçada.

### 7.4 Privacidade (LGPD/HIPAA)
- Consentimento explícito para coleta e tratamento de dados sensíveis (dados de saúde).
- Permissão granular de acesso, possibilitando ao usuário revogar o acesso do médico aos seus dados a qualquer hora (Data Sovereignty).
- Ofuscação de dados ao transferir relatórios a provedores terceiros ou para pesquisa anonimizada (desidentificação).

---

## 8. Plano de Resposta a Incidentes (Incident Response & Remediation)

Se uma falha grave for detectada em ambiente de produção (ex. cálculo errôneo afetando usuários devido a um bug oculto):

1. **Detecção de Anomalias:** Monitoramento ativo. Se o número de disparos de logs de erro crítico ultrapassar certo limite por minuto, o pager (OpsGenie, PagerDuty) da equipe SRE/Engenharia aciona.
2. **Rollback e Kill Switch:** O sistema possui um "Kill Switch" que invalida e desabilita temporariamente a funcionalidade do Calculador nos clientes em caso de suspeita grave. Uma comunicação no app avisa: "O calculador está sob manutenção técnica. Por favor, calcule sua dose manualmente."
3. **Notificação ao Médico e Usuário:** Comunicação via E-mail e Push Notification para os pacientes e médicos potencialmente expostos à falha no período do bug, orientando monitoramento minucioso de hiper/hipoglicemia.
4. **Análise de Causa Raiz (Root Cause Analysis - RCA):** Equipe forense averígua a falha no código e conduz uma revalidação e aprovação regulatória antes do serviço subir novamente.

---

## 9. Pseudocódigo do Safety Layer (JS/ESM)

Abaixo apresentamos o *core* defensivo que compõe o módulo `SafetyManager.js` da plataforma. Todos os dados vindos de fora obrigatoriamente passam por essas três funções encadeadas.

```javascript
/**
 * Módulo Central de Safety e Validation
 * Desenvolvido seguindo as diretrizes ISO 14971
 * Arquitetura de Defesa em Profundidade.
 */

// Limites Absolutos Fixos (Hardcoded)
const HARD_LIMITS = {
  MIN_BG: 30, // mg/dL
  MAX_BG: 600, // mg/dL
  MAX_CHO: 300, // gramas
  MIN_DOSE: 0.05, // Unidades
  ABSOLUTE_MAX_BOLUS: 25.0, // Unidades (Nunca ultrapassável pelo sistema)
  MIN_TARGET: 70, // mg/dL
  MAX_TARGET: 200, // mg/dL
  MIN_DIA: 2.0, // horas
  MAX_DIA: 8.0 // horas
};

/**
 * 9.1 Validações de Entrada (Validate Inputs)
 * Garante que os números que vão entrar na matemática pura sejam sadios.
 * 
 * @param {Object} inputs { bg, cho }
 * @param {Object} context { isf, icr, target, maxBolusConfigurado, iob, dia }
 * @throws {Error} Quando os limites absolutos (Hard Limits) são quebrados.
 */
export function validateInputs(inputs, context) {
  // 1. Checagem de NaN e Invalidações de Tipo
  if (typeof inputs.bg !== 'number' || Number.isNaN(inputs.bg)) {
    throw new Error('ERR_BG_INVALID_TYPE: Glicemia deve ser um número válido.');
  }

  // 2. Validação da Glicemia
  if (inputs.bg < HARD_LIMITS.MIN_BG || inputs.bg > HARD_LIMITS.MAX_BG) {
    throw new Error(`ERR_BG_OUT_OF_BOUNDS: Valor de Glicemia fora do escopo biológico seguro (${HARD_LIMITS.MIN_BG} - ${HARD_LIMITS.MAX_BG}).`);
  }

  // 3. Validação de Carboidratos
  if (inputs.cho < 0 || inputs.cho > HARD_LIMITS.MAX_CHO) {
    throw new Error(`ERR_CHO_OUT_OF_BOUNDS: Carboidrato invalido. Deve ser entre 0 e ${HARD_LIMITS.MAX_CHO} gramas.`);
  }

  // 4. Validação de Fatores Base
  if (!context.icr || context.icr <= 0) {
    throw new Error('ERR_INVALID_FACTOR_DIV_ZERO: Fator de Carboidrato (ICR) não pode ser nulo ou zero.');
  }
  if (!context.isf || context.isf <= 0) {
    throw new Error('ERR_INVALID_FACTOR_DIV_ZERO: Fator de Sensibilidade (ISF) não pode ser nulo ou zero.');
  }

  // 5. Validação de Alvo
  if (context.target < HARD_LIMITS.MIN_TARGET || context.target > HARD_LIMITS.MAX_TARGET) {
    throw new Error('ERR_TARGET_BG_OUT_OF_BOUNDS: O alvo glicêmico configurado oferece risco clínico.');
  }
}

/**
 * 9.2 Checagem de Alertas Clínicos
 * Esta fase inspeciona a situação pré-cálculo e retorna alertas (Warnings)
 * 
 * @param {Object} inputs { bg, cho }
 * @param {Object} context { isf, icr, target, maxBolusConfigurado, iob, dia }
 * @returns {Array} Lista de objetos de alerta { code, severity, message }
 */
export function checkAlerts(inputs, context) {
  const alerts = [];

  // Alerta Crítico de Hipoglicemia
  if (inputs.bg < 54) {
    alerts.push({
      code: 'ALERT_SEVERE_HYPO',
      severity: 'CRITICAL',
      message: 'ALERTA VERMELHO: Hipoglicemia severa. Consuma carboidratos de ação rápida imediatamente e NÃO injete insulina.'
    });
  } 
  // Alerta de Hipoglicemia Leve
  else if (inputs.bg >= 54 && inputs.bg < 70) {
    alerts.push({
      code: 'ALERT_MILD_HYPO',
      severity: 'WARNING',
      message: 'Glicemia baixa. Recomendado tratar a hipoglicemia leve antes de calcular.'
    });
  }

  // Alerta de Hiperglicemia Extrema
  if (inputs.bg > 400) {
    alerts.push({
      code: 'ALERT_EXTREME_HYPER',
      severity: 'CRITICAL',
      message: 'EMERGÊNCIA: Glicose acima de 400 mg/dL. Verifique cetonas e estado clínico imediatamente.'
    });
  }
  // Alerta de Checagem de Cetonas
  else if (inputs.bg >= 300) {
    alerts.push({
      code: 'ALERT_HIGH_BG_KETONES',
      severity: 'WARNING',
      message: 'Glicemia alta e mantida requer verificação de cetonas urinárias ou no sangue.'
    });
  }

  return alerts;
}

/**
 * 9.3 Aplicação de Regras de Segurança pós-cálculo
 * Audita a dose gerada para ter certeza absoluta de que é viável.
 * 
 * @param {Number} rawDose - A dose preliminar calculada pela matemática do motor.
 * @param {Object} context - Contexto do paciente
 * @param {Array} currentAlerts - Alertas que foram gerados na fase de checagem.
 * @returns {Object} { finalDose, alerts, blocked }
 */
export function applySafetyRules(rawDose, context, currentAlerts) {
  let finalDose = rawDose;
  let isBlocked = false;
  let finalAlerts = [...currentAlerts];

  // Regra de Trava Crítica
  const hasCriticalAlert = finalAlerts.some(a => a.severity === 'CRITICAL' && a.code === 'ALERT_SEVERE_HYPO');
  if (hasCriticalAlert) {
    finalDose = 0;
    isBlocked = true; // Safety cutoff
    return { finalDose, alerts: finalAlerts, blocked: isBlocked };
  }

  // Sanity Check no resultado matemático (jamais NaN, jamais negativo)
  if (Number.isNaN(finalDose)) {
    throw new Error('SYS_ERR: Algoritmo falhou com saída Not-a-Number (NaN).');
  }

  if (finalDose < 0) {
    finalDose = 0; // Insulina negativa é logicamente 0 (sistema aberto não suga insulina do corpo)
  }

  // Checagem de Limite Mínimo de Sugestão
  if (finalDose > 0 && finalDose < HARD_LIMITS.MIN_DOSE) {
    finalDose = 0; // Clippado para zero para não recomendar poeira
  }

  // Avaliação de Insulin Stacking e limites de Max Bolus configurado
  const resolvedMaxBolus = Math.min(context.maxBolusConfigurado || 10, HARD_LIMITS.ABSOLUTE_MAX_BOLUS);

  if (finalDose + context.iob > resolvedMaxBolus * 0.7) {
    finalAlerts.push({
      code: 'ALERT_STACKING_RISK',
      severity: 'WARNING',
      message: 'Atenção: A dose solicitada somada ao IOB existente beira o risco de empilhamento. Verifique.'
    });
  }

  if (finalDose > resolvedMaxBolus) {
    // Corte abrupto por limiar máximo
    finalDose = resolvedMaxBolus;
    finalAlerts.push({
      code: 'ALERT_MAX_BOLUS_ENFORCED',
      severity: 'WARNING',
      message: `A dose foi limitada ao máximo configurado de ${resolvedMaxBolus}U para sua segurança.`
    });
  }

  // Retorna uma casa decimal segura para dosagem, ex: 3.55U => 3.5U (truncamento seguro)
  // Dependendo do modo, arrendondamento pode ser pra baixo (Safety First)
  finalDose = Math.floor(finalDose * 20) / 20; // Arredondamento para os steps mais finos (0.05U) das bombas

  return {
    finalDose,
    alerts: finalAlerts,
    blocked: isBlocked
  };
}

/**
 * 9.4 Registro de Auditoria (Audit Log)
 * Realiza o empacotamento das variáveis para envio a um log de telemetria cego e imutável.
 */
export function auditLog(userId, inputs, context, safetyResult) {
  const logEvent = {
    timestamp: new Date().toISOString(),
    event: 'SAFETY_CHECKPOINT_COMPLETED',
    uid: userId,
    inputState: inputs,
    profileContext: context,
    decision: {
      finalDose: safetyResult.finalDose,
      blocked: safetyResult.blocked,
      alertsEmmited: safetyResult.alerts.map(a => a.code)
    }
  };

  // Na vida real: envio persistente via Kafka ou S3 para armazenamento read-only.
  console.log('[AUDIT LOG]:', JSON.stringify(logEvent));
}
```

---

## 10. Lista de Verificação de Segurança (Checklist)

Para cada atualização na plataforma, ou para cada ciclo de homologação e produção, as seguintes etapas devem ser cumpridas sem falhas. Se houver sequer uma inconformidade, não é permitido subir código para a nuvem de produção (No-Go Decision).

### 10.1 Checklist de Implementação e Código (Development)
- [ ] O código implementa todas as validações (Hard Limits) listadas no item 2.
- [ ] A arquitetura isola o `SafetyManager` de maneira que toda injeção passe por ele (Nenhuma dose é gerada por fora).
- [ ] Nenhuma constante hardcoded crítica foi alterada acidentalmente no código (ex. DIA ou MAX_BOLUS).
- [ ] Foram criados testes unitários exaustivos utilizando matriz de cenários perigosos (Boundary testing).
- [ ] Todas as dependências criptográficas (para JWT e dados em repouso) encontram-se atualizadas, isentas de CVEs severos (NPM Audit/Dependabot zerados).

### 10.2 Checklist de Testes de Segurança (Quality Assurance - QA)
- [ ] **Teste de Fronteira Crítica:** Injetado `BG = 53` e checado se sistema retornou o bloqueio fatal de modo efetivo.
- [ ] **Teste de Overflow Matemático:** Inserido `ISF = 0.0001` na API e o backend bloqueou por restrição de API e validação no módulo central.
- [ ] **Teste de Manipulação de Timestamps:** Celular do testador teve o horário modificado - o sistema detectou e exigiu sincronização de tempo, não calculando IOB.
- [ ] **Teste de Resiliência Concorrente (Race Conditions):** O usuário tentou solicitar cálculos idênticos muito velozes; o Redis L1/L2 deduplicou os eventos, impedindo duplos logs.
- [ ] **Teste de Exibição do Alerta Visual:** A UI reagiu apropriadamente para o código de severidade `CRITICAL` desenhando alertas visíveis e barrando os inputs.

### 10.3 Checklist de Implantação e Operação (Deploy & SRE)
- [ ] Sistema de CI/CD aprovou os pipelines de testes e não apresentou falhas de compilação.
- [ ] Scripts de migração de banco não tocam e não alteram perfis sem auditoria expressa.
- [ ] A nuvem de infraestrutura tem WAF (Web Application Firewall) habilitado rejeitando IPs suspeitos.
- [ ] O banco de dados de produção se encontra cifrado no nível do volume (EBS Encryption ou similar AES-256).
- [ ] Monitores e alertas (PagerDuty/Datadog/CloudWatch) configurados para disparar ao surgirem erros fatais 500 ou quebras sistêmicas nas rotas de cálculo, com tempo de resposta do On-Call de no máximo 15 minutos.

### 10.4 Auditoria Periódica (Review)
- [ ] Os logs da aplicação da última semana mantêm rastreabilidade perfeita e inalterável?
- [ ] Revisão Mensal de incidentes que resultaram em Hipoglicemias baseadas em uso, comparando logs do calculador contra relatórios médicos se notificados pelo paciente.
- [ ] Revisão da política de privacidade para manter rigor absoluto ao GDPR/LGPD/HIPAA.

---
*Este documento é o guia definitivo (Single Source of Truth) para todo desenvolvedor ou clínico que audita e revisa a arquitetura de segurança, validação e comportamento determinístico do sistema Amanda Bot V4.*
