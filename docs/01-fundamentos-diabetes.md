# Documento 01 — Fundamentos do Diabetes

> ⚠️ **AVISO MÉDICO**: Este documento é destinado a propósitos de engenharia de software e suporte a decisões clínicas. Não substitui o julgamento médico profissional. Todas as fórmulas, algoritmos e referências devem ser validados por profissionais de saúde antes da aplicação em ambiente clínico.

## 1. O que é Diabetes Mellitus

O Diabetes Mellitus (DM) é um distúrbio metabólico crônico, de etiologia múltipla, caracterizado por hiperglicemia crônica resultante de defeitos na secreção de insulina, na ação da insulina, ou em ambos. A longo prazo, a hiperglicemia persistente está associada a danos estruturais e funcionais em vários órgãos, com destaque para disfunção e falência de olhos (retinopatia), rins (nefropatia), nervos (neuropatia), coração (doença cardiovascular) e vasos sanguíneos.

### Epidemiologia
O DM é considerado um dos maiores problemas de saúde pública global do século XXI. Segundo a Federação Internacional de Diabetes (IDF), estima-se que mais de 537 milhões de adultos vivam com diabetes no mundo, número que deve saltar para 783 milhões até 2045. 

No **Brasil**, as estatísticas são igualmente alarmantes. O país ocupa a 6ª posição global em número de casos de DM, com cerca de 15,7 milhões de adultos diagnosticados, além de uma alta prevalência de casos não diagnosticados. 

### Impacto na Saúde Pública
Os custos diretos e indiretos do diabetes representam uma carga imensa para o Sistema Único de Saúde (SUS) e sistemas suplementares. O manejo inadequado leva a altas taxas de internação por complicações agudas (como Cetoacidose Diabética e Estado Hiperglicêmico Hiperosmolar) e complicações crônicas (como amputações não traumáticas, diálise e cegueira).

---

## 2. Classificação e Tipos

A classificação do DM baseia-se na etiologia e fisiopatologia da doença.

### 2.1. Diabetes Mellitus Tipo 1 (DM1)
Representa de 5 a 10% dos casos. É caracterizado pela destruição imunomediada (autoimune) ou idiopática das células beta pancreáticas, levando à deficiência absoluta de insulina.
- **Fisiopatologia**: Ocorre uma insulite linfocítica, resultando na perda progressiva de células beta. 
- **Marcadores de Autoimunidade**: Presença de autoanticorpos como Anti-GAD65 (descarboxilase do ácido glutâmico), IAA (anti-insulina), IA-2 (tirosina fosfatase) e ZnT8 (transportador de zinco 8).
- **Apresentação Clínica**: Geralmente abrupta na infância ou adolescência, frequentemente abrindo o quadro com Cetoacidose Diabética (CAD). É estritamente **insulinodependente** para sobrevivência.

### 2.2. Diabetes Mellitus Tipo 2 (DM2)
Compreende 90 a 95% dos casos. Caracteriza-se pela combinação de resistência periférica à insulina e disfunção progressiva das células beta pancreáticas.
- **Progressão**: Inicialmente, a resistência à insulina nos tecidos periféricos (músculo, fígado, tecido adiposo) leva à hiperinsulinemia compensatória. Com o tempo, as células beta não conseguem manter essa superprodução, culminando em declínio secretório e hiperglicemia.
- **Fatores de Risco**: Obesidade, sedentarismo, envelhecimento, histórico familiar e etnia.

### 2.3. LADA (Latent Autoimmune Diabetes in Adults)
O LADA é uma forma de DM1 de progressão lenta, ocorrendo em adultos.
- **Diagnóstico Diferencial**: Muitas vezes diagnosticado erroneamente como DM2 inicialmente devido à idade do paciente e ausência imediata de necessidade de insulina. O diagnóstico é confirmado pela presença de autoanticorpos (principalmente GAD65) e falência progressiva de células beta que requer insulinoterapia mais rapidamente que no DM2 típico.

