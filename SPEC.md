Preciso de um comando, agentes e skill para realizar a terefa de extrai telas, screens dos documentos em `docs/features/<feature-name>/scenarios.feature`
O agente também poderá levar em conta outros documentos na pasta `docs/features/<feature-name>`

O comando deverá se chamar extract-views e deverá ser chamado assim:
/extract-views <nome-da-feature> <instruções adicionais>

O comando deverá chamar o agente especializado na tarefa e o agente deverá estar vinculado às skills. Ele deverá seguir a mesma dinâmica de entrevista
dos demais agentes.

O principal objetivo é:

1. Identificar as telas presentes nos scenarios e nomear cada uma delas com um nome significativo.
2. Para cada tela identificada:
   2.1 Criar um pasta (caso não exista) em `docs/features/<feature-name>/views/<nome-da-tela>`
   2.2 Criar um arquivo chamado tela.md dentro desta pasta com a descrição dos componentes da tela, como campos, seções, botoẽs, links, etc.
   2.3 Neste mesmo arquivo, colocar qualquer consideração que julgar importante, como estados, etc.
   2.4 Deixar uma última seção para print das telas. A ideia aqui é deixar um seção que será preenchida manualmente com referências para prints de wireframes, mocks e afins da tela em questão.
