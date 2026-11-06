// Dados do Expresso do Prompt · mapa v5 (5 colunas × 6 linhas), 30 estações, 46 conexões, 30 Missões
const ESTACOES = [{"nome": "Ciências", "zona": "partida", "coluna": 1, "linha": 4}, {"nome": "Até 5 Linhas", "zona": "formato", "coluna": 0, "linha": 3}, {"nome": "Respeito a Todos", "zona": "etica", "coluna": 1, "linha": 5}, {"nome": "Assunto Novo", "zona": "contexto", "coluna": 3, "linha": 1}, {"nome": "Dar Ideias", "zona": "tarefa", "coluna": 0, "linha": 4}, {"nome": "Jornalista", "zona": "persona", "coluna": 0, "linha": 1}, {"nome": "Passo a Passo", "zona": "formato", "coluna": 1, "linha": 1}, {"nome": "Resumir", "zona": "tarefa", "coluna": 2, "linha": 1}, {"nome": "Cientista", "zona": "persona", "coluna": 1, "linha": 0}, {"nome": "Autoria Própria", "zona": "etica", "coluna": 0, "linha": 2}, {"nome": "Feira de Ciências", "zona": "contexto", "coluna": 2, "linha": 3}, {"nome": "Geografia", "zona": "partida", "coluna": 4, "linha": 2}, {"nome": "Checar Fatos", "zona": "etica", "coluna": 2, "linha": 0}, {"nome": "Explicar", "zona": "tarefa", "coluna": 3, "linha": 0}, {"nome": "Tutor(a) Paciente", "zona": "persona", "coluna": 3, "linha": 2}, {"nome": "Trabalho em Grupo", "zona": "contexto", "coluna": 1, "linha": 2}, {"nome": "Matemática", "zona": "partida", "coluna": 2, "linha": 4}, {"nome": "Tabela", "zona": "formato", "coluna": 3, "linha": 3}, {"nome": "Criar Exercícios", "zona": "tarefa", "coluna": 1, "linha": 3}, {"nome": "Citar Fontes", "zona": "etica", "coluna": 3, "linha": 4}, {"nome": "Professor(a)", "zona": "persona", "coluna": 2, "linha": 5}, {"nome": "Lista", "zona": "formato", "coluna": 2, "linha": 2}, {"nome": "Estudo em Casa", "zona": "contexto", "coluna": 0, "linha": 5}, {"nome": "Português", "zona": "partida", "coluna": 3, "linha": 5}, {"nome": "Proteger Dados", "zona": "etica", "coluna": 4, "linha": 0}, {"nome": "Revisar Texto", "zona": "tarefa", "coluna": 4, "linha": 1}, {"nome": "História", "zona": "partida", "coluna": 0, "linha": 0}, {"nome": "Narrador(a)", "zona": "persona", "coluna": 4, "linha": 3}, {"nome": "Prova Amanhã", "zona": "contexto", "coluna": 4, "linha": 5}, {"nome": "Mapa Mental", "zona": "formato", "coluna": 4, "linha": 4}];

