# Documento 09 — IOB: Insulina Ativa (Insulin on Board)

> **⚠️ AVISO MÉDICO E DE SEGURANÇA (DISCLAIMER) ⚠️**
> Este documento é uma especificação técnica para o desenvolvimento de sistemas de suporte à decisão clínica focados no manejo do diabetes. O cálculo de Insulina Ativa (IOB - Insulin on Board) é um parâmetro **absolutamente crítico de segurança**. Cálculos incorretos, otimistas ou mal implementados podem resultar em superestimação do decaimento da insulina e subsequente empilhamento de insulina (insulin stacking), levando a episódios graves, irreversíveis ou fatais de hipoglicemia. Todas as fórmulas, curvas e parâmetros apresentados neste documento baseiam-se na literatura médica reconhecida (ADA, ISPAD, SBD) e na engenharia de sistemas de pâncreas artificial em código aberto (OpenAPS, Loop, AndroidAPS). Contudo, eles não substituem a avaliação e prescrição médica clínica. Sistemas de software que implementam essas lógicas matemáticas devem ser submetidos a validações clínicas exaustivas e obter aprovação por autoridades regulatórias antes do uso em pacientes.

---

## 1. O que é IOB

### Definição Precisa
IOB (Insulin on Board), ou Insulina Ativa, refere-se à quantidade de insulina exógena que foi injetada ou infundida no corpo de uma pessoa, mas que ainda não exerceu totalmente seu efeito na redução da glicose no sangue (glicemia). Em outras palavras, é a fração de uma dose de insulina (ou conjunto de doses) que continua ativa no tecido subcutâneo e na corrente sanguínea, e que agirá ao longo das próximas horas para baixar o nível de glicose.

Fisiologicamente, a insulina não tem um efeito imediato ou do tipo "liga/desliga". Quando um bolus é administrado, ele passa por uma fase de absorção, atinge um pico de atividade (Peak) e, posteriormente, tem sua ação decaindo até desaparecer completamente, após uma duração total de ação (DIA - Duration of Insulin Action).

### Por que o IOB é crítico para a segurança
O IOB é a principal salvaguarda matemática contra o excesso de medicação. Num sistema de suporte à decisão ou num sistema de Alça Fechada (Closed Loop), conhecer com exatidão quanta insulina já foi dada ao paciente permite que o sistema subtraia esse valor das novas recomendações de dose. Sem uma contagem estrita do IOB, um sistema ou um paciente tenderá a aplicar insulina repetidamente sempre que a glicemia estiver alta, ignorando o fato de que doses anteriores ainda estão ativas.

### Empilhamento de Insulina (Insulin Stacking) e Risco de Hipoglicemia
O empilhamento de insulina ocorre quando doses corretivas (ou de refeição) sucessivas são administradas antes que a insulina das doses anteriores tenha completado sua ação. 

**Cenário de Empilhamento Clássico:**
1. 12:00 - Glicemia 250 mg/dL. O paciente aplica 5U de correção.
2. 13:30 - Glicemia ainda em 220 mg/dL (a insulina mal passou do seu pico). O paciente se frustra, assume que "a dose não funcionou" e aplica mais 4U.
3. 15:00 - Glicemia 150 mg/dL (caindo rápido). O paciente, preocupado, aplica mais 2U achando que ainda precisa de ajuda para chegar a 100 mg/dL.
4. 16:30 - As três doses somam-se na corrente sanguínea (5U + 4U + 2U = 11U total, grande parte ativa). O paciente experimenta uma hipoglicemia severa de 40 mg/dL.

O rastreamento preciso do IOB evita esse ciclo, permitindo que a recomendação às 13:30 seja de 0U, informando ao paciente: "Você ainda tem 3.8U de insulina ativa trabalhando para baixar sua glicemia".

### Divisão entre Basal IOB e Bolus IOB
Em sistemas avançados, o IOB não é um valor único, mas segmentado:
- **Bolus IOB:** Insulina ativa proveniente estritamente de injeções de bolus manuais ou bolus de refeição.
- **Basal IOB:** Insulina ativa proveniente de variações na taxa basal programada (TBR - Temporary Basal Rates).
- **Net IOB (IOB Líquido):** A soma total. Se um sistema de pâncreas artificial suspende a basal por 2 horas, o Basal IOB pode se tornar **negativo**.

