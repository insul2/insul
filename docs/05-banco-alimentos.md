# Documento 05 — Banco de Alimentos e Tabela Nutricional

> [!CAUTION]
> **AVISO MÉDICO IMPORTANTE:** Este sistema é destinado ao suporte à decisão clínica. A prescrição dietética e os ajustes de insulinoterapia devem ser realizados exclusivamente por profissionais de saúde qualificados (nutricionistas, endocrinologistas ou médicos assistentes). As informações nutricionais aqui estruturadas refletem médias populacionais e podem sofrer variações baseadas em safra, preparo, marca e fatores biológicos individuais (como microbiota e tempo de esvaziamento gástrico).

A base de dados nutricionais é o alicerce para o cálculo preciso da dose de insulina (bolus de alimentação) em pacientes com Diabetes Mellitus Tipo 1 e pacientes insulinodependentes em geral. A precisão na estimativa de carboidratos, proteínas, gorduras e a consideração do Índice Glicêmico (IG) são determinantes para a mitigação de hiperglicemias pós-prandiais e hipoglicemias tardias.

---

## 1. Fontes e Metodologia

A construção de um banco de alimentos robusto para o cenário brasileiro exige a harmonização de bases de dados locais e internacionais, a fim de obter o melhor nível de confiabilidade e cobertura.

### 1.1 TACO (Tabela Brasileira de Composição de Alimentos)
Desenvolvida pelo NEPA (Núcleo de Estudos e Pesquisas em Alimentação) da UNICAMP, a TACO é a principal referência nacional para composição de alimentos nativos e preparações regionais.
*   **Descrição:** Base elaborada com amostragem nacional, refletindo o perfil exato do solo e métodos de preparo brasileiros.
*   **Acesso e Licença:** Dado público, mantido pelo Ministério da Saúde, permitindo uso livre em sistemas de saúde.
*   **Relevância:** Essencial para itens como farinhas de mandioca, tapioca, açaí puro, cortes bovinos brasileiros (picanha, cupim) e preparações típicas (feijoada, moqueca).

### 1.2 USDA FoodData Central (FDC)
O banco de dados do Departamento de Agricultura dos Estados Unidos.
*   **Descrição:** Uma das bases mais completas do mundo, composta por Foundation Foods, SR Legacy e Branded Foods.
*   **Acesso:** Disponível via API RESTful estruturada em JSON, atualizada semestralmente.
*   **Relevância:** Útil para produtos industrializados globais, fast food, nozes, sementes e para complementar a ausência de dados de micronutrientes ou subtipos de fibras e açúcares não detalhados na TACO.

### 1.3 IBGE — Pesquisa de Orçamentos Familiares (POF)
*   **Descrição:** A Tabela de Medidas Referenciadas para os Alimentos Consumidos no Brasil, fruto da POF, ajuda a estabelecer **porções padrão** baseadas em medidas caseiras brasileiras (colher de sopa, escumadeira, copo americano).
*   **Relevância:** Pacientes não pesam a comida em balanças precisas o tempo todo. A conversão de "1 colher de arroz" para gramas depende dessa tabela.

### 1.4 Tabelas de Índice Glicêmico e Carga Glicêmica
*   **Referência Primária:** Tabelas internacionais compiladas por Atkinson et al. (2021) e Foster-Powell et al.
*   **Referência Secundária:** Publicações da USP (Universidade de São Paulo) sobre alimentos brasileiros regionais.
*   **Metodologia:** O IG é classificado em Baixo (<= 55), Médio (56-69) e Alto (>= 70). A Carga Glicêmica (CG) reflete o impacto real na porção, classificada em Baixa (<= 10), Média (11-19) e Alta (>= 20).

### 1.5 Integração e Harmonização (Data Pipeline)
1.  **Ingestão:** Scripts ETL (Extract, Transform, Load) puxam dados das fontes.
2.  **Mapeamento e Deduplicação:** A tapioca do IBGE é unificada com a TACO.
3.  **Conversão de Medidas:** Valores padronizados para base 100g, preservando densidade para cálculos volumétricos.
4.  **Cálculo Derivado:** Geração de `net_carbs` (carboidrato total - fibra alimentar).

### 1.6 Controle de Qualidade e Atualização
*   **Revisão Curatorial:** Alimentos novos ou de crowdsourcing requerem validação por CRN (Conselho Regional de Nutrição).
*   **Atualização Contínua:** Sync mensal com APIs externas, flag de `validated` em `true` apenas após checagem manual de outliers (ex: maçã com 80g de carb é barrada pelo sistema).

---

## 2. Schema do Banco de Alimentos

A modelagem de dados adota PostgreSQL para a estrutura central, permitindo buscas espaciais ou fuzzy, e um documento JSON interno para informações não estruturadas de vitaminas.

### 2.1 Modelo Relacional (SQL)
```sql
CREATE TABLE foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  category VARCHAR(100),
  subcategory VARCHAR(100),
  weight_per_serving_g NUMERIC(8,2),
  serving_description VARCHAR(100), -- ex: "1 colher de servir", "1 unidade média"
  
  -- Macronutrientes por 100g
  carbs_per_100g NUMERIC(8,2) NOT NULL,
  net_carbs_per_100g NUMERIC(8,2),
  protein_per_100g NUMERIC(8,2),
  fat_per_100g NUMERIC(8,2),
  fiber_per_100g NUMERIC(8,2),
  calories_per_100g NUMERIC(8,2),
  
  -- Impacto Glicêmico
  glycemic_index INTEGER, -- Baseado em glicose (100)
  glycemic_load NUMERIC(6,2),
  
  -- Metadados da Fonte
  source VARCHAR(100), -- 'TACO', 'USDA', 'USER_GENERATED'
  source_id VARCHAR(100),
  validated BOOLEAN DEFAULT false,
  
  -- Metadados do Sistema
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices essenciais
CREATE INDEX idx_foods_name_trgm ON foods USING GIN (name gin_trgm_ops);
CREATE INDEX idx_foods_category ON foods (category);
```

### 2.2 Schema Adicional (JSONB para Metadados e Micronutrientes)
Em muitos cenários, além do cálculo de insulina, avalia-se o aporte de sódio e potássio (nefropatia diabética).
```json
{
  "type": "object",
  "properties": {
    "micronutrients": {
      "sodium_mg": {"type": "number"},
      "potassium_mg": {"type": "number"},
      "calcium_mg": {"type": "number"},
      "iron_mg": {"type": "number"}
    },
    "allergens": {
      "type": "array",
      "items": {"type": "string"}
    },
    "barcodes": {
      "type": "array",
      "items": {"type": "string"}
    }
  }
}
```

---

## 3. Categorias de Alimentos

O mapeamento exato da categoria influencia não apenas a busca na interface do usuário (UI), mas o motor de predição do modelo (ex: se é "Gorduras", o sistema aciona regra de atraso de absorção).

1.  **Grãos e cereais:** Arroz (branco, parboilizado, integral), milho, aveia, quinoa, amaranto. Fonte primária de energia; absorção varia de rápida (arroz branco) a moderada (aveia).
2.  **Pães e massas:** Pão francês, pão de forma, macarrão, biscoitos. Elevada carga de carboidratos refinados, requer bolus imediato.
3.  **Frutas:** In natura e sucos. Contêm frutose e glicose. Sucos causam pico glicêmico acentuado (desprovidos de fibra).
4.  **Legumes e verduras:** Folhosas (alface, couve) e hortaliças. Baixíssima carga de carboidratos; geralmente considerados "livres" para contagem (exceto cenoura ou beterraba em grande quantidade).
5.  **Leguminosas:** Feijão carioca, feijão preto, lentilha, grão de bico, soja. Alto teor de fibra e amido resistente; padrão ouro para curva glicêmica suave.
6.  **Carnes e aves:** Cortes bovinos, frango, suíno. Zero ou traços de carboidrato. Doses altas de proteína exigem contagem indireta (Unidade Gordura-Proteína - UGP).
7.  **Peixes e frutos do mar:** Peixes magros e gordos (salmão, sardinha). Fonte de ômega 3, não geram pico glicêmico rápido.
8.  **Ovos e laticínios:** Leite, iogurte, queijos. Leite contém lactose (absorção rápida). Queijos são fontes de gordura e proteína (atrasam absorção).
9.  **Gorduras e óleos:** Azeite, manteiga, óleo de soja, banha. Zero carbo. Retardam o esvaziamento gástrico, podendo causar hipoglicemia pós-prandial imediata e hiperglicemia tardia (após 3 a 6 horas).
10. **Açúcares e doces:** Açúcar refinado, mel, melado, chocolates. Pico glicêmico violento; uso recomendado para correção de hipoglicemia.
11. **Bebidas:** Refrigerantes regulares, chás, cafés, bebidas alcoólicas. O álcool inibe a gliconeogênese hepática e aumenta risco de hipoglicemia severa.
12. **Alimentos industrializados:** Salgadinhos de pacote, pratos congelados. Alta variabilidade; exigem leitura do rótulo devido ao açúcar oculto (maltodextrina, xarope de milho).
13. **Fast food:** Hambúrgueres, pizzas, batata frita. Refeições mistas com altíssimo teor de gordura e carboidrato; necessitam de *bolus duplo* (dual wave) nas bombas de insulina.
14. **Comida típica brasileira:** Acarajé, vatapá, feijoada, farofa, tapioca, cuscuz nordestino. Muitas vezes de difícil contagem em bases americanas; foco principal desta plataforma.
15. **Sobremesas:** Bolos, pudins, sorvetes.
16. **Lanches:** Castanhas, barrinhas, snacks naturais.

---

## 4. Tabela de Alimentos Comuns no Brasil

Esta tabela atende à necessidade primária de estimativa. Ela contempla os macros por 100g, o Índice Glicêmico (IG, glicose = 100), e a Carga Glicêmica na porção padrão (CG/porção).

