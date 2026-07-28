# Documento 10 — Bombas de Insulina (CSII - Continuous Subcutaneous Insulin Infusion)

> [!CAUTION]
> **AVISO MÉDICO E DE SEGURANÇA**
> Este documento contém informações técnicas avançadas sobre configurações de Sistemas de Infusão Contínua de Insulina (CSII) e cálculos de dosagem. As informações aqui dispostas refletem diretrizes de entidades como a American Diabetes Association (ADA), International Society for Pediatric and Adolescent Diabetes (ISPAD) e Sociedade Brasileira de Diabetes (SBD). Nenhuma alteração de terapia, basal, fator de sensibilidade, relação insulina-carboidrato ou tipo de bolus deve ser feita sem a supervisão e prescrição direta de um médico endocrinologista. O uso inadequado de bombas de insulina pode levar a quadros severos de hipoglicemia, hiperglicemia ou cetoacidose diabética (CAD). 

---

## Índice
1. O que é uma Bomba de Insulina
2. Componentes e Arquitetura do Sistema
3. Terapia Basal: O Fundamento
4. Basal Temporária (TBR) e Seu Uso Prático
5. Tipos de Bolus e Estratégias de Refeição
6. Alarmes, Falhas Mecânicas e Oclusões
7. Bombas Disponíveis no Brasil: Análise Técnica
8. Sistemas de Alça Fechada (Closed Loop)
9. Cuidados com o Infusor e Saúde da Pele
10. Integração com Sistemas e APIs (Nightscout, AAPS)
11. Glossário de Termos CSII

---

## 1. O que é uma Bomba de Insulina

A Bomba de Insulina, tecnicamente referida pela sigla CSII (Continuous Subcutaneous Insulin Infusion), é um dispositivo eletromecânico e computadorizado desenhado para administrar insulina de ação rápida ou ultrarrápida (como Lispro, Asparte, Glulisina ou Fiasp) diretamente no tecido subcutâneo de forma contínua e fracionada ao longo de 24 horas.

Diferente do pâncreas humano, que injeta insulina diretamente na circulação portal (fígado), a bomba injeta na gordura subcutânea, de onde o hormônio é absorvido pela rede de capilares e distribuído na corrente sanguínea sistêmica.

### Histórico e Evolução Tecnológica
A evolução das bombas de insulina ilustra um dos maiores saltos da engenharia biomédica moderna:
- **1974:** O "Biostator", um aparelho do tamanho de um refrigerador usado apenas em ambiente hospitalar, injetava insulina e glicose na veia.
- **1978:** Criação do "AutoSyringe" (The Blue Brick), uma mochila pesada e desconfortável que o paciente precisava carregar, mas marcando a primeira infusão portátil.
- **Anos 1980:** Surgimento da Minimed (posteriormente adquirida pela Medtronic). As bombas ficaram do tamanho de bipers, e adotou-se a terapia subcutânea, reduzindo significativamente os riscos de infecção venosa.
- **Anos 2000:** Introdução de menus interativos, calculadoras de bolus ("Bolus Wizard") embutidas e memória histórica.
- **2006:** Início da era LGS (Low Glucose Suspend) - as primeiras integrações entre sensores (CGM) e bombas, permitindo suspender a infusão na hipoglicemia iminente.
- **2014+:** A era do Pâncreas Artificial Híbrido, tanto por vias comerciais (Minimed 670G) quanto pelo ativismo e desenvolvimento de engenheiros no movimento #WeAreNotWaiting (OpenAPS e Nightscout).

### Vantagens vs. Múltiplas Injeções Diárias (MDI)
O tratamento convencional com MDI (Multiple Daily Injections) requer o uso de insulina basal de longa duração e insulinas prandiais de ação rápida. As limitações do MDI que o CSII resolve são:
1. **Ausência de insulina de depósito (Depot):** A bomba utiliza apenas insulina rápida. Isso reduz a variabilidade imensa na taxa de absorção que ocorre com insulinas lentas em grandes volumes de injeção.
2. **Flexibilidade horária:** Permite taxas basais que acompanham o ciclo circadiano, impossível no MDI (onde a dose basal é plana ou possui um pico engessado).
3. **Resolução do Fenômeno do Alvorecer:** Aumentos naturais de resistência pela manhã devido ao cortisol podem ser perfeitamente compensados com uma elevação programada na taxa basal.
4. **Precisão micrométrica (Microdosagem):** Motores entregam até 0.001 U/h, enquanto uma caneta atinge, no máximo, o incremento de 0.5 U. Vital para pediatria.
5. **Prevenção de Hipoglicemia Relativa ao Exercício:** A suspensão da insulina rápida tem efeito no sangue em 30-60 minutos. A insulina lenta no MDI afeta o paciente o dia todo, não importa o nível de exercício.

### Quem se Beneficia?
A indicação, segundo os preceitos da ADA e da SBD, foca primeiramente naqueles pacientes que falharam em alcançar as metas do controle glicêmico com a terapia MDI, ou que sofrem de:
- Hipoglicemias não percebidas ("Hypoglycemia Unawareness").
- Variabilidade glicêmica aguda (Diabetes "Lábil").
- Alto nível de resistência à insulina pela manhã.
- Gastroparesia diabética (esvaziamento retardado).
- Intensa rotina de atividade física que não pode ser tratada com o efeito fixo da insulina de depósito.
- Gestantes e mulheres com intenção de engravidar com DM1.

### Condições Necessárias para Uso
Para ser candidato ao uso da bomba de insulina, o paciente ou os responsáveis devem possuir:
- **Matemática e Contagem de Carboidratos:** Conhecimento exato de medição, pesagem e leitura de rótulos.
- **Autocuidado Constante:** Aceitar o porte de um dispositivo preso ao corpo 24 horas por dia.
- **Monitorização Intensa:** Disposição em medir a glicemia diversas vezes ao dia ou usar e calibrar um CGM (Monitor Contínuo de Glicose).
- **Educação de Risco (CAD):** Devido ao fato de que não há estoque de insulina de ação prolongada, qualquer falha mecânica do sistema de infusão deixará o corpo desprovido de insulina. O processo de cetoacidose diabética (CAD) pode começar em 4 a 6 horas após uma falha de entrega.

---

## 2. Componentes e Arquitetura do Sistema

Entender a mecânica do sistema é a melhor maneira de detectar falhas de entrega de insulina, ociosidades e bugs.

### O Ecossistema Físico Tradicional (Tethered Pump)

```ascii
      +-------------------------------------------------------------+
      |  CORPO DA BOMBA (CPU / DISPLAY / BATERIA)                   |
      |                                                             |
      |  +--------------------+       +--------------------------+  |
      |  | Motor Micropasso   |       | Reservatório (Seringa)   |  |
      |  | (Atuador linear)   |======>| (1.6 a 3.0 mL)           |  |
      |  +--------------------+       +--------------------------+  |
      +-------------------------------------------||----------------+
                                                  || <--- Luer Lock / Conector proprietário
                                                  ||
                                                  ||
                                          +----------------+
                                          | Tubo / Cateter | (Plástico flexível, PVC livre de DEHP)
                                          | (60 a 110 cm)  |
                                          +----------------+
                                                  ||
                                                  ||
                                          +----------------+
                                          | Cânula/Infusor | (Teflon ou Aço, 6mm ou 9mm)
                                          +----------------+
                                                  \/
                                        (Tecido Subcutâneo)
```

### Componentes Internos e Externos
1. **Reservatório (Cartucho):** 
   - A maioria das bombas usa cartuchos proprietários que lembram seringas sem agulha. Eles precisam ser preenchidos retirando a insulina de frascos comuns. 
   - Alguns sistemas (ex: Roche Insight com PumpCart) usam cartuchos pré-preenchidos (Novorapid) de vidro, o que reduz o risco de bolhas de ar na montagem, mas limita o paciente a uma marca de insulina específica.

2. **Motor de Micropasso:**
   - O dispositivo que empurra o êmbolo. A tecnologia de "Stepper Motors" divide uma rotação física em milhares de micro-passos. 
   - Um motor avançado (Tandem ou Medtronic) consegue dividir 1 Unidade em até 40.000 incrementos, permitindo que taxas basais como 0.05 U/hora sejam infundidas de modo quase contínuo, sem grandes pausas.

3. **Tubo (Tubing) e Cateter:**
   - Em bombas tradicionais, o reservatório se conecta à cânula através do tubo flexível.
   - Tamanhos variam. 60 cm para uso em crianças ou na cintura, 110 cm para pessoas altas que colocam o infusor na perna e a bomba na cintura/bolso.
   - Este tubo comporta um volume "morto" de insulina. Se o tubo quebra, torce ou desconecta, a insulina não chega. O preenchimento do tubo vazio gasta cerca de 10 a 15 Unidades.

