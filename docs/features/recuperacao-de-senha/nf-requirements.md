# Requisitos Não Funcionais — Recuperação de Senha

## Performance

**NFR-1**: Em condições normais, o sistema deve enviar o email de recuperação de senha dentro de até 1 minuto após a solicitação, para 95% dos casos.

> Fonte: Estória 2, critério 2 (Receber link de recuperação válido) / REQ-5 (Envio de email com token)

**NFR-2**: Em condições normais, o sistema deve processar a redefinição de senha e retornar a resposta de sucesso em até 500ms para 95% dos casos.

> Fonte: PRD, Critério de Sucesso "Usuário completa redefinição em menos de 2 minutos" / Estória 3 / REQ-10 (Atualizar credencial e invalidar sessões)

## Segurança

**NFR-3**: O sistema deve armazenar tokens de recuperação de senha criptografados de forma irreversível e nunca expor o token completo em logs, mensagens de erro ou respostas HTTP.

> Fonte: PRD, seção Riscos "Token armazenado de forma insegura" / Estória 2, critério 4 "usar HTTPS e nunca expor o token completo em logs" / REQ-4 (Token único com expiração)

**NFR-4**: O sistema deve invalidar permanentemente um token de recuperação de senha imediatamente após sua primeira utilização bem-sucedida, impedindo qualquer reutilização subsequente.

> Fonte: Estória 2, critério 3 (Invalidar token após primeira utilização) / REQ-6 (Invalidar token após redefinição bem-sucedida)

**NFR-5**: O sistema deve limitar solicitações de recuperação de senha a um máximo de 5 tentativas por endereço IP a cada período de 1 hora, bloqueando o IP que exceder esse limite até que o período expire automaticamente.

> Fonte: PRD, seção Riscos "Enumeration e força bruta" / Estória 7 (Rate limiting na solicitação) / REQ-16 e REQ-17 (Limitar 5 tentativas por hora e desbloqueio automático)

## Observabilidade

**NFR-6**: O sistema deve registrar em log de auditoria todas as tentativas de solicitação de recuperação de senha, incluindo: tentativas bem-sucedidas, tentativas com emails inexistentes, tentativas bloqueadas por rate limit, com timestamp e endereço IP de origem. Os logs de auditoria devem ser retidos por um mínimo de 1 ano.

> Fonte: Estória 4, critério 4 (Registrar tentativas com emails inexistentes para auditoria) / Estória 7, critério 3 (Registrar tentativas bloqueadas em logs de segurança) / REQ-16 (Registrar tentativas bloqueadas por rate limit)
