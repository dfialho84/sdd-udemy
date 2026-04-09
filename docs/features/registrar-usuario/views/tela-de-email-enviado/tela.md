# Tela de Email Enviado

## Visao Geral

- **Nome:** Tela de Email Enviado
- **Slug:** tela-de-email-enviado
- **URL:** —
- **Objetivo:** Informar ao visitante que o cadastro foi recebido e que um link de confirmacao foi enviado ao seu email, orientando-o a acessar a caixa de entrada para concluir o processo.
- **Scenarios relacionados:**
  - Cadastro realizado com dados validos

## Componentes

### Conteudo e mensagens fixas

- Mensagem informando que um link de confirmacao foi enviado ao email cadastrado
- Instrucao para o visitante verificar a caixa de spam caso nao encontre o email na caixa de entrada (derivada do PRD, secao Riscos: "exibir na tela pos-cadastro uma instrucao clara para verificar a caixa de spam")

## Estados

### Padrao (initial)

Tela exibida imediatamente apos o envio bem-sucedido do formulario de cadastro. Apresenta a mensagem de que o link de confirmacao foi enviado ao endereco de email informado. Nao ha acoes disponiveis alem da leitura da instrucao.

## Consideracoes

### Outros

- Esta tela e exibida apenas apos um cadastro valido — visitantes nao acessam esta tela diretamente por URL
- O email de confirmacao ja foi disparado pelo sistema antes de esta tela ser exibida; nao ha reenvio disponivel (fora do escopo conforme PRD, secao "Fora do Escopo")

### Acessibilidade

Nao especificado nos artefatos atuais. A preencher quando houver requisito nao funcional correspondente.

### Responsividade

Nao especificado nos artefatos atuais. A preencher quando houver requisito nao funcional correspondente.

## Referencias Visuais

### Wireframe
_A preencher manualmente._

### Mockup
_A preencher manualmente._

### Prototipo interativo
_A preencher manualmente._
