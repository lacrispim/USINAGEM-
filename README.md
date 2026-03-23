# USINAGEM - Dashboard de Produção

Este é um projeto desenvolvido no Firebase Studio para monitoramento e análise de registros de usinagem, controle de produção e indicadores de performance (OEE).

## Como Acessar a Aplicação

Para acessar o dashboard, siga estes passos:
1. **Cadastro:** Na primeira vez, acesse a página de `/signup` para criar seu usuário com e-mail e senha.
2. **Login:** Após cadastrado, use suas credenciais na página de `/login`.
3. **Esqueci a Senha:** Se precisar redefinir, utilize a página de `/forgot-password`.

## Conexão com GitHub

Se você estiver enfrentando problemas para sincronizar o código:
- **Senha:** O GitHub não aceita a senha do seu e-mail para operações de Git.
- **Solução:** Você deve gerar um **Personal Access Token (PAT)**:
  1. No GitHub, vá em *Settings* > *Developer Settings* > *Personal access tokens*.
  2. Gere um token com a permissão `repo`.
  3. Use este token como sua "senha" ao se conectar.

## Funcionalidades Principais

- **Registro de Produção:** Apontamento de atividades, tempos e status de fabricação.
- **Registro de Perdas:** Monitoramento de paradas (PDL/MPL) e motivos de inatividade.
- **Visão Supervisor (Dashboard):**
  - Análise de Planejado vs Realizado.
  - Evolução Mensal - MMPCODE (OEE).
  - Performance de técnicos e máquinas.
- **Programação em Tempo Real:** Integração com Firebase Realtime Database para visualização do plano semanal.

## Tecnologias Utilizadas

- **Frontend:** Next.js (App Router), React, Tailwind CSS.
- **UI Components:** ShadCN UI, Lucide Icons.
- **Gráficos:** Recharts.
- **Backend:** Firebase Auth, Firestore, Realtime Database.
- **Exportação:** XLSX (Excel).

---
*Desenvolvido como protótipo de alta fidelidade para gestão industrial.*