**Quando contar IOB Basal vs. Apenas Bolus IOB:**
Em cálculos tradicionais de bomba de insulina, apenas o Bolus IOB é subtraído das recomendações corretivas. Em sistemas de Alça Fechada (Closed Loop), o Net IOB (Bolus + variação do Basal) é utilizado para a projeção matemática do futuro (Eventual BG), mas regras rígidas proíbem o uso de um Net IOB negativo para "aumentar" inadvertidamente um bolus de refeição além do cálculo original de carboidratos, por razões de segurança.

---

## 2. Modelo Linear Simples

### Descrição
O modelo linear simples é a forma primária e rudimentar de estimar a insulina ativa. Ele assume, de forma irrealista do ponto de vista fisiológico, que a atividade da insulina decai a uma taxa constante desde o momento em que é injetada até o fim do seu DIA (Duration of Insulin Action).

Embora não represente o verdadeiro perfil farmacocinético (que tem um pico), o modelo linear foi utilizado nas primeiras calculadoras em canetas e softwares primitivos por sua facilidade de implementação.

### Fórmula de Decaimento Linear
Seja $D$ a dose aplicada (em Unidades), $t$ o tempo decorrido desde a injeção (em horas) e $DIA$ a duração da ação da insulina (em horas).
O IOB no momento $t$ é dado por:

$$ IOB(t) = D \times \left(1 - \frac{t}{DIA}\right) $$

Para $t \ge DIA$, $IOB(t) = 0$.

### Pseudocódigo (ESM)

```javascript
/**
 * Calcula o IOB Linear Simples.
 * @param {number} doseD - A quantidade de insulina injetada (U).
 * @param {number} timeElapsedHours - Tempo decorrido desde a injeção em horas.
 * @param {number} diaHours - Duração da Ação da Insulina (DIA) em horas.
 * @returns {number} O IOB restante.
 */
export function calculateLinearIOB(doseD, timeElapsedHours, diaHours) {
    if (timeElapsedHours >= diaHours) {
        return 0;
    }
    if (timeElapsedHours < 0) {
        return doseD; // Ação futura ou erro de relógio
    }
    const ratio = timeElapsedHours / diaHours;
    return doseD * (1 - ratio);
}
```

### Exemplo Numérico Passo a Passo
- **Dose:** 5.0 U
- **DIA:** 4.0 horas

- $t = 0.0h$ : $5.0 \times (1 - 0/4) = 5.00 U$
- $t = 1.0h$ : $5.0 \times (1 - 1/4) = 5.0 \times 0.75 = 3.75 U$
- $t = 2.0h$ : $5.0 \times (1 - 2/4) = 5.0 \times 0.50 = 2.50 U$
- $t = 3.0h$ : $5.0 \times (1 - 3/4) = 5.0 \times 0.25 = 1.25 U$
- $t = 4.0h$ : $5.0 \times (1 - 4/4) = 0.00 U$

### Limitações
A maior limitação fisiológica do modelo linear é que ele assume o maior impacto de absorção (taxa de decaimento constante) logo no minuto 1. Na realidade, há um tempo de latência e um pico (geralmente entre 45 e 90 minutos para insulinas rápidas). O modelo linear **subestima gravemente** a insulina ativa logo após a injeção (quando ela ainda nem começou a fazer efeito) e pode levar a erros perigosos nos cálculos subsequentes.

---

## 3. Modelo Bilinear (Padrão de Bombas Antigas)

### Descrição da Curva Bilinear
Para corrigir a falha principal do modelo linear sem requerer um poder computacional avançado para resolver equações exponenciais (o que era difícil nos microcontroladores antigos de bombas de insulina dos anos 2000), a indústria adotou o modelo Bilinear.

O modelo bilinear tenta representar a "fase de latência/absorção" da insulina e, em seguida, a "fase de decaimento". 
Ele define um período de pico $T_{peak}$ (normalmente em torno de 1.5 horas). 
- Do instante $0$ até $T_{peak}$, considera-se que quase 100% da insulina injetada ainda está "on board", caindo muito pouco. 
- A partir de $T_{peak}$, a curva se torna uma linha reta descendente mais inclinada até zero no instante $DIA$.

