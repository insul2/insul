# LEBEN Engineering Handbook — Volume 15: Experiência, Usabilidade e Fluxos do Usuário (Fase 7)

**Auditores:** Principal Product Engineer, UX Designer Lead, Staff Frontend Engineer & Especialista em Acessibilidade  
**Projeto:** LEBEN — Plataforma de Gestão de Diabetes & Motor Clínico de Bolus (v4.0.0)  
**Data:** 06 de Agosto de 2026  
**Foco:** Usabilidade, Acessibilidade (WCAG 2.1), Arquitetura de Informação e Simplificação do Fluxo Clínico  

---

## 1. Mapeamento Completo da Arquitetura de Navegação & Rotas

### 1.1 Diagrama do Fluxo de Navegação Atual

```mermaid
graph TD
    Login[/login] --> Dashboard[/]
    Register[/register] --> Dashboard[/]

    Dashboard --> Bolus[/bolus]
    Dashboard --> Glucose[/glucose]
    Dashboard --> Foods[/foods]
    Dashboard --> Reports[/reports]

    Sidebar --> AI[/ai -> Dashboard]
    Sidebar --> Alerts[/alerts -> Dashboard]
    Sidebar --> Profile[/profile]
    Sidebar --> Settings[/settings]

    BottomNav --> Foods2[/meals -> /foods]
```

---

## 2. Diagnóstico Detalhado das Telas e Componentes

### 🔴 2.1 BUGS DE FRONTEND E NAVEGAÇÃO