const CONEXOES = [{"a": 10, "b": 16, "tamanho": 2, "trilhos": ["formato", "etica"]}, {"a": 12, "b": 13, "tamanho": 1, "trilhos": ["persona", "tarefa"]}, {"a": 16, "b": 23, "tamanho": 3, "trilhos": ["persona", "contexto"]}, {"a": 7, "b": 21, "tamanho": 2, "trilhos": ["tarefa", "cinza"]}, {"a": 4, "b": 0, "tamanho": 1, "trilhos": ["formato", "etica"]}, {"a": 17, "b": 19, "tamanho": 2, "trilhos": ["tarefa", "formato"]}, {"a": 8, "b": 6, "tamanho": 2, "trilhos": ["etica", "contexto"]}, {"a": 3, "b": 11, "tamanho": 3, "trilhos": ["cinza", "tarefa"]}, {"a": 26, "b": 8, "tamanho": 1, "trilhos": ["contexto", "persona"]}, {"a": 18, "b": 0, "tamanho": 2, "trilhos": ["formato", "persona"]}, {"a": 3, "b": 25, "tamanho": 1, "trilhos": ["contexto", "etica"]}, {"a": 18, "b": 10, "tamanho": 1, "trilhos": ["persona", "etica"]}, {"a": 3, "b": 14, "tamanho": 2, "trilhos": ["etica", "formato"]}, {"a": 4, "b": 22, "tamanho": 2, "trilhos": ["persona", "cinza"]}, {"a": 25, "b": 11, "tamanho": 2, "trilhos": ["tarefa", "contexto"]}, {"a": 17, "b": 27, "tamanho": 1, "trilhos": ["contexto", "etica"]}, {"a": 16, "b": 19, "tamanho": 1, "trilhos": ["formato", "tarefa"]}, {"a": 19, "b": 23, "tamanho": 2, "trilhos": ["formato", "etica"]}, {"a": 26, "b": 5, "tamanho": 2, "trilhos": ["contexto", "persona"]}, {"a": 6, "b": 15, "tamanho": 2, "trilhos": ["cinza", "tarefa"]}, {"a": 5, "b": 6, "tamanho": 1, "trilhos": ["persona", "etica"]}, {"a": 7, "b": 3, "tamanho": 1, "trilhos": ["formato", "etica"]}, {"a": 14, "b": 17, "tamanho": 2, "trilhos": ["contexto", "cinza"]}, {"a": 20, "b": 23, "tamanho": 1, "trilhos": ["tarefa", "persona"]}, {"a": 23, "b": 28, "tamanho": 1, "trilhos": ["tarefa", "formato"]}, {"a": 9, "b": 1, "tamanho": 2, "trilhos": ["formato", "persona"]}, {"a": 29, "b": 28, "tamanho": 2, "trilhos": ["tarefa", "contexto"]}, {"a": 8, "b": 12, "tamanho": 1, "trilhos": ["etica", "cinza"]}, {"a": 6, "b": 7, "tamanho": 1, "trilhos": ["formato", "etica"]}, {"a": 24, "b": 25, "tamanho": 2, "trilhos": ["contexto", "persona"]}, {"a": 1, "b": 4, "tamanho": 2, "trilhos": ["etica", "tarefa"]}, {"a": 21, "b": 10, "tamanho": 2, "trilhos": ["cinza", "formato"]}, {"a": 11, "b": 27, "tamanho": 2, "trilhos": ["etica", "persona"]}, {"a": 15, "b": 10, "tamanho": 3, "trilhos": ["contexto", "tarefa"]}, {"a": 15, "b": 18, "tamanho": 2, "trilhos": ["formato", "cinza"]}, {"a": 2, "b": 20, "tamanho": 1, "trilhos": ["persona", "etica"]}, {"a": 14, "b": 11, "tamanho": 1, "trilhos": ["etica", "formato"]}, {"a": 26, "b": 6, "tamanho": 3, "trilhos": ["persona", "contexto"]}, {"a": 16, "b": 20, "tamanho": 2, "trilhos": ["tarefa", "etica"]}, {"a": 13, "b": 3, "tamanho": 2, "trilhos": ["formato", "cinza"]}, {"a": 19, "b": 29, "tamanho": 1, "trilhos": ["tarefa", "etica"]}, {"a": 10, "b": 17, "tamanho": 1, "trilhos": ["formato", "persona"]}, {"a": 17, "b": 29, "tamanho": 3, "trilhos": ["contexto", "tarefa"]}, {"a": 15, "b": 21, "tamanho": 1, "trilhos": ["cinza", "persona"]}, {"a": 0, "b": 16, "tamanho": 1, "trilhos": ["persona", "etica"]}, {"a": 9, "b": 15, "tamanho": 1, "trilhos": ["cinza", "formato"]}];

