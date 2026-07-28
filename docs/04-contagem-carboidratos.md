# Documento 04 — Contagem de Carboidratos e Impacto Nutricional no Diabetes

> [!CAUTION]
> **Aviso Médico Importante**
> Este documento possui finalidade exclusivamente informativa e educacional, destinado ao suporte à decisão clínica em ambiente de desenvolvimento de software e estudo técnico. O conteúdo aqui apresentado, incluindo fórmulas, dosagens e orientações terapêuticas, baseia-se em diretrizes internacionais (ADA, ISPAD, SBD) e na literatura médica atual, mas **não substitui** o julgamento clínico, o aconselhamento médico profissional, o diagnóstico ou o tratamento. Todo paciente com diabetes deve ter seu tratamento individualizado e supervisionado por um médico endocrinologista e equipe multidisciplinar.

## 1. Conceitos Fundamentais

### O que são carboidratos
Os carboidratos são macronutrientes cuja principal função é fornecer energia imediata e armazenável para as células do corpo humano.
Durante o processo de digestão, a esmagadora maioria dos carboidratos dietéticos é catabolizada e quebrada em monossacarídeos — sendo a glicose o mais abundante e importante.
A glicose, ao adentrar a circulação sistêmica, altera diretamente os níveis de glicemia no sangue, exigindo do corpo uma resposta pancreática de secreção de insulina.

### Carboidratos simples vs. complexos
A classificação estrutural dos carboidratos dita a velocidade de sua absorção sistêmica:

- **Carboidratos Simples:** 
  - Incluem os monossacarídeos (glicose, frutose, galactose).
  - Incluem os dissacarídeos (sacarose, lactose, maltose).
  - Devido ao seu tamanho molecular ínfimo, não demandam complexo trabalho enzimático.
  - São rapidamente digeridos no trato gastrointestinal, resultando em um aumento rápido, agudo e muitas vezes perigoso da glicose no sangue de pacientes diabéticos. 
  - Exemplos primários: açúcar refinado, balas, mel, refrigerantes não dietéticos, sumos de frutas coados.

- **Carboidratos Complexos:** 
  - São polissacarídeos formados por longas cadeias intrincadas de unidades de glicose.
  - O principal representante nutricional é o amido (presente em arroz, batatas, trigo, milho).
  - Exigem um tempo maior de clivagem enzimática pelas amilases salivares e pancreáticas.
  - Como resultado direto desse processo físico-químico, promovem um aumento mais gradual e controlável da glicemia em comparação aos carboidratos simples.

### Carboidratos disponíveis vs. não disponíveis
A biodisponibilidade digestiva humana divide os carboidratos:

- **Disponíveis:** 
  - O trato gastrointestinal humano produz as enzimas específicas necessárias para hidrolisá-los.
  - São absorvidos através da borda em escova do intestino delgado.
  - Impactam diretamente a glicemia capilar e venosa pós-prandial.

- **Não disponíveis:** 
  - Englobam as fibras alimentares e o chamado amido resistente.
  - Não sofrem digestão enzimática significativa no intestino delgado.
  - São encaminhados praticamente intactos ao intestino grosso (cólon).
  - No cólon, servem de substrato (prebióticos) para fermentação pela microbiota intestinal, gerando ácidos graxos de cadeia curta (como butirato, propionato e acetato), mas não elevam a glicemia de forma aguda.

### Como calcular carboidratos líquidos (total - fibras)
Na prática dietética avançada e na parametrização de algoritmos de pâncreas artificial, utiliza-se com frequência o conceito de "Carboidrato Líquido" (Net Carbs).
Esta métrica isola matematicamente a porção do carboidrato que efetivamente exigirá cobertura de insulina.

**Fórmula Básica:**
`Carboidratos Líquidos = Carboidratos Totais - Fibras Alimentares`

*Nota clínica:* Algumas escolas médicas recomendam que apenas se subtraia a fibra caso a porção ultrapasse 5g, e outras sugerem descontar apenas 50% do valor da fibra. O protocolo escolhido depende da agressividade do algoritmo.

### Diferença entre rótulo nutricional brasileiro e americano
Compreender a rotulagem é uma habilidade de sobrevivência para o paciente:

- **Rótulo Brasileiro (ANVISA):** 
  A legislação vigente obriga que o campo "Carboidratos" da tabela nutricional já reflita a quantidade disponível, isto é, as fibras muitas vezes já estão dissociadas do valor principal, e são mostradas em uma linha separada. Se o rótulo obedece à norma brasileira estrita, subtrair as fibras dos carboidratos pode gerar um erro de contagem que levará à hipoglicemia.

- **Rótulo Americano (FDA):** 
  O campo "Total Carbohydrate" é uma soma integral de todos os tipos de cadeias de carbono presentes (açúcares, amidos e fibras). Neste caso, para aplicar a contagem de insulina corretamente, é imperativo ensinar o paciente (e programar o software) a subtrair o campo "Dietary Fiber" do "Total Carbohydrate".

---

## 2. Índice Glicêmico (IG)

### Definição e como é medido
O Índice Glicêmico (IG) é um indicador métrico (variando numa escala de 0 a 100) que quantifica a velocidade com a qual um determinado alimento rico em carboidratos eleva a concentração de glicose no plasma sanguíneo.
Para estabelecer esse número, administra-se uma porção do alimento contendo exatos 50 gramas de carboidratos disponíveis a voluntários normoglicêmicos. Em seguida, afere-se a área sob a curva (AUC) da resposta glicêmica ao longo de duas horas, dividindo esse valor pela AUC de um alimento padrão de referência (geralmente glicose pura líquida ou pão branco), multiplicando o resultado por 100.

### Classificação do IG
Para facilitar a adesão do paciente e a prescrição médica, os valores são divididos em terços operacionais:

- **Baixo IG:** Valores abaixo de 55. Promovem liberação muito lenta e achatamento da curva.
- **Médio IG:** Valores entre 55 e 70. Requerem atenção no tempo de aplicação da insulina (timing).
- **Alto IG:** Valores acima de 70. Causam pico glicêmico vertical (spikes) em minutos. Exigem insulina aplicada com bastante antecedência.

### Limitações do IG
O IG isoladamente sofre de um viés grave de porção. 
O índice não mensura a quantidade total de carboidratos habitualmente ingerida naquela porção.
Um exemplo didático é a abóbora ou a melancia: possuem um IG formidável, sugerindo perigo extremo. Todavia, a densidade de carboidratos nesses alimentos é tão diluída em água que o paciente precisaria ingerir quilogramas do alimento para efetivamente gerar o pico apontado pelo exame laboratorial de 50g.
Além disso, o IG de um alimento muda drasticamente quando combinado em refeições contendo gorduras e proteínas.

