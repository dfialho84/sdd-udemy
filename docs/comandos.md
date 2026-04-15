## Comandos do Projeto

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Testes unitários/integração
npm run test
npm run test -- --testPathPattern=<caminho>  # teste único

# Testes E2E
npx cypress run
npx cypress open

# Testes de carga
k6 run <script.js>

# Lint
npm run lint

# Banco de dados — apagar todas as tabelas (inclusive migrations), sem apagar o banco
node scripts/drop-all-tables.js
```
