---
name: prd-standards
description: >
    Padrões de qualidade para criação de PRDs (Product Requirements Documents)
    neste projeto. Define as 10 seções obrigatórias, critérios de qualidade por
    seção, formato esperado e regras gerais. Use junto com o interview-guide para
    conduzir a entrevista e o prd-example como régua de qualidade.
---

# Padrões de PRD

## Estrutura obrigatória

Um PRD é composto pelas seguintes seções, nesta ordem:

1. Visão Geral
2. Problema
3. Usuário-Alvo
4. Objetivos
5. Critérios de Sucesso
6. Fora do Escopo
7. Fluxo Principal
8. Fluxo Alternativo
9. Dependências
10. Riscos

---

## Seções e critérios de qualidade

### 1. Visão Geral

**Propósito:** Descrever em 2-3 frases o que a feature faz e qual mecanismo principal ela usa.

**Formato:** Texto corrido (sem bullets, sem tabelas).

**Checklist de qualidade:**
- [ ] Responde "o quê" (o que o usuário consegue fazer)
- [ ] Responde "como" (mecanismo principal, ex: JWT, cookie httpOnly)
- [ ] Tem entre 1 e 3 frases
- [ ] Não contém detalhes de implementação (nomes de funções, estrutura de tabelas)
- [ ] Não começa com "Este PRD descreve..." ou frases meta

**Sinal de qualidade suficiente:** Qualquer pessoa do time entende a feature sem precisar ler o restante.

---

### 2. Problema

**Propósito:** Justificar por que a feature precisa existir. Qual dor ela resolve.

**Formato:** Texto corrido (1-3 parágrafos curtos ou frases).

**Checklist de qualidade:**
- [ ] Articula a situação atual (o que acontece hoje sem a feature)
- [ ] Explica o impacto concreto para o usuário (consequência real, não abstrata)
- [ ] Não confunde "problema" com "solução" (não descreve o que será construído)

**Sinal de qualidade suficiente:** Fica claro que sem esta feature algo importante está faltando.

---

### 3. Usuário-Alvo

**Propósito:** Identificar quem vai usar a feature e quais são suas pré-condições.

**Formato:** 1-2 frases específicas.

**Checklist de qualidade:**
- [ ] É específico (não "qualquer usuário" ou "os usuários")
- [ ] Menciona pré-condições se houver (ex: "com conta previamente criada via register-user")

**Sinal de qualidade suficiente:** Dá para imaginar a persona usando a feature.

---

### 4. Objetivos

**Propósito:** Listar o que o sistema fará, de forma concreta e verificável.

**Formato:** Lista numerada. Cada item começa com verbo no infinitivo.

**Checklist de qualidade:**
- [ ] Entre 3 e 7 itens
- [ ] Cada item começa com verbo de ação (Permitir, Emitir, Detectar, Validar, Rejeitar...)
- [ ] Cada item é verificável — dá para dizer "isso foi implementado ou não"
- [ ] Nenhum item se repete ou sobrepõe outro
- [ ] Não confunde objetivos com critérios de sucesso (objetivos são o que o sistema faz; critérios são como medir)

**Sinal de qualidade suficiente:** Os objetivos cobrem o comportamento essencial da feature sem lacunas.

---

### 5. Critérios de Sucesso

**Propósito:** Definir métricas mensuráveis que confirmam que a feature foi bem entregue.

**Formato:** Tabela com duas colunas: `Critério` e `Medida`.

**Checklist de qualidade:**
- [ ] Entre 3 e 6 linhas
- [ ] Coluna "Medida" é quantificável ou verificável (%, tempo, boolean, "nunca", "sempre")
- [ ] Não repete os objetivos palavra por palavra
- [ ] Cobre ao menos: happy path, cenário de erro principal, e um requisito não-funcional (segurança ou performance)

**Sinal de qualidade suficiente:** Em um teste de aceitação, dá para marcar cada critério como passou/falhou.

---

### 6. Fora do Escopo

