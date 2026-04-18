# PRD — Recuperação de Senha

## 1. Visão Geral

Um fluxo seguro que permite ao usuário redefinir sua senha quando a esquece, sem intervenção administrativa. O usuário clica em "Recuperar Senha" na tela de login, informa seu email, recebe um link único e com expiração de 12 horas via email, e pode redefinir sua senha através desse link.

## 2. Problema

Frequentemente, usuários esquecem suas senhas e ficam impossibilitados de acessar o sistema. Sem um mecanismo de recuperação, eles precisam contatar suporte administrativo, o que gera custo operacional e tempo inativo. Um fluxo de auto-recuperação reduz essa fricção e melhora a experiência.

## 3. Usuário-Alvo

Qualquer usuário com cadastro ativo que tenha esquecido sua senha.

## 4. Objetivos

1. Permitir que o usuário solicite recuperação de senha informando seu email
2. Enviar um link único e com expiração para o email do usuário
3. Permitir que o usuário redefina sua senha através do link recebido
4. Validar que o link expirou ou é inválido se tentado fora do prazo
5. Impedir que o usuário acesse a tela de redefinição sem um link válido

## 5. Critérios de Sucesso

| Critério | Medida |
|----------|--------|
| Usuário recebe email com link válido | Link funciona por até 12 horas |
| Usuário consegue redefinir senha via link válido | Redefinição é bem-sucedida e senha anterior fica inválida |
| Email inexistente é tratado | Usuário é informado e redirecionado para cadastro |
| Link expirado é rejeitado | Sistema exibe mensagem de erro apropriada |
| Fluxo de happy path é concluído | Usuário completa redefinição em menos de 2 minutos |

## 6. Fora do Escopo

- Autenticação multifator (MFA) na redefinição de senha
- Redefinição de senha para usuários que não se lembram do email cadastrado
- Recuperação de conta por SMS ou perguntas de segurança
- Sincronização automática de senha em outras plataformas
- Interface de admin para redefinir senha de outro usuário

## 7. Fluxo Principal

```
Usuário clica em "Esqueci a senha" na tela de login
→ Sistema exibe formulário de recuperação
→ Usuário informa email e submete
→ Sistema valida se email existe e está associado a conta ativa
→ Sistema gera token único com expiração de 12h
→ Sistema envia email com link contendo token
→ Sistema exibe mensagem de confirmação
→ Usuário clica no link recebido por email
→ Sistema valida token e sua expiração
→ Sistema exibe tela de redefinição de senha
→ Usuário informa nova senha e confirmação
→ Sistema valida força/complexidade da senha
→ Sistema atualiza senha
→ Sistema exibe mensagem de sucesso e redireciona para login
```

## 8. Fluxo Alternativo

**Email não encontrado:** Usuário informa email que não existe no sistema → Sistema não revela se email existe ou não (por segurança) → Sistema exibe mensagem genérica "Se existe conta com esse email, você receberá um link de recuperação" → Sistema oferece link para tela de cadastro.

**Link expirado:** Usuário tenta acessar link após 12h → Sistema detecta expiração → Sistema exibe mensagem de erro → Sistema oferece opção para solicitar novo link de recuperação.

**Token inválido:** Usuário tenta acessar URL com token malformado ou inválido → Sistema rejeita → Sistema redireciona para tela de recuperação com mensagem de erro.

## 9. Dependências

- Feature "registrar-usuario" deve estar implementada (usuários cadastrados existem)
- Feature "login" deve estar implementada (usuário pode fazer login após redefinição)
- Sistema de email deve estar configurado (SMTP ou serviço externo)
- Banco de dados deve ter tabela de usuários com campo email e senha
- Mecanismo de hashing seguro para senhas (ex: bcrypt)

## 10. Riscos

| Risco | Mitigação |
|-------|-----------|
| Link de recuperação interceptado por terceiros | Usar HTTPS, tokens com expiração curta (12h), invalidar token após primeiro uso |
| Força bruta no formulário de email | Rate limiting: máximo 5 tentativas por IP por hora |
| Redefinição de senha de outro usuário | Validar que token só redefinir a senha do email associado; não revelar se email existe |
| Email não entregue | Oferecer opção de reenviar link; alertar usuário que pode levar alguns minutos |
| Token armazenado de forma insegura | Usar tokens criptografados no banco; nunca em logs ou URLs sem HTTPS |