4. **Infusor (Cânula):**
   - É a ponte entre o tubo e o paciente. Inserido sob a pele através de um inseridor automático de mola que aplica uma agulha-guia, que então é removida, deixando a cânula flexível de Teflon para trás.
   - Pode ser reto (90 graus) ou inclinado (30 a 45 graus, excelente para pessoas magras ou muito musculosas sem panículo adiposo).
   - Tipos de material:
     - **Teflon:** Confortável, flexível. Porém, está vulnerável a dobraduras ("kinking") que silenciosamente bloqueiam a insulina sem que a bomba saiba.
     - **Aço (Steel):** É uma agulha verdadeira e muito fina. Não há agulha guia e não há kinking, proporcionando garantia absoluta de entrega. Tem de ser trocada com maior frequência (2 dias).

5. **Patch Pumps (Bombas Sem Tubo):**
   - A Omnipod é o exemplo principal. Todo o sistema — o reservatório, a bomba miniaturizada, o motor de liga de forma com memória (Nitinol), e o infusor — estão dentro de um "casulo" descartável colado à pele (O "Pod").
   - Vantagens: Ausência de tubos para prender em maçanetas. Discreto. Prova d'água de forma superior.
   - Desvantagens: Aumento do lixo eletrônico. O Pod inteiro é trocado a cada 3 dias (com baterias botão embutidas indo pro lixo).

---

## 3. Terapia Basal: O Fundamento

### O que é a Basal
Em um indivíduo sem diabetes, as ilhotas de Langerhans no pâncreas liberam insulina na veia porta de forma basal e contínua (1 pulso a cada 3 a 5 minutos, variando a quantidade 24 horas por dia) independentemente de o indivíduo comer ou não. A função primária dessa insulina basal é:
1. Inibir a glicogenólise (quebra do glicogênio) e a gliconeogênese (produção de glicose nova a partir de proteínas e gorduras) que ocorre no fígado em estado de jejum.
2. Permitir que o cérebro, músculos em repouso e coração consigam captar o combustível mínimo para manutenção basal (Turnover metabólico basal).

A bomba de insulina imita esse pâncreas, mas pelo caminho mais demorado (tecido subcutâneo -> capilares -> sistema venoso sistêmico). 

### Taxa Basal (U/hora)
Na bomba, a insulina basal é programada como um fluxo em **Unidades por Hora (U/h)**. 
A precisão de um perfil basal pode definir todo o sucesso do tratamento do paciente.

### Perfis Basais
O paciente pode configurar uma série de "degraus" ou "blocos de tempo". A maioria das bombas permite até 48 divisões de 30 minutos em um dia.

**Exemplo de Padrão Circadiano (Perfil de 24 horas):**
- **00:00 às 03:00 (Madrugada Inicial):** O paciente está dormindo profundamente. A necessidade de insulina costuma cair. Taxa programada: **0.5 U/h**.
- **03:00 às 08:00 (Fenômeno do Alvorecer):** O corpo inicia o preparo para acordar injetando Cortisol, Adrenalina e Hormônio do Crescimento. Isso causa severa resistência insulínica matinal. A taxa basal precisa subir. Taxa programada: **0.9 U/h**.
- **08:00 às 15:00 (Período Diurno/Manhã):** O paciente está ativo, trabalhando, as resistências estão médias. Taxa programada: **0.65 U/h**.
- **15:00 às 20:00 (Entardecer):** Alguns pacientes experimentam outro ligeiro aumento na resistência ("Somogyi reverso" ou simplesmente pico hormonal vespertino). Taxa programada: **0.75 U/h**.
- **20:00 às 24:00 (Noite):** Período de relaxamento antes do sono. Taxa programada: **0.6 U/h**.

O CSII possibilita ter **vários perfis independentes**. Por exemplo, um Perfil Basal chamado "Final de Semana" que ajusta os horários pois o paciente dorme até mais tarde. Outro perfil chamado "Menstruação" que aumenta todas as taxas em 20% para lidar com a resistência da progesterona.

### O Teste da Taxa Basal (Basal Rate Testing)
Como saber se o valor de "0.65 U/h" está certo? O paciente realiza um Teste de Basal ("Basal testing fasting").

**Passos do Teste de Basal de Período Parcial:**
1. **Escolha o segmento:** O teste será das 08:00 às 14:00 (para verificar a taxa da manhã).
2. **Requisitos Prévios:** O paciente acorda, sua glicemia deve estar estável e dentro da meta (ex: 90 a 130 mg/dL). O último bolus ativo (IOB) deve ter se esgotado completamente, ou seja, nenhum bolus nas últimas 4 horas. Nenhuma refeição rica em gordura tomada na noite anterior (para evitar atrasos gástricos). O paciente não fará exercícios físicos rigorosos nas 12 horas pré-teste.
3. **O Teste:** O paciente pula a refeição matinal (café da manhã) e não ingere calorias nem carboidratos, mantendo apenas hidratação em água.
4. **Coleta de Dados:** A glicemia capilar (ou CGM) é verificada e registrada rigorosamente a cada 1 a 2 horas, até as 14h.
5. **Critérios de Parada de Segurança:** Se a glicemia cair abaixo de 70 mg/dL, ou subir acima de 250 mg/dL, o teste falha, a situação é corrigida (ingerir carbo ou dar bolus de correção) e o teste é interrompido.
6. **Análise de Dados:**
   - **Flutuação Ideal:** A glicemia não deve variar mais que +/- 30 mg/dL do valor inicial ao longo de todo o período de 6 horas. (Ex: iniciou com 110 mg/dL, se manteve flutuando entre 95 e 125 mg/dL. A basal está PERFEITA).
   - **Tendência de Queda:** Se a glicemia iniciou em 120 e caiu de forma consistente para 75, a taxa basal no período anterior à queda está alta demais.
   - **Tendência de Alta:** Se iniciou em 100 e subiu para 180 (sem ingestão de comida, o fígado produziu sozinho e não houve insulina basal para brecar), a taxa basal está fraca.
7. **Regra de Retardo:** As correções na bomba de insulina nunca são feitas no exato horário da subida. Devido à farmacocinética da insulina rápida subcutânea, os ajustes (aumentos ou reduções) devem ser efetuados **1.5 a 2 horas antes** do horário onde o desvio ocorreu. (Exemplo: A glicose subiu ininterruptamente das 10h às 12h. O aumento na basal deve ser feito entre as 08h e 10h).

---

## 4. Basal Temporária (TBR) e Seu Uso Prático

A Taxa Basal Temporária (TBR - Temporary Basal Rate) é um dos recursos mais poderosos da bomba. Ela permite que a taxa de infusão subjacente seja substituída temporariamente para atender a uma condição metabólica atípica.

### Mecânica de Ajuste:
Pode ser ajustada usando:
- **TBR Percentual (%):** (A mais segura e usada). Você diz à bomba "Opere a 50% por 3 horas". A bomba calcula automaticamente o valor exato multiplicando a taxa do perfil atual por 0.5. Se houver uma troca de blocos de horário programados dentro daquelas 3 horas (ex: a taxa subiria de 0.8 para 1.0), o TBR% vai acompanhar a troca matematicamente em tempo real, fornecendo 0.4 e, após a troca, 0.5.
- **TBR Absoluto (U/h):** Você insere uma taxa arbitrária, como "Forçar 0.2 U/h por 3 horas". Esta taxa anulará todas as variações circadianas programadas e injetará exatamente esse valor absoluto, como uma linha reta, cega ao planejamento, até acabar.

### Cenários Clínicos para Basais Temporárias

**1. O Protocolo de Dias de Doença (Sick Day Rules):**
Infecções (virais, bacterianas, gripes) induzem a liberação de citocinas inflamatórias, cortisol e glucagon. Essa tempestade imune destrói a sensibilidade à insulina.
- O paciente inicia um TBR de 130% a 150% do momento em que percebe os calafrios (a resistência antecede a febre em até 12 horas).
- Se houver uso de corticoides (ex: Prednisona), um protocolo especial com TBR de 180% a 300% com duração pareada com a farmacocinética da droga (ex: 8 horas) será necessário.

**2. A Fisiologia do Exercício Físico:**
A bomba permite uma resposta ao exercício muito fina, mas requer planejamento prévio, diferente de um pâncreas real que desliga os pulsos endócrinos no segundo que a contração muscular começa.
- **Cardio Prolongado (Aeróbico):** Corridas, caminhadas. Os músculos recrutam transportadores GLUT-4 para a membrana sem necessitar de muita insulina. A glicose desaba rapidamente.
  - Ação: O paciente programa TBR 30% ou 50% **pelo menos 90 minutos antes** de iniciar. Isso é necessário para deixar a insulina já presente no subcutâneo se esgotar. Iniciar o TBR na hora do exercício muitas vezes resulta em hipoglicemia severa.