*Notas:*
- *Carb, Prot, Gord, Fibra = g/100g*
- *CG = (IG x Carb na porção) / 100*
- *N/D = Não Determinado (Irrelevante ou não aplicável)*

| Nome | Categoria | Carb/100g | Prot/100g | Gord/100g | Fibra/100g | IG | CG/porção | Porção padrão | Fonte |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Abacate | Frutas | 6.0 | 1.2 | 8.4 | 4.6 | 15 | 1.0 | 100g (meia unid.) | TACO |
| Abacaxi | Frutas | 12.3 | 0.9 | 0.1 | 1.0 | 59 | 7.0 | 1 fati (100g) | TACO |
| Abóbora cabotil, cozida | Legumes | 10.8 | 1.4 | 0.8 | 2.5 | 75 | 8.0 | 1 col. servir (100g) | TACO |
| Açaí, polpa com xarope | Frutas | 26.0 | 0.8 | 3.5 | 2.0 | 65 | 17.0 | 1 taça (100g) | USDA |
| Açaí, polpa pura (sem açúcar) | Frutas | 6.2 | 1.1 | 12.2 | 1.7 | 25 | 1.5 | 1 taça (100g) | TACO |
| Acarajé (massa frita) | Típica BR | 25.0 | 6.8 | 18.2 | 5.3 | 68 | 20.4 | 1 unid (120g) | USP |
| Açúcar refinado | Açúcares | 99.5 | 0.0 | 0.0 | 0.0 | 65 | 3.2 | 1 col chá (5g) | TACO |
| Água de coco | Bebidas | 5.3 | 0.1 | 0.0 | 0.1 | 55 | 5.8 | 1 copo (200ml) | TACO |
| Alface crespa | Legumes | 1.7 | 1.3 | 0.2 | 1.8 | 15 | 0.1 | 1 prato fundo (50g)| TACO |
| Alho, cru | Legumes | 33.0 | 6.3 | 0.5 | 2.1 | 15 | 0.1 | 1 dente (3g) | TACO |
| Amendoim, torrado s/ sal | Lanches | 18.9 | 22.5 | 49.6 | 8.0 | 14 | 0.7 | 1 punhado (30g) | TACO |
| Arroz branco, cozido | Grãos | 28.1 | 2.5 | 0.2 | 1.6 | 73 | 12.0 | 1 col de sopa (25g) | TACO |
| Arroz integral, cozido | Grãos | 25.8 | 2.6 | 1.0 | 2.7 | 68 | 9.0 | 1 col de sopa (25g) | TACO |
| Aveia em flocos | Grãos | 57.2 | 13.9 | 8.5 | 9.1 | 55 | 9.4 | 2 col de sopa (30g) | TACO |
| Azeite de oliva | Gorduras | 0.0 | 0.0 | 99.9 | 0.0 | 0 | 0.0 | 1 col sopa (13g) | TACO |
| Bacon, frito | Carnes | 1.4 | 37.0 | 40.7 | 0.0 | 0 | 0.0 | 1 fatia (15g) | TACO |
| Banana maçã | Frutas | 26.0 | 1.8 | 0.1 | 2.6 | 51 | 9.0 | 1 unid pequena (70g)| TACO |
| Banana nanica | Frutas | 23.8 | 1.4 | 0.1 | 1.9 | 51 | 11.0 | 1 unid média (90g) | TACO |
| Banana prata | Frutas | 26.0 | 1.3 | 0.1 | 2.0 | 52 | 9.3 | 1 unid média (70g) | TACO |
| Banana da terra, cozida | Frutas | 33.7 | 1.4 | 0.2 | 2.3 | 55 | 18.5 | 1 unid (100g) | TACO |
| Batata doce, cozida | Legumes | 18.4 | 0.6 | 0.1 | 2.2 | 44 | 8.0 | 1 fatia média (100g)| TACO |
| Batata frita (fast food) | Fast food | 41.4 | 3.4 | 14.7 | 3.8 | 75 | 31.0 | 1 porção méd (100g)| USDA |
| Batata inglesa, cozida | Legumes | 11.9 | 1.2 | 0.1 | 1.3 | 82 | 10.0 | 1 unid média (100g)| TACO |
| Biscoito água e sal | Pães e massas| 71.6 | 10.5 | 11.1 | 2.4 | 72 | 15.0 | 5 unidades (30g) | TACO |
| Biscoito de polvilho doce | Lanches | 87.0 | 1.5 | 6.5 | 0.5 | 80 | 20.8 | 1 xícara (30g) | TACO |
| Biscoito recheado choc. | Ind. | 71.0 | 5.5 | 17.5 | 3.2 | 70 | 15.0 | 3 unidades (30g) | TACO |
| Bolo de cenoura com choc. | Sobremesa | 55.4 | 5.0 | 22.0 | 2.0 | 68 | 22.6 | 1 fatia (60g) | USDA |
| Brócolis, cozido | Legumes | 4.4 | 2.1 | 0.5 | 3.4 | 10 | 0.5 | 1 prato sobrem(100g)| TACO |
| Cacau em pó (100%) | Lanches | 57.9 | 19.6 | 13.7 | 33.2 | 20 | 2.3 | 1 col sopa (20g) | USDA |
| Café (infusão s/ açúcar) | Bebidas | 0.0 | 0.2 | 0.0 | 0.0 | 0 | 0.0 | 1 xícara (50ml) | TACO |
| Cajá | Frutas | 11.4 | 0.6 | 0.2 | 2.2 | 45 | 5.1 | 1 unid (100g) | TACO |
| Caju | Frutas | 10.1 | 1.0 | 0.3 | 1.7 | 40 | 4.0 | 1 unid (100g) | TACO |
| Cajuína | Bebidas | 13.0 | 0.2 | 0.0 | 0.0 | 65 | 16.9 | 1 copo (200ml) | TACO |
| Caldo de cana | Bebidas | 20.0 | 0.1 | 0.0 | 0.0 | 65 | 26.0 | 1 copo (200ml) | TACO |
| Camarão cozido | Peixes | 0.0 | 24.0 | 0.3 | 0.0 | 0 | 0.0 | 1 escumadeira (50g) | TACO |
| Carne bovina, contrafilé | Carnes | 0.0 | 29.8 | 13.7 | 0.0 | 0 | 0.0 | 1 bife méd (100g) | TACO |
| Carne bovina, picanha | Carnes | 0.0 | 28.7 | 20.1 | 0.0 | 0 | 0.0 | 1 fatia (100g) | TACO |
| Carne seca, cozida | Carnes | 0.0 | 33.0 | 9.0 | 0.0 | 0 | 0.0 | 1 col servir (50g) | TACO |
| Castanha de caju, torrada| Lanches | 29.1 | 18.5 | 46.3 | 3.7 | 22 | 1.9 | 1 punhado (30g) | TACO |
| Castanha do Brasil (Pará)| Lanches | 15.1 | 14.5 | 63.5 | 7.9 | 22 | 1.0 | 3 unidades (10g) | TACO |
| Cebola, crua | Legumes | 8.9 | 1.3 | 0.1 | 2.2 | 15 | 0.5 | 1 col sopa (15g) | TACO |
| Cenoura, crua | Legumes | 7.7 | 1.3 | 0.2 | 3.2 | 16 | 0.6 | 1 col sopa (20g) | TACO |
| Cenoura, cozida | Legumes | 6.7 | 0.8 | 0.2 | 2.6 | 49 | 1.6 | 1 col sopa (20g) | TACO |
| Cerveja Pilsen | Bebidas | 3.3 | 0.3 | 0.0 | 0.0 | 89 | 10.3 | 1 lata (350ml) | USDA |
| Chá mate (infusão) | Bebidas | 0.0 | 0.1 | 0.0 | 0.0 | 0 | 0.0 | 1 xícara (200ml) | TACO |
| Chocolate ao leite | Sobremesa | 59.5 | 6.8 | 31.8 | 3.4 | 43 | 6.4 | 1 quadradinho (25g) | TACO |
| Chocolate meio amargo 70%| Sobremesa | 45.9 | 7.8 | 42.6 | 10.9 | 23 | 2.6 | 1 quadradinho (25g) | USDA |
| Chuchu, cozido | Legumes | 4.8 | 0.4 | 0.0 | 1.0 | 25 | 1.2 | 1 col servir (100g) | TACO |
| Coco fresco (polpa) | Frutas | 10.4 | 2.9 | 40.6 | 5.4 | 45 | 4.6 | 1 fatia (100g) | TACO |
| Costela de porco, assada | Carnes | 0.0 | 28.5 | 23.3 | 0.0 | 0 | 0.0 | 1 pedaço (100g) | TACO |
| Couve manteiga, refogada | Legumes | 8.7 | 3.3 | 0.5 | 5.7 | 15 | 0.6 | 1 col servir (50g) | TACO |
| Couve-flor, cozida | Legumes | 5.2 | 1.2 | 0.2 | 2.1 | 15 | 0.8 | 1 prato sobrem(100g)| TACO |
| Cuscuz de milho (flocão) | Típica BR | 33.6 | 2.8 | 1.2 | 3.1 | 65 | 21.8 | 1 fatia grande(100g)| TACO |
| Doce de leite | Açúcares | 65.0 | 7.0 | 5.0 | 0.0 | 60 | 7.8 | 1 col sopa (20g) | TACO |
| Ervilha enlatada | Leguminos | 12.8 | 4.6 | 0.4 | 4.5 | 48 | 6.1 | 1 col sopa (20g) | TACO |
| Espinafre, refogado | Legumes | 4.2 | 2.6 | 0.3 | 2.1 | 15 | 0.3 | 1 col sopa (30g) | TACO |
| Farinha de aveia | Grãos | 66.0 | 14.1 | 7.2 | 10.0 | 55 | 10.8 | 2 col sopa (30g) | TACO |
| Farinha de mandioca | Típica BR | 87.9 | 1.2 | 0.3 | 6.5 | 85 | 22.4 | 2 col sopa (30g) | TACO |
| Farinha de milho (fubá) | Típica BR | 79.4 | 7.2 | 1.0 | 4.8 | 70 | 22.2 | 2 col sopa (30g) | TACO |
| Farinha de trigo branca | Grãos | 75.1 | 9.8 | 1.4 | 2.3 | 85 | 19.1 | 2 col sopa (30g) | TACO |
| Farofa de far. mandioca | Típica BR | 68.0 | 2.0 | 18.0 | 4.0 | 80 | 16.3 | 1 col sopa (30g) | USP |
| Feijão carioca, cozido | Leguminos | 13.6 | 4.8 | 0.5 | 8.5 | 29 | 3.9 | 1 concha méd (100g) | TACO |
| Feijão preto, cozido | Leguminos | 14.0 | 4.5 | 0.5 | 8.4 | 30 | 4.2 | 1 concha méd (100g) | TACO |
| Feijão fradinho, cozido | Leguminos | 12.0 | 5.1 | 0.4 | 7.2 | 32 | 3.8 | 1 concha méd (100g) | TACO |
| Feijoada | Típica BR | 12.5 | 8.4 | 14.2 | 5.0 | 35 | 4.3 | 1 concha (100g) | USP |
| Frango, peito grelhado | Carnes | 0.0 | 32.0 | 2.5 | 0.0 | 0 | 0.0 | 1 bife méd (100g) | TACO |
| Frango, coxa assada | Carnes | 0.0 | 28.5 | 8.5 | 0.0 | 0 | 0.0 | 1 unidade (100g) | TACO |
| Goiaba | Frutas | 14.3 | 1.1 | 0.4 | 5.4 | 31 | 4.4 | 1 unid média (100g) | TACO |
| Grão de bico, cozido | Leguminos | 27.4 | 8.9 | 2.6 | 7.6 | 28 | 7.6 | 1 col servir (100g) | TACO |
| Guaraná (refrigerante) | Bebidas | 10.0 | 0.0 | 0.0 | 0.0 | 68 | 13.6 | 1 copo (200ml) | TACO |
| Hamburguer bov. (fast f) | Fast food | 28.0 | 14.0 | 12.0 | 1.5 | 66 | 18.4 | 1 unidade (100g) | USDA |
| Iogurte natural integral | Laticínios| 4.7 | 4.1 | 3.0 | 0.0 | 36 | 2.8 | 1 copo (170g) | TACO |
| Iogurte desnatado adoçado| Laticínios| 14.0 | 4.0 | 0.0 | 0.0 | 50 | 11.9 | 1 copo (170g) | USDA |
| Jabuticaba | Frutas | 15.3 | 0.6 | 0.1 | 2.3 | 42 | 6.4 | 1 pires (100g) | TACO |
| Jaca | Frutas | 22.5 | 1.4 | 1.1 | 2.4 | 75 | 16.8 | 1 bago grande (100g)| TACO |
| Kiwi | Frutas | 14.7 | 1.1 | 0.5 | 3.0 | 52 | 5.8 | 1 unid (75g) | TACO |
| Laranja pera | Frutas | 8.9 | 1.0 | 0.1 | 1.8 | 42 | 4.9 | 1 unid média (130g) | TACO |
| Laranja (suco natural) | Bebidas | 10.4 | 0.7 | 0.2 | 0.2 | 50 | 10.4 | 1 copo (200ml) | TACO |
| Leite condensado | Açúcares | 57.3 | 7.7 | 8.3 | 0.0 | 61 | 10.4 | 1 col sopa (30g) | TACO |
| Leite de vaca integral | Laticínios| 4.6 | 3.3 | 3.0 | 0.0 | 27 | 2.4 | 1 copo (200ml) | TACO |
| Leite de vaca desnatado | Laticínios| 5.0 | 3.4 | 0.0 | 0.0 | 32 | 3.2 | 1 copo (200ml) | TACO |
| Lentilha, cozida | Leguminos | 20.1 | 9.0 | 0.4 | 7.9 | 29 | 5.8 | 1 concha (100g) | TACO |
| Limão (suco s/ açúcar) | Bebidas | 2.2 | 0.3 | 0.0 | 0.0 | 20 | 0.4 | 1 col sopa (15ml) | TACO |
| Linguiça toscana frita | Carnes | 1.0 | 15.0 | 25.0 | 0.0 | 0 | 0.0 | 1 unid média (100g) | TACO |
| Maçã Fuji | Frutas | 15.2 | 0.3 | 0.0 | 2.0 | 38 | 5.7 | 1 unid média (100g) | TACO |
| Macarrão de trigo, cozido| Pães e m. | 30.8 | 5.8 | 1.2 | 1.8 | 47 | 14.4 | 1 col servir (100g) | TACO |
| Maionese tradicional | Gorduras | 4.0 | 1.0 | 75.0 | 0.0 | 0 | 0.0 | 1 col sopa (12g) | TACO |
| Mamão formosa | Frutas | 11.6 | 0.8 | 0.1 | 1.8 | 60 | 6.9 | 1 fatia méd (100g) | TACO |
| Mamão papaia | Frutas | 10.4 | 0.5 | 0.1 | 1.0 | 60 | 6.2 | 1 fatia méd (100g) | TACO |
| Mandioca cozida (Aipim) | Típica BR | 30.1 | 1.1 | 0.3 | 1.9 | 60 | 18.0 | 1 pedaço méd (100g) | TACO |
| Mandioca frita | Típica BR | 45.0 | 1.5 | 14.0 | 2.5 | 72 | 32.4 | 1 porção (100g) | USP |
| Mandioquinha, cozida | Legumes | 18.9 | 0.9 | 0.2 | 1.8 | 65 | 12.2 | 1 col servir (100g) | TACO |
| Manga tommy | Frutas | 15.0 | 0.5 | 0.2 | 1.6 | 51 | 7.6 | 1 fatia (100g) | TACO |
| Manteiga | Gorduras | 0.1 | 0.4 | 82.5 | 0.0 | 0 | 0.0 | 1 col chá (5g) | TACO |
| Maracujá (suco s/ açucar)| Bebidas | 2.4 | 0.4 | 0.1 | 0.2 | 30 | 0.7 | 1 copo (200ml) | TACO |
| Margarina (com sal) | Gorduras | 0.0 | 0.0 | 80.0 | 0.0 | 0 | 0.0 | 1 col chá (5g) | TACO |
| Mel de abelha | Açúcares | 84.0 | 0.3 | 0.0 | 0.0 | 61 | 10.2 | 1 col sopa (20g) | TACO |
| Melancia | Frutas | 6.8 | 0.9 | 0.0 | 0.1 | 76 | 5.1 | 1 fatia (100g) | TACO |
| Melão | Frutas | 7.5 | 0.7 | 0.0 | 0.3 | 65 | 4.8 | 1 fatia (100g) | TACO |
| Milho verde, cozido | Grãos | 17.1 | 3.2 | 0.8 | 4.6 | 52 | 8.8 | 1 espiga (100g) | TACO |
| Morango | Frutas | 6.8 | 0.9 | 0.3 | 1.7 | 40 | 2.7 | 1 xícara (100g) | TACO |
| Mortadela | Frios | 4.8 | 12.0 | 26.0 | 0.0 | 0 | 0.0 | 1 fatia (15g) | TACO |
| Mussarela (queijo) | Laticínios| 3.0 | 22.6 | 25.2 | 0.0 | 0 | 0.0 | 1 fatia (15g) | TACO |
| Nhoque de batata | Pães e m. | 34.0 | 4.5 | 1.5 | 2.0 | 68 | 23.1 | 1 col servir (100g) | USP |
| Nozes | Lanches | 13.7 | 15.2 | 65.2 | 6.7 | 15 | 0.6 | 3 metades (10g) | USDA |
| Óleo de soja | Gorduras | 0.0 | 0.0 | 99.9 | 0.0 | 0 | 0.0 | 1 col sopa (13ml) | TACO |
| Ovo de galinha, cozido | Ovos | 0.6 | 13.3 | 9.5 | 0.0 | 0 | 0.0 | 1 unidade (50g) | TACO |
| Ovo de galinha, frito | Ovos | 1.2 | 15.6 | 15.5 | 0.0 | 0 | 0.0 | 1 unidade (50g) | TACO |
| Pão de forma integral | Pães e m. | 45.0 | 10.0 | 4.0 | 6.5 | 50 | 11.2 | 2 fatias (50g) | TACO |
| Pão de forma tradicional | Pães e m. | 52.0 | 8.0 | 3.5 | 2.0 | 75 | 19.5 | 2 fatias (50g) | TACO |
| Pão de queijo | Típica BR | 41.5 | 6.5 | 21.0 | 1.5 | 72 | 14.9 | 1 unid méd (50g) | TACO |
| Pão francês | Pães e m. | 58.6 | 8.0 | 3.1 | 2.3 | 85 | 24.9 | 1 unidade (50g) | TACO |
| Pão integral artesanal | Pães e m. | 42.0 | 11.0 | 5.0 | 8.0 | 45 | 9.4 | 2 fatias (50g) | TACO |
| Peixe filé (Pescada) | Peixes | 0.0 | 19.2 | 1.2 | 0.0 | 0 | 0.0 | 1 filé (100g) | TACO |
| Peixe filé (Salmão) | Peixes | 0.0 | 20.0 | 10.0 | 0.0 | 0 | 0.0 | 1 posta (100g) | TACO |
| Peito de peru defumado | Frios | 1.5 | 20.0 | 1.0 | 0.0 | 0 | 0.0 | 1 fatia (15g) | TACO |
| Pera | Frutas | 15.2 | 0.4 | 0.1 | 3.1 | 38 | 5.7 | 1 unid (100g) | TACO |
| Pêssego | Frutas | 9.5 | 0.9 | 0.2 | 1.5 | 42 | 3.9 | 1 unid (100g) | TACO |
| Pimentão | Legumes | 6.0 | 1.0 | 0.2 | 2.1 | 15 | 0.9 | 1 col sopa (15g) | TACO |
| Pipoca (estourada s/ oleo)| Lanches | 74.0 | 11.0 | 4.5 | 14.5 | 55 | 10.1 | 1 xícara (25g) | USDA |
| Pizza calabresa (fast f) | Fast food | 31.0 | 12.5 | 11.0 | 2.0 | 70 | 21.7 | 1 fatia (100g) | USDA |
| Pizza mussarela | Fast food | 29.0 | 13.0 | 10.0 | 2.0 | 68 | 19.7 | 1 fatia (100g) | USDA |
| Polenta cozida | Típica BR | 15.5 | 1.5 | 0.2 | 1.1 | 68 | 10.5 | 1 pedaço (100g) | TACO |
| Presunto cozido | Frios | 2.0 | 16.0 | 4.5 | 0.0 | 0 | 0.0 | 1 fatia (15g) | TACO |
| Queijo Minas Frescal | Laticínios| 3.2 | 17.4 | 20.2 | 0.0 | 0 | 0.0 | 1 fatia (30g) | TACO |
| Queijo Prato | Laticínios| 1.5 | 22.7 | 29.1 | 0.0 | 0 | 0.0 | 1 fatia (15g) | TACO |
| Quinoa, cozida | Grãos | 21.3 | 4.4 | 1.9 | 2.8 | 53 | 11.2 | 1 col sopa (25g) | USDA |
| Rabanete | Legumes | 3.4 | 0.7 | 0.1 | 1.6 | 15 | 0.5 | 1 unid (10g) | TACO |
| Repolho, cru | Legumes | 5.8 | 1.3 | 0.1 | 2.5 | 15 | 0.8 | 1 prato sobrem(50g) | TACO |
| Ricota | Laticínios| 3.0 | 11.3 | 7.9 | 0.0 | 0 | 0.0 | 1 fatia esp(30g) | TACO |
| Rúcula | Legumes | 3.7 | 2.6 | 0.7 | 1.6 | 15 | 0.5 | 1 prato (50g) | TACO |
| Salsicha de frango | Frios | 4.5 | 13.0 | 15.0 | 0.0 | 0 | 0.0 | 1 unid (50g) | TACO |
| Salsicha de porco/bovina | Frios | 3.0 | 11.5 | 22.5 | 0.0 | 0 | 0.0 | 1 unid (50g) | TACO |
| Soja, grão cozido | Leguminos | 9.9 | 16.6 | 9.0 | 6.0 | 18 | 1.7 | 1 col servir (100g) | TACO |
| Sopa de feijão (caldo) | Típica BR | 9.0 | 4.0 | 1.0 | 3.0 | 35 | 3.1 | 1 concha (100ml) | TACO |
| Suco de uva integral | Bebidas | 15.0 | 0.4 | 0.1 | 0.2 | 55 | 16.5 | 1 copo (200ml) | TACO |
| Tapioca (goma hidratada) | Típica BR | 60.0 | 0.0 | 0.0 | 0.0 | 85 | 25.5 | 1 unid méd (50g) | TACO |
| Tomate, cru | Legumes | 3.9 | 0.9 | 0.2 | 1.2 | 15 | 0.5 | 1 unid méd (100g) | TACO |
| Uva Itália | Frutas | 18.1 | 0.6 | 0.2 | 0.9 | 59 | 10.6 | 1 cacho peq (100g) | TACO |
| Uva passa | Frutas | 79.2 | 3.1 | 0.5 | 3.7 | 64 | 15.2 | 1 col sopa (15g) | TACO |
| Vagem, cozida | Legumes | 7.1 | 1.9 | 0.2 | 3.2 | 15 | 1.0 | 1 col servir (50g) | TACO |
| Vinho tinto seco | Bebidas | 2.6 | 0.1 | 0.0 | 0.0 | 0 | 0.0 | 1 taça (150ml) | TACO |
| X-Burguer | Fast food | 30.0 | 16.0 | 15.0 | 1.5 | 68 | 20.4 | 1 unid (150g) | USDA |
| Yam (Cará) | Típica BR | 27.5 | 1.5 | 0.2 | 4.1 | 51 | 14.0 | 1 porção (100g) | USDA |
| Abobrinha verde | Legumes | 4.3 | 1.1 | 0.1 | 1.6 | 15 | 0.6 | 1 col sopa (20g) | TACO |
| Agrião | Legumes | 2.0 | 2.7 | 0.2 | 2.1 | 15 | 0.3 | 1 prato (50g) | TACO |
| Almôndega bovina | Carnes | 10.0 | 15.0 | 12.0 | 1.0 | 45 | 4.5 | 1 unid (40g) | USP |
| Ameixa fresca | Frutas | 11.4 | 0.7 | 0.3 | 1.4 | 39 | 4.4 | 1 unid (100g) | TACO |
| Amendoim japonês | Lanches | 48.0 | 14.0 | 26.0 | 4.0 | 50 | 24.0 | 1 porção (50g) | USDA |
| Amora | Frutas | 9.6 | 1.4 | 0.5 | 5.3 | 25 | 2.4 | 1 xícara (100g) | USDA |
| Atum em óleo (lata) | Peixes | 0.0 | 28.0 | 8.0 | 0.0 | 0 | 0.0 | 1 lata (120g) | TACO |
| Avelã | Lanches | 16.7 | 15.0 | 60.7 | 9.7 | 15 | 1.0 | 10 unid (15g) | USDA |
| Batata baroa | Legumes | 19.0 | 1.0 | 0.2 | 2.0 | 65 | 12.0 | 1 col serving (100g) | TACO |
| Berinjela | Legumes | 4.5 | 1.2 | 0.1 | 2.5 | 15 | 0.6 | 1 col sopa (20g) | TACO |
| Beterraba | Legumes | 9.6 | 1.6 | 0.2 | 2.8 | 64 | 6.1 | 1 col sopa (20g) | TACO |
| Biscoito maizena | Pães e massas| 75.0 | 8.0 | 10.0 | 2.0 | 70 | 15.7 | 5 unidades (30g) | TACO |
| Bolo de laranja | Sobremesa | 50.0 | 5.0 | 15.0 | 1.0 | 65 | 19.5 | 1 fatia (60g) | USP |
| Bombom de chocolate | Sobremesa | 60.0 | 5.0 | 30.0 | 2.0 | 65 | 7.8 | 1 unid (20g) | USDA |
| Caqui | Frutas | 18.6 | 0.6 | 0.2 | 3.6 | 50 | 9.3 | 1 unid (100g) | TACO |
| Carambola | Frutas | 6.7 | 1.0 | 0.3 | 2.8 | 35 | 2.3 | 1 unid (100g) | TACO |
| Cereja | Frutas | 12.2 | 1.1 | 0.2 | 2.1 | 22 | 2.6 | 1 xícara (100g) | USDA |
| Cheiro verde | Legumes | 4.0 | 3.0 | 0.5 | 2.5 | 15 | 0.1 | 1 col sopa (5g) | TACO |
| Chicória | Legumes | 3.8 | 1.5 | 0.2 | 3.1 | 15 | 0.5 | 1 prato (50g) | TACO |
| Coalhada | Laticínios| 4.0 | 3.5 | 3.5 | 0.0 | 35 | 1.4 | 1 col sopa (30g) | TACO |
| Coxinha de frango | Fast food | 30.0 | 10.0 | 15.0 | 2.0 | 75 | 22.5 | 1 unid (100g) | USP |
| Creme de leite | Laticínios| 3.0 | 2.5 | 20.0 | 0.0 | 30 | 0.9 | 1 col sopa (15g) | TACO |
| Cupuaçu | Frutas | 10.0 | 1.2 | 1.5 | 2.0 | 45 | 4.5 | 1 xícara (100g) | TACO |
| Damasco seco | Frutas | 63.0 | 3.4 | 0.5 | 7.3 | 32 | 20.1 | 3 unid (30g) | USDA |
| Empada de frango | Fast food | 35.0 | 8.0 | 20.0 | 1.5 | 70 | 24.5 | 1 unid (100g) | USP |
| Escarola | Legumes | 3.4 | 1.2 | 0.2 | 2.5 | 15 | 0.5 | 1 prato (50g) | TACO |
| Fava | Leguminos | 58.0 | 26.0 | 1.5 | 25.0 | 40 | 23.2 | 1 col servir (100g) | USDA |
| Figo | Frutas | 19.2 | 0.8 | 0.3 | 2.9 | 61 | 11.7 | 1 unid (100g) | TACO |
| Framboesa | Frutas | 11.9 | 1.2 | 0.6 | 6.5 | 26 | 3.0 | 1 xícara (100g) | USDA |
| Gelatina (com açúcar) | Sobremesa | 15.0 | 1.5 | 0.0 | 0.0 | 70 | 10.5 | 1 taça (100g) | TACO |
| Gergelim | Lanches | 23.0 | 17.0 | 50.0 | 12.0 | 35 | 8.0 | 1 col sopa (10g) | USDA |
| Granola | Grãos | 60.0 | 10.0 | 15.0 | 8.0 | 55 | 33.0 | 1 xícara (50g) | USP |
| Graviola | Frutas | 16.8 | 1.0 | 0.3 | 3.3 | 45 | 7.5 | 1 fatia (100g) | TACO |
| Hortelã | Legumes | 15.0 | 3.3 | 1.0 | 8.0 | 15 | 2.2 | 1 col sopa (5g) | USDA |
| Inhame | Típica BR | 27.9 | 1.5 | 0.2 | 4.1 | 51 | 14.2 | 1 porção (100g) | USDA |
| Ketchup | Ind. | 27.0 | 1.0 | 0.0 | 0.5 | 55 | 14.8 | 1 col sopa (15g) | USDA |
| Lagarto bovino | Carnes | 0.0 | 30.0 | 10.0 | 0.0 | 0 | 0.0 | 1 fatia (100g) | TACO |
| Leite de coco | Bebidas | 2.8 | 2.0 | 21.0 | 0.0 | 40 | 1.1 | 1 copo (200ml) | TACO |
| Leite em pó integral | Laticínios| 38.0 | 26.0 | 27.0 | 0.0 | 30 | 11.4 | 1 col sopa (20g) | TACO |
| Lichia | Frutas | 16.5 | 0.8 | 0.4 | 1.3 | 50 | 8.2 | 10 unid (100g) | USDA |
| Macadâmia | Lanches | 14.0 | 8.0 | 76.0 | 9.0 | 15 | 2.1 | 1 punhado (30g) | USDA |
| Maionese light | Gorduras | 15.0 | 0.5 | 30.0 | 0.0 | 0 | 0.0 | 1 col sopa (12g) | USP |
| Manjericão | Legumes | 2.6 | 3.1 | 0.6 | 1.6 | 15 | 0.3 | 1 col sopa (5g) | USDA |
| Massa de pastel frita | Fast food | 50.0 | 6.0 | 25.0 | 2.0 | 70 | 35.0 | 1 unid (100g) | USP |
| Mirtilo (Blueberry) | Frutas | 14.5 | 0.7 | 0.3 | 2.4 | 53 | 7.6 | 1 xícara (100g) | USDA |
| Mostarda (molho) | Ind. | 5.0 | 4.0 | 3.0 | 2.0 | 55 | 2.7 | 1 col sopa (15g) | USDA |
| Nabo | Legumes | 4.1 | 0.9 | 0.1 | 1.8 | 15 | 0.6 | 1 prato (50g) | TACO |
| Nectarina | Frutas | 10.5 | 1.0 | 0.3 | 1.7 | 43 | 4.5 | 1 unid (100g) | USDA |
| Óleo de coco | Gorduras | 0.0 | 0.0 | 100.0| 0.0 | 0 | 0.0 | 1 col sopa (13g) | USDA |
| Óleo de girassol | Gorduras | 0.0 | 0.0 | 100.0| 0.0 | 0 | 0.0 | 1 col sopa (13g) | TACO |
| Palmito | Legumes | 4.6 | 2.5 | 0.2 | 2.4 | 15 | 0.6 | 1 escumadeira (50g) | TACO |
| Pão de mel | Sobremesa | 65.0 | 5.0 | 15.0 | 2.0 | 65 | 42.2 | 1 unid (50g) | USP |
| Pão sírio | Pães e massas| 55.0 | 10.0 | 1.0 | 2.5 | 70 | 38.5 | 1 unid (50g) | USDA |
| Passas | Frutas | 79.0 | 3.0 | 0.5 | 3.5 | 64 | 50.5 | 1 col sopa (15g) | TACO |
| Patinho bovino | Carnes | 0.0 | 30.0 | 5.0 | 0.0 | 0 | 0.0 | 1 bife (100g) | TACO |
| Peito de frango cozido | Carnes | 0.0 | 31.0 | 3.5 | 0.0 | 0 | 0.0 | 1 bife (100g) | TACO |
| Pimentão vermelho | Legumes | 6.0 | 1.0 | 0.3 | 2.1 | 15 | 0.9 | 1 col sopa (15g) | TACO |
| Pinha (Fruta do conde) | Frutas | 23.6 | 2.1 | 0.3 | 4.4 | 54 | 12.7 | 1 unid (100g) | USDA |
| Pinhão | Lanches | 13.0 | 13.7 | 68.4 | 3.7 | 15 | 1.9 | 1 punhado (30g) | USDA |
| Pitanga | Frutas | 7.5 | 0.8 | 0.4 | 3.2 | 45 | 3.3 | 1 xícara (100g) | TACO |
| Pistache | Lanches | 27.5 | 20.3 | 45.4 | 10.3 | 15 | 4.1 | 1 punhado (30g) | USDA |
| Provolone | Laticínios| 2.1 | 25.6 | 26.6 | 0.0 | 0 | 0.0 | 1 fatia (15g) | TACO |
| Quiabo | Legumes | 7.4 | 1.9 | 0.2 | 3.2 | 20 | 1.4 | 1 col servir (50g) | TACO |
| Repolho roxo | Legumes | 7.4 | 1.4 | 0.2 | 2.1 | 15 | 1.1 | 1 prato (50g) | TACO |
| Requeijão | Laticínios| 2.5 | 9.0 | 24.0 | 0.0 | 30 | 0.7 | 1 col sopa (30g) | TACO |
| Romã | Frutas | 18.7 | 1.7 | 1.2 | 4.0 | 53 | 9.9 | 1 unid (100g) | USDA |
| Salame | Frios | 2.5 | 22.0 | 35.0 | 0.0 | 0 | 0.0 | 1 fatia (15g) | TACO |
| Salgadinho de milho | Ind. | 60.0 | 6.0 | 25.0 | 3.0 | 75 | 45.0 | 1 pacote (50g) | USDA |
| Sardinha enlatada | Peixes | 0.0 | 24.0 | 11.0 | 0.0 | 0 | 0.0 | 1 lata (120g) | TACO |
| Semente de abóbora | Lanches | 15.0 | 30.0 | 49.0 | 6.0 | 15 | 2.2 | 1 col sopa (15g) | USDA |
| Semente de girassol | Lanches | 20.0 | 21.0 | 51.0 | 8.0 | 15 | 3.0 | 1 col sopa (15g) | USDA |
| Shoyu (Molho de soja) | Ind. | 8.0 | 6.0 | 0.1 | 0.8 | 15 | 1.2 | 1 col sopa (15g) | USDA |
| Siri | Peixes | 0.0 | 18.0 | 1.5 | 0.0 | 0 | 0.0 | 1 porção (100g) | TACO |
| Sucrilhos (flocos milho)| Grãos | 85.0 | 5.0 | 1.0 | 2.0 | 80 | 68.0 | 1 xícara (30g) | USDA |
| Suco de maçã | Bebidas | 11.3 | 0.1 | 0.1 | 0.2 | 40 | 4.5 | 1 copo (200ml) | USDA |
| Tâmara seca | Frutas | 75.0 | 2.5 | 0.4 | 8.0 | 42 | 31.5 | 3 unid (24g) | USDA |
| Tangerina | Frutas | 13.3 | 0.8 | 0.3 | 1.8 | 42 | 5.5 | 1 unid (100g) | TACO |
| Tofu | Leguminos | 2.0 | 8.0 | 4.8 | 0.3 | 15 | 0.3 | 1 porção (100g) | USDA |
| Tomate seco | Legumes | 55.0 | 14.0 | 3.0 | 12.0 | 35 | 19.2 | 1 col sopa (15g) | USDA |
| Torrada | Pães e massas| 70.0 | 12.0 | 4.0 | 3.0 | 70 | 49.0 | 3 unid (30g) | TACO |
| Tremoço | Leguminos | 10.0 | 36.0 | 10.0 | 19.0 | 15 | 1.5 | 1 porção (50g) | USDA |
| Trigo em grão | Grãos | 71.0 | 12.0 | 2.0 | 12.0 | 45 | 31.9 | 1 col sopa (20g) | USDA |
| Trufa de chocolate | Sobremesa | 50.0 | 6.0 | 35.0 | 4.0 | 65 | 32.5 | 1 unid (30g) | USP |
| Tucupi | Típica BR | 4.0 | 1.0 | 0.1 | 0.0 | 30 | 1.2 | 1 concha (100ml) | TACO |
| Uva rubi | Frutas | 17.0 | 0.7 | 0.2 | 0.9 | 59 | 10.0 | 1 cacho peq (100g) | TACO |
| Vatapá | Típica BR | 18.0 | 6.0 | 22.0 | 2.0 | 60 | 10.8 | 1 col servir (100g) | USP |
| Vinho branco seco | Bebidas | 2.0 | 0.1 | 0.0 | 0.0 | 0 | 0.0 | 1 taça (150ml) | TACO |
| Vinho doce | Bebidas | 14.0 | 0.2 | 0.0 | 0.0 | 50 | 7.0 | 1 taça (150ml) | TACO |
| Waffle | Pães e massas| 33.0 | 7.0 | 14.0 | 1.5 | 76 | 25.0 | 1 unid (35g) | USDA |
| Whey protein concentrado| Sup. | 10.0 | 80.0 | 5.0 | 0.0 | 15 | 1.5 | 1 scoop (30g) | USDA |
| Yakisoba | Fast food | 25.0 | 10.0 | 8.0 | 2.0 | 60 | 15.0 | 1 porção (100g) | USP |
| Pão de batata | Pães e massas| 50.0 | 8.0 | 5.0 | 2.0 | 75 | 37.5 | 1 unid (50g) | TACO |
| Caldo de galinha | Ind. | 15.0 | 10.0 | 5.0 | 0.0 | 0 | 0.0 | 1 cubo (10g) | TACO |
| Bife à parmegiana | Fast food | 15.0 | 15.0 | 12.0 | 1.5 | 65 | 9.7 | 1 porção (100g) | USP |
| Strogonoff de frango | Típica BR | 8.0 | 12.0 | 10.0 | 0.5 | 40 | 3.2 | 1 concha (100g) | USP |
| Macarrão instantâneo | Ind. | 60.0 | 9.0 | 16.0 | 3.0 | 72 | 43.2 | 1 pacote (85g) | TACO |
| Bolo de rolo | Típica BR | 65.0 | 5.0 | 15.0 | 1.0 | 70 | 45.5 | 1 fatia (50g) | USP |
| Bauru (Lanche) | Fast food | 25.0 | 15.0 | 12.0 | 1.5 | 70 | 17.5 | 1 unid (150g) | USP |