### 2.4. MODY (Maturity Onset Diabetes of the Young)
Forma monogênica de diabetes, de herança autossômica dominante, caracterizada por disfunção primária das células beta. Início geralmente antes dos 25 anos.
- **Subtipos**: Existem vários genes implicados.
  - MODY 1: HNF4A
  - MODY 2: GCK (Glucocinase) - Geralmente hiperglicemia leve, em jejum, não progressiva, que raramente requer tratamento medicamentoso.
  - MODY 3: HNF1A - O mais comum, responde excelentemente a sulfonilureias.
  - MODY 4-6: Menos comuns, envolvendo outros fatores de transcrição pancreáticos.

### 2.5. Diabetes Mellitus Gestacional (DMG)
Intolerância aos carboidratos diagnosticada pela primeira vez durante a gravidez (geralmente no segundo ou terceiro trimestre) que não preenche critérios para DM prévio.
- **Critérios IADPSG / OMS**: Teste Oral de Tolerância à Glicose (TOTG) 75g entre 24-28 semanas. Diagnóstico se pelo menos 1 valor alterado:
  - Jejum: ≥ 92 mg/dL
  - 1h: ≥ 180 mg/dL
  - 2h: ≥ 153 mg/dL
- **Riscos**: Macrossomia fetal, hipoglicemia neonatal, risco aumentado para a mãe e o filho desenvolverem DM2 futuramente.

### 2.6. Diabetes Secundário e Outros Tipos
- **Pancreatogênico (Diabetes Tipo 3c)**: Secundário a doenças do pâncreas exócrino (pancreatite crônica, fibrose cística, trauma, pancreatectomia).
- **Induzido por Medicamentos**: Glicocorticoides, imunossupressores, antirretrovirais, antipsicóticos atípicos.
- **Endocrinopatias**: Acromegalia, Síndrome de Cushing, Feocromocitoma.

---

## 3. Fisiologia da Insulina

### 3.1. Síntese e Secreção
A insulina é um hormônio peptídico (51 aminoácidos em duas cadeias, A e B, ligadas por pontes dissulfeto) produzido pelas **células beta das Ilhotas de Langerhans** no pâncreas.
A molécula precursora, a pró-insulina, é clivada nos grânulos secretores em insulina e Peptídeo-C, sendo ambos secretados em quantidades equimolares.

### 3.2. Secreção Basal vs. Prandial
- **Basal**: Secreção contínua e de baixa amplitude, ocorrendo mesmo em jejum. Sua função primária é inibir a produção excessiva de glicose pelo fígado (gliconeogênese e glicogenólise), além de prevenir lipólise descontrolada e cetogênese.
- **Prandial**: Picos agudos de secreção em resposta à ingestão de alimentos (especialmente carboidratos), facilitando a captação e o armazenamento rápido da glicose nos tecidos.

### 3.3. Mecanismo de Ação
A insulina liga-se ao seu receptor específico (um receptor tirosina-quinase) nas membranas das células-alvo (músculo estriado, tecido adiposo, fígado).
Essa ligação desencadeia uma cascata de sinalização intracelular (via PI3K/Akt), que culmina na translocação de vesículas contendo **GLUT4** (transportadores de glicose) para a membrana plasmática celular (em músculos e adipócitos), permitindo a entrada massiva de glicose na célula.

No fígado (que não depende do GLUT4 para entrada de glicose, mas do GLUT2), a insulina promove a síntese de glicogênio e inibe a glicogenólise e a gliconeogênese.

### 3.4. Meia-vida Plasmática
A meia-vida da insulina endógena na circulação sanguínea é de apenas **3 a 5 minutos**, sendo rapidamente degradada por insulinases no fígado e nos rins. Isso permite um ajuste muito fino e rápido da glicemia em indivíduos saudáveis.

---

## 4. Papel do Glucagon

O glucagon é o principal hormônio de contrarregulação, secretado pelas **células alfa** das Ilhotas de Langerhans, atuando de forma antagônica à insulina.

### 4.1. Contrarregulação Glicêmica
Em situações de queda de glicose plasmática (hipoglicemia) ou durante o jejum e exercícios extenuantes, o pâncreas reduz a secreção de insulina e aumenta a de glucagon. O glucagon atua primordialmente no fígado, estimulando:
- **Glicogenólise**: Quebra rápida do glicogênio hepático em glicose livre.
- **Gliconeogênese**: Produção de nova glicose a partir de precursores como aminoácidos, lactato e glicerol.

