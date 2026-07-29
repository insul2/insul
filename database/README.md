# 🗄️ Arquitetura do Banco de Dados — Insul / Amanda V4 (MySQL 8.0+)
## Plataforma Completa de Gestão do Diabetes & Suporte ao Bolus

---

## 📊 Mapeamento dos Recursos Avançados para a Estrutura de Tabelas

A arquitetura do banco de dados abrange os **recursos do aplicativo + Simulador de Bolus + Gêmeo Digital (Digital Twin)**:

```
[ users ] ──── [ user_patient_permissions ] ──── [ patients ]
 (Autenticação)      (Médicos, Pais e Cuidadores)      (Biometria & Perfil Clínico)
                                                            │
    ┌─────────────────────────┬─────────────────────────────┼─────────────────────────────┬─────────────────────────┐
    │                         │                             │                             │                         │
[ glucose_readings ]    [ meals & items ]             [ bolus_events ]            [ exercise_events ]        [ alerts ]
 (CGM/BGM + Trend)    (Refeições + FPU)             (Snapshot + SHA-256)           (Ajuste ISF 12-24h)     (Hipo/Hiper/Tiras)
    │                         │                             │                             │                         │
[ device_integrations ] [ favorite_foods ]            [ ai_photo_logs ]           [ ai_habit_insights ]   [ gamification_goals ]
 (Dexcom, Libre, Pump) (Alimentos 1-Toque)            (IA Visão Computacional)     (Predições & Padrões)      (Metas & TIR)
                              │                             │                             │                         │
                        [ meal_templates ]            [ meal_plans ]              [ ai_chat_sessions ]    [ shopping_lists ]
                       (Refeições Prontas)         (Prescrição Nutricional)        (Assistente Virtual)    (Compras Automáticas)
                                                                                          │
                                                                                  [ bolus_simulations ]
                                                                                   (Simulador "What-If")
                                                                                          │
                                                                                  [ digital_twin_profiles ]
                                                                                   (Gêmeo Digital por IA)

[ food_database ] (488.123 Alimentos Únicos: TBCA, SBD, TACO, USDA)
   └── [ glycemic_index_load ] (Índice Glicêmico IG/CG e Categorias de Busca)

[ patient_glycemic_statistics ] (TIR, TAR, TBR, Variabilidade CV%, GMI eAG, Médias por Horário)
[ audit_log ] (Auditoria Clínica Imutável: IP, Dispositivo, Hash SHA-256)
```

---

## 📋 Tabela de Correspondência Módulo x Tabela SQL