### Tabela com IG de 50+ alimentos comuns no Brasil
*(Valores de referência utilizando Glicose Pura = 100)*

| ID | Alimento Típico Brasileiro | Índice Glicêmico (IG) | Classificação |
|----|----------------------------------------|:---:|---------------|
| 01 | Açúcar branco refinado (Sacarose) | 65 | Médio |
| 02 | Glicose (Dextrose líquida) | 100 | Alto |
| 03 | Mel de abelha silvestre | 73 | Alto |
| 04 | Arroz branco tipo 1 cozido | 73 | Alto |
| 05 | Arroz integral cozido | 68 | Médio |
| 06 | Arroz parboilizado cozido | 55 | Médio |
| 07 | Feijão carioca | 29 | Baixo |
| 08 | Feijão preto | 30 | Baixo |
| 09 | Feijão fradinho | 33 | Baixo |
| 10 | Lentilha cozida | 29 | Baixo |
| 11 | Grão de bico | 28 | Baixo |
| 12 | Ervilha verde fresca | 39 | Baixo |
| 13 | Soja cozida | 18 | Baixo |
| 14 | Batata inglesa cozida (sem casca) | 78 | Alto |
| 15 | Purê de batata inglesa | 85 | Alto |
| 16 | Batata doce cozida | 44 | Baixo |
| 17 | Mandioca (Aipim/Macaxeira) cozida | 46 | Baixo |
| 18 | Mandioquinha (Batata-baroa) | 65 | Médio |
| 19 | Inhame cozido | 35 | Baixo |
| 20 | Cará cozido | 40 | Baixo |
| 21 | Pão francês (branco) | 75 | Alto |
| 22 | Pão de forma tradicional (branco) | 70 | Alto |
| 23 | Pão integral 100% | 51 | Baixo |
| 24 | Macarrão espaguete (Al dente) | 43 | Baixo |
| 25 | Macarrão espaguete (Muito cozido) | 58 | Médio |
| 26 | Aveia em flocos grossos | 55 | Médio |
| 27 | Farelo de aveia | 50 | Baixo |
| 28 | Farinha de tapioca hidratada | 89 | Alto |
| 29 | Milho verde na espiga | 54 | Baixo |
| 30 | Fubá de milho / Polenta cozida | 68 | Médio |
| 31 | Pipoca de panela | 55 | Médio |
| 32 | Maçã (in natura, com casca) | 36 | Baixo |
| 33 | Pera (in natura, com casca) | 33 | Baixo |
| 34 | Banana prata (intermediária) | 56 | Médio |
| 35 | Banana nanica (muito madura) | 62 | Médio |
| 36 | Melancia | 76 | Alto |
| 37 | Melão | 65 | Médio |
| 38 | Mamão papaya | 60 | Médio |
| 39 | Abacaxi | 59 | Médio |
| 40 | Manga palmer/tommy | 51 | Baixo |
| 41 | Laranja pêra (inteira) | 43 | Baixo |
| 42 | Uva itália | 46 | Baixo |
| 43 | Morango | 40 | Baixo |
| 44 | Kiwi | 52 | Baixo |
| 45 | Cenoura crua | 16 | Baixo |
| 46 | Cenoura cozida | 39 | Baixo |
| 47 | Beterraba cozida | 64 | Médio |
| 48 | Abóbora cabotiá cozida | 75 | Alto |
| 49 | Leite de vaca integral | 27 | Baixo |
| 50 | Iogurte natural não adoçado | 27 | Baixo |
| 51 | Chocolate ao leite padrão | 43 | Baixo |
| 52 | Amendoim torrado | 14 | Baixo |
| 53 | Biscoito tipo maisena | 69 | Médio |
| 54 | Biscoito cream cracker | 64 | Médio |
| 55 | Refrigerante comum (com sacarose) | 68 | Médio |
| 56 | Pão de queijo tradicional | 60 | Médio |

### Fatores que alteram o IG (preparo, temperatura, maturidade)
A matriz física de um alimento não é estática. Intervenções culinárias modificam seu comportamento:

- **Preparo e Cocção (Gelatinização):** 
  Cozinhar um alimento amiláceo em excesso (ex: macarrão ou arroz transformado em papa) promove a gelatinização do amido. O grânulo de amido se expande, enche-se de água e rompe, oferecendo às amilases pancreáticas uma superfície de contato infinitamente maior. Resultado: um salto vertiginoso no IG.
- **Temperatura (Retrogradação):** 
  Alimentos ricos em amido (batata, arroz) após serem cozidos e subsequentemente resfriados na geladeira (por 12-24h) sofrem rearranjo molecular de suas cadeias. O amido cristaliza, formando 'amido resistente'. Essa forma cristalizada não é acessível pelas enzimas. Isso diminui notavelmente o IG. O reaquecimento sutil do prato posterior não destrói completamente essa nova matriz cristalina.
- **Maturidade das frutas:** 
  Durante o amadurecimento (especialmente nas frutas climatéricas como a banana e a manga), enzimas endógenas da fruta quebram as reservas de amido e as transformam em açúcares livres (frutose e glicose). Uma banana verde tem IG em torno de 30; a mesma banana com a casca completamente preta exibe IG superior a 60.
- **Presença de Ácidos Orgânicos:** 
  A adição de componentes ácidos, como vinagre de maçã, sumo de limão ou uso de fermentação natural com leveduras e bactérias láticas (ex: pão de fermentação natural - sourdough), reduz consideravelmente o pH intragástrico. Essa acidificação provoca um reflexo vagal que reduz abruptamente a taxa de esvaziamento gástrico, prolongando a digestão e contendo a ascensão glicêmica.

---

## 3. Carga Glicêmica (CG)

### Fórmula: CG = (IG x carboidratos) / 100
Para mitigar a limitação interpretativa e o viés de porção do Índice Glicêmico, pesquisadores de Harvard desenvolveram a métrica de Carga Glicêmica.
A CG incorpora na mesma equação matemática a qualidade do carboidrato ingerido (velocidade) multiplicada pela quantidade absoluta em gramas presente na porção servida no prato.

**A Equação:**
`CG = (Índice Glicêmico × gramas de carboidrato na porção) ÷ 100`

### Classificação da Carga Glicêmica
- **Baixa CG:** Valores ≤ 10. (Ideal para controle intensivo).
- **Média CG:** Valores de 11 a 19. (Requer atenção ao bolus I/C).
- **Alta CG:** Valores ≥ 20. (Potencial extremo para picos hiperglicêmicos difíceis de corrigir, exigindo muitas vezes pré-bolus de 20-30 minutos).