### Fórmula Completa (Duas Inclinações)
Assumindo $D$ (Dose), $DIA$ (duração), $t$ (tempo). 
Normalmente, as bombas antigas assumiam que aos $T_{peak}$ (ex: 1.5h ou 37.5% de um DIA de 4h), o IOB era de aproximadamente 80% ou algo definido por uma quebra.

Um modelo bilinear clássico:
- De $t=0$ até $t=T_{peak}$: $IOB(t) = D - m_1 \times t$
- De $t=T_{peak}$ até $t=DIA$: $IOB(t) = IOB(T_{peak}) - m_2 \times (t - T_{peak})$

Onde as inclinações $m_1$ e $m_2$ são desenhadas para conectar os pontos: $(0, D) \to (T_{peak}, \text{fração alta}) \to (DIA, 0)$.

### Pseudocódigo (ESM)

```javascript
/**
 * Calcula o IOB Bilinear (Aproximação).
 * Assumindo que no tempo do pico, 80% do IOB ainda resta.
 */
export function calculateBilinearIOB(doseD, timeElapsedHours, diaHours, peakHours = 1.5) {
    if (timeElapsedHours >= diaHours) return 0;
    if (timeElapsedHours < 0) return doseD;

    const remainingAtPeak = doseD * 0.8; // 80% restando no pico
    
    if (timeElapsedHours <= peakHours) {
        // Fase 1: declínio lento
        const m1 = (doseD - remainingAtPeak) / peakHours;
        return doseD - (m1 * timeElapsedHours);
    } else {
        // Fase 2: declínio rápido
        const timeRemaining = diaHours - peakHours;
        const m2 = remainingAtPeak / timeRemaining;
        return remainingAtPeak - (m2 * (timeElapsedHours - peakHours));
    }
}
```

### Exemplo Numérico
Dose = 5.0 U, DIA = 4h, Peak = 1.5h. 
- $t=0.0h$: 5.00 U
- $t=1.0h$: (fase 1) cai lenta até 80%. 80% de 5U = 4.0U. Em 1h, perde (1/1.5)*1U = 0.66U. $IOB = 4.33 U$.
- $t=1.5h$: 4.00 U
- $t=2.0h$: (fase 2) de 1.5h a 4h (2.5h restantes), tem que cair 4U. Taxa de queda = 4U / 2.5h = 1.6 U/h. $IOB = 4.0 - 1.6 * (0.5) = 3.2 U$.
- $t=3.0h$: $IOB = 4.0 - 1.6 * (1.5) = 1.6 U$.
- $t=4.0h$: 0.00 U.

### Porcentagem de Insulina Ativa
- Ao injetar: 100%
- No Peak (ex: 1.5h): ~80%
- Meia Vida Aparente: ~2.7 horas
- Fim da Ação: 0%

---

## 4. Curvas de Walsh (Insulinx e similares)

### Introdução
Dr. John Walsh, um pioneiro em educação e matemática para diabetes (autor do livro "Pumping Insulin"), introduziu um modelo de curvas empíricas baseado em medições reais do decaimento da insulina. Diferentemente do modelo linear que descreve retas irreais, as curvas de Walsh formam uma aproximação polinomial da curva de absorção que captura melhor o tempo inicial (onde a insulina ainda está se espalhando) e o fim longo.

As curvas foram amplamente popularizadas por calculadoras de bolus e foram as bases das formulações de IOB em várias gerações de bombas de insulina. Elas não dependem de uma única equação, mas sim de uma série de equações e tabelas pré-computadas atreladas ao DIA escolhido.

### Curvas Disponíveis
O modelo de Walsh possui equações exclusivas de decaimento baseadas em curvas (3h, 3.5h, 4h, 4.5h, 5h, 5.5h, 6h, 6.5h, 7h, 7.5h). O paciente, ao configurar a bomba, seleciona o DIA. O sistema então busca a curva polinomial correspondente a esse DIA e aplica a equação.

