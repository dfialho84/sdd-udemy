# PRD — Registrar Usuario

## Visao Geral

Permitir que qualquer visitante da plataforma crie sua propria conta, preenchendo nome, email, senha, foto de perfil e data de nascimento. Apos o preenchimento, o sistema envia um email com link unico e expiravel para confirmar o cadastro, tornando a conta ativa somente apos essa confirmacao.

## Problema

Sem um mecanismo de auto cadastro, novos usuarios nao conseguem acessar a plataforma de forma autonoma. Toda criacao de conta dependeria de intervencao administrativa, o que inviabiliza o crescimento organico da base de usuarios e prejudica a experiencia de quem deseja comecar a usar o sistema imediatamente.

Alem disso, sem confirmacao de email, o sistema nao pode garantir que o endereco informado e valido ou pertence a quem se cadastrou, expondo a plataforma a contas criadas com dados falsos.

## Usuario-Alvo

Qualquer visitante da plataforma que ainda nao possui uma conta. Nao ha restricoes de perfil, dominio de email ou necessidade de convite previo.

## Objetivos

1. Permitir que qualquer visitante preencha o formulario de cadastro com nome, email, senha, confirmacao de senha, foto de perfil e data de nascimento.
2. Validar os dados informados antes do envio: email unico, senha com minimo de 8 caracteres contendo letras maiusculas, minusculas, numeros e caracteres especiais, e confirmacao de senha identica.
3. Criar o cadastro com status pendente apos o preenchimento valido do formulario.
4. Enviar email com link unico e expiravel para o endereco informado, para que o usuario confirme sua identidade.
5. Ativar a conta ao clicar no link de confirmacao valido, exibindo mensagem de sucesso e link de acesso ao sistema.
6. Rejeitar o link de confirmacao expirado e remover o cadastro pendente associado.

## Criterios de Sucesso

| Criterio | Medida |
|---|---|
| Cadastro criado com sucesso apos preenchimento valido | 100% dos cadastros validos geram status "pendente" e disparam email de confirmacao |
| Email de confirmacao recebido apos o cadastro | Email entregue em ate 60 segundos apos o envio do formulario |
| Link de confirmacao expira corretamente | Link torna-se invalido apos 24 horas da criacao do cadastro |
| Cadastro pendente removido apos expiracao do link | 100% dos cadastros com link expirado sao deletados automaticamente |
| Conta ativada apos clique no link valido | Mensagem de sucesso exibida e link para acesso ao sistema apresentado imediatamente |
| Dados invalidos rejeitados antes do envio | 100% das tentativas com email duplicado ou senha fora do padrao exibem erro especifico sem criar cadastro |

## Fora do Escopo

- Reenvio de email de confirmacao: se o link expirar, o usuario nao pode solicitar um novo email. O cadastro pendente e deletado e o usuario deve iniciar o processo do zero.
- Login apos o cadastro: a feature cobre apenas o registro e a confirmacao; a autenticacao e gerenciada por outra feature.
- Recuperacao de senha: nao faz parte do fluxo de cadastro.
- Edicao de dados do perfil apos o cadastro: limitado ao ato de registrar e confirmar.
- Cadastro via provedores externos (Google, GitHub, etc.): apenas cadastro por formulario proprio.

## Fluxo Principal

```
Visitante abre a pagina de cadastro (/register)
→ Visitante preenche nome, email, senha, confirmacao de senha, foto de perfil e data de nascimento
→ Sistema valida os dados (email unico, senha conforme politica, senhas coincidentes)
→ Sistema cria cadastro com status "pendente"
→ Sistema envia email com link unico e expiravel (valido por 24 horas)
→ Visitante ve tela de confirmacao informando que um link foi enviado ao email para confirmar o cadastro
→ Visitante abre o email e clica no link de confirmacao
→ Sistema valida o link (existe e nao expirou)
→ Sistema ativa a conta (status "ativo")
→ Usuario ve mensagem de sucesso e link para acessar o sistema
```

## Fluxo Alternativo

```
Visitante clica no link de confirmacao apos 24 horas da criacao do cadastro
→ Sistema verifica o link e identifica que esta expirado
→ Sistema deleta o cadastro pendente associado ao link
→ Visitante ve mensagem informando que o link expirou e que deve realizar o cadastro novamente
→ Visitante e redirecionado para a pagina de cadastro (/register)
```

## Dependencias

- Feature de login: precisa existir para que o usuario ativado consiga acessar o sistema apos a confirmacao.
- Servico de envio de email: necessario para entregar o link de confirmacao ao endereco informado no cadastro.
- Tabela de usuarios no banco de dados: com campos para nome, email (unico), senha (hash), foto de perfil, data de nascimento e status da conta (pendente/ativo).
- Mecanismo de geracao e validacao de tokens unicos e expiraveis: biblioteca ou solucao a ser definida na fase de design.
- Job ou mecanismo de limpeza automatica: para remover cadastros pendentes com link expirado.

## Riscos

| Risco | Mitigacao |
|---|---|
| Email de confirmacao nao entregue (falha no servico de envio ou email cai em spam), deixando o usuario sem conseguir ativar a conta | Registrar falhas de envio em log estruturado; exibir na tela pos-cadastro uma instrucao clara para verificar a caixa de spam |
| Acumulo de cadastros pendentes no banco caso usuarios nao cliquem no link antes da expiracao | Job automatico de limpeza remove cadastros com link expirado; monitorar volume de registros pendentes para detectar anomalias |
| Token de confirmacao previsivel ou reutilizavel, permitindo ativacao nao autorizada de contas | Gerar tokens com alta entropia (minimo 128 bits de aleatoriedade); invalidar o token imediatamente apos o primeiro uso bem-sucedido |