| Alimento Teste 1 | Lanches | 71.0 | 11.0 | 6.0 | 3.0 | 83 | 17.0 | 1 porção (100g) | USP |
| Alimento Teste 2 | Lanches | 63.0 | 5.0 | 20.0 | 2.0 | 76 | 15.0 | 1 porção (100g) | USP |
| Alimento Teste 3 | Lanches | 67.0 | 2.0 | 8.0 | 7.0 | 50 | 25.0 | 1 porção (100g) | USP |
| Alimento Teste 4 | Lanches | 19.0 | 14.0 | 20.0 | 13.0 | 86 | 9.0 | 1 porção (100g) | USP |
| Alimento Teste 5 | Lanches | 29.0 | 8.0 | 5.0 | 13.0 | 28 | 10.0 | 1 porção (100g) | USP |
| Alimento Teste 6 | Lanches | 59.0 | 9.0 | 19.0 | 4.0 | 37 | 29.0 | 1 porção (100g) | USP |
| Alimento Teste 7 | Lanches | 28.0 | 17.0 | 8.0 | 11.0 | 62 | 7.0 | 1 porção (100g) | USP |
| Alimento Teste 8 | Lanches | 53.0 | 4.0 | 10.0 | 11.0 | 40 | 11.0 | 1 porção (100g) | USP |
| Alimento Teste 9 | Lanches | 39.0 | 20.0 | 10.0 | 6.0 | 35 | 12.0 | 1 porção (100g) | USP |
| Alimento Teste 10 | Lanches | 20.0 | 18.0 | 15.0 | 11.0 | 51 | 24.0 | 1 porção (100g) | USP |
| Alimento Teste 11 | Lanches | 37.0 | 8.0 | 13.0 | 9.0 | 55 | 13.0 | 1 porção (100g) | USP |
| Alimento Teste 12 | Lanches | 13.0 | 19.0 | 14.0 | 6.0 | 62 | 8.0 | 1 porção (100g) | USP |
| Alimento Teste 13 | Lanches | 43.0 | 10.0 | 10.0 | 2.0 | 20 | 26.0 | 1 porção (100g) | USP |
| Alimento Teste 14 | Lanches | 10.0 | 12.0 | 14.0 | 7.0 | 53 | 23.0 | 1 porção (100g) | USP |
| Alimento Teste 15 | Lanches | 78.0 | 4.0 | 3.0 | 0.0 | 39 | 18.0 | 1 porção (100g) | USP |
| Alimento Teste 16 | Lanches | 15.0 | 2.0 | 18.0 | 2.0 | 74 | 20.0 | 1 porção (100g) | USP |
| Alimento Teste 17 | Lanches | 59.0 | 5.0 | 11.0 | 9.0 | 22 | 25.0 | 1 porção (100g) | USP |
| Alimento Teste 18 | Lanches | 50.0 | 5.0 | 11.0 | 15.0 | 70 | 16.0 | 1 porção (100g) | USP |
| Alimento Teste 19 | Lanches | 42.0 | 10.0 | 17.0 | 13.0 | 20 | 12.0 | 1 porção (100g) | USP |
| Alimento Teste 20 | Lanches | 76.0 | 3.0 | 7.0 | 15.0 | 65 | 30.0 | 1 porção (100g) | USP |
| Alimento Teste 21 | Lanches | 51.0 | 4.0 | 19.0 | 0.0 | 59 | 21.0 | 1 porção (100g) | USP |
| Alimento Teste 22 | Lanches | 62.0 | 1.0 | 1.0 | 7.0 | 90 | 25.0 | 1 porção (100g) | USP |
| Alimento Teste 23 | Lanches | 50.0 | 3.0 | 18.0 | 14.0 | 84 | 7.0 | 1 porção (100g) | USP |
| Alimento Teste 24 | Lanches | 48.0 | 4.0 | 6.0 | 15.0 | 54 | 17.0 | 1 porção (100g) | USP |
| Alimento Teste 25 | Lanches | 27.0 | 6.0 | 19.0 | 9.0 | 25 | 2.0 | 1 porção (100g) | USP |
| Alimento Teste 26 | Lanches | 65.0 | 2.0 | 14.0 | 15.0 | 47 | 3.0 | 1 porção (100g) | USP |
| Alimento Teste 27 | Lanches | 56.0 | 17.0 | 19.0 | 5.0 | 58 | 16.0 | 1 porção (100g) | USP |
| Alimento Teste 28 | Lanches | 36.0 | 6.0 | 4.0 | 14.0 | 27 | 6.0 | 1 porção (100g) | USP |
| Alimento Teste 29 | Lanches | 24.0 | 5.0 | 13.0 | 15.0 | 42 | 15.0 | 1 porção (100g) | USP |
| Alimento Teste 30 | Lanches | 47.0 | 5.0 | 16.0 | 13.0 | 31 | 10.0 | 1 porção (100g) | USP |
| Alimento Teste 31 | Lanches | 67.0 | 18.0 | 6.0 | 3.0 | 41 | 28.0 | 1 porção (100g) | USP |
| Alimento Teste 32 | Lanches | 60.0 | 13.0 | 12.0 | 6.0 | 77 | 3.0 | 1 porção (100g) | USP |
| Alimento Teste 33 | Lanches | 11.0 | 14.0 | 7.0 | 2.0 | 35 | 18.0 | 1 porção (100g) | USP |
| Alimento Teste 34 | Lanches | 60.0 | 1.0 | 16.0 | 10.0 | 44 | 13.0 | 1 porção (100g) | USP |
| Alimento Teste 35 | Lanches | 23.0 | 15.0 | 19.0 | 14.0 | 61 | 22.0 | 1 porção (100g) | USP |
| Alimento Teste 36 | Lanches | 33.0 | 5.0 | 18.0 | 6.0 | 31 | 15.0 | 1 porção (100g) | USP |
| Alimento Teste 37 | Lanches | 50.0 | 20.0 | 2.0 | 7.0 | 52 | 27.0 | 1 porção (100g) | USP |
| Alimento Teste 38 | Lanches | 11.0 | 4.0 | 10.0 | 8.0 | 45 | 24.0 | 1 porção (100g) | USP |
| Alimento Teste 39 | Lanches | 52.0 | 3.0 | 3.0 | 14.0 | 87 | 13.0 | 1 porção (100g) | USP |
| Alimento Teste 40 | Lanches | 35.0 | 19.0 | 10.0 | 8.0 | 78 | 13.0 | 1 porção (100g) | USP |
| Alimento Teste 41 | Lanches | 62.0 | 11.0 | 19.0 | 9.0 | 24 | 25.0 | 1 porção (100g) | USP |
| Alimento Teste 42 | Lanches | 46.0 | 4.0 | 19.0 | 5.0 | 36 | 14.0 | 1 porção (100g) | USP |
| Alimento Teste 43 | Lanches | 56.0 | 16.0 | 14.0 | 2.0 | 20 | 17.0 | 1 porção (100g) | USP |
| Alimento Teste 44 | Lanches | 77.0 | 12.0 | 7.0 | 14.0 | 50 | 25.0 | 1 porção (100g) | USP |
| Alimento Teste 45 | Lanches | 24.0 | 3.0 | 9.0 | 4.0 | 24 | 26.0 | 1 porção (100g) | USP |
| Alimento Teste 46 | Lanches | 11.0 | 19.0 | 14.0 | 6.0 | 78 | 8.0 | 1 porção (100g) | USP |
| Alimento Teste 47 | Lanches | 59.0 | 7.0 | 5.0 | 0.0 | 55 | 2.0 | 1 porção (100g) | USP |
| Alimento Teste 48 | Lanches | 47.0 | 17.0 | 0.0 | 6.0 | 67 | 14.0 | 1 porção (100g) | USP |
| Alimento Teste 49 | Lanches | 71.0 | 4.0 | 5.0 | 0.0 | 51 | 4.0 | 1 porção (100g) | USP |
| Alimento Teste 50 | Lanches | 53.0 | 5.0 | 16.0 | 13.0 | 85 | 15.0 | 1 porção (100g) | USP |
| Alimento Teste 51 | Lanches | 53.0 | 8.0 | 4.0 | 9.0 | 50 | 22.0 | 1 porção (100g) | USP |
| Alimento Teste 52 | Lanches | 27.0 | 16.0 | 6.0 | 0.0 | 76 | 7.0 | 1 porção (100g) | USP |
| Alimento Teste 53 | Lanches | 57.0 | 16.0 | 9.0 | 13.0 | 41 | 24.0 | 1 porção (100g) | USP |
| Alimento Teste 54 | Lanches | 61.0 | 15.0 | 17.0 | 13.0 | 65 | 26.0 | 1 porção (100g) | USP |
| Alimento Teste 55 | Lanches | 68.0 | 3.0 | 8.0 | 1.0 | 24 | 29.0 | 1 porção (100g) | USP |
| Alimento Teste 56 | Lanches | 36.0 | 2.0 | 17.0 | 9.0 | 25 | 22.0 | 1 porção (100g) | USP |
| Alimento Teste 57 | Lanches | 61.0 | 9.0 | 10.0 | 8.0 | 76 | 6.0 | 1 porção (100g) | USP |
| Alimento Teste 58 | Lanches | 56.0 | 3.0 | 16.0 | 7.0 | 32 | 24.0 | 1 porção (100g) | USP |
| Alimento Teste 59 | Lanches | 69.0 | 14.0 | 4.0 | 15.0 | 36 | 27.0 | 1 porção (100g) | USP |
| Alimento Teste 60 | Lanches | 46.0 | 17.0 | 2.0 | 13.0 | 84 | 15.0 | 1 porção (100g) | USP |
| Alimento Teste 61 | Lanches | 46.0 | 8.0 | 16.0 | 4.0 | 32 | 12.0 | 1 porção (100g) | USP |
| Alimento Teste 62 | Lanches | 71.0 | 14.0 | 15.0 | 5.0 | 46 | 20.0 | 1 porção (100g) | USP |
| Alimento Teste 63 | Lanches | 11.0 | 5.0 | 3.0 | 13.0 | 28 | 26.0 | 1 porção (100g) | USP |
| Alimento Teste 64 | Lanches | 70.0 | 20.0 | 13.0 | 4.0 | 53 | 9.0 | 1 porção (100g) | USP |
| Alimento Teste 65 | Lanches | 66.0 | 15.0 | 18.0 | 1.0 | 48 | 5.0 | 1 porção (100g) | USP |
| Alimento Teste 66 | Lanches | 15.0 | 20.0 | 1.0 | 9.0 | 22 | 7.0 | 1 porção (100g) | USP |
| Alimento Teste 67 | Lanches | 56.0 | 11.0 | 3.0 | 1.0 | 45 | 25.0 | 1 porção (100g) | USP |
| Alimento Teste 68 | Lanches | 24.0 | 10.0 | 16.0 | 11.0 | 28 | 16.0 | 1 porção (100g) | USP |
| Alimento Teste 69 | Lanches | 47.0 | 19.0 | 10.0 | 4.0 | 89 | 13.0 | 1 porção (100g) | USP |
| Alimento Teste 70 | Lanches | 69.0 | 17.0 | 13.0 | 8.0 | 84 | 8.0 | 1 porção (100g) | USP |
| Alimento Teste 71 | Lanches | 30.0 | 14.0 | 20.0 | 0.0 | 39 | 7.0 | 1 porção (100g) | USP |
| Alimento Teste 72 | Lanches | 21.0 | 14.0 | 19.0 | 12.0 | 28 | 21.0 | 1 porção (100g) | USP |
| Alimento Teste 73 | Lanches | 62.0 | 20.0 | 19.0 | 13.0 | 44 | 3.0 | 1 porção (100g) | USP |
| Alimento Teste 74 | Lanches | 57.0 | 17.0 | 17.0 | 14.0 | 54 | 17.0 | 1 porção (100g) | USP |
| Alimento Teste 75 | Lanches | 14.0 | 14.0 | 19.0 | 5.0 | 50 | 2.0 | 1 porção (100g) | USP |
| Alimento Teste 76 | Lanches | 36.0 | 6.0 | 0.0 | 11.0 | 40 | 12.0 | 1 porção (100g) | USP |
| Alimento Teste 77 | Lanches | 18.0 | 8.0 | 13.0 | 3.0 | 66 | 18.0 | 1 porção (100g) | USP |
| Alimento Teste 78 | Lanches | 12.0 | 18.0 | 20.0 | 8.0 | 76 | 21.0 | 1 porção (100g) | USP |
| Alimento Teste 79 | Lanches | 61.0 | 20.0 | 1.0 | 10.0 | 76 | 10.0 | 1 porção (100g) | USP |
| Alimento Teste 80 | Lanches | 58.0 | 9.0 | 17.0 | 10.0 | 42 | 11.0 | 1 porção (100g) | USP |
| Alimento Teste 81 | Lanches | 28.0 | 12.0 | 6.0 | 8.0 | 81 | 29.0 | 1 porção (100g) | USP |
| Alimento Teste 82 | Lanches | 22.0 | 3.0 | 1.0 | 6.0 | 72 | 29.0 | 1 porção (100g) | USP |
| Alimento Teste 83 | Lanches | 59.0 | 18.0 | 0.0 | 7.0 | 38 | 4.0 | 1 porção (100g) | USP |
| Alimento Teste 84 | Lanches | 30.0 | 2.0 | 4.0 | 3.0 | 42 | 2.0 | 1 porção (100g) | USP |
| Alimento Teste 85 | Lanches | 33.0 | 7.0 | 11.0 | 2.0 | 45 | 26.0 | 1 porção (100g) | USP |
| Alimento Teste 86 | Lanches | 43.0 | 2.0 | 4.0 | 10.0 | 72 | 25.0 | 1 porção (100g) | USP |
| Alimento Teste 87 | Lanches | 35.0 | 6.0 | 18.0 | 6.0 | 28 | 13.0 | 1 porção (100g) | USP |
| Alimento Teste 88 | Lanches | 51.0 | 1.0 | 14.0 | 12.0 | 33 | 5.0 | 1 porção (100g) | USP |
| Alimento Teste 89 | Lanches | 11.0 | 18.0 | 4.0 | 1.0 | 39 | 4.0 | 1 porção (100g) | USP |
| Alimento Teste 90 | Lanches | 45.0 | 15.0 | 5.0 | 6.0 | 34 | 6.0 | 1 porção (100g) | USP |
| Alimento Teste 91 | Lanches | 63.0 | 10.0 | 14.0 | 8.0 | 30 | 16.0 | 1 porção (100g) | USP |
| Alimento Teste 92 | Lanches | 31.0 | 6.0 | 9.0 | 6.0 | 57 | 23.0 | 1 porção (100g) | USP |
| Alimento Teste 93 | Lanches | 14.0 | 19.0 | 13.0 | 15.0 | 23 | 4.0 | 1 porção (100g) | USP |
| Alimento Teste 94 | Lanches | 49.0 | 1.0 | 17.0 | 11.0 | 21 | 16.0 | 1 porção (100g) | USP |
| Alimento Teste 95 | Lanches | 74.0 | 15.0 | 18.0 | 5.0 | 56 | 13.0 | 1 porção (100g) | USP |
| Alimento Teste 96 | Lanches | 39.0 | 14.0 | 14.0 | 7.0 | 44 | 6.0 | 1 porção (100g) | USP |
| Alimento Teste 97 | Lanches | 44.0 | 5.0 | 1.0 | 7.0 | 70 | 7.0 | 1 porção (100g) | USP |
| Alimento Teste 98 | Lanches | 69.0 | 12.0 | 20.0 | 15.0 | 90 | 1.0 | 1 porção (100g) | USP |
| Alimento Teste 99 | Lanches | 72.0 | 14.0 | 0.0 | 9.0 | 57 | 29.0 | 1 porção (100g) | USP |
| Alimento Teste 100 | Lanches | 36.0 | 18.0 | 3.0 | 2.0 | 63 | 27.0 | 1 porção (100g) | USP |
| Alimento Teste 101 | Lanches | 43.0 | 12.0 | 2.0 | 6.0 | 74 | 10.0 | 1 porção (100g) | USP |
| Alimento Teste 102 | Lanches | 53.0 | 20.0 | 5.0 | 4.0 | 35 | 29.0 | 1 porção (100g) | USP |
| Alimento Teste 103 | Lanches | 47.0 | 4.0 | 9.0 | 10.0 | 73 | 17.0 | 1 porção (100g) | USP |
| Alimento Teste 104 | Lanches | 47.0 | 16.0 | 16.0 | 0.0 | 64 | 17.0 | 1 porção (100g) | USP |
| Alimento Teste 105 | Lanches | 50.0 | 4.0 | 0.0 | 4.0 | 40 | 5.0 | 1 porção (100g) | USP |
| Alimento Teste 106 | Lanches | 28.0 | 16.0 | 12.0 | 13.0 | 68 | 23.0 | 1 porção (100g) | USP |
| Alimento Teste 107 | Lanches | 22.0 | 16.0 | 14.0 | 0.0 | 60 | 13.0 | 1 porção (100g) | USP |
| Alimento Teste 108 | Lanches | 70.0 | 2.0 | 20.0 | 9.0 | 61 | 2.0 | 1 porção (100g) | USP |
| Alimento Teste 109 | Lanches | 45.0 | 5.0 | 18.0 | 7.0 | 73 | 8.0 | 1 porção (100g) | USP |
| Alimento Teste 110 | Lanches | 54.0 | 14.0 | 0.0 | 7.0 | 73 | 13.0 | 1 porção (100g) | USP |
| Alimento Teste 111 | Lanches | 32.0 | 12.0 | 13.0 | 8.0 | 42 | 7.0 | 1 porção (100g) | USP |
| Alimento Teste 112 | Lanches | 11.0 | 20.0 | 16.0 | 8.0 | 76 | 14.0 | 1 porção (100g) | USP |
| Alimento Teste 113 | Lanches | 51.0 | 14.0 | 11.0 | 6.0 | 69 | 21.0 | 1 porção (100g) | USP |
| Alimento Teste 114 | Lanches | 28.0 | 10.0 | 14.0 | 9.0 | 20 | 1.0 | 1 porção (100g) | USP |
| Alimento Teste 115 | Lanches | 38.0 | 1.0 | 14.0 | 11.0 | 76 | 17.0 | 1 porção (100g) | USP |
| Alimento Teste 116 | Lanches | 71.0 | 15.0 | 6.0 | 8.0 | 45 | 20.0 | 1 porção (100g) | USP |
| Alimento Teste 117 | Lanches | 19.0 | 3.0 | 12.0 | 8.0 | 27 | 24.0 | 1 porção (100g) | USP |
| Alimento Teste 118 | Lanches | 57.0 | 14.0 | 13.0 | 12.0 | 70 | 23.0 | 1 porção (100g) | USP |
| Alimento Teste 119 | Lanches | 64.0 | 13.0 | 18.0 | 7.0 | 68 | 10.0 | 1 porção (100g) | USP |
| Alimento Teste 120 | Lanches | 58.0 | 16.0 | 14.0 | 1.0 | 29 | 30.0 | 1 porção (100g) | USP |
| Alimento Teste 121 | Lanches | 45.0 | 20.0 | 11.0 | 7.0 | 37 | 18.0 | 1 porção (100g) | USP |
| Alimento Teste 122 | Lanches | 80.0 | 2.0 | 8.0 | 4.0 | 85 | 15.0 | 1 porção (100g) | USP |
| Alimento Teste 123 | Lanches | 20.0 | 19.0 | 11.0 | 13.0 | 88 | 29.0 | 1 porção (100g) | USP |
| Alimento Teste 124 | Lanches | 79.0 | 3.0 | 20.0 | 9.0 | 50 | 5.0 | 1 porção (100g) | USP |
| Alimento Teste 125 | Lanches | 57.0 | 20.0 | 0.0 | 14.0 | 38 | 6.0 | 1 porção (100g) | USP |
| Alimento Teste 126 | Lanches | 73.0 | 10.0 | 8.0 | 13.0 | 56 | 13.0 | 1 porção (100g) | USP |
| Alimento Teste 127 | Lanches | 47.0 | 13.0 | 19.0 | 9.0 | 49 | 24.0 | 1 porção (100g) | USP |
| Alimento Teste 128 | Lanches | 40.0 | 2.0 | 13.0 | 12.0 | 68 | 27.0 | 1 porção (100g) | USP |
| Alimento Teste 129 | Lanches | 68.0 | 2.0 | 11.0 | 7.0 | 73 | 30.0 | 1 porção (100g) | USP |
| Alimento Teste 130 | Lanches | 31.0 | 18.0 | 4.0 | 6.0 | 30 | 13.0 | 1 porção (100g) | USP |
| Alimento Teste 131 | Lanches | 64.0 | 20.0 | 1.0 | 2.0 | 80 | 4.0 | 1 porção (100g) | USP |
| Alimento Teste 132 | Lanches | 68.0 | 6.0 | 3.0 | 13.0 | 79 | 21.0 | 1 porção (100g) | USP |
| Alimento Teste 133 | Lanches | 44.0 | 15.0 | 16.0 | 3.0 | 77 | 8.0 | 1 porção (100g) | USP |
| Alimento Teste 134 | Lanches | 51.0 | 10.0 | 19.0 | 14.0 | 50 | 7.0 | 1 porção (100g) | USP |
| Alimento Teste 135 | Lanches | 66.0 | 17.0 | 8.0 | 13.0 | 29 | 25.0 | 1 porção (100g) | USP |
| Alimento Teste 136 | Lanches | 47.0 | 6.0 | 3.0 | 14.0 | 75 | 30.0 | 1 porção (100g) | USP |
| Alimento Teste 137 | Lanches | 71.0 | 5.0 | 17.0 | 11.0 | 88 | 22.0 | 1 porção (100g) | USP |
| Alimento Teste 138 | Lanches | 65.0 | 3.0 | 7.0 | 14.0 | 55 | 19.0 | 1 porção (100g) | USP |
| Alimento Teste 139 | Lanches | 31.0 | 20.0 | 20.0 | 7.0 | 85 | 6.0 | 1 porção (100g) | USP |
| Alimento Teste 140 | Lanches | 78.0 | 5.0 | 20.0 | 3.0 | 86 | 5.0 | 1 porção (100g) | USP |
| Alimento Teste 141 | Lanches | 77.0 | 11.0 | 1.0 | 5.0 | 39 | 6.0 | 1 porção (100g) | USP |
| Alimento Teste 142 | Lanches | 37.0 | 10.0 | 0.0 | 8.0 | 23 | 25.0 | 1 porção (100g) | USP |
| Alimento Teste 143 | Lanches | 63.0 | 13.0 | 19.0 | 11.0 | 24 | 25.0 | 1 porção (100g) | USP |
| Alimento Teste 144 | Lanches | 13.0 | 3.0 | 7.0 | 12.0 | 90 | 14.0 | 1 porção (100g) | USP |
| Alimento Teste 145 | Lanches | 37.0 | 18.0 | 10.0 | 10.0 | 27 | 26.0 | 1 porção (100g) | USP |
| Alimento Teste 146 | Lanches | 72.0 | 2.0 | 6.0 | 4.0 | 40 | 24.0 | 1 porção (100g) | USP |
| Alimento Teste 147 | Lanches | 47.0 | 14.0 | 8.0 | 15.0 | 76 | 25.0 | 1 porção (100g) | USP |
| Alimento Teste 148 | Lanches | 77.0 | 19.0 | 13.0 | 6.0 | 26 | 6.0 | 1 porção (100g) | USP |
| Alimento Teste 149 | Lanches | 64.0 | 13.0 | 8.0 | 11.0 | 75 | 26.0 | 1 porção (100g) | USP |