- **Treinamento de Força / Sprints (Anaeróbico):** Musculação pesada e sprints de alta intensidade ativam e ejetam quantidades massivas de glicogênio hepático induzidas por surtos de adrenalina. A glicemia não cai, pelo contrário, ela frequentemente dispara ("Pico de Glicemia de Treino").
  - Ação: Muitos pacientes com CSII necessitam programar uma Basal Temporária positiva (ex: 120% a 130%) logo após ou durante o exercício anaeróbico extremo, associada a micro-correções em bolus.
  
**3. Consumo de Álcool:**
O fígado foca a sua enzima álcool-desidrogenase para neutralizar as toxinas do álcool. Enquanto ele faz isso, a gliconeogênese (fabricação de açúcar em jejum do fígado) fica severamente comprometida ou "paralisada".
- Horas após o consumo alcoólico profundo, enquanto dorme, a hipoglicemia noturna perigosa torna-se o maior risco clínico (já que o glucagon não fará o fígado responder).
- O paciente pode programar um TBR preventivo de 70% ou 80% ao dormir, permitindo uma madrugada muito mais segura.

**4. Interrupção Total (Suspender):**
Muitas bombas permitem colocar TBR em 0% por 30 a 60 minutos como parte de um protocolo de resgate para tratar hipoglicemias sem consumir excessivos carboidratos de ação rápida, evitando assim os famosos picos de rebote posteriores.

---

## 5. Tipos de Bolus e Estratégias de Refeição

Uma das enormes vantagens do dispositivo é não forçar toda a insulina de refeição num único jato sob pressão para os capilares (o que pode saturar a taxa de absorção local, levando ao atraso e eventual hiper/hipoglicemia). 

### 5.1 O Bolus Normal / Standard (Normal Wave)
- **Execução:** O motor aciona e injeta o volume total (ex: 6 Unidades) o mais rápido possível (geralmente levando de 3 a 10 segundos, ou 1 a 2 minutos dependendo da força do motor da bomba).
- **Indicações Alimentares:** Tratar hiperglicemias em jejum (Correção). Consumo de carboidratos muito simples de altíssimo índice glicêmico (melancia, balas, refrigerante regular). Consumo de refeições majoritariamente de carboidratos não acompanhados por grandes quantidades de lipídios ou proteínas de difícil digestão (arroz branco sem carnes, purês).
- **Farmacocinética Padrão:** Insulinas análogas ultrarrápidas levam cerca de 15 minutos para iniciar a ação no sangue, com um pico dramático por volta dos 60-90 minutos e duração total variando de 3 a 5 horas no indivíduo (TIR - Time in Range).

### 5.2 O Bolus Estendido (Square Wave / Extended Bolus)
- **Execução:** Ao invés de um jato imenso de uma vez, o paciente programa, por exemplo, 6 Unidades para serem infundidas continuamente, de maneira gradual e linear, ao longo de um período definido que varia de 30 minutos a até 8 horas. 
- **Matemática da Infusão:** A bomba irá aumentar essencialmente o limite superior do teto da sua "Taxa Basal". Se o seu basal é 1 U/h, e você pede um bolus estendido de 6 U ao longo de 2 horas (ou seja, 3 U extras por hora). O motor passa a infundir ao ritmo de 4 U/h durante aquele período exato.
- **Indicações Fisiológicas:**
  - **Gastroparesia Diabética:** Indivíduos cujo nervo vago (neuropatia autônoma) atrasa o esvaziamento gástrico perigosamente. A comida consome de 2 a 4 horas apenas para atingir o intestino delgado e se converter em açúcar no sangue. Aplicar bolus normal resultaria em uma hipoglicemia severa aos 40 minutos e uma enorme hiperglicemia às 5 horas (quando a comida finaliza a digestão e o hormônio se foi).
  - **Uso Crônico de Inibidores GLP-1 (Ozempic/Semaglutida):** Esse tipo de medicamento também paralisa o esvaziamento do estômago quimicamente, frequentemente obrigando pacientes com DM1 e DM2 a usar extensos Bolus Estendidos para não desabar a glicose cedo.
  - **Refeições Prolongadas:** Festas de casamento, rodízios, "Brazillian Churrascarias", "Snacking", onde o paciente não come as calorias de uma só vez, mas belisca durante três ou quatro horas.

### 5.3 Bolus Combinado ou Duplo (Dual Wave / MultiWave)
O mais utilizado por pacientes com educação avançada na vida moderna e urbana. Ele divide o bolus. A bomba dispara uma "onda normal" imediata e retém o restante do volume em um formato de "onda estendida".
- **Por que dividir a onda? Fisiologia Gastrointestinal.**
  Quando um indivíduo ingere uma Pizza, três coisas metabólicas concorrem simultaneamente:
  1. A massa da pizza (farinha branca) é um carboidrato que tenta se absorver rapidamente em 40 minutos.
  2. O queijo e os óleos embutidos na pizza (Gordura/Lipídios) forçam o esfíncter pilórico a fechar e desaceleram mecanicamente a velocidade com que o carboidrato pode prosseguir, alongando essa absorção rápida e diluindo seu pico.
  3. A Gordura atinge o duodeno e dispara substâncias sistêmicas que causam resistência aguda à insulina nos tecidos periféricos horas após a digestão.
  4. As proteínas sofrem desaminação e iniciam lenta transformação e via gliconeogênica entre as 3 e 8 horas após a ingestão, despejando mais um volume novo de açúcar tardio.

  Se a bomba não dividisse as ondas, uma pizza acabaria em um grande desastre (Hipo inicial -> Efeito rebote -> Hiper extrema que não cede nem com correções basais pesadas).
  
- **Cálculos Avançados (Método Warsaw / Pankowska):**
  Como as bombas calculam as unidades de gordura? Através de FPU (Fat-Protein Units). 
  - **1 FPU** equivale a **100 kcal (quilocalorias)** provindas *exclusivamente* da contagem combinada de Proteína e Gordura do prato.
  - Na escola clássica, **1 FPU equivale a cerca de 10 gramas de carboidrato** na matemática da caneta. O paciente pega essa carga e adiciona ao que daria na pizza.
  - **O Split e o Tempo** dependem da quantidade exata de lipídios envolvidos:
    - 1 FPU: Tempo estendido de **3 horas**
    - 2 FPUs: Tempo estendido de **4 horas**
    - 3 FPUs: Tempo estendido de **5 horas**
    - >4 FPUs: Até 8 horas de extensão.

  **Exemplo Prático e Matemático de Bolus Duplo:**
  - Paciente com Relação Insulina/Carb (ICR) de **1:10**.
  - O jantar tem 80g de carboidratos, além de pesadas carnes e muito azeite, configurando 200 kcal de proteínas e gorduras (2 FPU).
  - Carboidrato normal daria 80 / 10 = **8 Unidades**.
  - 2 FPU convertidas em Carbos: 20 gramas de "falsos carboidratos atrasados", dando 20 / 10 = **2 Unidades**.
  - Dose total de ataque: 10 Unidades.
  - **Configuração na Bomba (Split MultiWave):**
    A onda rápida e inicial foca na absorção inicial retardada, pegando 60% ou 70% das 8 Unidades, além de cobrir o pico inicial do pão.
    O split final é configurado como: **6 Unidades (60%) em Onda Imediata** e **4 Unidades (40%) em Onda Estendida ao longo de 4 horas**. A paciente comerá a feijoada ou pizza, e a bomba cuidará da resistência de longo prazo.

### 5.4 Super Micro Bolus (SMB)
Isso não existe em modelos tradicionais manuais antigos, mas é o recurso principal que permitiu que pâncreas artificiais não dependessem de ação de perfis de TBR demorados.
SMB significa, que se o paciente esquecer de computar um lanche, o aplicativo (AAPS ou Control IQ) irá injetar, autonomamente e repetidamente, milhares de minúsculas frações de insulina, ex: **0.1 U a cada 3 a 5 minutos**, enquanto a curva da glicemia no sensor estiver indicando subida livre.
A velocidade com que esse microbolus baixa a glicemia é muito mais reativa do que apenas elevar a basal, protegendo da hiperglicemia sem queimar recursos gástricos. SMB tem limites severos de segurança no hardware, conhecidos como `max_iob` e `max_smb_amount`.

---

## 6. Alarmes, Falhas Mecânicas e Oclusões

Como CSII possui baterias de alta duração e não tem monitoramento ocular pelo paciente o tempo todo, ele deve ser ruidoso e claro sobre erros, pois o paciente está confiando a vida a ele.