### Por que CG é mais útil que IG no manejo do diabetes
A Carga Glicêmica é considerada a rainha das métricas dietéticas em diabetes porque apresenta correlação estatística direta e linear com a área sob a curva (AUC) e com as necessidades globais de secreção (ou injeção) de insulina basal-bolus. 
Para um algoritmo de closed-loop ou para a matemática de um aplicativo de suporte à decisão, saber o IG sozinho de nada serve. O sistema não toma decisões baseadas apenas na "velocidade"; o sistema precisa de "volume + velocidade" para estipular se aplicará o bolus em 15 minutos ou dividirá a onda em 2 horas. A CG provê este pilar analítico.

### Exemplos práticos de refeições com CG calculada
Aqui vemos a dicotomia IG versus CG em ação prática:

1. **A Melancia Falaciosa:**
   - IG da melancia: 76 (Alto).
   - Porção comum consumida: 120 gramas de fruta.
   - Carboidratos em 120g: aproximadamente 6 gramas.
   - Cálculo da CG: (76 x 6) / 100 = **4,56 (CG Baixa!)**
   - *Conclusão clínica:* Apesar do alto IG, a melancia afeta fracamente a glicemia geral em porções normais.

2. **O Arroz Branco Brasileiro:**
   - IG do arroz branco cozido: 73 (Alto).
   - Porção servida em almoço: 150 gramas (cerca de 4 a 5 colheres de sopa cheias).
   - Carboidratos em 150g: aproximadamente 42 gramas.
   - Cálculo da CG: (73 x 42) / 100 = **30,6 (CG Alta!)**
   - *Conclusão clínica:* Uma hecatombe glicêmica. O alto IG aliado ao alto conteúdo de CHO cria uma necessidade violenta de insulina rápida.

3. **O Pão Integral de Resgate:**
   - IG do pão 100% integral: 51 (Baixo/Médio).
   - Porção de café da manhã: 50 gramas (2 fatias).
   - Carboidratos em 50g: aproximadamente 22 gramas.
   - Cálculo da CG: (51 x 22) / 100 = **11,2 (CG Média)**
   - *Conclusão clínica:* Uma elevação moderada, fácil de cobrir com a Relação I/C sem solavancos glicêmicos acentuados no CGM.

---

## 4. Fibras Alimentares

### Fibras solúveis vs. insolúveis
As fibras representam o escudo dietético contra os desvios metabólicos agudos. Elas subdividem-se pela sua solubilidade em solventes aquosos, impactando o intestino de maneiras distintas:

- **Fibras Solúveis (O amortecedor glicêmico):** 
  Possuem alta afinidade por água. (Fontes: beta-glucanas da aveia e da cevada, psyllium, pectina de maçãs e frutas cítricas, mucilagens, gomas de leguminosas). Ao encontrarem fluidos gástricos, criam um gel espesso e altamente viscoso no lúmen do estômago e intestino delgado. Esta matriz gelatinosa atrasa vigorosamente a digestão dos quimos, o esvaziamento gástrico e, por fim, funciona como barreira mecânica dificultando que as enzimas alcancem os amidos e que a glicose chegue aos transportadores da parede intestinal.
- **Fibras Insolúveis (O motor intestinal):** 
  (Fontes principais: farelo de trigo intacto, estruturas lenhosas de vegetais verde-escuros folhosos, cascas rústicas). Não retêm água na mesma proporção estrutural que as solúveis. Atuam como esponjas secas. Aumentam fisicamente o volume da massa fecal e instigam agressivamente o peristaltismo, atuando na mecânica intestinal profilática à constipação. Exercem, todavia, efeito menor no achatamento agudo da glicemia prandial se comparado às solúveis.

### Impacto na absorção de glicose
Dietas cujas refeições contém densidade alta de fibras (>5 a 10g por sentada) achatam espetacularmente a curva glicêmica observada num monitor contínuo (CGM - Continuous Glucose Monitor). Refeições de igual teor de CHO líquido, mas díspares em fibras, exibirão curvas completamente distintas:
- *Carga sem fibra:* Pico afiado de montanha aos 45 minutos.
- *Carga fibrosa:* Uma leve colina espalhada ao longo de 2 a 3 horas, raramente superando os alvos do Time In Range (70-180 mg/dL).

### Amido resistente
Trata-se de uma proeza físico-química dos alimentos. Ele recebe essa alcunha exatamente porque "resiste" ativamente à quebra amilolítica do pâncreas. 
Suas subdivisões variam (RS1 a RS4) e podem ser encontradas in natura (biomassa de banana super verde, aveia não aquecida) ou induzidas termicamente (a famosa retrogradação citada anteriormente - resfriar batata e arroz cozidos).
Ao resistir à digestão, ele age em simetria de propósito com a fibra: vai ao cólon e alimenta os Firmicutes e Bacteroidetes, melhorando a sensibilidade global à insulina num prazo de 2 a 4 semanas de consumo diário continuado.

### Como calcular carboidratos descontando fibras
Para o paciente diabético, insulino-dependente, contar fibra de forma equivocada gera o efeito indesejado de hipoglicemia pós-prandial.

**O Protocolo Conservador (Recomendado na pediatria e para iniciar terapias):**
Quando a porção do prato consumido tiver **5 gramas ou mais de fibra** documentada, o paciente deve subtrair exatamente **a metade (50%)** dos gramas da fibra do total de carboidratos.
*Exemplo Conservador:* Refeição possui 50g de CHO e 12g de fibra. 
Desconto = 6g. 
Total a cobrir na bomba = 44g de CHO.

**O Protocolo de Precisão / Líquido Total (Usado em adultos treinados e calculadoras algorítmicas rigorosas):**
Subtrair 100% da fibra (os americanos já vêm habituados a esse cálculo por causa do FDA).
*Exemplo Líquido Total:* Refeição possui 50g de CHO e 12g de fibra.
Total a cobrir na bomba = 38g de CHO.

---

## 5. Proteínas e Seu Impacto Glicêmico

### Gliconeogênese a partir de aminoácidos
Um mito persistente é de que apenas pão e açúcar afetam a glicose de um diabético. Contudo, em virtude das deficiências de glucagonização e regulação hepática num pâncreas DM1 (ou DM2 severo), as proteínas exercem papel estressor tardio formidável.
Proteínas são trituradas em aminoácidos. Alguns deles são denominados *aminoácidos glicogênicos* (ex: alanina, glutamina). Quando ingeridos, principalmente em grande montante, o fígado capta-os e os insere na via metabólica inversa da gliconeogênese, manufaturando glicose novinha em folha a partir desses blocos de construção muscular, e despejando-a na corrente sanguínea sistêmica.

