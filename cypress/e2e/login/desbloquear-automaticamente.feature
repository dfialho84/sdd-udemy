Feature: Login — Desbloqueio automatico apos 15 minutos

  # GH-8 — Desbloquear automaticamente apos 15 minutos
  # Rastreabilidade: T-46 · REQ-12 · Scenario: "Desbloquear automaticamente apos 15 minutos"

  Scenario: Desbloquear automaticamente apos 15 minutos
    Given que o identificador "alice" esta bloqueado e o periodo de 15 minutos expirou
    When o usuario tenta fazer login com "alice" e uma senha valida
    And clica no botao de login
    Then o sistema remove o bloqueio
    And o sistema reseta o contador de tentativas fracassadas
    And o usuario consegue fazer login com sucesso