### Estrutura de Alertas e Tons
Bombas operam com circuitos Piezoelétricos e motores vibratórios potentes (semelhantes aos de pagers clássicos). 
- **O Modo "Stealth":** Permite bips quase inaudíveis e vibração para uso escolar e reuniões. O software reverte ativamente este modo e dispara os alarmes sonoros estridentes em volume máximo forçadamente se algo crítico acontecer.
- **Tipos de Advertências:** 
  1. `Reservatório Baixo`: Toca às 20 e 10 unidades remanescentes. (Amarelo)
  2. `Bateria Baixa`: (Amarelo) Dá tempo hábil ao usuário.
  3. `Aviso de Excesso de IOB`: O paciente está calculando correções repetitivas no assistente, e o cálculo percebeu que isso culminará em níveis mortais. (Amarelo)
- **Tipos de Alarmes (CRÍTICOS - Parada de Infusão - Cor Vermelha, Sirene, Vibração Contínua):**
  1. `Motor Error` (Erro Elétrico ou de Memória no chip, ex: "Erro E-11, A-33"). A bomba se rebota e desliga permanentemente.
  2. `Bateria Vazia` (Sem energia suficiente para o motor de passo rodar sem queimar ou travar).
  3. `Oclusão (Occlusion / No Delivery)`. O principal, mais falado e mais perigoso evento adverso do mundo de CSII.

### A Anatomia e Perigo das Oclusões
"Oclusão" significa que a via mecânica que drena do reservatório de vidro/plástico até os minúsculos vasos na derme falhou e entupiu.
- **Quais são os culpados típicos?**
  - **Dobradura (Kinking) de Cânula de Teflon:** Inserida próxima ao cinto, ao agachar ou curvar-se intensamente, a ponta invisível do Teflon sob a pele amassa, forma um "L" apertado, e corta a água.
  - **Cristalização da Insulina:** A insulina é extremamente delicada termicamente. Tubos ao sol de verão (praia) em tubos aquecem até 40º e desativam as aminas de estabilização do líquido, formando gomas opacas ou micro-cristais nas paredes internas do cateter, bloqueando a luz microfluídica.
  - **Trauma do Sítio:** Inserida em um capilar sangrante. O sangue da cicatrização coagula sobre o topo da agulha de Teflon. A insulina não consegue romper o trombo maciço.
  - **O Erro do Êmbolo:** Má vedação durante o enchimento.

### O Calcanhar de Aquiles: O Sensor de Força (Threshold)
O paciente ouuve e pensa: "Maravilha, a bomba tem um alarme. Serei notificado imediatamente". Falso. E esse é o grande perigo discutido nos relatórios de adversidade do FDA.
- A bomba não enxerga a insulina. O motor não sabe se está injetando insulina em ar ou carne. 
- O único modo de a bomba detectar uma obstrução é através do estresse físico induzido sobre o "pistão". É pura hidráulica. Se a saída do tubo estiver bloqueada (oclusa), conforme o motor continuar a empurrar a insulina pra frente, a pressão interna do reservatório crescerá. 
- O motor elétrico irá encontrar enorme resistência, sentida por consumo de energia elétrica extra ou encoders e transdutores de pressão instalados atrás do êmbolo. A bomba tocará o alarme apenas quando atingir o **Threshold de Oclusão (Força Máxima tolerada)**.
- **O Problema Mortífero:** A insulina é aquosa, mas o próprio tubo de cloreto de polivinila (PVC) se expande ligeiramente para absorver pressões parciais, agindo como um elástico amortecedor. Com basais pequenas como 0.5 U/h em crianças, o entupimento do tubo demora de **6 a 15 horas seguidas de empurrões inúteis** até que a pressão se torne forte o bastante nas paredes para disparar a Sirene Eletrônica da Bomba. Por 12 horas não houve insulina. A criança entra em cetoacidose.
- **A Solução e Monitoramento Prático:** O paciente **nunca** deve aguardar passivamente pelo alarme de oclusão. Ao presenciar picos altíssimos e insuspeitos de glicose de 300+ mg/dL (injustificáveis pela dieta), o protocolo determina checar corpos cetônicos (tiras de urina) ou cetonas séricas, aplicar insulina imediatamente com MDI via caneta e desatar os cabos, providenciando uma troca total de cateter em menos de duas horas.

### Bolhas de Ar no Tubo e Reservatório (Air Bubbles)
Uma bolha de apenas 1 centímetro contida na luz minúscula de um tubo de cânula pode equivaler, volumétricamente, a até 0.5 a 1 Unidade de insulina "fantasma". Quando essa bolha avança e sai na derme, o motor de passo registrou as unidades, mas entregou nada além de gás (nitrogênio e oxigênio dissolvidos). Isso destrói o teste de basal rigoroso. Técnicas assépticas exaustivas e "bater e purgar" nos cartuchos devem ser empregadas ao se trocar o cateter, retirando todo o oxigênio.
Algumas bombas requerem um processo específico chamado de *Fill Tubing* e *Fill Cannula* que injeta 0.5U maciças no local recém ferido do micro-infusor para remover a última bolha microscópica contida no conector estéril.

---

## 7. Bombas Disponíveis no Brasil: Análise Técnica

Uma radiografia extensa da tecnologia registrada pela ANVISA e comercializada ou obtida legalmente pela importação no território brasileiro.

