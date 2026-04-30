Feature: Login — Tentar login durante período de bloqueio

  # GH-7 — Tentar login durante período de bloqueio
  # Rastreabilidade: T-41 · REQ-11 · REQ-10 · NFR-4 · Scenario: "Tentar login durante período de bloqueio"

  Scenario: Tentar login durante período de bloqueio
    Given que o identificador "alice" está bloqueado por tentativas erradas
    When o usuário tenta fazer login com "alice"
    Then o sistema exibe mensagem de bloqueio "Muitas tentativas fracassadas. Tente novamente em 15 minutos"
    And o usuário não consegue fazer login