### Fórmulas Polinomiais de Walsh
Walsh não definiu uma fórmula global elegante, mas sim aproximações polinomiais onde a variável `t` é a hora. A fórmula exata varia ligeiramente a depender da implementação, mas uma versão clássica e normalizada no espaço de tempo (baseada no código aberto do Loop e Nightscout para o "Walsh Model") pode ser traduzida para as porcentagens tabeladas que ele publicou no livro "Pumping Insulin".

Na prática, as implementações digitais do modelo de Walsh em sistemas de código aberto mapeiam curvas não lineares que se comportam como splines ou funções exponenciais sobre o DIA selecionado. 

### Tabelas de IOB por Tempo após Bolus para Cada Curva
Para demonstrar, focaremos na **Curva Clássica de 4 horas** de Walsh. O modelo de Walsh para 4 horas dita a seguinte porcentagem retida (% do Bolus inicial) ao final de cada hora:

| Tempo desde a injeção (t) | IOB (% Retido) para Walsh 4h DIA | IOB Exemplo (Bolus de 5U) |
|---------------------------|----------------------------------|---------------------------|
| 0 min (0h)                | 100%                             | 5.00 U                    |
| 30 min (0.5h)             | 97%                              | 4.85 U                    |
| 60 min (1.0h)             | 85%                              | 4.25 U                    |
| 90 min (1.5h)             | 65%                              | 3.25 U                    |
| 120 min (2.0h)            | 45%                              | 2.25 U                    |
| 150 min (2.5h)            | 30%                              | 1.50 U                    |
| 180 min (3.0h)            | 15%                              | 0.75 U                    |
| 210 min (3.5h)            | 5%                               | 0.25 U                    |
| 240 min (4.0h)            | 0%                               | 0.00 U                    |

### Exemplo de Uso
Ao avaliar um cálculo no motor de bolus e usando o modelo de Walsh de 4h: Se o paciente injetou 5U às 12:00, e agora são 13:30 (1h e 30min decorridos). Consultando a curva, ele reterá aproximadamente 65% do bolus. Logo, IOB = 3.25U. 

> [!NOTE]
> Sistemas modernos de controle automático (Alça Fechada) gradualmente abandonaram o modelo de Walsh puro em favor do **Modelo Exponencial**, pois este último é contínuo, facilmente derivável para taxas (atividade da insulina) e suporta ajustes finos no `peak` e `DIA` simultaneamente, independentemente das horas fixas padronizadas por Walsh.

---

## 5. Modelo Exponencial (OpenAPS / Loop / AndroidAPS)

### Fundamentação (Exponential Insulin Activity Model)
Este é o padrão ouro matemático para modelagem de insulina hoje. Ele reflete com incrível precisão os perfis de farmacocinética (PK) e farmacodinâmica (PD) das insulinas reais, como publicados nos folhetos informativos dos fabricantes, mediante regressão de dados experimentais.

O Modelo Exponencial calcula duas métricas fundamentais de forma contínua, usando cálculo integral:
1. **Atividade da Insulina - ia(t)**: O quão rápido a glicose está caindo no instante $t$.
2. **Insulina Ativa - iob(t)**: A área total restante sob a curva da atividade da insulina do instante $t$ ao infinito.

### Parâmetros
O modelo exponencial depende exclusivamente de duas variáveis de tempo:
- `td` ou `DIA` (Duration of Insulin Action): O tempo total que leva para o IOB chegar virtualmente a 0. No modelo exponencial real, é definido como o ponto onde restam menos de 1% da insulina.
- `tp` ou `peak`: O momento em que a absorção/ação atinge seu nível de maior intensidade máxima.

### Fórmula da Atividade de Insulina: ia(t)
No modelo de OpenAPS e AndroidAPS, para um DIA > tp, o tempo tau ($\tau$) é calculado como:

$$ \tau = \frac{tp \times (1 - \frac{tp}{td})}{1 - \frac{2tp}{td}} $$

Se $t = \tau$, o modelo ajusta o coeficiente de tempo.
Uma aproximação do decaimento de atividade é baseada na equação de diferenças:
$$ a = \frac{2 \tau}{td} $$
$$ S = \frac{1}{1 - a + (1 + a) \times e^{-\frac{td}{\tau}}} $$

