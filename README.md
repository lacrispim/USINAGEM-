
# USINAGEM - Dashboard de Produção

Este é um projeto desenvolvido no Firebase Studio para monitoramento e análise de registros de usinagem, controle de produção e indicadores de performance (OEE).

## 🚀 Como Resolver o Erro de "Authentication failed" no Git

Se você recebeu o erro `remote: No anonymous write access` ou `fatal: Authentication failed`, siga estes passos para conseguir fazer o **Git Push**:

1. **Gere um Token no GitHub:**
   - Acesse seu GitHub e vá em **Settings** (Configurações).
   - No menu lateral esquerdo, clique em **Developer Settings** (lá no final).
   - Clique em **Personal access tokens** > **Tokens (classic)**.
   - Clique no botão **Generate new token (classic)**.
   - Dê um nome (ex: "Firebase Studio").
   - Marque a caixa **`repo`** (isso é obrigatório).
   - Clique em "Generate token" no final da página.
   - **COPIE o código gerado** (ele começa com `ghp_`). Você não conseguirá vê-lo novamente!

2. **Use o Token como Senha:**
   - No Firebase Studio (ou no seu terminal), quando ele pedir sua senha para o GitHub, **não use sua senha do e-mail**.
   - **Cole o Token** que você copiou no campo de senha.

3. **Dica para o erro de Socket (`connect ENOENT`):**
   - Este erro geralmente acontece quando a conexão entre o editor e o GitHub se perde. Após configurar o Token, tente salvar as alterações novamente no painel lateral do Firebase Studio.

## Funcionalidades Principais

- **Registro de Produção:** Apontamento de atividades, tempos e status de fabricação.
- **Programação em Tempo Real:** Gestão semanal com caixas exclusivas por técnico e turno.
- **Visão Supervisor:**
  - Unificação de unidades fabris (ex: Valinhos Dove/Sabonete).
  - Análise de Planejado vs Realizado.
  - Gráfico de Capacidade Disponível vs Realizada (Dados de Junho).

---
*Desenvolvido como protótipo de alta fidelidade para gestão industrial.*