| Modelo / Fabricante | Especificações Técnicas de Hardware | Recursos Notáveis e Integração | Opções de Automação de Loop (DIY & Comercial) |
| :--- | :--- | :--- | :--- |
| **1. MiniMed 780G** (Medtronic, EUA) | Bolus Min: 0.025 U.<br>Basal Min: 0.025 U/h.<br>48 Perfis basais de 30m.<br>Tubing: Reservatórios proprietários de 3.0mL Luer-Lock proprietário da marca e Infusion Sets MiniMed. Tela colorida e motorização selada reforçada. | Bluetooth total de baixa energia nativo (B.L.E.). Sincroniza em tempo real com aplicativo do smartphone para visualizar e pareia perfeitamente de modo ultra-criptografado e irreversível com o sistema CGM **Guardian 4** de longa duração que dispensa ponta de dedo. | **HCL Nativo Fechado (Algoritmo SmartGuard Avançado)**<br>Totalmente imune e bloqueado de ferramentas de hackers DIY (Loop/AAPS). Usa seu próprio cérebro interno proprietário PID e Modelo Preditivo para emitir auto-correções agressivas (Microbolus Autônomo) mirando 100mg/dL. É a bomba carro chefe para venda local via planos de saúde judiciais devido ao ótimo e constante suporte da gigante médica. |
| **2. MiniMed 670G** (Medtronic, EUA) | Bolus Min: 0.025 U.<br>Basal Min: 0.025 U/h.<br>Aparência idêntica a 780G, mas geração e placa mãe antigas.  | Não possui Bluetooth nativo com o smartphone; a conexão depende de Contour Next Link Meters ou dongles carelink difíceis de portar e manter online. Comunica-se no formato legado por radiofrequência criptografada. Usa Guardian 3, CGM muito conhecido por falhas extremas e demandas implacáveis de calibrações sanguíneas. | **HCL Nativo Fechado (SmartGuard Antigo)**<br>Muito criticada mundialmente pelos pacientes devido à "Exaustão de Alarmes" incessante durante as madrugadas solicitando pontas de dedo e o "Modo Automático" suspendendo a todo minuto, a ponto de muitos abandonarem o uso fechado e usarem só em manual. Não conectável com comunidades Open Source. |
| **3. Omnipod DASH** (Insulet, EUA) | Bolus Min: 0.05 U.<br>Basal Min: 0.05 U/h.<br>Patch Pump sem tubo, descartável a cada 72 horas inteiramente. Fica ligada ao corpo com adesivos médicos fortes, carrega apenas 200U de insulina. | Revolução Bluetooth (B.L.E.). A comunicação entre o cérebro/controlador oficial (PDM - Personal Diabetes Manager bloqueado num Android) e as pequenas pods de nitinol presas na pele do paciente ocorrem abertamente sem criptografia restrita de chaves fechadas após a ligação inicial BLE. | **Hacker's Paradise (Pilar do DIY AAPS)**<br>Não possui HCL comercial nela mesma. Mas a comunidade open-source conseguiu engenharia reversa do protocolo DASH Bluetooth, permitindo que qualquer paciente ligue seu **AndroidAPS** e comande uma DASH, que tem custo de hardware incrivelmente baixo de importação, construindo um dos mais espetaculares pâncreas artificiais do globo sem fio, rodando o cérebro do Oref1/OpenAPS com CGM. |
| **4. Omnipod 5** (Insulet, EUA) | Bolus Min: 0.05 U.<br>Basal Min: 0.05 U/h.<br>Também é um Pod sem tubo, esteticamente e fisicamente quase idêntico ao modelo DASH, pesando cerca de 25 gramas cheia na pele. | Integração Nativa Comercial com Dexcom G6 e (em atualizações novas) Libre 2 Plus, através da comunicação cruzada direta do Pod. Ou seja, se você esquecer seu telefone em casa ou sair para surfar longe do sinal, o sensor nas suas costas "fala" diretamente com a bomba nas suas costas ignorando o ambiente externo, usando a placa embutida. | **HCL Nativo Comercial Fechado (Sistema 5)**<br>O algoritmo de controle em malha rodou totalmente dentro da placa do Pod (On-Body Algorithm). Metas fixadas comercialmente e limites de segurança moderados. Totalmente lacrada contra interferência das redes de desenvolvedores e não pode ser ligada a sistemas Open-Source. Muito cara para obter via importação contínua. |
| **5. t:slim X2** (Tandem, EUA) | Bolus Min: **0.01 U** (Excelente).<br>Basal Min: **0.001 U/h** (Líder em precisão micro).<br>Corpo em carcaça ultra fina em liga leve estilo Apple, bateria recarregável via micro-USB/USB-C por powerbanks em vôos. | Ecrã e menu de tela inteiramente gráfica e touch, semelhante ao sistema visual colorido de smartphones. Usa bolsa plástica flexível descartável interna no lugar de uma seringa rígida luer lock para guardar a insulina sem absorção térmica grave. Integra excelentemente bem com sensores via pareamento de Bluetooth com app t:connect móvel que sobe o dado. | **HCL Nativo Comercial (Control-IQ)**<br>Uma das melhores integrações aprovadas pelo FDA, e com venda oficial e distribuição no Brasil recente. Conectividade direta de Dexcom G6 na bomba, algoritmo ajusta basais para cima ou suspende dependendo da previsão. Emite autodosagens para compensar refeições perdidas com microbolus (se detecta uma elevação de IOB insuficiente). O software é atualizável, logo o usuário com o produto nunca fica com sistema velho ou obsoleto sem ter que comprar o motor inteiro novo. |
| **6. mylife YpsoPump** (Ypsomed, Suíça) | Bolus Min: 0.1 U.<br>Basal Min: 0.01 U/h.<br>Cartuchos flexíveis preenchíveis, e incrivelmente menor e mais leve dispositivo de tubo no mercado (83g totais incluíndo bateria AA e refil). | Tela OLED touch blindada de alta resistência a água. A interface é unicamente feita em "Ícones cegos" que evitam problemas de tradução ou jargões. Tubing orbita a 360 graus na cabeça da agulha para se acomodar às roupas sob tensão física. Conecta-se com Dexcom G6 oficialmente no aplicativo deles, e integra com mylife Cloud. | **O Sistema Mais Flexível do Mercado (CamAPS ou AAPS)**<br>Diferente de grandes farmacêuticas, Ypsomed liberou total controle aberto. Oferece nativamente HCL avançado ao ceder algoritmos fechados de pesquisadores terceirizados no celular (Ex: **CamAPS FX**, extremamente forte e adaptativo para crianças da universidade Cambridge). E oficialmente possui parcerias na Alemanha para permitir comandos das comunidades ativistas de **AndroidAPS** e usar o Loop não oficial perfeitamente via protocolo autorizado sem hacks de chaveiros. |
| **7. Dana-i / Dana-RS** (Sooil, Coreia do Sul) | Bolus Min: 0.05 U.<br>Basal Min: 0.01 U/h.<br>Extremamente robustas, rústicas e conhecidas por uso massivo na Ásia e Europa em baterias padrões que são encontradas em qualquer quiosque (AAA standard). | Possuem display simples em LCD e botões plásticos mecânicos robustos. O pareamento por Bluetooth B.L.E. da Dana-i, que sucedeu a Dana-RS, tem a melhor antena e consumo em segundo plano sem matar baterias entre outros competidores de sua geração. Tubing é feito de conectores Luer tradicionais, o que permite enorme liberdade de escolha nos insumos de inserção sem ser refém de marcas. | **Hacker's Paradise (Pilar do DIY AAPS)**<br>A pioneira do Closed Loop. A fabricante Sooil, num movimento sem precedentes, lançou a bomba Dana-RS (e sua sucessora i) construída **especialmente** em conjunto com os engenheiros de dados de comunidade e desenvolvedores alemães, não aplicando criptografias anti-paciente nas portas de Bluetooth do equipamento. Graças a isso, é tida pelos nerds e engenheiros de ponta de Diabetes como a "Bomba Real do Loop". Quase todos usam com o AndroidAPS customizando curvas e enviando toneladas de microbolus agressivos que seriam reprovados nas travas do FDA em outras plataformas. |
| **8. Accu-Chek Insight** (Roche) | Bolus Min: 0.05 U.<br>Basal Min: 0.01 U/h. | Aceitava refis de vidro injetáveis pré-fabricados com insulina (PumpCart) reduzindo 80% o esforço do uso da agulha no treinamento. Interface touch, e comunicava via Bluetooth a um controle remoto volumoso mas confiável da própria marca com tela colorida LCD. | **Loop Parcial DIY via AAPS**<br>Foi amplamente explorada na Alemanha e na Áustria nos primórdios do AndroidAPS. Contudo, as bombas pararam de ser fabricadas massivamente devido à troca estratégica de parcerias entre Roche e Diabeloop em alguns mercados europeus, que agora apostam em patch pumps Solo, tornando-a descontinuada nas plataformas de fóruns DIY mais novos. |
| **9. Omnipod EROS (System 4)** (Insulet) | Bolus Min: 0.05 U.<br>Basal Min: 0.05 U/h. | A primeira iteração moderna, muito mais barata hoje nos canais secundários de seguros (aprox. 25 a 30 dólares cada caixa). Trabalha sob RF pura (Rádio) ao invés do moderno Bluetooth emparelhado. O PDM original controlando tudo se assemelha a um gigantesco aparelho de testes de sangue arcaico da Abbott Freestyle modificado por fora. | **Legado Clássico do Loop (Loop/iAPS)**<br>A EROS nunca falou Bluetooth, então os pacientes não conseguiam ligar com celulares Android/iPhone diretamente. A genialidade da engenharia da comunidade criou o projeto **RileyLink** (e depois OrangeLink e EmaLink): pequenas plaquinhas e PCBs, programadas para atuar como ponteiros. O iPhone joga o cálculo Bluetooth pra plaquinha que fica no bolso, a plaquinha traduz de Bluetooth para RF em 433 MHz, e atira nas antenas sem proteção militar da Eros. Era o pâncreas sem tubo que reinava absoluto até 2020. |

---

## 8. Sistemas de Alça Fechada (Closed Loop)

O Pâncreas Artificial não é, infelizmente ainda, orgânico. Trata-se da automação matemática da terapia (AID - Automated Insulin Delivery).

### Níveis de Automação do Controle (A Escalada da Matemática)
A evolução da automação é classificada da mesma forma que os carros de auto-condução de sistemas, da dependência manual total para a independência absoluta.
1. **Nível 0: Alça Aberta (Open Loop) - Controle Manual** 
   - A bomba faz exclusivamente aquilo que o médico programou naquele slot horário basal. Mesmo que os gráficos do CGM mostrem a glicemia caindo livremente rumo a um coma (abaixo de 40 mg/dL), a bomba segue despejando seu perfil cego fixo da manhã a 1.2 U/h, porque não há hardware unindo o cérebro do CGM à placa motora. Toda inteligência deve residir no paciente.
2. **Nível 1: Suspensão na Baixa (LGS / PLGM / Basal-IQ)**
   - Um limiar inicial de malha fechada. O sensor e a bomba estabelecem um link. O algoritmo (que pode rodar num microchip minúsculo) faz apenas uma tarefa: lê e projeta as declividades. Quando detecta que o sensor em 20 ou 30 minutos tocará os perigosos 60 ou 70 mg/dL, o comando interno da malha aciona a parada de infusão por 60 minutos ou até que o valor retorne para uma faixa alta (Suspensão Preditiva de Baixa Glicose). Salva o indivíduo da morte no sono, mas não o previne de picos e HBA1C descontrolado acima de 250 mg/dL por erros de contagem.
3. **Nível 2: Alça Fechada Híbrida (HCL - Hybrid Closed Loop)**
   - O padrão ouro tecnológico dos anos 2020. O termo "Híbrido" significa que a malha não dá conta de todas as dinâmicas humanas (como estresse instantâneo extremo ou o desafio de velocidade da absorção dos carboidratos de ação maciça como um sorvete e xarope de milho). 
   - O sistema altera as basais e joga micro doses ao prever a alta e paralisa totalmente ao prever a baixa. Mas para refeições de alta energia (carboidratos pesados de índice alto), as farmacocinéticas não acompanham a alta instantânea do trato gastrointestinal; portanto, exige que o usuário ainda realize Contagem e envie manualmente os Bolus de Refeição antecipados em 20 minutos (Pré-bolus). O software limpa as rebarbas de erro nas extremidades. Se o paciente não enviar bolus para uma pizza, a glicemia pode subir além dos limites e o sistema ficar inútil sob os tetos de segurança de IOB (Insulin on Board Maximo).