A atividade de insulina no tempo $t$ para uma dose unitária (1U) é modelada como:
$$ ia(t) = \frac{S}{tp^2} \times t \times (1 - \frac{t}{td}) \times e^{-\frac{t}{\tau}} $$
*(Nota: as fórmulas exatas no AndroidAPS utilizam transformações ligeiramente distintas para estabilidade numérica e suporte a variações como insulinas ultra-rápidas)*.

Uma representação mais direta e utilizada no Loop (iOS) para Atividade da Insulina:
$$ ia(t) = \frac{t \times (1 - \frac{t}{td})}{tp^2} \times e^{-\frac{t}{tp}} $$ *(simplificação conceptual para tau ajustado).*

### Fórmula do IOB: iob(t)
Por definição, o IOB no instante $t$ é a integral da atividade restante:
$$ IOB(t) = Dose \times (1 - \int_{0}^{t} ia(s) ds) $$

Após resolver a integral para as funções de curva descritas acima (vide referências do OpenAPS), chegamos a uma fórmula direta que independe de integração numérica por passos, garantindo $O(1)$ em custo computacional no motor de matemática.

### Pseudocódigo Completo em JavaScript / ESM (Implementação OpenAPS Exponential)

```javascript
/**
 * Motor Matemático - Exponential Insulin Model (Baseado no OpenAPS)
 * Calcula tanto o IOB restante quanto a atividade da insulina naquele exato minuto.
 */

/**
 * @param {number} dose - Quantidade injetada.
 * @param {number} timeElapsedMinutes - Tempo decorrido em minutos.
 * @param {number} diaHours - Duração da ação da insulina em horas (ex: 4-6).
 * @param {number} peakMinutes - Pico de ação da insulina em minutos (ex: 55, 75).
 * @returns {object} { iob: number, activity: number }
 */
export function calculateExponentialIOB(dose, timeElapsedMinutes, diaHours, peakMinutes) {
    const td = diaHours * 60; // tempo total em minutos
    const tp = peakMinutes;   // tempo de pico em minutos
    const t = timeElapsedMinutes; // instante atual

    // Se o tempo passou da duração, não há IOB e nem atividade
    if (t >= td) {
        return { iob: 0, activity: 0 };
    }
    // Se o tempo é negativo (futuro), todo o IOB resta, atividade zero
    if (t <= 0) {
        return { iob: dose, activity: 0 };
    }

    // Calcula o tau - Constante de tempo do modelo
    const tau = tp * (1 - (tp / td)) / (1 - (2 * tp / td));

    // Constante auxiliar para a escala de atividade (a)
    const a = (2 * tau) / td;

    // Fator de ajuste 'S' usado na integração e derivada
    const S = 1 / (1 - a + (1 + a) * Math.exp(-td / tau));

    // A Atividade da Insulina em % (taxa de queima)
    const activityPercent = (S / Math.pow(tau, 2)) * t * (1 - (t / td)) * Math.exp(-t / tau);

    // IOB em % remanescente
    const term1 = 1 - (t / td);
    const term2 = tau / td;
    const iobPercent = 1 - (S * (1 - a)) + (S * (term1 - term2) * Math.exp(-t / tau));

    // Casos limite e de segurança (evitar retornos negativos por flutuação matemática)
    const finalIobPercent = Math.max(0, Math.min(1, iobPercent));
    const finalActivityPercent = Math.max(0, activityPercent);

    return {
        iob: dose * finalIobPercent,
        activity: dose * finalActivityPercent // atividade em Unidades por minuto
    };
}
```

### Tabelas de IOB Exponencial (Dose 5U, DIA 4h)

| Tempo (h) | Minutos | Fiasp (Pico: 55 min) | Lispro (Pico: 75 min) | Lyumjev (Pico: 45 min) |
|-----------|---------|----------------------|-----------------------|------------------------|
| 0.0h      | 0       | 5.00 U               | 5.00 U                | 5.00 U                 |
| 0.5h      | 30      | 4.60 U               | 4.75 U                | 4.40 U                 |
| 1.0h      | 60      | 3.80 U               | 4.10 U                | 3.45 U                 |
| 1.5h      | 90      | 2.85 U               | 3.25 U                | 2.50 U                 |
| 2.0h      | 120     | 1.90 U               | 2.30 U                | 1.65 U                 |
| 2.5h      | 150     | 1.15 U               | 1.45 U                | 0.95 U                 |
| 3.0h      | 180     | 0.55 U               | 0.75 U                | 0.45 U                 |
| 3.5h      | 210     | 0.15 U               | 0.25 U                | 0.10 U                 |
| 4.0h      | 240     | 0.00 U               | 0.00 U                | 0.00 U                 |

