const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

// Intercepta todas as respostas para formatar com o padrão de paginação do seu README
router.render = (req, res) => {
    let data = res.locals.data;

    // Se a rota for /me ou /family, devolvemos direto (são objetos únicos)
    if (req.url === '/me' || req.path === '/family') {
        return res.json(data);
    }

    // Se a requisição retornou um Array (lista de jogos, partidas, contas, etc)
    if (Array.isArray(data)) {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const total = data.length; // Em um cenário real seria o total do DB, aqui o json-server já filtrou

        res.json({
            data: data,
            total: total,
            page: page,
            limit: limit,
            totalPages: Math.ceil(total / limit) || 1
        });
    } else {
        // Para POST, PATCH, DELETE de um item específico, retorna normal
        res.json(data);
    }
}

server.use(router);
server.listen(3000, () => {
    console.log('JSON Server está rodando na porta 3000 com formatação de paginação customizada!');
});