| # | Recurso do Aplicativo | Tabelas Envolvidas no Banco | Descrição Técnica no MySQL |
| :--- | :--- | :--- | :--- |
| **1** | **Tela Inicial (Dashboard)** | `glucose_readings`, `bolus_events`, `meals` | Leitura da glicemia atual + trend, cálculo de IOB ativo e histórico recente. |
| **2** | **Calculadora de Bolus Inteligente** | `bolus_events`, `insulin_profile_segments` | Cálculo prandial + corretivo + FPU + desconto de IOB com snapshot imutável. |
| **3** | **IA Reconhecimento por Foto** | `ai_photo_logs`, `meals` | Log do modelo de visão (Gemini) com itens detectados, gramas e FPU estimado. |
| **4** | **Leitor de Código de Barras** | `food_database` (`barcode`) | Busca indexada por `EAN-13` na coluna `barcode` única da base de alimentos. |
| **5** | **Gráficos Sobrepostos & Estatísticas** | `glucose_readings`, `patient_glycemic_statistics` | **TIR (Tempo na Faixa)**, **CV% (Variabilidade)**, **GMI (HbA1c)** e médias por horário. |
| **6** | **IA que Aprende Hábitos** | `ai_habit_insights` | Registro de padrões recorrentes (ex: pico por pizza, variação por dia). |
| **7** | **Exercícios e Impacto Glicêmico** | `exercise_events` | Janela de sensibilidade de 12-24h com sugestão de redução de bolus. |
| **8** | **Cadastro de Insulinas & Curvas** | `patient_insulins`, `insulin_profiles` | Farmacocinética (DIA, Pico, Onset) por marca (Fiasp, Lispro, Lantus, Tresiba). |
| **9** | **Integração com Sensores & Bombas** | `device_integrations` | Tokens e pontes OAuth2/API para Dexcom, LibreLink, Omnipod, Nightscout. |
| **10**| **Alertas Inteligentes** | `alerts` | Gatilhos para hipoglicemia, estoque baixo de insulinas/tiras e desconexão. |
| **11**| **Lista de Compras Automática** | `shopping_lists` | Geração automática de compras baseada nas refeições planejadas da semana. |
| **12**| **Planejamento Alimentar** | `meal_plans` | Cardápios e dietas prescritos por nutricionistas/endócrinos vinculados. |
| **13**| **Relatórios e PDF para Médicos** | `patient_glycemic_statistics` | Relatórios clínicos completos com TIR, GMI (HbA1c), CV% e gráficos consolidados. |
| **14**| **Área do Médico / Endocrinologista**| `user_patient_permissions` (`DOCTOR`) | Acesso seguro do profissional aos gráficos, histórico e sugestão de ajustes. |
| **15**| **Área da Família / Cuidadores** | `user_patient_permissions` (`GUARDIAN`) | Alertas push em tempo real para pais em episódios de hipoglicemia grave. |
| **16**| **Metas e Gamificação** | `gamification_goals` | Conquistas clínicas (ex: 7 dias sem hipo, 90% TIR, streak de registros). |
| **17**| **Refeições Favoritas (1-Toque)** | `meal_templates`, `favorite_foods` | Modelos pré-salvos pelo paciente com re-uso com apenas 1 clique. |
| **18**| **Busca Ultra-Rápida de Alimentos** | `food_database` (`FULLTEXT INDEX`) | Pesquisa instantânea em 488 mil alimentos via `MATCH(name, brand)`. |
| **19**| **Modo Offline & Sincronização** | `data/unified_foods_database.json` | Carga local de alimentos e sincronização delta do histórico ao reconectar. |
| **20**| **Assistente IA Educacional** | `ai_chat_sessions` | Chat de apoio pedagógico ao paciente com avisos médicos obrigatórios. |
| **21**| **🧪 Simulador de Bolus ("What-If")** | `bolus_simulations` | Simulação sem registro clínico: *"E se eu comer 80g e caminhar 30min?"*. |
| **22**| **🧬 Gêmeo Digital (Digital Twin)** | `digital_twin_profiles` | Perfil metabólico preditivo por IA que aprende respostas individuais aos alimentos. |

---

## 🛠️ Ordem de Execução das Migrações no MySQL

```bash
# 1. Usuários, Pacientes e IMC (Triggers)
mysql -u root -p banco < database/migrations/001_create_users_and_patients.sql

# 2. Perfis de Cálculo de Insulina (ICR, ISF, Alvo)
mysql -u root -p banco < database/migrations/002_create_insulin_profiles.sql

# 3. Glicemia, Refeições e Bolus Imutável (SHA-256)
mysql -u root -p banco < database/migrations/003_create_glucose_meals_bolus.sql

# 4. Exercícios, Alertas, Auditoria e Refeições Salvas
mysql -u root -p banco < database/migrations/004_create_exercise_alerts_audit_food.sql

# 5. Perfil de Saúde Completo e Viais de Insulina
mysql -u root -p banco < database/migrations/005_create_patient_full_profile.sql

# 6. Índice Glicêmico, Alimentos Favoritos e Multi-Perfil (Médicos/Pais)
mysql -u root -p banco < database/migrations/006_glycemic_favorites_multi_permissions.sql

# 7. Recursos Avançados de IA, Sensores, Planos e Gamificação
mysql -u root -p banco < database/migrations/007_ai_features_devices_plans.sql

# 8. Módulo de Estatísticas Clínicas (TIR, CV%, HbA1c/GMI, Médias por Horário e Refeição)
mysql -u root -p banco < database/migrations/008_glycemic_statistics_module.sql

# 9. Módulo Simulador de Bolus ("What-If") e Gêmeo Digital (Digital Twin)
psql -U xivia_user -d xivia -f database/migrations/009_bolus_simulator_digital_twin.sql

# 10. Hardening Clínico de Produção (Versionamento, Particionamento, GIN Trigram & LGPD)
psql -U xivia_user -d xivia -f database/migrations/010_production_grade_clinical_hardening.sql

# 11. Carga dos 488 Mil Alimentos Unificados
psql -U xivia_user -d xivia -f database/seeds/001_seed_unified_foods.sql
```