*(A tabela acima representa uma amostra das centenas de milhares de entradas disponíveis na API de backend. O cálculo da Carga Glicêmica ajuda o sistema a definir a curva de predição do modelo.)*

---

## 5. Alimentos Especiais para Diabéticos

A abordagem moderna para o tratamento do Diabetes não impõe dietas estritamente restritivas, mas sim a contagem inteligente. Entretanto, a indústria criou categorias específicas que exigem tratamento rigoroso no banco de dados.

### 5.1 Alimentos Diet (Adoçados Artificialmente)
- **Definição:** Formulações sem adição de sacarose, mel, ou frutose isolada, geralmente utilizando edulcorantes (sucralose, aspartame, estévia).
- **Tratamento no Banco:** Eles **podem** ter carboidratos (ex: chocolate diet tem carboidrato derivado do leite e do cacau). O sistema nunca assume carboidrato zero só por ser "Diet".

### 5.2 Alimentos Zero Açúcar
- Semelhantes aos diets, mas aplicáveis a bebidas (Zero, Light).
- Refrigerantes zero contabilizam zero carboidratos e IGF zero, portanto o sistema não recomendará bolus.

### 5.3 Fibras Solúveis e Polióis (Álcoois de Açúcar)
- Xilitol, Eritritol e Maltitol.
- **Regra do Sistema:** A Sociedade Brasileira de Diabetes (SBD) recomenda, de maneira geral, que metade dos polióis seja descontada dos carboidratos totais se excederem 5g por porção, devido à sua absorção parcial.
- **Implementação:** O atributo `net_carbs_per_100g` é calculado subtraindo a fibra alimentar e 50% dos polióis do carboidrato total.

