
# USINAGEM - Dashboard de Produção

Este é um projeto desenvolvido no Firebase Studio para monitoramento e análise de registros de usinagem, controle de produção e indicadores de performance (OEE).

## Como Acessar a Aplicação

Para acessar o dashboard, siga estes passos:
1. **Cadastro:** Na primeira vez, acesse a página de `/signup` para criar seu usuário com e-mail e senha.
2. **Login:** Após cadastrado, use suas credenciais na página de `/login`.
3. **Esqueci a Senha:** Se precisar redefinir, utilize a página de `/forgot-password`.

## Conexão com GitHub e Vercel

Se você está tendo problemas para enviar informações para o Vercel:
- **Diferença entre Pull e Push:** O comando `git pull` traz as informações do site para o seu computador. O comando **`git push`** é o que envia suas alterações do computador para o GitHub/Vercel.
- **Autenticação (Token):** O GitHub **NÃO** aceita a sua senha do e-mail para operações de envio (Push).
- **Solução (PAT):** Você deve gerar um **Personal Access Token (PAT)** no GitHub:
  1. No GitHub, vá em *Settings* > *Developer Settings* > *Personal access tokens*.
  2. Gere um token (classic) com a permissão `repo`.
  3. Use este código como sua "senha" ao conectar o Firebase Studio ou ao fazer um `push`.

## Funcionalidades Principais

- **Registro de Produção:** Apontamento de atividades, tempos e status de fabricação (limite padrão de visualização de 30 dias).
- **Registro de Perdas:** Monitoramento de paradas (PDL/MPL) e motivos de inatividade.
- **Visão Supervisor (Dashboard):**
  - Análise de Planejado vs Realizado (DDS/ADM, Setup, Usinagem).
  - Evolução Mensal - MMPCODE (OEE) para D600 e Centur 30.
  - Performance de técnicos e máquinas.
- **Programação em Tempo Real:** Integração com Firebase Realtime Database para visualização do plano semanal.

## Tecnologias Utilizadas

- **Frontend:** Next.js (App Router), React, Tailwind CSS.
- **UI Components:** ShadCN UI, Lucide Icons.
- **Gráficos:** Recharts.
- **Backend:** Firebase Auth, Firestore, Realtime Database.

---
*Desenvolvido como protótipo de alta fidelidade para gestão industrial.*