#### BUG-01: Rotas Órfãs e Redirecionamentos Falsos no Menu
- **Arquivos Afetados:** [`AppRoutes.jsx:L44-L46`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/routes/AppRoutes.jsx#L44-L46) + [`Sidebar.jsx:L31`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/components/layout/Sidebar.jsx#L31)
- **Evidência:** O item de menu "LEBEN AI" no menu lateral aponta para a rota `/ai`, porém o `AppRoutes.jsx` renderiza `<DashboardPage />` nessa rota. O mesmo acontece com a rota `/alerts`. O usuário clica em "LEBEN AI" esperando um assistente clínico e é redirecionado silenciosamente de volta para o Dashboard sem aviso.
- **Impacto:** Sensação de funcionalidade quebrada ou enganosa.

#### BUG-02: `BottomNav` Mobile Estourado e Inacessível
- **Arquivo Afetado:** [`BottomNav.jsx:L6-L14`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/components/layout/BottomNav.jsx#L6-L14)
- **Evidência:** O menu inferior mobile contém **7 itens estáticos** (`Início`, `Bolus`, `Comida`, `Glicemia`, `Relatórios`, `Perfil`, `Ajustes`). Em celulares com largura $< 380\text{px}$ (iPhone SE, Androids compactos), os ícones ficam sobrepostos ou exigem rolagem horizontal (`overflow-x-auto`), com área de toque $< 32\text{px}$.
- **Violação:** WCAG 2.1 Target Size (mínimo $44 \times 44\text{px}$).

#### BUG-03: Notificações Fictícias Hardcoded no Topbar
- **Arquivo Afetado:** [`Topbar.jsx:L32-L36`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/components/layout/Topbar.jsx#L32-L36)
- **Evidência:** O dropdown de notificações exibe 3 alertas fixos mockados em memória ("Glicemia Estável", "Lembrete de Medição", "LEBEN Engine Pronta"). O ponto vermelho de notificação permanece piscando infinitamente sem integração real com o histórico do paciente.

---

### 🟠 2.2 FLUXOS QUEBRADOS E NAVEGAÇÃO INCONSISTENTE

#### FLUX-01: Rotas Duplicadas `/meals` e `/foods`
- **Arquivo Afetado:** [`AppRoutes.jsx:L40-L41`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/routes/AppRoutes.jsx#L40-L41)
- **Evidência:** O sistema possui a rota `/meals` e a rota `/foods`, ambas apontando exatamente para a mesma `<FoodSearchPage />`. Isso gera URLs inconsistentes ao compartilhar ou navegar entre o histórico de refeições e a busca de alimentos.

#### FLUX-02: Perda de Contexto e Falta de Botão Voltar no Cálculo com Alimentos
- **Arquivo Afetado:** [`FoodSearchPage.jsx`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/pages/Foods/FoodSearchPage.jsx) ➔ [`BolusCalculatorPage.jsx`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/pages/Bolus/BolusCalculatorPage.jsx)
- **Evidência:** Ao selecionar um alimento na busca de alimentos e clicar em "Calcular Bolus com Xg de Carbo", o sistema redireciona para `/bolus?carbs=45`. No entanto, na calculadora de bolus, não há nenhum indicador ou botão para retornar à busca de alimentos ou ajustar o prato.

#### FLUX-03: Desconexão dos Perfis Circadianos de ICR/ISF entre Frontend e Backend
- **Arquivo Afetado:** [`BolusCalculatorPage.jsx:L10-L15`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/pages/Bolus/BolusCalculatorPage.jsx#L10-L15)
- **Evidência:** O frontend define um array hardcoded estático `circadianProfiles` com valores idênticos (`icr: 9, isf: 32` no café da manhã) para todos os usuários do sistema, em vez de buscar os parâmetros cadastrados no perfil do paciente (`/api/v1/profile`).

---

### 🟡 2.3 MELHORIAS DE UX E REDUÇÃO DE ESFORÇO COGNITIVO

#### UX-01: Sobrecarga Cognitiva na Calculadora de Bolus (10 Campos Simultâneos)
- **Arquivo Afetado:** [`BolusCalculatorPage.jsx:L164-L260`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/pages/Bolus/BolusCalculatorPage.jsx#L164-L260)
- **Evidência:** A tela exibe simultaneamente 10 formulários/selects técnicos:
  1. Glicemia Atual (mg/dL)
  2. Carboidratos (g)
  3. Insulina Ativa (IOB - U)
  4. Tipo de Insulina
  5. Perfil de Paciente (Alvo)
  6. Absorção da Refeição
  7. Incremento de Dose
  8. Fator ISF
  9. Razão ICR
  10. Ajuste por Exercício
- **Impacto Clínico em Idosos e Leigos:** Pacientes idosos ou recém-diagnosticados sentem-se desorientados ao ter que preencher ou revisar 10 parâmetros clínicos a cada refeição.
- **Proposta de UX:** Dividir a interface em **Modo Simples (Default)** com apenas 2 campos essenciais (**Glicemia** e **Carboidratos**) e mover os 8 campos de ajuste avançado para uma aba/accordion expandível **"Ajustes Médicos Avançados"**.

#### UX-02: Ausência de Atalho de Registro Rápido no Dashboard
- **Arquivo Afetado:** [`DashboardPage.jsx`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/pages/Dashboard/DashboardPage.jsx)
- **Evidência:** O Dashboard principal exige múltiplos cliques para realizar as 3 ações diárias mais frequentes: registrar glicemia, ler sensor NFC ou calcular bolus.
- **Proposta de UX:** Adicionar um card superior de **"Ações Rápidas de 1 Clique"** (Registrar Glicemia Agora, Ler NFC, Calcular Bolus da Refeição).

---

### 🟢 2.4 SIMPLIFICAÇÕES E UNIFICAÇÃO DE COMPONENTES

| Item a Unificar / Remover | Arquivos Envolvidos | Proposta de Simplificação |
| :--- | :--- | :--- |
| **Rotas `/meals` e `/foods`** | [`AppRoutes.jsx:L40-L41`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/routes/AppRoutes.jsx#L40-L41) | Remover a rota duplicada `/meals` e manter estritamente `/foods` para busca e histórico de refeições. |
| **Menu "LEBEN AI" e "Alertas" no Sidebar** | [`Sidebar.jsx:L31`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/components/layout/Sidebar.jsx#L31) | Remover `/ai` e `/alerts` do menu lateral até que possuam páginas dedicadas, evitando links enganosos. |
| **Enxugamento do BottomNav Mobile** | [`BottomNav.jsx:L6-L14`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/components/layout/BottomNav.jsx#L6-L14) | Reduzir o menu móvel de 7 para **4 itens fundamentais**: `Início` (`/`), `Bolus` (`/bolus`), `Glicemia` (`/glucose`), `Alimentos` (`/foods`). |
| **Unificação da Busca no Topbar** | [`Topbar.jsx:L41-L50`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/components/layout/Topbar.jsx#L41-L50) | Redirecionar a busca global do Topbar diretamente para `/foods?q=termo`, aproveitando a mesma página de busca sem código duplicado. |

---

### ♿ 2.5 AUDITORIA DE ACESSIBILIDADE (WCAG 2.1 AA)

| Elemento | Problema de Acessibilidade | Requisito WCAG | Solução Recomendada |
| :--- | :--- | :--- | :--- |
| **Botões de Ícones em Topbar** | Falta `aria-label` nos botões de alternância de tema e sino de notificações | 4.1.2 Name, Role, Value | Adicionar `aria-label="Alternar modo escuro"` e `aria-label="Notificações"`. |
| **Navegação no Mobile** | Botões do `BottomNav` possuem altura reduzida com área de toque $< 36\text{px}$ | 2.5.5 Target Size ($44 \times 44\text{px}$) | Reorganizar a barra inferior para ter 4 ícones maiores com padding adequado. |
| **Contraste de Texto Suave** | Tags e textos em `text-slate-400` sobre fundo cinza claro possuem contraste $< 3.5:1$ | 1.4.3 Contrast (Minimum 4.5:1) | Alterar classes para `text-slate-600` em modo claro e `text-slate-350` em modo escuro. |
| **Formulários sem Labels Visuais** | Inputs em cartões rápidos utilizam apenas `placeholder` sem `<label>` associada | 3.3.2 Labels or Instructions | Adicionar elementos `<label>` visíveis vinculados por `htmlFor` aos `id`s dos inputs. |

---

## 🔵 3. Plano de Refatoração de UX e Interface (Priorizado)

### Sprint 1: Correções de Navegação e Menu (Imediato)
1. Ajustar [`AppRoutes.jsx`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/routes/AppRoutes.jsx) eliminando rotas duplicadas (`/meals`) e removendo redirecionamentos falsos (`/ai`, `/alerts`).
2. Reduzir [`BottomNav.jsx`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/components/layout/BottomNav.jsx) para os **4 itens principais**, garantindo alvos de toque de $44 \times 44\text{px}$.
3. Ajustar [`Sidebar.jsx`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/components/layout/Sidebar.jsx) mantendo apenas rotas com páginas reais implementadas.

### Sprint 2: Simplificação da Calculadora de Bolus (UX Clínico)
1. Reformular [`BolusCalculatorPage.jsx`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/pages/Bolus/BolusCalculatorPage.jsx) dividindo a interface em:
   - **Modo Essencial (Default):** Apenas 2 inputs numéricos grandes: `Glicemia (mg/dL)` e `Carboidratos (g)`.
   - **Modo Avançado (Accordion):** Opções clínicas secundárias (`Perfis`, `Absorção`, `Exercício`, `Incremento`, `ISF`, `ICR`).
2. Adicionar botão de retorno/navegação clara ao vir de `/foods?carbs=X`.

### Sprint 3: Acessibilidade e Notificações Reais
1. Adicionar `aria-label` e estados `:focus-visible` em todos os botões de ícone em [`Topbar.jsx`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/components/layout/Topbar.jsx) e modais.
2. Integrar o dropdown de notificações do Topbar com os últimos alertas reais de hipoglicemia.