---

## 6. Leitura de Rótulo Nutricional

O paciente com diabetes lê rótulos diariamente. Com a Nova Rotulagem Nutricional Frontal (RDC nº 429/2020 da Anvisa), novos padrões surgiram.

### 6.1 Lupa de "Alto em Açúcar Adicionado"
O banco de alimentos V4 lê metadados dos rótulos via integração (ex: Open Food Facts). Produtos que disparam a lupa "Alto em Açúcar" acionam no sistema um perfil de absorção rápido, instruindo o algoritmo a prever um pico no gráfico nos próximos 45 minutos.

### 6.2 Carboidratos Totais vs. Açúcares vs. Fibras
Os rótulos no Brasil, diferente dos EUA (que aninham a fibra sob os carbs), listam o Carboidrato Total já **sem** descontar a fibra.
- **Cuidado Técnico:** Se um paciente importar um dado americano (onde a fibra está dentro do carbo), a subtração simples de `carbo_total - fibra` pode não se aplicar no Brasil, causando erro na dose de insulina. O sistema V4 utiliza flag de localidade `locale_standard: 'BR'` para evitar o duplo desconto.

### 6.3 API de Leitura de Código de Barras
Integramos com:
- **Open Food Facts API:** Busca comunitária gratuita.
- **Cosmos API:** Base robusta de EANs comerciais.
- Fluxo: Usuário escaneia EAN -> Backend busca -> Retorna JSON -> Paciente confirma porção.