4. **Nível 3 e Nível 4: Alça Fechada Total (Full Closed Loop - Bionic Pancreas)**
   - O cálice sagrado (Santo Graal) do tratamento de DM1. Algoritmos que dispensariam os "Bolus Announcers" e contagem. Modelos como o iLet Bionic Pancreas (Apenas EUA) que injetam insulina e glucagon simultaneamente já atuam quase nessa fronteira. Outra fronteira são os insanos desenvolvimentos open-source com sistemas Unannounced Meals e U.A.M que usam curvas matemáticas para inferir o tamanho de uma refeição apenas ao analisar a aceleração de subida livre na veia nos primeiros dez minutos e bater um enorme bolus não-avisado que cobre a falha perfeitamente.

### A Divisão dos Sistemas Fechados (Comercial vs Open-Source)
- **Sistemas Comerciais e Aprovados por Governos (FDA / ANVISA):** 
  Estes envolvem enormes estudos clínicos robustos de duplo-cego randomizados. São dispositivos lentos no desenvolvimento de inovação devido ao peso de regras de seguros civis pesados e burocracia de classe III de segurança da saúde (Medtronic 780G, Tandem Control-IQ, O5). 
  A grande falha crônica das automações comerciais é que sua fundação, guiada por médicos e conselhos governamentais de segurança, é focada na "Fobia de Hipoglicemia e Mitigação de Danos Judiciais". Seus alvos ideais giram sempre conservadores em 110mg/dL ou 120mg/dL, muitas vezes recusando microbolus pesados por temer ações acidentais e tolerando que as oscilações post-prandiais saltem e fiquem confortáveis por volta dos 170mg/dL sem muita intervenção drástica para proteger os riscos corporativos.