### 4.2. Relação Insulina / Glucagon
O balanço entre esses dois hormônios dita o estado metabólico. 
- Elevada relação (Pós-prandial): Estado anabólico (armazenamento de glicose, lipídios e síntese proteica).
- Baixa relação (Jejum/Hipoglicemia): Estado catabólico (liberação de reservas energéticas).

### 4.3. Uso Terapêutico
Formulações sintéticas de glucagon são fundamentais no resgate de **hipoglicemia grave** (Nível 3).
- **Kit Glucagon injetável**: Requer reconstituição liofilizada e administração IM ou SC.
- **Baqsimi**: Glucagon na forma de spray nasal, de uso muito mais simples em emergências, absorvido pela mucosa nasal (inclusive em pacientes inconscientes).

---

## 5. Produção de Glicose pelo Fígado

O fígado é o maestro do metabolismo basal de glicose.

### 5.1. Mecanismos
- **Glicogenólise**: Liberação rápida de glicose das reservas poliméricas hepáticas. Estas reservas duram em torno de 12-24 horas de jejum.
- **Gliconeogênese**: Síntese contínua de glicose a partir do momento em que as reservas de glicogênio caem.

### 5.2. Supressão Hepática pela Insulina
No indivíduo sem DM ou bem controlado, a insulina basal suprime adequadamente a produção hepática de glicose (PHG). No DM, a falta de insulina (ou resistência hepática à ela) faz com que o fígado produza glicose desenfreadamente, justificando a hiperglicemia de jejum.

### 5.3. Fenômeno do Amanhecer (Dawn Phenomenon)
Aumento natural e fisiológico da resistência à insulina nas primeiras horas da manhã (geralmente entre 4h e 8h), mediado pelo pico circadiano de hormônios contrarreguladores, como cortisol, GH (hormônio do crescimento), glucagon e catecolaminas. Em pacientes diabéticos, isso resulta em hiperglicemia matinal, exigindo ajustes de insulina basal (ex: aumento da taxa basal em bombas de insulina).

### 5.4. Efeito Somogyi
Hiperglicemia matinal de rebote. Ocorre em resposta a uma hipoglicemia não detectada durante a madrugada (frequentemente por excesso de insulina basal ou NPH noturna). O corpo libera massivamente hormônios de contrarregulação, resultando em hiperglicemia ao despertar. O diferencial com o fenômeno do amanhecer requer medição contínua (CGM) ou capilar às 3h da manhã.

---

## 6. Resistência à Insulina

Presente principalmente no DM2, mas também na obesidade, síndrome metabólica e síndrome dos ovários policísticos (SOP).

### 6.1. Mecanismos Moleculares
Defeitos na cascata de sinalização pós-receptor. A ligação da insulina ao receptor ocorre, mas a fosforilação dos substratos (IRS-1) é defeituosa, impedindo a translocação adequada dos receptores GLUT4 nas células musculares e adipócitos.

### 6.2. Papel da Adiposidade Visceral
O tecido adiposo visceral é metabolicamente muito ativo, secretando adipocinas inflamatórias (TNF-alfa, IL-6, resistina) e ácidos graxos livres (AGL) que induzem resistência à insulina diretamente no fígado e músculos (lipotoxicidade).

### 6.3. Hiperinsulinemia Compensatória
Para vencer a resistência periférica, as células beta aumentam drasticamente a secreção de insulina. Embora a glicemia se mantenha normal inicialmente (fase de pré-diabetes), a hiperinsulinemia per se promove aumento de peso, retenção de sódio, e aumento da pressão arterial, alimentando o ciclo da síndrome metabólica.

### 6.4. HOMA-IR (Homeostatic Model Assessment)
Índice calculado a partir da insulina de jejum e glicemia de jejum. Útil em pesquisas clínicas para quantificar a resistência à insulina, porém tem limitações de padronização na prática clínica diária.
- Fórmula: `(Glicemia de jejum (mg/dL) x Insulina de jejum (mU/L)) / 405`

---

## 7. Hipoglicemia