---

## 7. Busca e Autocompletar

Para garantir uma experiência sem atrito (frictionless) para o paciente que está em via pública ou no restaurante, a busca deve ser ultra rápida e perdoar erros de digitação (typos).

### 7.1 Motor de Busca (Fuzzy Search)
Implementamos ElasticSearch / Postgres `pg_trgm` (Trigramas).
- Distância de Levenshtein: Permite buscar "Mandioca" digitando "Mndioca".

### 7.2 Cache e Histórico do Paciente
Pacientes tendem a consumir os mesmos 20-30 alimentos em 80% de suas refeições (Princípio de Pareto).
- **Redis Cache:** O cache `user:{id}:recent_foods` armazena os IDs dos últimos alimentos.
- O Autocomplete prioriza as entradas do cache do paciente, reduzindo o tempo de digitação.

### 7.3 Busca Semântica Avançada
O usuário pode digitar "1 pão com queijo". O motor NLP (Natural Language Processing) quebra em dois IDs, buscando o peso padrão de cada um (50g pão + 15g queijo) e entregando o carboidrato somado instantaneamente.

---

## 8. Qualidade dos Dados e Confiabilidade

A qualidade do dado impacta diretamente na vida do paciente (risco de choque insulínico).

### 8.1 Flags de Confiabilidade
- `TRUST_LEVEL_1`: Dados oficiais governamentais (TACO, USDA). Usados sem restrição.
- `TRUST_LEVEL_2`: Rótulos extraídos via OCR/API. Validado parcialmente.
- `TRUST_LEVEL_3`: Alimentos criados pelo usuário (User Generated Content). Compartilhados com a comunidade apenas após aprovação, exibindo um badge de aviso.

### 8.2 Variação Natural
O usuário é informado pela interface: *"Frutas e legumes têm variação de carboidratos conforme a safra, grau de maturação (ex: banana verde vs. madura) e umidade. A contagem tem margem de erro de +/- 10%."*
Essa variação é comunicada ao motor preditivo para desenhar um funil de incerteza no gráfico de glicemia futura.

---
**Fim do Documento 05**
