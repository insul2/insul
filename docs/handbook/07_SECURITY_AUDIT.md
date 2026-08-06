# LEBEN Engineering Handbook — Volume 07: Security Audit & OWASP Top 10

**Projeto:** LEBEN — Plataforma de Gestão de Diabetes & Motor Clínico de Bolus  
**Versão:** 4.0.0  

---

## 1. Matriz de Auditoria OWASP Top 10

```mermaid
graph TD
    A[Inspecção de Segurança LEBEN] --> B[A01: Broken Access Control - CRÍTICO]
    A --> C[A02: Cryptographic Failures - CRÍTICO]
    A --> D[A03: Injection - MÉDIO]
    A --> E[A05: Security Misconfiguration - ALTO]
    A --> F[A07: Identification and Auth Failures - CRÍTICO]

    B --> B1[Bypass de Login no Frontend via Catch Syntax]
    C --> C1[Secrets de Produção no Git e Fallbacks no Código]
    D --> D1[Consultas SQL sem Trigram e Concatenadas]
    E --> E1[CORS Totalmente Aberto Sem Restrição de Domínio]
    F --> F1[Falta de Revogação de Tokens e Rate Limiting]
```

---

## 2. Vulnerabilidades Críticas Encontradas

### 🚨 VULN-01: Exposição de Segredos e Credenciais de Banco no Código
- **Arquivos Afetados:** [`backend/src/config/env.js:L15-18`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/config/env.js#L15-L18), [`.env:L6-14`](file:///c:/Users/Well/Desktop/projetoinsu/.env#L6-L14), [`render.yaml:L13-16`](file:///c:/Users/Well/Desktop/projetoinsu/render.yaml#L13-L16).
- **Descrição:** O arquivo `env.js` contém a string de conexão com o **MongoDB Atlas** contendo usuário e senha administrativos (`mongodb+srv://midiasperformancevips_db_user:admin123123@...`) e a chave secreta de assinatura JWT (`leben_super_secret_jwt_key_v4_production`) codificadas diretamente em texto puro.
- **Risco:** Qualquer pessoa com acesso ao repositório Git pode ler, alterar ou deletar a base de dados de produção e forjar tokens de acesso válidos.
- **Mitigação Recomendada:** Revogar a senha da conta MongoDB Atlas imediatamente, rotacionar a chave JWT no provedor de hospedagem (Render) e remover os valores default hardcoded no código.

---

### 🚨 VULN-02: Authentication Bypass Silencioso no Frontend
- **Arquivo Afetado:** [`frontend/src/context/AuthContext.jsx:L33-45`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/context/AuthContext.jsx#L33-L45) e [`L68-76`](file:///c:/Users/Well/Desktop/projetoinsu/frontend/src/context/AuthContext.jsx#L68-L76).
- **Evidência:**
  ```javascript
  catch (err) {
    // Smart Fallback Local em caso de reconexão
    const fallbackUser = { id: 'usr_' + Date.now(), name: displayName, email: cleanEmail };
    localStorage.setItem('leben_token', 'demo_token_123');
    localStorage.setItem('leben_user', JSON.stringify(fallbackUser));
    setUser(fallbackUser);
    setIsAuthenticated(true);
    return { success: true };
  }
  ```
- **Descrição:** Quando o backend retorna erro ou está fora do ar, o bloco `catch` simula um login de sucesso gerando o token `'demo_token_123'`, garantindo acesso irrestrito às rotas privadas.
- **Risco:** Quebra o controle de acesso e expõe dados voláteis.
- **Mitigação Recomendada:** Remover qualquer geração sintética de token no cliente.

---

### ⚠️ VULN-03: CORS Aberto sem Restrição de Origem
- **Arquivo Afetado:** [`backend/src/app.js:L13`](file:///c:/Users/Well/Desktop/projetoinsu/backend/src/app.js#L13).
- **Evidência:** `app.use(cors())`.
- **Risco:** Permite que qualquer site malicioso faça requisições cross-origin para a API REST do LEBEN.
- **Mitigação Recomendada:** Restringir as origens permitidas via `cors({ origin: process.env.ALLOWED_ORIGINS })`.

---

## 3. Plano de Hardening de Segurança (Checklist)

- [ ] **Passo 1:** Alterar a senha da conta MongoDB Atlas.
- [ ] **Passo 2:** Gerar novas chaves aleatórias de 256 bits para `JWT_SECRET` e `AUDIT_SECRET`.
- [ ] **Passo 3:** Remover senhas do arquivo `.env` do Git e incluí-lo no `.gitignore`.
- [ ] **Passo 4:** Excluir o bloco de fallback de login sintético em `AuthContext.jsx`.
- [ ] **Passo 5:** Configurar o middleware `express-rate-limit` para limitar tentativas de login a 5 requisições por minuto por IP.
