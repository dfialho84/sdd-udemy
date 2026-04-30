Feature: Login — Bloqueio após tentativas erradas

  # GH-6 — Bloquear após 3 tentativas erradas em 10 minutos
  # Rastreabilidade: T-40 · REQ-8 · REQ-9 · REQ-10 · NFR-3 · NFR-4 · Scenario: "Bloquear após 3 tentativas erradas em 10 minutos"

  Scenario: Bloquear após 3 tentativas erradas em 10 minutos
    Given que o usuário "alice" realizou 3 tentativas de login fracassadas nos últimos 10 minutos
    When o usuário tenta fazer login novamente
    Then o sistema exibe mensagem de bloqueio "Muitas tentativas fracassadas. Tente novamente em 15 minutos"
    And o identificador "alice" é bloqueado por 15 minutos
    And o usuário não consegue fazer login