const MISSOES = [
 {
  "numero": 1,
  "partida": "Matemática",
  "estacoes": [
   "Prova Amanhã",
   "Tutor(a) Paciente",
   "Criar Exercícios",
   "Passo a Passo",
   "Autoria Própria"
  ],
  "valor": 15,
  "situacao": "Você travou nas equações e a prova é amanhã.",
  "dica": "R2 Ética antes da Tarefa"
 },
 {
  "numero": 2,
  "partida": "Matemática",
  "estacoes": [
   "Estudo em Casa",
   "Professor(a)",
   "Explicar",
   "Até 5 Linhas",
   "Checar Fatos"
  ],
  "valor": 17,
  "situacao": "Uma loja anuncia “50% + 20% = 70% de desconto”. Será?",
  "dica": "sem regra extra: pense na melhor ordem"
 },
 {
  "numero": 3,
  "partida": "Matemática",
  "estacoes": [
   "Trabalho em Grupo",
   "Jornalista",
   "Dar Ideias",
   "Tabela",
   "Proteger Dados"
  ],
  "valor": 16,
  "situacao": "Seu grupo vai pesquisar o uso de celular na escola.",
  "dica": "R1 Persona primeiro · R2 Ética antes da Tarefa"
 },
 {
  "numero": 4,
  "partida": "Ciências",
  "estacoes": [
   "Feira de Ciências",
   "Cientista",
   "Explicar",
   "Mapa Mental",
   "Citar Fontes"
  ],
  "valor": 14,
  "situacao": "Um vídeo diz que beber água gelada faz mal. Será verdade?",
  "dica": "sem regra extra: pense na melhor ordem"
 },
 {
  "numero": 5,
  "partida": "Ciências",
  "estacoes": [
   "Prova Amanhã",
   "Narrador(a)",
   "Resumir",
   "Lista",
   "Autoria Própria"
  ],
  "valor": 15,
  "situacao": "A prova de fotossíntese é amanhã e o conteúdo não entra.",
  "dica": "R1 Persona primeiro"
 },
 {
  "numero": 6,
  "partida": "Ciências",
  "estacoes": [
   "Assunto Novo",
   "Professor(a)",
   "Criar Exercícios",
   "Lista",
   "Citar Fontes"
  ],
  "valor": 12,
  "situacao": "A turma começou a estudar o sistema solar.",
  "dica": "sem regra extra: pense na melhor ordem"
 },
 {
  "numero": 7,
  "partida": "Ciências",
  "estacoes": [
   "Estudo em Casa",
   "Jornalista",
   "Resumir",
   "Até 5 Linhas",
   "Checar Fatos"
  ],
  "valor": 15,
  "situacao": "Uma mensagem no grupo da família fala mal das vacinas.",
  "dica": "R3 Material no fim"
 },
 {
  "numero": 8,
  "partida": "História",
  "estacoes": [
   "Trabalho em Grupo",
   "Narrador(a)",
   "Dar Ideias",
   "Mapa Mental",
   "Respeito a Todos"
  ],
  "valor": 19,
  "situacao": "Seu grupo vai apresentar sobre os povos indígenas da região.",
  "dica": "R1 Persona primeiro · R2 Ética antes da Tarefa"
 },
 {
  "numero": 9,
  "partida": "História",
  "estacoes": [
   "Prova Amanhã",
   "Professor(a)",
   "Resumir",
   "Tabela",
   "Autoria Própria"
  ],
  "valor": 17,
  "situacao": "Amanhã tem prova sobre a Revolução Industrial.",
  "dica": "sem regra extra: pense na melhor ordem"
 },
 {
  "numero": 10,
  "partida": "História",
  "estacoes": [
   "Estudo em Casa",
   "Jornalista",
   "Explicar",
   "Lista",
   "Checar Fatos"
  ],
  "valor": 16,
  "situacao": "Você quer descobrir como o seu bairro surgiu.",
  "dica": "R1 Persona primeiro"
 },
 {
  "numero": 11,
  "partida": "História",
  "estacoes": [
   "Assunto Novo",
   "Tutor(a) Paciente",
   "Explicar",
   "Passo a Passo",
   "Citar Fontes"
  ],
  "valor": 13,
  "situacao": "Você vai explicar a Independência do Brasil em 5 minutos.",
  "dica": "sem regra extra: pense na melhor ordem"
 },
 {
  "numero": 12,
  "partida": "Português",
  "estacoes": [
   "Estudo em Casa",
   "Professor(a)",
   "Revisar Texto",
   "Lista",
   "Autoria Própria"
  ],
  "valor": 17,
  "situacao": "A redação do ENEM está chegando e você quer treinar.",
  "dica": "R2 Ética antes da Tarefa · R3 Material no fim"
 },
 {
  "numero": 13,
  "partida": "Português",
  "estacoes": [
   "Trabalho em Grupo",
   "Tutor(a) Paciente",
   "Revisar Texto",
   "Até 5 Linhas",
   "Respeito a Todos"
  ],
  "valor": 18,
  "situacao": "Seu grupo escreveu um texto contra o bullying para o mural.",
  "dica": "R3 Material no fim"
 },
 {
  "numero": 14,
  "partida": "Português",
  "estacoes": [
   "Assunto Novo",
   "Narrador(a)",
   "Explicar",
   "Mapa Mental",
   "Citar Fontes"
  ],
  "valor": 12,
  "situacao": "Você vai apresentar um seminário sobre Machado de Assis.",
  "dica": "R1 Persona primeiro"
 },
 {
  "numero": 15,
  "partida": "Português",
  "estacoes": [
   "Estudo em Casa",
   "Tutor(a) Paciente",
   "Dar Ideias",
   "Lista",
   "Proteger Dados"
  ],
  "valor": 19,
  "situacao": "Você quer fazer o seu primeiro currículo.",
  "dica": "R2 Ética antes da Tarefa"
 },
 {
  "numero": 16,
  "partida": "Geografia",
  "estacoes": [
   "Estudo em Casa",
   "Cientista",
   "Explicar",
   "Até 5 Linhas",
   "Checar Fatos"
  ],
  "valor": 18,
  "situacao": "Sua rua alaga sempre que chove forte.",
  "dica": "sem regra extra: pense na melhor ordem"
 },
 {
  "numero": 17,
  "partida": "Geografia",
  "estacoes": [
   "Trabalho em Grupo",
   "Professor(a)",
   "Resumir",
   "Tabela",
   "Respeito a Todos"
  ],
  "valor": 14,
  "situacao": "A turma vai estudar as culturas das regiões do Brasil.",
  "dica": "R2 Ética antes da Tarefa"
 },
 {
  "numero": 18,
  "partida": "Geografia",
  "estacoes": [
   "Feira de Ciências",
   "Jornalista",
   "Dar Ideias",
   "Lista",
   "Citar Fontes"
  ],
  "valor": 15,
  "situacao": "Seu projeto da feira de ciências é sobre desmatamento.",
  "dica": "sem regra extra: pense na melhor ordem"
 },
 {
  "numero": 19,
  "partida": "Geografia",
  "estacoes": [
   "Assunto Novo",
   "Tutor(a) Paciente",
   "Criar Exercícios",
   "Mapa Mental",
   "Autoria Própria"
  ],
  "valor": 13,
  "situacao": "Você precisa desenhar o mapa do seu bairro com legenda.",
  "dica": "R2 Ética antes da Tarefa"
 },
 {
  "numero": 20,
  "partida": "Ciências",
  "estacoes": [
   "Trabalho em Grupo",
   "Cientista",
   "Dar Ideias",
   "Tabela",
   "Respeito a Todos"
  ],
  "valor": 15,
  "situacao": "A turma vai pesquisar as plantas medicinais da comunidade.",
  "dica": "R1 Persona primeiro · R2 Ética antes da Tarefa"
 },
 {
  "numero": 21,
  "partida": "Matemática",
  "estacoes": [
   "Assunto Novo",
   "Narrador(a)",
   "Explicar",
   "Lista",
   "Respeito a Todos"
  ],
  "valor": 14,
  "situacao": "Você vai ajudar um colega que tem dificuldade em porcentagem.",
  "dica": "R1 Persona primeiro"
 },
 {
  "numero": 22,
  "partida": "História",
  "estacoes": [
   "Trabalho em Grupo",
   "Tutor(a) Paciente",
   "Dar Ideias",
   "Até 5 Linhas",
   "Proteger Dados"
  ],
  "valor": 17,
  "situacao": "Você vai entrevistar seus avós sobre a história da cidade.",
  "dica": "R2 Ética antes da Tarefa"
 },
 {
  "numero": 23,
  "partida": "Matemática",
  "estacoes": [
   "Estudo em Casa",
   "Professor(a)",
   "Dar Ideias",
   "Tabela",
   "Proteger Dados"
  ],
  "valor": 16,
  "situacao": "Você quer juntar a mesada para comprar um tênis.",
  "dica": "R2 Ética antes da Tarefa"
 },
 {
  "numero": 24,
  "partida": "Matemática",
  "estacoes": [
   "Trabalho em Grupo",
   "Professor(a)",
   "Explicar",
   "Passo a Passo",
   "Checar Fatos"
  ],
  "valor": 13,
  "situacao": "Seu grupo precisa transformar os dados da pesquisa em um gráfico.",
  "dica": "R3 Material no fim"
 },
 {
  "numero": 25,
  "partida": "Português",
  "estacoes": [
   "Trabalho em Grupo",
   "Jornalista",
   "Revisar Texto",
   "Até 5 Linhas",
   "Checar Fatos"
  ],
  "valor": 19,
  "situacao": "Uma notícia viralizou com um título exagerado.",
  "dica": "R3 Material no fim"
 },
 {
  "numero": 26,
  "partida": "Português",
  "estacoes": [
   "Prova Amanhã",
   "Tutor(a) Paciente",
   "Revisar Texto",
   "Lista",
   "Autoria Própria"
  ],
  "valor": 15,
  "situacao": "Amanhã tem apresentação oral e você quer revisar o seu roteiro.",
  "dica": "R1 Persona primeiro · R2 Ética antes da Tarefa · R3 Material no fim"
 },
 {
  "numero": 27,
  "partida": "Geografia",
  "estacoes": [
   "Feira de Ciências",
   "Cientista",
   "Dar Ideias",
   "Mapa Mental",
   "Citar Fontes"
  ],
  "valor": 16,
  "situacao": "A escola vai fazer uma campanha de reciclagem de tampinhas.",
  "dica": "R1 Persona primeiro"
 },
 {
  "numero": 28,
  "partida": "Geografia",
  "estacoes": [
   "Assunto Novo",
   "Professor(a)",
   "Explicar",
   "Passo a Passo",
   "Proteger Dados"
  ],
  "valor": 17,
  "situacao": "Você vai pegar ônibus sozinho para um lugar novo no Rio.",
  "dica": "R2 Ética antes da Tarefa"
 },
 {
  "numero": 29,
  "partida": "Ciências",
  "estacoes": [
   "Feira de Ciências",
   "Cientista",
   "Criar Exercícios",
   "Até 5 Linhas",
   "Checar Fatos"
  ],
  "valor": 13,
  "situacao": "Seu grupo vai fazer um quiz sobre a dengue para a feira de ciências.",
  "dica": "sem regra extra: pense na melhor ordem"
 },
 {
  "numero": 30,
  "partida": "História",
  "estacoes": [
   "Assunto Novo",
   "Narrador(a)",
   "Resumir",
   "Mapa Mental",
   "Respeito a Todos"
  ],
  "valor": 17,
  "situacao": "Você nunca ouviu falar da Pequena África, no Rio, e quer conhecer.",
  "dica": "R1 Persona primeiro · R2 Ética antes da Tarefa"
 }
];