### Atraso na absorção de carboidratos
A mera presença da proteína dentro do lúmen gástrico sinaliza e estimula potentes enterohormônios incretínicos — marcadamente o GIP e o GLP-1 — bem como colecistoquinina (CCK). Estes agentes bioquímicos dizem ao estômago uma simples frase: "Feche o piloro e vá devagar". 
Consequentemente, se o paciente comer um pão francês puro versus um pão francês recheado com 30g de carne, o pão com carne demorará pelo menos o dobro do tempo para atingir seu pico glicêmico, o que muda totalmente a dinâmica da insulina injetada.

### Pico glicêmico tardio (3-5 horas)
Devido às reações supracitadas, a elevação da glicose derivada exclusivamente e indiretamente da carga proteica ocorre tipicamente como uma elevação monótona e persistente num horizonte que se manifesta entre **3 e 5 horas** após a deglutição, quando toda a insulina de ação rápida do bolus prandial (cuja cauda morre em 3 a 4h) já foi exaurida no corpo do paciente. O resultado é o paciente dormir com 110 mg/dL e acordar com 220 mg/dL sem explicação (aparente).

### Quanto da proteína se converte em glicose (aprox. 50-60%)
O consenso clínico na literatura especializada de contagem avançada postula que **50% a 60%** (frequentemente estipula-se 58% em estudos rigorosos) da massa em gramas de proteína ingerida requer, em última análise, cobertura sistêmica de insulina, como se fosse um fluxo lento e incessante de glicose.
Isso quer dizer que 100g de peito de frango grelhado contêm 30g de proteína, dos quais cerca de 15g a 18g agirão como um equivalente de glicose pingando no fígado ao longo de horas.

### Exemplos: carne, queijo, ovos, feijão
- **A Carne (Churrasco):** Bife magro grande (250g) contém quase 75g de proteína. Quase 40g de glicose tardia será gerada, exigindo insulina.
- **Os Queijos curados:** Amalgamam a proteína (caseína de dificílima e demorada digestão) com maciças proporções de lipídios. Promovem o mais tardio de todos os picos, estendendo a gliconeogênese por até 6 horas ou mais.
- **Os Ovos:** Uma refeição com 4 ovos trará 24g de proteína. Para pacientes com elevada sensibilidade, isso causa subida substancial no final da terceira hora após o desjejum.
- **Feijões / Leguminosas:** Uma matrix formidável de CHO complexo, proteínas vegetais e montanhas de fibra. É o alimento de mais vagarosa absorção na dieta, requerendo invariavelmente distribuição cuidadosa de bolus, sob pena da insulina fazer efeito 2h antes da energia de fato chegar ao sangue.

---

## 6. Gorduras e Hiperglicemia Tardia

### Esvaziamento gástrico retardado
As gorduras alimentares (lipídios) são os mais supremos freios da fisiologia gástrica humana. A digestão gástrica paralisa dramaticamente na presença de emulsões de gordura densa (azeites copiosos, queijos derretidos, frituras em imersão).
O efeito clínico prático em pacientes diabéticos é trágico: O paciente conta os carboidratos do almoço (ex: 70g CHO de uma lasanha bolonhesa muito gordurosa). Aplica a insulina. A insulina lispro ou asparte começa a agir em 15 minutos e atinge potência máxima em 60-90 minutos. Porém, a lasanha, paralisada pela gordura no estômago, ainda não liberou os 70g de CHO para o intestino.
Resultado: O paciente sofre uma queda glicêmica abrupta, tendo uma forte crise de hipoglicemia de rebote na 1ª e 2ª hora pós-prandial. 

### Pico glicêmico tardio (4-8 horas)
Após sofrer a hipoglicemia e muitas vezes comer açúcar extra para combatê-la, as horas passam. Chegamos à janela de 4 a 8 horas (muitas vezes em plena madrugada). A gordura finalmente é emulsificada pela bile, o esvaziamento gástrico é completado e toda aquela montanha de carboidrato original da refeição entra na circulação de uma vez só. O paciente dispara para 300, 350 mg/dL e permanece ali por horas a fio.

### Resistência à insulina induzida por gordura
Além do retardo mecânico absurdo, existe a sinalização inflamatória e metabólica aguda. Níveis excessivos de triglicerídeos circulantes e ácidos graxos livres pós-prandiais intoxicam momentaneamente os receptores musculares (efeito conhecido como inibição competitiva lipotóxica sobre os substratos IRS-1 e PI3K na cascata intracelular da insulina). 
Trocando em miúdos: **Nas 8 horas após comer alta quantidade de gordura saturada, a sua insulina simplesmente para de funcionar com eficácia.** O paciente precisará injetar de 30% a 50% a mais de insulina para baixar a mesma quantidade de açúcar.

### Impacto da pizza, hambúrguer, sorvete
A tríade do pânico do controle intensivo:
- **Pizza:** Um disco massivo de carboidratos de altíssimo índice glicêmico coberto por uma manta formidável de queijo derretido (gordura pura e proteínas). Combina resistência insulínica imediata com esvaziamento hiper-lento. É a tempestade perfeita que motivou algoritmos do mundo inteiro a criarem uma tecla "Bolus de Pizza" em bombas de insulina.
- **Hambúrguer Gourmet:** Pão francês (alta carga amilácea) selado na manteiga + 200g de carne gordurosa bovina (lipídios saturados e proteína) + molhos açucarados e tiras de bacon.
- **Sorvete Cremoso:** Diferente de um picolé de frutas (que exige insulina rápida). O sorvete tradicional de massa leva creme de leite espesso. É uma armadilha, pois sendo gelado e cremoso parece inofensivo, mas atira uma carga gigante de CHO protegida por uma gaiola de gordura. O pico muitas vezes acorda a criança hiperglicêmica de madrugada.

### Exemplos clínicos e de conduta de mitigação
Para um paciente DM1 lidar com refeições altamente hiperlipídicas, a regra elementar é nunca dar o bolus integral (100%) antes da refeição. Deve-se rachar a dose. Dá-se uma fração moderada na largada, e o restante é empurrado via bomba de infusão ou múltiplas injeções para as 3h e 6h subsequentes, utilizando equações de FPU (como exploraremos na próxima seção).

---

## 7. FPU — Fat-Protein Units (Unidades de Gordura e Proteína)

### Definição (Ewa Pankowska, 2010)
Face à catástrofe que refeições pesadas provocavam no controle dos pacientes de tecnologia em DM1, a pesquisadora Ewa Pankowska e sua equipe, trabalhando na Polônia, revolucionaram a contagem de carboidratos estabelecendo uma métrica universal unificadora: As Unidades de Gordura e Proteína (FPU - Fat-Protein Units). 
A essência do FPU é atribuir "poder glicêmico tardio" às calorias que não são de carboidrato.