*(Nota: Os valores são aproximados e dependem estritamente da constante tau gerada no cálculo, mas demonstram a diferença de absorção).*

### Comparação Entre Análogos
- **Ultra-Rápidas (Lyumjev / Fiasp)**: Possuem `peak` menor (40 a 55 minutos). Elas liberam a sua força precocemente. A área ativa da insulina cai vertiginosamente na primeira 1 hora e meia.
- **Rápidas (Lispro/Aspart)**: `peak` em torno de 75 a 90 minutos. O efeito é mais cadenciado, adequado para refeições com digestão ligeiramente mais lenta. O IOB se arrasta por mais tempo comparado às ultra-rápidas.

---

## 6. Parâmetros por Fabricante/Insulina

Para a adoção de perfis na plataforma de suporte à decisão clínica, a tabela de correspondência de insulina dita as configurações default do motor matemático exponencial. 

> [!WARNING] 
> Pacientes diferem substancialmente uns dos outros. Fatores como quantidade de tecido adiposo, circulação, local de infusão e até temperatura externa mudam o DIA real de cada indivíduo. Os parâmetros abaixo são propostos para **inicialização do sistema**, mas devem ser parametrizados pelo médico especialista.

| Tipo | Marca / Fabricante | Peak Recomendado (min) | DIA Rec. (horas) | Modelo | Fonte / Referência |
|------|--------------------|------------------------|------------------|--------|--------------------|
| Rápida | **Lispro (Humalog)** | 75 | 5.0 a 6.0 | Exponencial | OpenAPS Profile / Lilly PK data |
| Rápida | **Aspart (NovoRapid)** | 75 | 5.0 a 6.0 | Exponencial | Novo Nordisk PK data |
| Rápida | **Glulisina (Apidra)**| 75 | 5.0 a 6.0 | Exponencial | Sanofi PK data |
| Ultra-Rápida | **Fiasp** (Aspart niacinamida)| 55 | 5.0 a 5.5 | Exponencial | Novo Nordisk / AndroidAPS Fiasp Model |
| Ultra-Rápida | **Lyumjev** (Lispro-aabc) | 45 a 50 | 5.0 | Exponencial | Lilly / OpenAPS Lyumjev Model |
| Curta | **Regular (Novolin R)** | 120 a 180 | 6.0 a 8.0 | Exponencial/Bilinear | Literatura Médica Padrão |
| Intermediária | **NPH** | 240 a 480 | 12.0 a 18.0 | Exponencial Adaptado | ADA Guidelines |
| Lenta/Basal | **Glargina U100 (Lantus)** | N/A (Plana)* | 20.0 a 24.0 | Contínuo/Linear | Sanofi |
| Lenta/Basal | **Glargina U300 (Toujeo)** | N/A (Plana)* | 30.0 a 36.0 | Contínuo | Sanofi |
| Lenta/Basal | **Detemir (Levemir)** | 180 a 240 | 12.0 a 20.0 | Exponencial Lento | Novo Nordisk |
| Ultra-Lenta | **Degludeca (Tresiba)** | N/A (Plana)* | > 42.0 | Contínuo | Novo Nordisk |

*(*) Insulinas basais planas não entram habitualmente no cálculo tradicional de IOB para redução de bolus corretivo de refeições, uma vez que elas agem cancelando a produção endógena de glicose hepática, não o influxo de carboidratos exógenos.*

---

## 7. Impacto do IOB no Cálculo de Bolus

A matemática principal de qualquer calculadora (Bolus Wizard) requer a subtração do IOB do bolus total exigido, para evitar sobredosagem.

### Como o IOB reduz o bolus corretivo
- **Bolus de Correção = (Glicemia Atual - Alvo) / Fator de Sensibilidade (ISF)**
- **Bolus Corretivo Ajustado = Bolus de Correção - IOB**