**Propósito:** Tornar explícito o que não será entregue nesta feature, evitando expectativas incorretas.

**Formato:** Lista de bullets.

**Checklist de qualidade:**
- [ ] Contém ao menos 3 itens
- [ ] Os itens são funcionalidades que o usuário poderia razoavelmente esperar, mas não serão entregues
- [ ] Não lista itens óbvios que nunca estariam no escopo (ex: "não vai pilotar aviões")

**Sinal de qualidade suficiente:** Alguém que leu a Visão Geral poderia ter esperado esses itens.

---

### 7. Fluxo Principal

**Propósito:** Descrever o caminho feliz (happy path) da feature, do início ao fim.

**Formato:** Diagrama textual com setas (`→`), dentro de bloco de código.

**Checklist de qualidade:**
- [ ] Começa no ponto de entrada do usuário (ex: "Entregador abre /login")
- [ ] Termina no resultado final (ex: "Entregador redirecionado para dashboard")
- [ ] Sem bifurcações (erros e casos alternativos ficam no Fluxo Alternativo)
- [ ] Cada passo é uma ação ou decisão distinta

**Sinal de qualidade suficiente:** Seguindo os passos, fica claro o que o usuário e o sistema fazem em cada momento.

---

### 8. Fluxo Alternativo

**Propósito:** Descrever fluxos secundários relevantes (refresh de token, recuperação, erro crítico).

**Formato:** Mesmo formato do Fluxo Principal. Pode ser "N/A — não há fluxo alternativo relevante nesta feature." se não couber.

**Checklist de qualidade:**
- [ ] Presente se houver um fluxo secundário que o produto precisa garantir
- [ ] Claramente diferente do Fluxo Principal (não é uma variação menor)
- [ ] Mesmo nível de detalhe do Fluxo Principal

**Sinal de qualidade suficiente:** O fluxo alternativo complementa o principal sem sobrepô-lo.

---

### 9. Dependências

**Propósito:** Listar o que precisa existir ou ser contratado para que esta feature funcione.

**Formato:** Lista de bullets. Cada item nomeia especificamente a dependência.

**Checklist de qualidade:**
- [ ] Menciona features do produto que precisam existir antes (ex: `register-user`)
- [ ] Menciona bibliotecas externas não-triviais (ex: `jose`, `bcrypt`)
- [ ] Menciona dados ou estruturas de banco que precisam existir
- [ ] Não lista dependências genéricas óbvias (ex: "Next.js", "banco de dados")

**Sinal de qualidade suficiente:** Um desenvolvedor sabe o que precisar estar pronto antes de começar.

---

### 10. Riscos

**Propósito:** Antecipar o que pode dar errado e como mitigar.

**Formato:** Tabela com duas colunas: `Risco` e `Mitigação`.

**Checklist de qualidade:**
- [ ] Entre 2 e 5 linhas
- [ ] Cada risco é específico desta feature (não genérico como "o servidor pode cair")
- [ ] Cada mitigação é concreta e acionável
- [ ] Cobre ao menos um risco de segurança se a feature lidar com autenticação, dados sensíveis ou ações destrutivas

**Sinal de qualidade suficiente:** Os riscos são os que mais preocupariam um tech lead revisando a feature.

---

## Regras gerais de formato

- **Tom:** orientado a produto, não a implementação. Um PM deve entender tudo sem saber código.
- **Idioma:** português. Termos técnicos consagrados (JWT, cookie, OAuth, bcrypt) ficam em inglês.
- **Título do arquivo:** `# PRD — <Nome da Feature>` (com travessão, não hífen)
- **Seções vazias:** nunca deixar uma seção em branco. Se não se aplica, escrever explicitamente por quê.
- **Sem repetição:** se algo já foi dito em uma seção, não repita em outra.

---

## Referências

- Guia de entrevista e banco de perguntas: `references/interview-guide.md`
- Exemplo anotado de PRD de qualidade: `references/prd-example.md`
