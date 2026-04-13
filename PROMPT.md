Esta é uma especificação inicial e crua da feature de login.

O objetivo desta feature é permitir que o usuário possa se autenticar no sistema e usar os recursos de forma segura,
garantido sua identidade e seguranças de suas informações.

A ideia é que o usuario já cadastrado acesse a página inicial e clique em um link "Entrar".
Em seguida será apresentada um formulário de login com usuario e senha.
O usuario entra com os valores e submete o formulario.
O sistema verifica se os dados estão corretos.
Caso afirmativo, ele será autenticado e será redirecionado para uma area proprioa para seu usuario /users/<id-do-usuaio>
Caso os dados estejam incorretos uma mensagem genérica será apresentada. (É importante apresentar uma mensagem bem genérica para não expor possíveis ataques)

A velocidade de resposta é importante.

A autenticação será feita por conta do proprio sistema, mas pode ser que no futuro usemos provedores, como Google ou Facebook. O sistema deverá estar preparado para isto mas não será implementado agora.

As tentativas tanto bem sucedidas quando mal sudidas devem ser registradas no log

Deve haver um controle de tentativas para evitar ataques de força bruta.