> ⚠️ **AVISO CLÍNICO**: Hipoglicemia é uma emergência médica. Em caso de perda de consciência ou convulsão, NUNCA administre nada via oral. Use Glucagon ou glicose endovenosa.

### 7.1. Definição e Níveis (Critérios ADA 2024)
- **Nível 1 (Leve/Alerta)**: Glicemia < 70 mg/dL e ≥ 54 mg/dL.
- **Nível 2 (Clinicamente Significativa)**: Glicemia < 54 mg/dL. Requer ação imediata.
- **Nível 3 (Grave)**: Hipoglicemia associada ao comprometimento cognitivo severo, requerendo assistência de terceiros para recuperação, independentemente do valor exato de glicose.

### 7.2. Sintomas
- **Adrenérgicos / Autonômicos** (surgem primeiro): Tremores, taquicardia, sudorese fria, palidez, ansiedade, fome intensa.
- **Neuroglicopênicos** (cérebro com falta de energia): Confusão mental, letargia, irritabilidade, visão turva, comportamento irracional, disartria, convulsões, coma.

### 7.3. Causas Comuns
Erro de dosagem de insulina, atraso ou omissão de refeições, carboidratos não absorvidos por gastroparesia, exercício físico intenso não planejado (ou não suplementado), consumo de álcool sem alimentos, perda de função renal (menor clearance de insulina).

### 7.4. Tratamento: Regra dos 15g
Para hipoglicemia Nível 1 ou 2 em paciente consciente:
1. Ingerir **15g de carboidratos de absorção rápida** (ex: 1 colher de sopa de açúcar na água, 150ml de suco de laranja, 3 sachês de açúcar, pastilhas de glicose).
2. Aguardar 15 minutos e medir novamente.
3. Se continuar < 70 mg/dL, repetir 15g de carboidratos rápidos.
4. Após normalizar, antecipar refeição ou fazer lanche com carboidrato complexo e proteína para evitar rebote.
*Evitar tratar hipoglicemia com chocolates ou alimentos ricos em gordura, pois a gordura retarda a absorção gástrica, atrasando a recuperação da glicemia.*

### 7.5. Hipoglicemia Assintomática (Hypoglycemia Unawareness)
Condição perigosa onde o paciente perde os sintomas autonômicos de alerta precoce devido a episódios repetitivos de hipoglicemia, que "dessensibilizam" o sistema nervoso simpático. O paciente pode entrar diretamente em convulsão ou coma. Necessita reajuste estrito das metas glicêmicas para evitar hipoglicemias por semanas e restaurar a percepção de sintomas.

---

## 8. Hiperglicemia

### 8.1. Critérios Diagnósticos
Estado caracterizado pelo excesso de glicose circulante. Clinicamente, glicemias acima das metas propostas (>180 mg/dL no pós-prandial).

### 8.2. Causas
Dose omitida ou insuficiente de insulina (ex: esquecimento do bólus prandial), falha na absorção do local de aplicação (lipohipertrofia), falha em bomba de insulina ou cateter, alto consumo de carboidratos, alto consumo de proteínas/gorduras não contabilizadas, infecções, febre, estresse agudo, uso de corticosteroides.

### 8.3. Sintomas e Consequências
Os sintomas clássicos dos "4 P's": Poliúria (muita urina), Polidipsia (muita sede), Polifagia (muita fome) e Perda de peso inexplicada.
**Glicotoxicidade**: A hiperglicemia severa e prolongada inibe a própria função residual das células beta e piora a resistência à insulina transitoriamente.

---

## 9. Cetoacidose Diabética (CAD)

> ⚠️ **ATENÇÃO**: A CAD é uma emergência endócrina letal se não tratada prontamente com hidratação rigorosa e insulina endovenosa contínua.

### 9.1. Fisiopatologia
Ocorre deficiência severa ou absoluta de insulina associada a excesso de glucagon. O fígado intensifica a gliconeogênese. Na ausência de insulina para utilizar glicose, o corpo passa a quebrar maciçamente gorduras (lipólise), liberando ácidos graxos livres. Estes são convertidos no fígado em **corpos cetônicos** (ácido acetoacético, beta-hidroxibutirato e acetona), os quais consomem as reservas de bicarbonato do sangue e causam acidose metabólica severa.

