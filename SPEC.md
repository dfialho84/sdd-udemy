Esta é uma aplicação para criação de quadros kanban para resolução de sprints.

O processo de desenvolvimento será seguindo a metodologia SDD com agentes,comandos e skills em @.claude/

a documentação está toda em @doc

A stack utilizada é:

next js com typescript
tailwind
shadcn
testes com jest
e2e testes com cypress e cucumber
orm drizzle
banco mysql
usar mailhog para simular emails
NÂO USAR next-sdd (nem nenhuma outra lib externa, use os componentes já existentes em .claude)
docker commpose para rodar componentes do ambiente de testes, como bancos, servidores de email, etc. (mas comente incluir serviços quando necessário)
Será usado opentelemetry como ferramenta de observabilidade
tracing → Jaeger
métricas → Prometheus
logs → Grafana Loki
dashboards → Grafana
use k6 para testes de carga
usar arquitetura hexagonal

Crie uma seção também como comandos diversos para executar o app, testar, etc.

Crie uma seção sobre os comandos e agentes a se usar.

Cria uma seção mostrando a sequencia de desenvolvimento usando sdd. (veja os comandos e agentes para descobir hahaha)