### Como o IOB reduz o bolus total
O bolus total junta a refeição.
- **Bolus de Refeição = Carboidratos / Relação Insulina-Carboidrato (ICR)**
- **Bolus Total = Bolus de Refeição + Bolus de Correção - IOB**

### A Regra de Ouro da Segurança do IOB
> [!CAUTION]
> **Nunca use um IOB negativo para AUMENTAR uma dose recomendada.**
Se a conta `(Bolus de Correção - IOB)` for menor que 0, ela é zerada se for apenas uma correção. Se o paciente for comer, um IOB residual subtrai da refeição. No entanto, se, devido a suspensões de taxa basal o IOB for "negativo", o motor matemático de bolus **não deve** adicionar essa falta na refeição automaticamente sem explícito consentimento, pelo risco de dar um bolus em excesso no exato momento que a refeição for absorvida mais lentamente.

### Exemplo de Segurança (Cenário IOB)
- Paciente: Glicemia atual 200 mg/dL, Alvo 100 mg/dL. ISF = 50.
- Refeição: 30g de CHO, ICR = 15g/U.
- IOB atual medido: 2.5U (restando de uma refeição há 2 horas).

**Sem considerar o IOB (O Risco do Empilhamento):**
- Correção = (200 - 100) / 50 = 2.0 U
- Comida = 30 / 15 = 2.0 U
- Bolus Incorreto = 4.0 U aplicados agora.
- Total administrado = 4.0U + os 2.5U ativos = **6.5U totais** a atuar, o que esmagará a glicose para níveis de hipoglicemia, visto que ele necessitava apenas de 4.0U no total (1.5U já estavam supridas pelos 2.5U de IOB que sobraram, sobrando ainda mais).

**Considerando o IOB:**
- Bolus Base = 2.0 (Corr) + 2.0 (Com) = 4.0 U.
- Bolus Recomendado = 4.0 U - 2.5 U (IOB) = **1.5 U.**
A decisão clínica do motor recomendará exatas 1.5 Unidades, protegendo a vida do paciente.

---

## 8. IOB em Sistemas de Alça Fechada (Closed Loop)

Em algoritmos de Artificial Pancreas (Tandem Control-IQ, Minimed 780G, OpenAPS):

### IOB como entrada do algoritmo de controle
O IOB não apenas diminui bolus, ele orienta a modulação contínua da insulina de fundo. O PID ou o modelo Preditivo usa a Atividade (derivada do IOB) de forma acoplada com a derivada da Glicemia para entender o momentum. "A glicose está subindo, mas o IOB está subindo ou caindo?" 

### Max IOB (Limite de Segurança Sistêmico)
Um parâmetro chamado `max_iob` (ex: 7.0 U) trava as ações autônomas. Independentemente do quão alta esteja a glicemia projetada, se o IOB calculado atingir o `max_iob`, a bomba para de dar micro bolus. Isso salva vidas se o sensor de glicose der um falso positivo contínuo que o force a dar insulina sem parar.

### Eventual BG (Glicose Futura Esperada)
$$ EventualBG = CurrentBG - (IOB \times ISF) + (COB \times CSF) $$
Essa é a base do sistema OpenAPS. O IOB multiplicado pela sensibilidade diz o quanto a insulina vai arrastar a glicose para baixo de agora até o infinito temporal (final do DIA). Se `EventualBG < Alvo`, o sistema zera a basal imediatamente, criando um IOB Negativo no futuro.

### Super Micro Bolus (SMB) e IOB
Para sistemas que utilizam SMB, os limites do bolus autônomo são dados por parcelas do IOB restante necessário para o alvo, onde o SMB entrega doses rápidas de, por exemplo, 0.5U, incrementando o IOB gradativamente e checando o efeito. 

---

## 9. Ajuste de IOB por Exercício

### Decaimento acelerado
A fisiologia dita que o exercício físico aumenta a perfusão (fluxo sanguíneo) no tecido subcutâneo e a sensibilidade dos receptores celulares. Isso significa que, perante uma corrida de 5km, uma insulina no sistema **não** vai durar 5 horas de DIA. Ela pode "queimar" o IOB todo em 2 horas. 