### 9.2. Critérios Diagnósticos
- Glicemia > 250 mg/dL (pode ser menor na CAD euglicêmica).
- pH arterial < 7.30.
- Bicarbonato sérico < 18 mEq/L.
- Cetonemia ou Cetonúria fortemente positivas (≥ 3.0 mmol/L).
- Aumento do Ânion Gap (hiato aniônico).

### 9.3. Sintomas Clínicos
Respiração de Kussmaul (rápida e profunda), hálito cetônico (odor de maçã podre/acetona), desidratação severa, dor abdominal aguda (frequentemente simulando abdome agudo cirúrgico), náuseas, vômitos intensos, alteração do sensório.

### 9.4. Tratamento (Pilares)
1. **Restauração Volêmica (Hidratação)**: Fundamental, iniciada com cristaloides (Soro Fisiológico 0.9%).
2. **Insulinoterapia IV**: Insulina regular em bomba de infusão contínua. Não deve ser iniciada se potássio sérico estiver muito baixo (<3.3 mEq/L).
3. **Reposição de Eletrólitos**: Especialmente Potássio. A insulina joga o potássio para dentro da célula, podendo causar hipocalemia letal.
4. Busca e tratamento do fator desencadeante (infecção, IAM).

### 9.5. CAD Euglicêmica
Aumento crescente de casos de CAD com glicemias relativamente normais (< 250 mg/dL), desencadeada pelo uso de medicamentos da classe dos **inibidores de SGLT2 (gliflozinas)**. Requer alta suspeição clínica e monitoramento sistemático de cetonas em dias de doença.

---

## 10. Estado Hiperglicêmico Hiperosmolar (EHH)

Típico de pacientes mais idosos com DM2.

### 10.1. Diferença da CAD
No EHH, o paciente ainda possui reserva suficiente de insulina para evitar a lipólise massiva e a cetogênese grave, portanto não ocorre cetoacidose significativa (pH>7.30 e bicarbonato>18). No entanto, a glicemia sobe a níveis absurdos (frequentemente > 600 mg/dL), levando a uma diurese osmótica brutal e desidratação extrema.

### 10.2. Diagnóstico
- Glicemia > 600 mg/dL.
- Osmolaridade sérica efetiva > 320 mOsm/kg.
- Alteração profunda do nível de consciência (estupor/coma).
- Ausência de acidose cetônica significativa.

### 10.3. Tratamento
Semelhante à CAD, porém foca de forma ainda mais agressiva e monitorada na reposição volêmica maciça e correção gradual da hiperosmolaridade para evitar edema cerebral, sendo a insulina uma prioridade secundária à hidratação profunda inicial.

---

## 11. Hemoglobina Glicada (HbA1c)

### 11.1. O que mede
A HbA1c avalia a ligação não enzimática irreversível da glicose às moléculas de hemoglobina (glicação) nos eritrócitos. Reflete a glicemia média dos últimos **2 a 3 meses** (tempo de vida média da hemácia, que é de 120 dias).

### 11.2. Metas (Guidelines 2024)
- **ADA (Adultos não grávidas)**: < 7.0%.
- **SBD (Adultos DM2, jovens, recém-diagnosticados)**: < 6.5 a 7.0%. Pode ser mais flexível (até 8.0-8.5%) em idosos com comorbidades e baixa expectativa de vida.
- **ISPAD (Crianças e adolescentes DM1)**: < 7.0%, podendo ser individualizada.

### 11.3. Limitações
A HbA1c perde a confiabilidade em casos de: Hemoglobinopatias (traço falciforme), anemias hemolíticas, uremia grave, transfusões sanguíneas recentes, deficiência de ferro profunda ou gravidez (segundo/terceiro trimestres). Nestes casos, métricas de CGM (como GMI) ou exames como a **Frutosamina** (reflete média de 2-3 semanas) tornam-se ferramentas melhores.

### 11.4. eAG (Glicose Média Estimada)
Fórmula que traduz o valor da HbA1c para uma linguagem mais próxima dos testes diários:
`eAG (mg/dL) = (28.7 x HbA1c) - 46.7`
*Exemplo: HbA1c de 7.0% corresponde a uma eAG de ~154 mg/dL.*