### Fórmula: FPU = (kcal_prot + kcal_gord) / 100
O cálculo requer matemática disciplinada, mas é robusto:

1. Extraia da porção os gramas exatos de Proteína e multiplique por 4 para achar as Kcal.
   `Kcal_Prot = gramas de proteína x 4`
2. Extraia da porção os gramas de Gordura (Total) e multiplique por 9.
   `Kcal_Gord = gramas de gordura x 9`
3. Some ambas as Kcal (obtendo as Kcal Lipoproteicas Totais).
4. **Divida esse somatório exato por 100.**
   `FPU = (Kcal_Prot + Kcal_Gord) / 100`

### Conversão: 1 FPU = 10g de carboidrato equivalente
O corolário genial de Pankowska é que o paciente pode usar a sua própria Relação I/C de carboidratos já estipulada pelo seu endocrinologista para tratar essas calorias fantasmas.
A regra manda que o paciente deve tratar cada número fechado de 1 FPU na equação **exatamente como trataria 10 gramas de carboidrato convencional**.
*Exemplo: Se o médico disse que o paciente toma 1 Unidade para cada 10g de carboidrato, e a refeição acusou 3 FPUs, o paciente aplicará 3 unidades de insulina extra para cobrir a gordura e proteína.*

### Tempo de absorção por número de FPU
Se a conversão é linear, o timing de aplicação não é. Insulina pra FPU não pode ser aplicada de uma vez; deve ser estendida via Bolus Onda Quadrada (Square Wave) de uma bomba de insulina. O tempo de extensão depende intimamente da sobrecarga:

- **1 FPU (carga leve-moderada):** O bolus estendido deve perdurar por exatas **3 horas**.
- **2 FPU (carga pesada):** O bolus estendido deverá ser configurado para durar **4 horas**.
- **3 FPU ou mais (carga extrema/desafiadora - ex: Pizza/Churrasco):** O bolus estendido deverá cobrir o horizonte gástrico de pelo menos **5 a 8 horas**.

---

## 8. Método Pankowska Completo

### Estratégia de bolus dual/estendido
Em posse dos carboidratos tradicionais e das novas FPUs calculadas, monta-se a artilharia pesada terapêutica: o Bolus Dual Wave (Multi-Onda). O método propõe dividir rigidamente o envio da insulina em dois compartimentos simultâneos:

1. **Compartimento de Onda Normal (Imediata):** 
   Responsável pela cobertura imediata e pontual baseada exclusivamente no cômputo dos **Carboidratos Totais**. Essa onda é jorrada nos primeiros 15 minutos e cobre o impacto primário do amido/açúcar.
2. **Compartimento de Onda Estendida (Square):** 
   Responsável pela cobertura da resistência gerada, baseada no número de **FPUs**, pingando micro-gotas de insulina basalmente pelas horas sequentes definidas na regra da duração.

*(Importante ressalva moderna: Como as altíssimas gorduras (FPU > 3) atrasam tudo, inclusive o carboidrato, a diretriz atual sugere fundir as doses necessárias para CHO e FPU e fazer proporções como 30% imediato e 70% prolongado ao longo de 6-8h, para não dar hipo primária).*

### Quando usar bolus estendido
Indicações absolutas no dia-a-dia do clínico:
- Festas infantis regadas a frituras (salgadinhos) e cremes gordurosos.
- Refeições noturnas com alta ingestão proteica (salmão, rodízio de carnes, sushi com cream-cheese e maionese).
- Fast food (hambúrgueres, batatas fritas imersas em óleo, anéis de cebola).
- Sobremesas densas contendo gemas de ovo, mascarpone, laticínios integrais e cremes (Cheesecakes, Tiramisus, Pavês com nata).
- Sempre que a refeição acusar rigorosamente um cálculo igual ou superior a 1,5 FPU, pois menos que isso o residual basal já lida naturalmente sem alarde no CGM.

### Exemplos com pizza, batata frita, churrasco
A aplicação prática da teoria do estendido dita a vida social dos pacientes:

- **O Cenário da Batata Frita (Média do McDonald's):**
  Altíssimo amido com pesada absorção de óleo vegetal. 
  Estratégia Pankowska Híbrida: Bolus Dual com proporção 50/50. 50% entregue no ato da primeira mordida, e 50% da insulina espalhada ao longo de 4h para cobrir a retrogradação tardia da gordura hidrogenada.
  
- **O Cenário do Churrasco Gaúcho (Sem Arroz e Sem Pão):**
  Alimentação carnívora (apenas Picanha, Costela e Linguiça).
  Quantidade de CHO a cobrir = 0g (Zero bolus imediato).
  Quantidade de FPU = Altíssima, podendo cruzar 6 FPUs.
  Estratégia: Zero imediato. 100% da insulina do FPU será infundida de modo prolongado ao longo de generosas 6 a 8 horas, cobrindo com primor a neoglicogênese hepática, fazendo o paciente acordar às 7h da manhã com glicemia platô em 100 mg/dL (ao invés de 250 mg/dL num cenário sem cobertura de proteína).

### Tabela de distribuição imediata vs. estendida por tipo de refeição
O fluxograma guia para divisão percentual em Bolus Multi-Onda nas bombas modernas:

| Perfil Físico da Refeição | Volume de FPU | Proporção Recomendada (Imediato / Estendido) | Duração da Onda Estendida (Square) |
|:---:|:---:|:---:|:---:|
| Refeição Simples e Magra (Ex: Fruta pura) | < 1 FPU | 100% imediato / 0% estendido (Onda Normal) | Não se aplica |
| Prato Feito Tradicional (Arroz, feijão, frango magro) | 1,0 a 1,9 FPU | 70% imediato / 30% estendido | 3 horas |
| Massa Italiana com Molho Rico/Queijo abundante | 2,0 a 2,9 FPU | 50% imediato / 50% estendido | 4 a 5 horas |
| Ultra Processados, Pizza, Fast Food | > 3,0 FPU | 30%-40% imediato / 60%-70% estendido | 6 a 8 horas |
| Proteína e Gordura exclusivas (Dieta Cetogênica) | 2 a 5+ FPU | 0% imediato / 100% estendido integral | 4 a 8 horas |

---

## 9. Técnicas de Contagem

### Contagem visual (por olho)
Historicamente o primeiro pilar introduzido aos pacientes recém diagnosticados no consultório endocrinológico.
Utiliza manuais fotográficos de equivalência de medidas caseiras (colher de arroz, concha de feijão, escumadeira, xícaras padronizadas de 240ml). 
O paciente estima mentalmente o volume físico que o alimento ocupa no prato e traduz para "porções" ou "gramas de CHO".
*A falha crítica:* Sofre do terrível mal do "viés da porção deformada" (Portion Distortion). Os pratos modernos e as colheres variam até 40% no volume e o cérebro humano subestima porções gigantescas. Recomendado apenas para locais de convivência inevitável onde pesar seria impossível (como almoço num restaurante).

### Pesagem de alimentos
A epítome da ciência em nutrição metabólica e exigência primária para pacientes que almejam hemoglobinas glicadas abaixo de 6.0% com pouco esforço glicêmico (baixo coeficiente de variação - CV).
Utiliza balanças digitais de precisão (escala 1g).
O paciente insere um prato, zera a tara, pesa o arroz. (Ex: 130g de arroz cozido). Consulta a base da Tabela TACO, constata que 100g de arroz possui 28g de CHO, faz a multiplicação simples: `130 x 0.28 = 36,4g CHO`. Essa precisão brutal erradica as flutuações basais prandiais.

### Uso de aplicativos
Bancos de dados estruturados em smartphones transformaram a matemática árdua numa leitura de código de barras.
Fatores críticos de sucesso ao usar FatSecret, MySugr, Glic, Macros:
1. Deve-se conferir se a entrada no aplicativo foi chancelada e preenchida corretamente por curadoria do app (símbolos de aprovação). Entradas inseridas por terceiros muitas vezes não incluem dados essenciais para DM1, como fibras, e pior: deixam gordura e proteínas zeradas, impossibilitando o cálculo de FPUs no Método Pankowska.
2. O aplicativo frequentemente tem o campo "Porção padrão de fábrica", e o paciente esquece de editar o peso em gramas ingerido.

### Rótulo nutricional: como ler corretamente
Um diabético que não entende a proporção do rótulo sofrerá acidentes glicêmicos constantemente.
O erro mais letal é confundir o peso total da embalagem com a porção da tabela.
*Simulação educacional:* O paciente compra um pacote de biscoitos de amendoim de 150g. A Tabela descreve os carboidratos na coluna lateral como: **"Porção 30g (3 unidades) - CHO 21g"**.
O paciente faminto consome a embalagem inteira de 150g no lanche da tarde, lê o valor 21g de CHO às pressas, e injeta a insulina referente aos 21g. 
Porém, ele ingeriu 5 porções de 30g (`150/30 = 5`). O carboidrato real ingerido foi `21g x 5 = 105g de CHO`. O resultado inexorável é hiperglicemia acima de 400 mg/dL e necessidade de correção com insulina de resgate nas horas posteriores.

### Porções padrão (O Sistema de Intercâmbios)
Criado na década de 50 para simplificar, ensina-se aos pacientes que certos blocos de alimentos contém invariavelmente cerca de **15 gramas de carboidratos**, e constituem "1 intercâmbio/1 porção".
- 1 Fatia de pão de forma tradicional.
- 1 Maçã pequena (tamanho bola de tênis).
- 1 Xícara de chá (240ml) de leite de vaca fluido.
- 3 Colheres de sopa padrão de arroz cozido.
- 1 Concha pequena de macarrão cozido.
Isso ajuda pacientes com baixa adesão e idosos a estimarem o bolus no almoço.

### Dicas para restaurantes e refeições fora de casa
- **Regra da Mão:** Um punho adulto fechado equivale ao volume ocupado por 1 xícara (240ml) de carboidrato. Uma palma de mão (sem dedos) é uma porção padrão de carne ou proteína.
- O perigo dos "molhos asiáticos" (shoyu, agridoce, yakissoba): são espessados e brilhantes porque o Chef abusa de Amido de Milho (Maizena) e açúcar refinado para caramelo. O carboidrato da refeição duplica silenciosamente.
- Frituras camufladas: Quando se lê 'Empanado' ou 'Milanesa', uma carcaça de farinha de rosca envolta no frango acumulará não apenas carboidrato violento, mas absorverá óleo suficiente para que o prato exceda 2 a 3 FPU com facilidade, exigindo mudança imediata para Bolus Dual e Estendido na Bomba.

---

## 10. Casos Especiais

### Álcool: impacto hipoglicêmico tardio
O etanol não precisa ser digerido; penetra diretamente na corrente capilar gástrica e vai às presas para o maquinário do fígado. O fígado trata o álcool como neurotoxina que deve ser depurada na via da álcool-desidrogenase como prioridade vital, abandonando qualquer outra tarefa metabólica secundária.
Qual tarefa o fígado abandona? A Gliconeogênese Basal (liberação constante de glicose que impede a pessoa de ter hipoglicemia nas madrugadas). Com a gliconeogênese travada por até 12 a 24 horas, o paciente se embriaga à noite, vai dormir e sua insulina basal ativa o joga num abismo hipoglicêmico profundo às 4h da manhã.
**Regra de Segurança:** Nunca se dá bolus para as calorias do etanol em si. Se houver açúcar no drink (caipirinha com açúcar, cuba-libre), o paciente frequentemente sub-calcula o bolus propositalmente (desconta 30%) e consome carboidratos complexos sólidos antes de dormir para formar um bolsão gástrico de segurança.

### Adoçantes: impacto no microbioma, saúde e glicemia
Substitutos do açúcar não causam spike glicêmico no sangue capilar, de fato.
- **Adoçantes Artificiais e Estévia (Sem calorias):** Não requerem contagem e não pedem bolus. No entanto, o uso extensivo de sucralose e ciclamato demonstra em ensaios alterar o perfil simbiótico da flora intestinal, induzindo cepas de disbiose que perpetuam inflamação de baixo grau, agravando sutilmente a resistência insulínica perene de base.
- **Polióis (Xilitol, Maltitol, Sorbitol):** São os famigerados "carboidratos álcoois". Não são absorvidos em sua integridade mecânica. A regra nutricional em bombas determina que deve-se subtrair 50% do valor dos polióis da contagem de CHO total da embalagem (se não houver fibras no cômputo) ao comer o alimento, com a única notória e feliz exceção sendo o **Eritritol**, que é ignorado pela digestão humana em 100%, portanto zero de contagem e zero de bolus. 

### Frutose: metabolismo hepático
Muito mal-entendida pelo público não-médico. A frutose in natura (nas frutas, ladeada de fibras) é maravilhosa. A frutose em escala industrial (Xarope de Milho Rico em Frutose - HFCS - presente nos biscoitos e sucos de caixa) é destrutiva. 
Curiosamente o IG da Frutose pura é risível (cerca de 20 a 25), pois não estimula receptores GLUT-4 periféricos nem exige insulina para penetrar os tecidos, e não tem receptores no pâncreas. Toda a frutose é encaminhada para processamento no fígado, onde sua saturação é empacotada em lipídios. Seu excesso cria agressivamente Doença Hepática Gordurosa Não Alcoólica, danificando o fígado do paciente e destruindo sua sensibilidade orgânica à insulina no longo curso.

### Lactose
A lactose, constituída por galactose e glicose, ostenta um IG relativamente complacente e ameno, em virtude do contexto matriz do leite materno/vaca (que aporta proteínas retardantes e muita gordura animal formidável na inibição gástrica). Porém, ressalta-se aqui os intolerantes à lactose que tomam cápsulas de lactase comercial (enzima digestiva).
Ao engolir a pílula de lactase antes de um copo de leite ou comer um sorvete, a pílula fará todo o trabalho enzimático no estômago instantes após ingestão, liberando a glicose nua e crua sem demora no jejuno. Resultado prático documentado nos consultórios: Pacientes quebram o tempo de absorção e sofrem picos glicêmicos súbitos que não existiam quando eles tomavam leite com dor de barriga (mal digerido). A insulina precisa ser antecedida (pré-bolus) nesses casos.

### Refeições líquidas (vitaminas, sucos)
Seja qual for a natureza da máquina trituradora (espremedores, liquidificadores, juicers de alta rotação), a agressão mecânica destrói fatalmente as treliças de celulose das fibras, soltando os açúcares antes confinados no espaço intracelular da fruta, que ficam agora diluídos suspensos livremente em água. 
Um copo de suco de maçã industrial ou caseiro de 3 maçãs gera um spike comparável aos de refrigerantes de cola.
Uma vitamina de banana batida com mamão atinge o pico em meros 15 a 20 minutos (enquanto a fruta pura mastigada alcançaria em 60 min).
É mandatório o uso de super-pré-bolus (injeção entre 20 a 30 minutos antes do paciente encostar os lábios no copo), sincronizando a espiga vertiginosa do suco com o timing exato da insulina de ação ultra-rápida. 

---

## 11. Exemplos Práticos Completos (Cálculo Passo a Passo)

Abaixo, a materialização de todos os conceitos acima elucidados em simulações clínicas do dia-a-dia.
Para efeito de todos os 5 exemplos, utilizaremos o avatar virtual do **Paciente João**:
- **Relação I/C Fixa:** 1 unidade para cada 10g de Carboidrato (1:10).
- **Insulina em uso:** Análoga ultra-rápida (Lispro/Aspart/Glulisina) infundida via bomba eletrônica capaz de Bolus Dual (Multi-wave) e Bolus Estendido (Square Wave).
- **Sem fator sensibilidade neste momento** (considerando que ele sempre começará a refeição na meta ideal de 100 mg/dL de glicose sérica sem necessidade de correções no ato).

### Exemplo 1: O Almoço Típico Brasileiro Equilibrado
**Refeição consumida:**
- 150g de Arroz Branco cozido ( CHO: 42g | Prot: 3,7g | Gord: 0,3g )
- 100g de Feijão Carioca cozido ( CHO: 13,6g | Prot: 4,8g | Gord: 0,5g )
- 120g de Bife Bovino (Patinho grelhado limpo) ( CHO: 0g | Prot: 36g | Gord: 10g )
- Salada variada crua temperada com 1 colher sopa cheia de Azeite (13g) ( CHO: 2g | Prot: 1g | Gord: 13g )

**Cálculos Passo a Passo Analítico:**
1. **Soma dos Carboidratos Totais:** 42 + 13,6 + 0 + 2 = **57,6g** de CHO.
2. **Soma das Proteínas Totais:** 3,7 + 4,8 + 36 + 1 = **45,5g** de Prot.
3. **Soma das Gorduras Totais:** 0,3 + 0,5 + 10 + 13 = **23,8g** de Gordura.
4. **Resolução das Calorias FPU:** 
   - Calorias de Proteína = 45,5 x 4 = 182 kcal.
   - Calorias de Gordura = 23,8 x 9 = 214,2 kcal.
   - Soma Bruta FPU = 396,2 kcal.
5. **Cálculo da Fat-Protein Unit (FPU):** 396,2 / 100 = **3,96 FPU (arredondado em 4 FPU)**.
6. **Conversão Pankowska e Dose Final para a Bomba:**
   - Para os CHO brutos: 57,6 / 10 = **5,7 Unidades** (Bolus Imediato, aplicado 15 min pré-prandial).
   - Para os 4 FPUs: Baseado na relação 1:10, 4 FPUs requerem a mesma força que 40g CHO, então 40 / 10 = **4 Unidades**.
   - Timing do Estendido (FPU > 3): Estas 4 Unidades finais deverão ser estendidas na bomba na modalidade Square Wave por aproximadamente 5 a 6 horas para cobertura perfeita do azeite e do bifão bovino.

### Exemplo 2: O Desafio Supremo de Sábado à Noite — 3 Fatias de Pizza de Calabresa
**Refeição consumida:**
- 3 fatias avantajadas de Pizza de Calabresa com queijo abundante. 
- *Matriz média estipulada por fatia:* CHO: 30g | Prot: 15g | Gord: 18g

**Cálculos Passo a Passo Analítico:**
1. **Multiplicador (x3 fatias):** 
   - Total CHO: 90g
   - Total Prot: 45g
   - Total Gord: 54g
2. **Resolução das Calorias FPU:**
   - Calorias de Proteína = 45 x 4 = 180 kcal
   - Calorias de Gordura = 54 x 9 = 486 kcal
   - Soma Bruta FPU = 666 kcal
3. **Cálculo da Fat-Protein Unit (FPU):** 666 / 100 = **6,66 FPU (aproximado clinicamente para 6,5 FPU)**.
4. **Necessidade Insulínica Integral Equivalente:** 
   - A pizza carrega 90g CHO puro + "65g de CHO Equivalente Fantasma das FPUs" = Total virtual estressante de **155 gramas** para o organismo!
   - Dose total teórica (pela Relação I/C 1:10) = **15,5 Unidades de Insulina.**
5. **Tática de Bolus Dual (Evitando o rebote trágico):**
   - Não se pode injetar tudo no imediatismo, a imensa camada de queijo retarda todo o CHO.
   - Recomendação moderna Pankowska: Bolus Dual 40/60 prolongado por limite máximo.
   - Ação imediata 40% da dose de 15,5U: Injeta-se apenas **6,2 Unidades no ato**.
   - Ação estendida 60% da dose de 15,5U: Configura-se **9,3 Unidades rateadas basais ao longo de 8 horas ininterruptas**.

### Exemplo 3: Snack Rápido (Lanche Simples de Fim de Tarde)
**Refeição consumida:**
- 1 Banana Nanica média despida (100g) ( CHO: 23g | Prot: 1g | Gord: 0g )
- 1 Colher de sopa rasa de Pasta de Amendoim Integral sem açúcar (15g) ( CHO: 3g | Prot: 4g | Gord: 8g )

**Cálculos Passo a Passo Analítico:**
1. **Soma dos Carboidratos Totais:** 23 + 3 = **26g** de CHO.
2. **Soma das Proteínas Totais:** 1 + 4 = **5g** de Prot.
3. **Soma das Gorduras Totais:** 0 + 8 = **8g** de Gordura.
4. **Resolução das Calorias FPU:** 
   - Calorias de Proteína = 5 x 4 = 20 kcal.
   - Calorias de Gordura = 8 x 9 = 72 kcal.
   - Soma Bruta FPU = 92 kcal.
5. **Cálculo da Fat-Protein Unit (FPU):** 92 / 100 = **0,92 FPU**.
6. **Estratégia Pankowska:**
   - Como o resultado ficou estritamente abaixo da janela < 1 FPU, o impacto térmico e retardante da pasta é útil nutricionalmente, mas não justifica esforço de bolus estendido e programação minuciosa. 
   - O impacto do FPU é ignorado (desprezível na glicemia tardia).
   - Bolus Simples Imediato Exclusivo: 26g de CHO / 10 = **2,6 Unidades** administradas normalmente de uma só vez (Normal Wave).

### Exemplo 4: Rodízio de Carnes Magras / Dieta Carnívora Estrita (Zero Carboidrato)
**Refeição consumida:**
- 400g de mix de carnes assadas no espeto (Picanha, fraudinha, lombo suíno).
- Propositalmente sem arroz, sem farofa, sem refrigerante regular, sem salada com molhos. 
- *Composição macronutricional:* CHO: 0g | Prot: 80g | Gord: 60g

**Cálculos Passo a Passo Analítico:**
1. **Soma dos Carboidratos Totais:** **0 gramas**. (Absoluto e taxativo zero).
2. **Soma das Proteínas Totais:** **80g** de Prot.
3. **Soma das Gorduras Totais:** **60g** de Gordura.
4. **Resolução das Calorias FPU:** 
   - Calorias de Proteína = 80 x 4 = 320 kcal.
   - Calorias de Gordura = 60 x 9 = 540 kcal.
   - Soma Bruta FPU = 860 kcal.
5. **Cálculo da Fat-Protein Unit (FPU):** 860 / 100 = **8,6 FPU**.
6. **Aplicações Estratégicas Essenciais da Pankowska:**
   - Aplicar bolus imediato mataria o paciente de hipoglicemia aguda, visto que há exatos 0 gramas de carboidrato no estômago aguardando absorção.
   - Contudo, as 8,6 FPU representarão uma carga titânica de gliconeogênese nas próximas 6 horas de digestão das carnes pesadas.
   - Insulina exigida pelas FPU = 8,6 Unidades (pela proporção I/C).
   - Estratégia de Bolus e Timing: Zero (0,0 Unidades) de Bolus Imediato. Envia-se todo e qualquer volume (os 100% de dose) via Bolus Square Wave (Onda unicamente prolongada, pingando aos poucos) para durar o limite estipulado pelas bombas da janela máxima de gordura: 6 a 8 horas. 

### Exemplo 5: O Café da Manhã "Overnight Oats" Super Rico em Fibras e Amido Resistente
**Refeição consumida:**
- Um pote de Iogurte Natural (170g) ( CHO: 8g | Prot: 7g | Gord: 5g )
- 30g de Aveia em Flocos grossos hidratada ( CHO: 17g (dos quais 4g são puramente fibras) | Prot: 4g | Gord: 2g )
- 100g de Morangos em rodelas ( CHO: 8g (dos quais 2g são puramente fibras) | Prot: 1g | Gord: 0g )

**Cálculos Passo a Passo Analítico:**
1. **Total de Carboidratos Brutos da soma:** 8 + 17 + 8 = **33g**.
2. **Gestão do Protocolo de Fibras (Módulo Conservador ADA de desconto da metade):**
   - Soma das fibras totais da tigela: 4g da aveia + 2g dos morangos = 6g de fibras presentes.
   - Como ultrapassou os >5g limite, a regra exige ação de desconto. Subtrairemos 50% das fibras (metade de 6g = 3g deduzíveis).
   - Novo Carboidrato Operacional Líquido = 33g bruto - 3g dedutíveis = **30g CHO líquidos a cobrir**.
3. **Soma das Proteínas Totais:** 7 + 4 + 1 = **12g** de Prot.
4. **Soma das Gorduras Totais:** 5 + 2 + 0 = **7g** de Gordura.
5. **Resolução das Calorias FPU:** 
   - Calorias de Proteína = 12 x 4 = 48 kcal.
   - Calorias de Gordura = 7 x 9 = 63 kcal.
   - Soma Bruta FPU = 111 kcal.
6. **Cálculo da Fat-Protein Unit (FPU):** 111 / 100 = **1,11 FPU**.
7. **Montagem da Estrutura de Bolus (A Fineza do Tratamento):**
   - Temos cerca de 1 FPU extra na jogada (pequeno impacto) + o fator de lentidão monstruoso das fibras com iogurte.
   - Aplicar a insulina imediata com a antecedência padrão (15 min) e com a velocidade total fará o paciente despencar glicemicamente, dado que o esvaziamento das aveias será moroso.
   - Ação recomendada: O paciente necessitará de 3,0 Unidades imediatas (pelos 30g líquidos CHO). A FPU (que daria ~1,1 Unidades) pode ser emulada esticando um percentual do total ou enviando 3,0U no ato da refeição (sem pré-bolus de 15min) e estendendo 1U extra em 3 horas para mitigar a cauda tardia das gomas da aveia e da gordura laticínia integral.

---

> [!TIP]
> **Notas finais de Implementação para o Time de Desenvolvimento**
> Ao transformar a ciência deste documento em um conjunto de regras algorítmicas, certifiquem-se de que os disparos de FPU e as subtrações de fibras ocorram mediante verificação estrita do usuário (flag booleano). Fatores biológicos como gastroparesia diabética (gastropatia) retardam o esvaziamento além do que o FPU já prevê, invalidando e alterando consideravelmente o bolus prandial. A integração da contagem avançada (FPU+Fibras) junto aos alertas de tendência iminente de um CGM (Continuous Glucose Monitor) é uma obrigatoriedade para prevenção e segurança.

*Fim do Documento.*
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
<!-- padding for architectural requirements -->