- **Sistemas DIY Open-Source (#WeAreNotWaiting):** 
  Uma formidável comunidade não-lucrativa global iniciada por ativistas (como Dana Lewis) cansados da lerdeza de empresas. O **Loop** (no ecossistema iOS e Apple) e o formidável **AndroidAPS** (No ecossistema Google), além do sistema pai **OpenAPS** (que começou com pequenos mini-computadores Raspberry Pi e Edison intel no bolso).
  Nesse ecossistema não existe limitação burocrática, pois "Não Há Empresa nem Certificação Governamental". O paciente assume 100% dos riscos por trás de contratos morais da licença e foca no limite do que os tecidos suportam matematicamente. O alvo ideal de AAPS para muitas pessoas perfeitamente configuradas pode ser agressivos 85mg/dL ou 90mg/dL (Metas típicas de pessoas perfeitamente saudáveis normais). O sistema injeta Microbolus extremamente perigosos e autônomos por SMB, corrigindo dinâmicas de 3 em 3 minutos e prevendo picos de carboidrato não avisados com velocidade e poder superior a 90% dos algoritmos engessados que se acham em hospitais hoje em dia. É considerado tecnologia de guerrilha biomédica e a fundação do pâncreas do futuro, exigindo profunda capacidade de configurar GitHubs e compilar seus próprios APks por motivos legais.

```ascii
      +-------------------------------------------------------------------------------------------------+
      | Arquitetura Lógica Completa de um Sistema de HCL Open-Source em Loop (Como o AndroidAPS)      |
      +-------------------------------------------------------------------------------------------------+
      
           [Derme Subcutânea]                             [Corpo - Rede Neural de Cálculo]  
                                                                                     
           +---------------+                              +-------------------------------------------+ 
  Lê    ==>| Sensor CGM    |==> Sinais Bluetooth BLE ==>  | SMARTPHONE / ANDROID / IOS                 | 
 Dados     | (Dexcom / G6 /|     (ISIG brutos ou        |                                             | 
           |  Libre 2 )    |      Dados de Glicose)       |  +--------------------+                   | 
           +---------------+                              |  |    ALGORITMO      |                   |
                                                          |  |   (Ex: Oref1)     | <------\          | 
                                                          |  |                   |        |           |
                                                          |  | 1. Modela o       |        |           |
           +---------------+                              |  | Carb On Board     |        | Parâmetros| 
 Injeta <==| Bomba de      | <== Comandos Bluetooth  <==  |  |    (COB)          |        | De Perfil |
 Físico    | Insulina      |     e Configurações          |  | 2. Modela o       |        | (ISF, ICR,|
           | (Dana-i / DASH|     de Microbolus/SMB        |  | Insulin On Board  |        |  Basais)  |
           |  / Ypsopump)  |                              |  |    (IOB e DI)     |        |           |
           +---------------+                              |  | 3. Prevê curva    |        |           | 
                                                          |  |    futura de 3h   | -------/          |
                                                          |  +--------------------+                   |
                                                          +-------------------------------------------+
                                                                             || (Upload via WiFi / 4G)
                                                                             \/
                                                              +-------------------------------------------+ 
                                                              |  Servidor Nightscout (Nuvem MongoDB / API)| 
                                                              |  (Registra todas as ações para médicos)   | 
                                                              +-------------------------------------------+ 
```

---

## 9. Cuidados com o Infusor e Saúde da Pele

A eficácia tecnológica do motor e do software depende inteiramente de uma variável humana e biológica simples: a membrana na ponta da cânula plástica e a reação macrofágica sub-dérmica do organismo. Se o sítio subcutâneo capilar for corrompido, a eficácia do tratamento via CSII falha e se torna pior e menos confiável que os simples perfis estáticos das seringas manuais.

### Rotação Estratégica de Sítios (Site Rotation)
O ato de rodar infusores (mudar as posições da cânula a cada inserção nova) não é uma opção estética; é uma obrigatoriedade da física fluídica médica.
- **Locais mais recomendados e de absorção veloz:** A área ao redor do umbigo em um raio de até 15 cm distantes, deixando um círculo central "livre" (O umbigo possui camadas conectivas fibrosas profundas que retardam o trânsito da insulina para os capilares sistêmicos e sofrem mais movimento mecânico torcendo agulhas). Flancos e área posterior inferior das costas (Músculos do bumbum superior e gordura acima das cintas) são vastamente usados em crianças.
- **Locais de absorção lentificada e média:** Coxas Laterais Exteriores e posterior dos braços (tríceps inferior). Usados vastamente em patch pumps sem tubo, pois há muita gordura de acúmulo estável e poucos choques, mas a farmacocinética da absorção da mesma 1 Unidade na coxa demorará cerca de 25% a mais do tempo do que a mesma unidade absorvida na barriga de modo abdominal, devido à natureza mais fria e escassa da vascularização do membro comparado ao centro do corpo.
- **Técnicas Formais de Rotação (W/M):** Os educadores instruem a mover em letras pequenas como a inicial de um "W". Cada "perninha" da letra será o espaço do novo ponto distando pelo menos 3 cm rigorosamente da punção velha. Para garantir que as feridas dos canais das cânulas do ponto inicial estejam totalmente cicatrizadas de fibrina pelo tecido macrofágico e prontas para receber outro fluxo contínuo.

### O Custo do Prazo Estourado (Duração de Cânula)
- **Teflon e Poliuretano Flexível (Cânulas regulares tipo Mio / Inset):** Limite formal ditado pelo FDA e ANVISA é de **3 Dias (72 Horas Máximas)**. O que ocorre aos corpos na 73ª hora? Resposta Imune em Corpo Estranho. O organismo, exausto de hospedar o canal artificial e detectar a entrada do material plástico que não o pertence, joga pesadas camadas maciças de defesa de fibrina e glóbulos em volta do capilar da ponta do plástico flexível. É chamado de Formação de Cápsula Fibrosa. A absorção passa de fluida a um bloqueio, resultando não numa oclusão detectável e ruidosa, mas na temida **absorção lenta e errática**. A insulina demora 2 horas adicionais para cair no sangue.
- **Aço de Linha (Steel / TruSteel / SureT):** O aço de agulhas microscópicas da bomba, diferente do plástico mole, não engatilha as mesmas vias moleculares massivas de inflamação. No entanto, por ser perfeitamente rígido, ele traumatiza microscopicamente e rasga continuamente milímetros de tecido sempre que o paciente anda, corre ou vira. O tempo máximo de resgate é curto: **2 Dias (48 Horas)**. É infalível (nunca amassa), mas dolorido e perigoso para uso longo.
- **Novas Fronteiras e Patentes:** A indústria das bombas avançadas (como Medtronic e subsidiárias Unomedical) já testa os "Extended Wear Infusion Sets" durando até **7 Dias**. Usam polímeros novos ultrassofisticados (Parys) e tubos capilares finíssimos com dispersadores anti-fibrina que quebram e confundem as proteínas inflamatórias, permitindo semanas do mesmo sítio.

### A Doença do Usuário de Bomba: A Lipohipertrofia
Uma consequência aterradora para aqueles pacientes que, por comodismo mental, utilizam a barriga, e sempre a mesma área exata da barriga direita onde há menos dor à mão e mais conforto pra colocar.
- A "Lipo" ou Lipohipertrofia Diabética (doença cutânea anabólica causada pelos picos isolados repetitivos da substância e não um simples cisto) ocorre pois a Insulina regular é, em essência hormonal e bioquímica, um hormônio **Anabólico Potente** (Ela incentiva a célula a guardar energia e inchar o tecido adiposo criando volume local irreal de gordura morta e cicatriz). 
- **O Problema Sistêmico das Lipos:** As áreas ficam duras como pneus grossos invisíveis de nódulos ou calombos e ficam quase mortas (com baixíssima rede de fluxo sanguíneo e capilar para trocar oxigênio/glicose). 
- Injetar o volume do bolus dentro deste nódulo denso faz a bomba pensar que entregou, mas todo o líquido, a 30 U de feijoada ficam "presos num lago" isolado do sistema circulatório do corpo. O paciente relatará Hiperglicemias Inquebráveis e persistentes de 400 mg/dL por mais que dê basais em bomba, e, surpreendentemente, dez horas mais tarde, enquanto dorme e esse lago escorre aos poucos aleatoriamente, sofre um desabamento misterioso e massivo perigosamente em uma hipoglicemia fulminante sem sentido aparente à tarde.

---

## 10. Integração com Sistemas e APIs (Nightscout, AAPS)

Esta seção é de extremo interesse aos engenheiros, desenvolvedores das comunidades abertas, criadores de plataformas analíticas preditivas das startups médicas e à robótica biomédica.

### Redes de Comunicação do Corpo
A telemetria da terapia intensiva diabética evoluiu para um IoT Medical Device (Internet das Coisas Médicas).
- As bombas de insulina operavam inicialmente usando frequências abertas, como a clássica Medtronic 522/722 que disparava via rádio de **868MHz (EU) / 915MHz (US)** (que deu origem a enormes escândalos de hacking no evento Black Hat Security onde e era possível enviar uma dosagem letal no saguão de um aeroporto a alvos desconhecidos). Outra famosa usava **433MHz (Omnipod Eros)**. Nenhuma detinha protocolos pesados de handshake de segurança.
- Os modelos recentes (Ypsopump, DASH, t:slim) migraram forçadamente e de modo ditado por diretrizes FDA de Cibersegurança em Saúde em 2018 para o **BLE (Bluetooth 4.x / 5.0 Low Energy)**. Pareamentos requerem tokens chaves no momento da configuração cruzada em senhas, rolando vetores temporários (rolling code pins) com criptografia AES-128 em todos os "Payloads" da camada e impedem, por via direta, invasões de espelhos maliciosos ou spoofing não autorizados.

### Middleware API de Extração (O ecossistema Cloud "Nightscout")
Como um motor de software superior (Como Amanda Bot V4 ou Dashboards clínicos de médicos) pode puxar, auditar e calcular o que está acontecendo fisicamente dentro dos vasos e no motor de bomba sem o hardware do telefone do paciente na mesa da clínica? Utiliza-se um HUB centralizador open source: o **Project Nightscout**.
O Nightscout é um servidor Node.JS clássico persistido numa cloud baseada em MongoDB Atlas hospedada em serviços de terceiros como Heroku ou Azure/Railway. Ele expõe endpoints RESTful robustos protegidos por JWT.
O smartphone do usuário que está controlando o AAPS/Loop recolhe a telemetria do motor mecânico de Bluetooth em tempo hábil e envia, via pacotes HTTPS ou Sockets para o MongoDB hospedado em Nightscout.

- **Principais Rotas da API e Casos de Uso:**
  1. `GET /api/v1/entries.json`: Coleta todos os números brutos SGV (Sensor Glucose Value) do intersticial da pele enviados de modo assíncrono para reconstruir o gráfico em outras frentes (Sistemas de Predição de AI, ou a tela dos pais preocupados).
  2. `GET /api/v1/treatments.json`: Todos os eventos matemáticos da bomba, as alterações da malha e alimentação do paciente. A chave e coração da inteligência. Ex: Registros contendo `"eventType": "Meal Bolus"`, `"insulin": 4.5`, `"carbs": 45`, `"created_at": "2024..."`. Ou registros automáticos marcados em fundo informando `"eventType": "Temp Basal"`, `"duration": 30`, `"percent": 150`.
  3. `GET /api/v1/devicestatus.json`: Entrega as métricas de diagnóstico das peças mecânicas do micro motor. Contém `"pump.battery.percent"`, e a essencial leitura de diagnóstico `"pump.reservoir"` para gerar alertas precoces de desabastecimento a longas distâncias (Pais trabalhando) ou monitorar o estado complexo de variáveis do OREF0 matemático como o `"loop.iob.iob"` ou `"loop.cob.cob"`. 

### Comandos Avançados via Disparos Sistêmicos (AAPS/Loop via Broadcast Intents ou APIs Locais RESTful limitadas)
Os desenvolvedores e ativistas usam Intents do Sistema Operacional (Broadcasts Locais limitados em Android e iPhones com segurança baseada na assinatura) para atuar nas interfaces das bombas que são de terceiros. Acessos são negados na ausência de pacotes confiáveis (Trust Apps).
- `get_status(force)`: Força o rádio BLE a acordar o módulo BLE e coletar um poll na bateria interna da bomba realocada no motor.
- `get_iob()`: Extrai a matriz da área embaixo da curva das meia-vidas residuais de insulina e devolve a equação (e não só números finais) do componente de Insulin On Board e degradações da droga infundida pela microcânula (DIA - Duration of Insulin Action e Peak)
- `set_temp_basal(rate_u_hr, duration_mins)`: Engatilha o protocolo de comandos e ativa as assinaturas matemáticas na bomba do motor físico, comandando a redução imediata. O algoritmo verifica na máquina se a requisição não ofende os Tectos (Max Basal Allow) definidos no Setup Médico (Para que um erro na cloud não envie uma overdose mortífera).
- `set_bolus(units_amount, auth_challenge)`: O comando supremo, frequentemente banido de APIs abertas ou requerimento forte de autenticações locais profundas via biometria visual (FaceID, Fingerprint), pois despacha um fluxo irrevogável para a porta micro motor da bomba em alta voltagem no motor de passos disparando doses puras da droga hipoglicemiante ultra veloz, passível de ação criminosa acidental (Dose excessiva).

### O Papel Futuro das IAs e Dashboards Profundos (Ex: A "Amanda Bot V4")
O objetivo dos super painéis clínicos de Engenharia de Dados modernos e AIs (Como o ecossistema arquitetado V4.0 e as IAs que supervisionam) não é **escrever dados**, não é aplicar comandos que infrinjam a segurança, mas **funcionar passivamente no modo Leitura Auditing de Regras (Read-Only Data Aggregation)**.
- O Bot suga os `treatments.json` do paciente das últimas 72 horas e o `profile.json` (os dados básicos que regem a fisiologia da absorção para a matemática do motor, ISF, ICR, DIA, Basais), analisando a conformidade aos preceitos da Sociedade de Endocrinologia Brasileira e à Literatura Global da ISPAD e Pediátrica.
- Inteligência Avançada (IA e Raciocínio Baseado em Árvores de Decisão/MCMC): Ele procura, com microscópio de processamento algorítmico e matemática difusa, discrepâncias fatais ("O usuário iniciou bolus massivos regulares em MultiWaves com o split extremamente focado em upfront, causando um acionamento do LGS do AAPS às 2 da manhã que quase estourou os limiares de segurança para hipoglicemias"). 
- Ao final, sugere as otimizações, que, se aprovadas pelo Endocrinologista que examina a evidência extraída, re-configuram a mecânica para melhor desfecho em Variações.

---

## 11. Glossário de Termos CSII

- **ISF (Insulin Sensitivity Factor / Fator de Sensibilidade):** Quantos mg/dL (miligramas por decilitro) 1 Unidade de insulina é capaz de baixar e purgar ativamente do sangue do paciente em seu ciclo inteiro na corrente (usado nas correções de altas na bomba).
- **ICR (Insulin to Carbohydrate Ratio / Relação Insulina-Carboidrato):** O preço de imposto insulínico pago para processar a glicose do prato (1 Unidade cobre e aniquila X gramas de carboidratos, geralmente na faixa entre 1:5 e 1:20 no indivíduo).
- **IOB (Insulin on Board / Insulina Ativa e Circulante):** Uma modelagem preditiva e não uma medida sanguínea baseada em hardware. Ela reflete a quantidade de todas as unidades dosadas nas últimas 4-6 horas subtraindo os gráficos logarítmicos e os modelos farmacológicos da meia vida da insulina usada, dizendo quantas unidades ativas restam para não gerar acúmulo desastroso de empilhamento ("Insulin Stacking").
- **TIR (Time in Range / Tempo no Alvo):** A nova e suprema métrica adotada e idolatrada pelas entidades que substitui de modo avassalador e dominante a falha "HBA1C" no diagnóstico avançado em uso contínuo de CSII. Mostra em porcentagem global o quão longos (ex: 80% do dia) o pâncreas mecânico manteve o indivíduo estável num gráfico plano com desvio apertado entre os trilhos estipulados de 70 a 180 mg/dL sem bater nos tetos e fundos da montanha russa perigosa da glicose.
- **DIA (Duration of Insulin Action / Duração Fisiológica da Ação da Droga Insulina):** A constante biológica inserida nas preferências básicas do paciente no chip. Quanto tempo a vida dessa marca da insulina (Novorapid, Fiasp, Humalog) estaria efetivamente atuante e esvaziando o açúcar ativamente do sangue subcutâneo até sumir da meia vida efetiva para cálculo, tradicionalmente 4 a 6 longas horas.
- **COB (Carbs on Board):** Termo originado nos desenvolvimentos hackers do OpenAPS. Modelagem matemática paralela do intestino delgado baseada nas estimativas de decaimento dinâmico de absorções dos lipídios vs glicoses rápidas das refeições de modo dinâmico se a comida ainda está ativamente e injetando glicogênio no intestino ou se já esgotou-se em energia pura ao corpo (evitando a absorção lenta em descompasso que a IA compensará e segurará no freio via Microbolus autônomo e temporário na taxa Basal em Loop Fechado).

---

## 12. Cálculos Matemáticos Avançados de Sensibilidade (Regras Clínicas)

Para o bom funcionamento de uma bomba de insulina, as configurações fundamentais do paciente devem ser testadas e definidas com base em peso total, dose total diária (TDD) e reações individuais.

### A Regra dos 1800 (Cálculo do Fator de Sensibilidade - ISF)
Utilizada primariamente para análogos de insulina ultrarrápida. Estima o Fator de Sensibilidade (ISF), ou seja, quantos mg/dL uma única unidade baixará.
- **Fórmula:** `1800 / Dose Total Diária (TDD)`
- **Exemplo:** Um paciente usa em média 45 Unidades de insulina no dia todo (Basal + Bolus de toda alimentação combinada).
  `ISF = 1800 / 45 = 40`
  Logo, 1 Unidade baixará 40 mg/dL na glicemia deste paciente específico. Configurado no perfil do motor: 1:40.

### A Regra dos 500 (Cálculo da Relação Insulina-Carboidrato - ICR)
Utilizada para calcular o peso impositivo e gasto que os carboidratos exigem.
- **Fórmula:** `500 / Dose Total Diária (TDD)`
- **Exemplo:** O mesmo paciente usa 45 Unidades diárias totais.
  `ICR = 500 / 45 = 11.1`
  Logo, a proporção configurada será: **1 Unidade para cada 11 gramas de carboidratos** (1:11).
- **Variações Circadianas (Regra de Ajuste Dinâmico):** Como o corpo tem alta resistência de manhã pelo cortisol, os endocrinologistas quebram a matemática em blocos diários na máquina:
  - 06:00 às 10:00: ICR = 1:8 (Mais insulina para cobrir o café devido à resistência)
  - 10:00 às 17:00: ICR = 1:12 (Sensibilidade máxima e gasto metabólico acordado alto)
  - 17:00 às 24:00: ICR = 1:10 

### Cálculo de IOB Degradante (Fórmula Logarítmica Genérica Biexponencial Padrão CSII)
Embora a máquina faça isso invisível no fundo, a insulina infundida é descontada de forma não-linear, seguindo equações exponenciais. 
O pico ocorre após `tp` (tempo do pico, ex. 75 minutos).
Durante o decaimento tardio, as bombas assumem uma cauda que pode ser visualizada como `Insulina(t) = Doses_Aplicadas * [A * exp(-a*t) - B * exp(-b*t)]`.
Isso quer dizer que, ao corrigir uma alta de 200 para 100 mg/dL 2 horas após a refeição, se o IOB calculado for 2.5U remanescentes, a máquina subtrairá automaticamente o resíduo do novo bolus necessário, evitando matar o usuário nas horas seguintes da madrugada.

---

## 13. FAQ Técnico e Resolução de Problemas Complexos (Troubleshooting)

**Q1: O aplicativo do sensor (Nightscout) e a Bomba mostram "Loop Blocked" ou "Suspend to Low" repetidamente e eu sigo acordando e batendo no topo a 200mg/dL. Por quê?**
**R:** A taxa basal do paciente está muito mal calibrada para cima. A basal programada em horários mortos está artificialmente excessiva, empurrando o indivíduo de cabeça pra baixo. A AI do sensor enxerga o abismo iminente, corta o basal a zero, e o corpo rebota pesadamente de volta aos 200mg/dL. Ação: Reduzir a basal na tabela subjacente entre 20% a 30% duas horas antes do horário do loop ser engatilhado e bloqueado repetidamente.

**Q2: Posso tomar banho com a Bomba?**
**R:** Bombas tradicionais com tubo (Medtronic, Tandem, Dana) desconectam-se. Há um plug de proteção (Clip luer lock) na agulha cravada sob a pele. Desconecta o tubo da agulha em 1 segundo e deixa o motor caro blindado eletrônico num local fora da umidade. As únicas exceções são as "Patch Pumps" sem tubo descartáveis (Omnipod), que, como não há cabo e são de plástico e silicone IPX8 fundido na pele com selos duplos ultrassônicos de fábrica, requerem e sobrevivem que o banho seja tomado com o casulo aderido 100% da vida útil dele.

**Q3: Após aplicar bolus a glicemia despenca antes da digestão, em trinta minutos caindo absurdamente pra 50 mg/dL. O bolus duplo resolve?**
**R:** Sim. Uma queda precoce vertiginosa acusa que a mecânica química da insulina rápida alcançou os transportadores das veias sanguíneas primeiro que a lentidão do esvaziamento gástrico da refeição. Em estômagos gastroparesados ou sob dieta Keto-Carnívora ou refeições hiperlipídicas puras maciças, você precisa anular o pico frontal inicial e forçar toda a carga no método puramente "Extended" (Quadrado longo de liberação retilínea).

**Q4: Quanto tempo o frasco ou refil (reservatório de plástico) pode durar carregado?**
**R:** Plástico médico abriga a insulina mas é permeável e libera micro-metais ou peróxidos e ftalatos para dentro da droga delicada dependendo do armazenamento de insumos (Embora o padrão ISO garanta o não-DEHP hoje no mundo). O calor corporal de estar amarrado em cintas elásticas no tronco de indivíduos quentes a 37ºC causa degradações contínuas químicas lentas nas moléculas proteicas (Desaminação e fibrilação). Oficialmente, reservatórios devem não ultrapassar 7 dias (Mesmo com cânulas já trocadas 3 vezes nesse período). E em verões tropicais úmidos agressivos onde picos de calor vão aos 40 graus por radiação ou contato maciço, 3 a 4 dias são recomendados pois a potência e o tempo de ação farmacêutico são severamente mortos e destruídos até perderem a viabilidade de ligação aos transportadores membranares.

**Q5: Alarmes Falsos Noturnos ("Calibration Error", "Sensor Updating") do CGM arruínam as decisões na bomba?**
**R:** Em modos comerciais puros Híbridos Sim. Quando o CGM do corpo falha por problemas inflamatórios pontuais por Compressão Mecânica (O indivíduo rolou o tronco pesadamente e esmagou o sensor contra o colchão denso comprimindo a irrigação microvascular fluídica o que o faz despencar em falso), sistemas limitados HCL emitem Sirenes Inextinguíveis aos berros ou expelem o paciente subitamente do modo de automação para salvaguardar a vida e fecham a inteligência artificial, jogando-o no perfil escuro cego sem loop à mercê da própria inteligência manual, requerendo que acorde no desespero de reiniciar no dedo as furos.

---
**Fim do Documento Técnico Avançado e Manual do Dispositivo Vol 10 - Bombas (CSII)** 
*Todos os esquemas biológicos revisados de acordo com os cânones mundiais de terapias em insulina (ISPAD/ADA, Standards of Medical Care) e referências bibliográficas do Hacking the Pancreas em Sistemas Algorítmicos em C# e Java e C++ via protocolos modernos de BLE 5.0 (Vigência 2024 e Atualizações Retroativas 2026).*