---

## 12. Glicemia Capilar

Monitorização por meio de glicosímetros de sangue em fita reagente.

### 12.1. Técnica Correta
Lavagem adequada das mãos (restos de frutas ou doces nos dedos causam leituras falsamente altas extremas). Alternar os dedos (bordas laterais das polpas digitais). Evitar espremer o dedo ("ordenha") fortemente após a punção para evitar diluição com líquido intersticial.

### 12.2. Valores de Referência Capilar (Metas Gerais ADA)
- Jejum / Pré-prandial: 80 a 130 mg/dL.
- 2h Pós-prandial: < 180 mg/dL.

### 12.3. Interferências
- **Hematócrito**: Níveis muito altos de hematócrito (policitemia) podem subestimar a leitura. Níveis baixos (anemia grave) podem superestimar.
- **Vitamina C e Outras Drogas**: Doses altas de ácido ascórbico injetável, paracetamol e substâncias químicas específicas podem interferir dependendo da enzima utilizada na tira de teste (GDH-PQQ, GOX).

---

## 13. Monitoramento Contínuo de Glicose (CGM)

A revolução no controle do diabetes.

### 13.1. Princípio de Funcionamento
Sensores subcutâneos medem a glicose no **líquido intersticial** e não diretamente no sangue capilar ou venoso.

### 13.2. Delay Intersticial (Lag Time)
Ocorre um atraso fisiológico ("delay") de cerca de 10 a 15 minutos entre a glicose sanguínea e a intersticial. Quando a glicemia está subindo ou caindo vertiginosamente, o CGM pode mostrar valores atrasados em relação ao teste de dedo.

### 13.3. Tecnologias
- **FGM (Flash Glucose Monitoring)**: O usuário precisa passar o leitor ou smartphone próximo ao sensor (varredura/scan) para obter os dados. Ex: FreeStyle Libre.
- **rtCGM (Real-Time CGM)**: Transmite os dados automaticamente, via Bluetooth, em tempo real, alertando preditivamente sobre hipos ou hiperglicemias. Ex: Dexcom G6, Medtronic Guardian.

### 13.4. Métricas do Consenso Internacional (ATTD / ADA / ISPAD)
- **TIR (Time in Range - Tempo no Alvo)**: Porcentagem de tempo entre 70 e 180 mg/dL. Meta: **> 70%** (correlaciona-se com HbA1c de ~7.0%).
- **TAR (Time Above Range - Tempo Acima do Alvo)**:
  - Nível 1 (181 - 250 mg/dL). Meta: < 25%.
  - Nível 2 (> 250 mg/dL). Meta: < 5%.
- **TBR (Time Below Range - Tempo Abaixo do Alvo)**:
  - Nível 1 (54 - 69 mg/dL). Meta: < 4%.
  - Nível 2 (< 54 mg/dL). Meta: < 1%.
- **CV (Coeficiente de Variação)**: Mede a variabilidade glicêmica. Meta: **< 36%**. CV alto é forte preditor de hipoglicemias.
- **GMI (Glucose Management Indicator)**: Antiga HbA1c Estimada, calculada a partir dos dados médios dos últimos 14 dias do CGM.

---

## Referências Bibliográficas

1. **American Diabetes Association (ADA)**. Standards of Care in Diabetes - 2024. Diabetes Care 2024; 47(Suppl 1).
2. **International Society for Pediatric and Adolescent Diabetes (ISPAD)**. Clinical Practice Consensus Guidelines 2022. Pediatric Diabetes.
3. **Sociedade Brasileira de Diabetes (SBD)**. Diretrizes da Sociedade Brasileira de Diabetes 2023-2024. Brasília, DF.
4. **Battelino, T. et al.** Clinical Targets for Continuous Glucose Monitoring Data Interpretation: Recommendations From the International Consensus on Time in Range. Diabetes Care 2019; 42(8): 1593-1603.
5. **Katzung, B. G.** Farmacologia Básica e Clínica. 14ª Ed. Lange, 2018.

---

*Fim do Documento.*
