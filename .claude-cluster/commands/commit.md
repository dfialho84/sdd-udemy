---
name: commit
description: Analise as mudanças no repositório git e sugira uma mensagem de commit clara e concisa em português, seguindo o padrão conventional commits.
---

Analise as mudanças no repositório git (usando git status e git diff) e sugira uma mensagem de commit clara e concisa em português,
seguindo o padrão conventional commits (feat, fix, docs, chore, etc.).

Importante: veja também as diferenças de arquivos não estagiados.

Depois pergunte se o commit deve ser feito ou não.

Caso positivo, faça a adição do arquivos (com git add) e depois faça o commit com a mensagem sugerida.