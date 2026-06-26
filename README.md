
# USINAGEM - Dashboard de Produção

Este é um projeto desenvolvido no Firebase Studio para monitoramento e análise de registros de usinagem, controle de produção e indicadores de performance (OEE).

## 🚀 Como Resolver o Erro de Autenticação e Socket no Git

Se você está recebendo o erro `connect ENOENT /tmp/vscode-git...` ou `Authentication failed`, siga este guia para destravar o seu ambiente:

### 1. Corrigindo o erro de "Socket" (ENOENT)
Este erro significa que o editor perdeu a conexão com o Git. Para resolver:
- **Feche o terminal** atual e abra um novo.
- Se não funcionar, clique no ícone de "Relógio/Sincronização" no canto inferior esquerdo e tente novamente.
- Em último caso, **recarregue a página do Firebase Studio**.

### 2. Configurando o Token do GitHub (Obrigatório)
O GitHub não aceita sua senha comum. Você **precisa** de um Token (PAT):
1. Acesse: **GitHub** > **Settings** > **Developer Settings** > **Personal access tokens** > **Tokens (classic)**.
2. Clique em **Generate new token (classic)**.
3. Marque a caixa **`repo`** (essencial para fazer push).
4. **COPIE o código `ghp_...`** (você não o verá novamente).

### 3. Usando o Token no Terminal
Se o editor não pedir a senha ou der erro direto, use o terminal para forçar a configuração:
```bash
# Rode este comando para limpar credenciais antigas que podem estar dando erro
git config --global --unset credential.helper

# Tente fazer o push novamente
git push
```
Quando ele pedir o **Username**, digite seu e-mail/usuário.
Quando ele pedir a **Password**, **COLE O TOKEN** (não vai aparecer nada enquanto você cola, é normal, apenas dê Enter).

---

## Funcionalidades Recentes

- **Visão Supervisor Unificada:** As unidades Valinhos Dove e Sabonete agora são exibidas como uma única barra consolidada para facilitar a análise.
- **Gráficos de Capacidade:** Novo gráfico "Disponível vs Realizado" com dados orçamentários de Junho.
- **Programação por Técnico:** Caixas exclusivas para cada operador por turno com preenchimento automático de Café e DDS.

---
*Desenvolvido como protótipo de alta fidelidade para gestão industrial.*