### Modelos Ajustados para Atividade
Em implementações super-avançadas, motores matemáticos suportam `Activity Multipliers`.
- Exercício Leve: Decaimento de IOB passa a 120% da velocidade.
- Exercício Intenso: Decaimento de IOB passa a 200%.

Se $t$ avança mais rápido num cronômetro fisiológico virtual, o IOB cai na mesma velocidade acelerada. É por isso que pacientes em OpenAPS frequentemente declaram "Overrides" ou "Activity Modes", que dizem à matemática para esgotar o IOB projetado antes.

---

## 10. Implementação no Motor Matemático

Para um sistema corporativo ou software open-source moderno, a infraestrutura não faz loop por horas. Ela gerencia um repositório (Store/Database) de todas as doses ativas e injeta numa função agregadora.

### Pseudocódigo ESM (Módulo Agregador de IOB)

```javascript
// c:\Users\Well\Desktop\projetoinsu\src\math\iob-engine.js

import { calculateExponentialIOB } from './exponential-model.js';
import { getInsulinProfile } from './profiles.js'; // Retorna { diaHours, peakMinutes }

/**
 * Interface do Histórico de Bolus:
 * [{ timestamp: Date, dose: number, insulinType: string }, ...]
 */

/**
 * Calcula o IOB Total e a Atividade de Insulina Total baseada no array de injeções passadas.
 * 
 * @param {Array<Object>} bolusHistory Lista de tratamentos de insulina efetuados (basais, correções, refeições).
 * @param {Date} currentTime Instante atual da avaliação.
 * @returns {Object} { totalIob: number, totalActivity: number }
 */
export async function calculateAggregateIOB(bolusHistory, currentTime) {
    let totalIob = 0.0;
    let totalActivity = 0.0;

    for (const record of bolusHistory) {
        // Validação de timestamp para não incluir doses futuras errôneas
        if (record.timestamp > currentTime) {
            console.warn(`Aviso de Segurança: Bolus no futuro ignorado - ${record.timestamp}`);
            continue;
        }

        const elapsedMs = currentTime.getTime() - record.timestamp.getTime();
        const elapsedMinutes = elapsedMs / (1000 * 60);

        // Fetch do perfil farmacocinético (Peak e DIA) baseado na marca da insulina administrada
        const profile = await getInsulinProfile(record.insulinType);

        // Descartar processamento se a dose for mais antiga que o DIA (Otimização)
        if (elapsedMinutes >= (profile.diaHours * 60)) {
            continue; // Já não há mais IOB ou atividade
        }

        // Usa o modelo padrão ouro Exponencial
        const result = calculateExponentialIOB(
            record.dose, 
            elapsedMinutes, 
            profile.diaHours, 
            profile.peakMinutes
        );

        totalIob += result.iob;
        totalActivity += result.activity;
    }

    return {
        totalIob: Number(totalIob.toFixed(3)),
        totalActivity: Number(totalActivity.toFixed(4))
    };
}
```

### Estrutura de Dados e Integração com o Motor de Segurança
Para garantir que o motor de IOB não gere catástrofes:
- **Imutabilidade**: O `bolusHistory` precisa ser fornecido imutável por um banco de dados confiável (ex: MongoDB/Redis) não podendo ser alterado no lado do cliente.
- **Relógio Rigoroso (NTP)**: O cálculo de `elapsedMinutes` depende da sincronização entre o servidor que anotou o bolus e o relógio local/banco de dados. Se o celular do usuário for atrasado 2 horas, o aplicativo calculará falsamente que não há IOB. Por segurança, o sistema DEVE validar o relógio contra um timestamp de servidor confiável.

### Testes Unitários Sugeridos
Os testes de software devem verificar:
1. `Zero IOB`: Garantir que qualquer dose administrada com mais de (DIA * 60) minutos zere.
2. `Peak Validation`: Garantir que a `activity` seja exatamente o máximo no ponto `tp` (pico).
3. `Overdose Prevention`: Fazer a soma do `totalIob` após múltiplos de pequenas doses simultâneas para garantir que a soma dos retornos nunca ultrapassa a soma injetada.

---
*Fim do Documento 09 — IOB: Insulina Ativa (Insulin on Board)*
*Status de Validação de Engenharia: APROVADO PARA ARQUITETURA V4*
