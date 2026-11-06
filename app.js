// Expresso do Prompt · jogo online (GitHub Pages)
// Quem cria a partida é o anfitrião: o aparelho dele roda as regras e os bots.
// Os outros entram pelo código e conversam com ele direto (WebRTC, via PeerJS).

const PREFIXO = "expresso-prompt-v1-";
const LETRAS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LETRA = { contexto: "C", persona: "P", tarefa: "T", formato: "F", etica: "É", coringa: "★", cinza: "", partida: "?" };
const NOME_ZONA = { contexto: "CONTEXTO", persona: "PERSONA", tarefa: "TAREFA", formato: "FORMATO", etica: "ÉTICA", partida: "PARTIDA" };
const COR = { contexto: "#2b6cd9", persona: "#7c4dbf", tarefa: "#e88014", formato: "#2e9e5b", etica: "#d63e4c", cinza: "#969ca5", partida: "#1e2235" };
const COR_FUNDO = { contexto: "#e8f0fc", persona: "#f2ecfa", tarefa: "#fef2e4", formato: "#e8f6ee", etica: "#fceaec", cinza: "#ffffff" };

const $ = (s) => document.querySelector(s);

// ===================== estado local =====================
let eu = null;          // estado do jogo que este aparelho recebeu (visão do jogador)
let souAnfitriao = false;
let host = null;        // dados do anfitrião (só existe no aparelho de quem criou)
let peer = null;
let conexaoHost = null; // conexão do convidado com o anfitrião

function nomeJogador() {
    const n = $("#nome").value.trim();
    return n || "Jogador";
}

function mostrarTela(id) {
    document.querySelectorAll(".tela").forEach((t) => { t.hidden = t.id !== id; });
}

function avisoMenu(texto) {
    $("#menu-aviso").textContent = texto || "";
}

// ===================== ANFITRIÃO =====================
function novoCodigo() {
    let c = "";
    for (let i = 0; i < 5; i++) c += LETRAS[Math.floor(Math.random() * LETRAS.length)];
    return c;
}

function criarSala(offline) {
    souAnfitriao = true;
    host = {
        codigo: offline ? "-----" : novoCodigo(), offline,
        assentos: [{ nome: nomeJogador(), tipo: "humano", id: "local" }],
        rapida: false, estado: "espera", partida: null, conexoes: new Map(), botAgendado: null,
    };
    if (offline) {
        if (host.assentos.length < 2) host.assentos.push({ nome: "Bot 1", tipo: "bot" });
        difundirSala();
        return;
    }
    avisoMenu("Criando a partida…");
    peer = new Peer(PREFIXO + host.codigo);
    peer.on("open", () => { avisoMenu(""); difundirSala(); });
    peer.on("connection", (conn) => {
        conn.on("data", (msg) => receberNoHost(conn, msg));
        conn.on("close", () => saiuConvidado(conn.peer));
        conn.on("error", () => saiuConvidado(conn.peer));
    });
    peer.on("error", (e) => {
        if (e.type === "unavailable-id") { peer.destroy(); criarSala(false); return; }
        avisoMenu("Não deu para criar a partida online (" + e.type + "). Verifique a internet ou jogue só com bots.");
        mostrarTela("tela-menu");
    });
}

function enviarPara(id, msg) {
    if (id === "local") { receberNoCliente(msg); return; }
    const conn = host.conexoes.get(id);
    if (conn && conn.open) conn.send(msg);
}

function resumoSala() {
    return {
        codigo: host.codigo, offline: host.offline, rapida: host.rapida, estado: host.estado,
        assentos: host.assentos.map((a) => ({ nome: a.nome, tipo: a.tipo })),
    };
}

function difundirSala() {
    const r = resumoSala();
    host.assentos.forEach((a) => {
        if (a.tipo === "humano") enviarPara(a.id, { t: "sala", sala: r, souHost: a.id === "local" });
    });
}

function difundirJogo() {
    const p = host.partida;
    if (!p) return;
    host.assentos.forEach((a, j) => {
        if (a.tipo === "humano") enviarPara(a.id, { t: "jogo", estado: p.estadoPara(j), souHost: a.id === "local" });
    });
}

function agendarBot() {
    const p = host.partida;
    if (!p || p.fase !== "turno" || !p.jogadores[p.vez].bot) return;
    const chave = p.rel.vezes + ":" + p.vez;
    if (host.botAgendado === chave) return;
    host.botAgendado = chave;
    host.tentativasBot = 0;
    const jogar = () => {
        if (!host || host.partida !== p || p.rel.vezes + ":" + p.vez !== chave) return;
        try {
            p.botJogar();
        } catch (erro) {
            console.warn("Bot:", erro);
        }
        // se o bot não conseguiu terminar a vez, tenta de novo; na 3ª vez, passa a vez à força
        if (p.fase === "turno" && p.rel.vezes + ":" + p.vez === chave) {
            if (++host.tentativasBot >= 3) { p.acao = null; p.fimDaVez(); }
            else setTimeout(jogar, 600);
        }
    };
    setTimeout(jogar, 900);
}

function aoMudarPartida() {
    difundirJogo();
    agendarBot();
}

function iniciarPartida() {
    if (host.assentos.length < 2) return;
    host.estado = "jogo";
    const assentos = host.assentos.map((a) => ({ nome: a.nome, bot: a.tipo === "bot" }));
    host.partida = new Partida(assentos, host.rapida, aoMudarPartida);
    aoMudarPartida();
}

function indiceDo(id) {
    return host.assentos.findIndex((a) => a.id === id);
}

function receberNoHost(conn, msg) {
    if (!msg || typeof msg !== "object") return;
    if (msg.t === "entrar") {
        if (host.estado !== "espera") { conn.send({ t: "erro", texto: "Essa partida já começou." }); setTimeout(() => conn.close(), 300); return; }
        if (host.assentos.length >= MAX_JOGADORES) { conn.send({ t: "erro", texto: "A sala está cheia (5 jogadores)." }); setTimeout(() => conn.close(), 300); return; }
        host.conexoes.set(conn.peer, conn);
        host.assentos.push({ nome: String(msg.nome || "Jogador").slice(0, 18), tipo: "humano", id: conn.peer });
        difundirSala();
        return;
    }
    if (msg.t === "acao") tratarAcao(conn.peer, msg);
}

function tratarAcao(id, msg) {
    if (!host) return;
    const p = host.partida;
    const j = indiceDo(id);
    if (j < 0) return;
    if (host.estado === "espera") {
        if (id !== "local") return; // só o anfitrião mexe na sala
        if (msg.tipo === "bot" && host.assentos.length < MAX_JOGADORES) {
            const n = host.assentos.filter((a) => a.tipo === "bot").length;
            host.assentos.push({ nome: "Bot " + (n + 1), tipo: "bot" });
        } else if (msg.tipo === "tirar" && host.assentos[msg.a] && host.assentos[msg.a].tipo === "bot") {
            host.assentos.splice(msg.a, 1);
        } else if (msg.tipo === "rapida") {
            host.rapida = !host.rapida;
        } else if (msg.tipo === "iniciar") {
            iniciarPartida();
            return;
        }
        difundirSala();
        return;
    }
    if (!p) return;
    if (msg.tipo === "escolher") { p.escolher(j, msg.a); return; }
    if (msg.tipo === "nova" && id === "local" && p.fase === "fim") {
        host.estado = "espera"; host.partida = null;
        host.assentos = host.assentos.filter((a) => a.tipo === "bot" || a.id === "local" || host.conexoes.has(a.id));
        difundirSala();
        return;
    }
    if (p.fase !== "turno" || p.vez !== j || p.pendente[j]) return;
    let ok = false;
    if (msg.tipo === "plataforma") ok = p.comprar(j, Number(msg.a));
    else if (msg.tipo === "monte") ok = p.comprar(j, "monte");
    else if (msg.tipo === "construir") ok = p.construir(j, Number(msg.a), Number(msg.b), msg.c);
    else if (msg.tipo === "missoes") ok = p.pegarMissoes(j);
    else if (msg.tipo === "passar") ok = p.passar(j);
    if (!ok) difundirJogo();
}

function saiuConvidado(id) {
    if (!host || !host.conexoes.has(id)) return;
    host.conexoes.delete(id);
    const j = indiceDo(id);
    if (j < 0) return;
    if (host.estado === "espera") {
        host.assentos.splice(j, 1);
        difundirSala();
    } else {
        const a = host.assentos[j];
        a.tipo = "bot"; a.id = null;
        if (host.partida) {
            const jg = host.partida.jogadores[j];
            jg.bot = true;
            host.partida.registrar(jg.nome + " saiu; um bot assumiu a vez.");
            if (host.partida.pendente[j]) host.partida.botEscolher(j);
            aoMudarPartida();
        }
    }
}

// ===================== CONVIDADO =====================
function entrarNaSala(codigo) {
    codigo = codigo.trim().toUpperCase();
    if (codigo.length !== 5) { avisoMenu("O código tem 5 letras/números."); return; }
    souAnfitriao = false;
    avisoMenu("Procurando a partida " + codigo + "…");
    peer = new Peer();
    peer.on("open", () => {
        conexaoHost = peer.connect(PREFIXO + codigo, { reliable: true });
        const desistir = setTimeout(() => {
            if (!conexaoHost.open) { avisoMenu("Não encontrei a partida " + codigo + ". Confira o código."); sairDeTudo(false); }
        }, 12000);
        conexaoHost.on("open", () => {
            clearTimeout(desistir);
            avisoMenu("");
            conexaoHost.send({ t: "entrar", nome: nomeJogador() });
        });
        conexaoHost.on("data", receberNoCliente);
        conexaoHost.on("close", () => {
            if (eu !== null || !$("#tela-sala").hidden) { voltarAoMenu("A conexão com o anfitrião caiu."); }
        });
    });
    peer.on("error", (e) => {
        avisoMenu(e.type === "peer-unavailable" ? "Não encontrei a partida " + codigo + ". Confira o código." : "Erro de conexão (" + e.type + ").");
        sairDeTudo(false);
    });
}

function enviarAcao(tipo, a, b, c) {
    const msg = { t: "acao", tipo, a, b, c };
    if (souAnfitriao) tratarAcao("local", msg);
    else if (conexaoHost && conexaoHost.open) conexaoHost.send(msg);
}

function sairDeTudo(manterTela) {
    if (peer) { try { peer.destroy(); } catch (e) { /* nada */ } }
    peer = null; conexaoHost = null; host = null; souAnfitriao = false; eu = null;
    fecharJanelas();
    if (!manterTela) mostrarTela("tela-menu");
}

function voltarAoMenu(texto) {
    sairDeTudo(false);
    avisoMenu(texto || "");
}

// ===================== mensagens recebidas =====================
let souHostNaTela = false;

function receberNoCliente(msg) {
    if (msg.t === "erro") { voltarAoMenu(msg.texto); return; }
    if (msg.t === "sala") { eu = null; fecharJanelas(); mostrarSala(msg.sala, msg.souHost); return; }
    if (msg.t === "jogo") {
        const primeira = eu === null;
        eu = msg.estado;
        souHostNaTela = msg.souHost;
        mostrarTela("tela-jogo");
        if (primeira) { desenharTabuleiro(); zoomInicial(); }
        atualizarJogo();
    }
}

// ===================== SALA =====================
function mostrarSala(sala, souHost) {
    mostrarTela("tela-sala");
    $("#sala-codigo").textContent = sala.offline ? "SEM INTERNET" : sala.codigo;
    $("#sala-codigo").style.fontSize = sala.offline ? "1.4rem" : "";
    $("#sala-dica").hidden = sala.offline;
    $("#botao-copiar").hidden = sala.offline;
    const lista = $("#sala-assentos");
    lista.innerHTML = "";
    for (let i = 0; i < MAX_JOGADORES; i++) {
        const a = sala.assentos[i];
        const li = document.createElement("li");
        const nome = document.createElement("span");
        nome.innerHTML = `<span class="bolinha" style="background:${a ? CORES_JOGADOR[i] : "#ddd"}"></span>`;
        nome.append(a ? `${i + 1}. ${a.nome}${a.tipo === "bot" ? " (bot)" : ""}` : `${i + 1}. (vago)`);
        li.appendChild(nome);
        if (souHost && a && a.tipo === "bot") {
            li.appendChild(botao("Remover", "botao botao-vermelho", () => enviarAcao("tirar", i)));
        }
        lista.appendChild(li);
    }
    const area = $("#sala-botoes");
    area.innerHTML = "";
    if (souHost) {
        area.appendChild(botao("+ Adicionar bot", "botao botao-roxo", () => enviarAcao("bot")));
        area.appendChild(botao(`Partida Rápida (22 vagões, só Missões ★): ${sala.rapida ? "SIM" : "NÃO"}`, "botao botao-cinza", () => enviarAcao("rapida")));
        const pode = sala.assentos.length >= 2;
        const b = botao(pode ? "Começar partida" : "Precisa de pelo menos 2 jogadores", "botao botao-verde", () => { if (pode) enviarAcao("iniciar"); });
        b.disabled = !pode;
        area.appendChild(b);
    } else {
        const p = document.createElement("p");
        p.className = "ajuda";
        p.textContent = "Aguardando o anfitrião começar a partida…";
        area.appendChild(p);
    }
}

function botao(texto, classe, aoClicar) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = classe;
    b.textContent = texto;
    b.addEventListener("click", aoClicar);
    return b;
}

// ===================== TABULEIRO (SVG) =====================
const SVGNS = "http://www.w3.org/2000/svg";
const BW = 1032, BH = 944;
const SW = 60, TW = 74, R = 16.5, OFF = 19.5, PASSO = 37;
const px = (c) => 52 + c * 232;
const py = (r) => 50 + r * 170;
let tampinhas = [];   // tampinhas[ci][lado] = [elementos <g>]
let molduras = [];    // moldura de cada estação

function el(nome, attrs, pai) {
    const e = document.createElementNS(SVGNS, nome);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (pai) pai.appendChild(e);
    return e;
}

function txt(pai, x, y, texto, tamanho, cor, peso) {
    const t = el("text", { x, y, "font-size": tamanho, fill: cor, "font-weight": peso || 700, "text-anchor": "middle", "font-family": "Inter, Segoe UI, Arial, sans-serif" }, pai);
    t.textContent = texto;
    return t;
}

function metade(i) { return ESTACOES[i].zona === "partida" ? TW / 2 : SW / 2; }

function quebrarNome(nome) {
    const p = nome.split(" ");
    if (nome.length <= 10 || p.length === 1) return [nome];
    let melhor = null;
    for (let k = 1; k < p.length; k++) {
        const a = p.slice(0, k).join(" "), b = p.slice(k).join(" ");
        const n = Math.max(a.length, b.length);
        if (!melhor || n < melhor[0]) melhor = [n, [a, b]];
    }
    return melhor[1];
}

function desenharTabuleiro() {
    const svg = $("#tabuleiro");
    svg.innerHTML = "";
    tampinhas = []; molduras = [];
    el("rect", { x: 4, y: 4, width: BW - 8, height: BH - 8, rx: 14, fill: "#faf7f0" }, svg);
    const trilhos = el("g", {}, svg);
    const pecas = el("g", {}, svg);
    const estacoes = el("g", {}, svg);
    CONEXOES.forEach((c, ci) => {
        const a = ESTACOES[c.a], b = ESTACOES[c.b];
        const ax = px(a.coluna), ay = py(a.linha), bx = px(b.coluna), by = py(b.linha);
        tampinhas[ci] = [[], []];
        if (c.tamanho === 3) {
            // trilho de 3: bloco deitado no meio do quarteirão
            const cx = (ax + bx) / 2, cy = (ay + by) / 2, HW = PASSO * 1.5 + 6, HH = OFF + R + 6;
            const ha = metade(c.a), hb = metade(c.b);
            el("line", { x1: ax + ha, y1: ay + ha, x2: cx - HW + 6, y2: cy - HH + 6, stroke: "#b0aca4", "stroke-width": 4, "stroke-linecap": "round" }, trilhos);
            el("line", { x1: cx + HW - 6, y1: cy + HH - 6, x2: bx - hb, y2: by - hb, stroke: "#b0aca4", "stroke-width": 4, "stroke-linecap": "round" }, trilhos);
            el("rect", { x: cx - HW, y: cy - HH, width: 2 * HW, height: 2 * HH, rx: 12, fill: "#fff", stroke: "#1e2235", "stroke-width": 1.4 }, trilhos);
            for (let lado = 0; lado < 2; lado++) {
                const y = cy + (lado === 0 ? -OFF : OFF);
                for (let k = 0; k < 3; k++) tampinhas[ci][lado].push(tampinha(pecas, cx + (k - 1) * PASSO, y, c.trilhos[lado], ci, lado));
            }
            return;
        }
        const L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux;
        const d0 = metade(c.a) + 2, d1 = L - metade(c.b) - 2;
        for (let lado = 0; lado < 2; lado++) {
            const s = lado === 0 ? -1 : 1;
            el("line", { x1: ax + ux * d0 + nx * OFF * s, y1: ay + uy * d0 + ny * OFF * s, x2: ax + ux * d1 + nx * OFF * s, y2: ay + uy * d1 + ny * OFF * s,
                stroke: "#b0aca4", "stroke-width": 3, "stroke-linecap": "round" }, trilhos);
            for (let k = 0; k < c.tamanho; k++) {
                const t = L / 2 + (k - (c.tamanho - 1) / 2) * PASSO;
                tampinhas[ci][lado].push(tampinha(pecas, ax + ux * t + nx * OFF * s, ay + uy * t + ny * OFF * s, c.trilhos[lado], ci, lado));
            }
        }
    });
    ESTACOES.forEach((e, i) => {
        const x = px(e.coluna), y = py(e.linha);
        const g = el("g", {}, estacoes);
        if (e.zona === "partida") {
            const h = TW / 2;
            molduras[i] = el("rect", { x: x - h, y: y - h, width: TW, height: TW, rx: 14, fill: "#1e2235", stroke: "#1e2235", "stroke-width": 3 }, g);
            txt(g, x, y - h + 13, "PARTIDA", 7, "rgba(255,255,255,.75)", 800);
            txt(g, x, y + 8, "?", 26, "#fff", 900);
            txt(g, x, y + h - 9, e.nome, 10, "#fff", 900);
        } else {
            const h = SW / 2;
            molduras[i] = el("rect", { x: x - h, y: y - h, width: SW, height: SW, rx: 12, fill: "#fff", stroke: COR[e.zona], "stroke-width": 2.5 }, g);
            txt(g, x, y - h + 9, NOME_ZONA[e.zona], 6, COR[e.zona], 800);
            el("circle", { cx: x, cy: y - 8, r: 8.5, fill: COR[e.zona] }, g);
            txt(g, x, y - 4.5, LETRA[e.zona], 10, "#fff", 900);
            const linhas = quebrarNome(e.nome);
            linhas.forEach((l, k) => txt(g, x, y + 14 + (k - (linhas.length - 1) / 2) * 8.5, l, 8, "#1e2235", 800));
        }
    });
}

function tampinha(pai, x, y, cor, ci, lado) {
    const g = el("g", { class: "tampinha", "data-ci": ci, "data-lado": lado }, pai);
    el("circle", { cx: x, cy: y, r: R, fill: COR_FUNDO[cor], stroke: COR[cor], "stroke-width": 2.6, "stroke-dasharray": cor === "cinza" ? "4 3" : "" }, g);
    txt(g, x, y + 4, LETRA[cor], 11, COR[cor], 900);
    g.addEventListener("click", () => { if (!arrastou) pedirConstruir(ci, lado); });
    return g;
}

// ===== zoom e arrastar (dedo, mouse e pinça) =====
const vista = { x: 0, y: 0, w: BW, h: BH };
let arrastou = false;

function aplicarVista() {
    const svg = $("#tabuleiro");
    const caixa = svg.getBoundingClientRect();
    const proporcao = caixa.width > 0 ? caixa.height / caixa.width : BH / BW;
    vista.w = Math.min(Math.max(vista.w, 200), BW * 1.4);
    vista.h = vista.w * proporcao;
    const folgaX = Math.max(0, (vista.w - BW) / 2), folgaY = Math.max(0, (vista.h - BH) / 2);
    vista.x = Math.min(Math.max(vista.x, -folgaX - 0), BW - vista.w + folgaX);
    vista.y = Math.min(Math.max(vista.y, -folgaY - 0), BH - vista.h + folgaY);
    if (vista.w >= BW && vista.h >= BH) { vista.x = (BW - vista.w) / 2; vista.y = (BH - vista.h) / 2; }
    svg.setAttribute("viewBox", `${vista.x} ${vista.y} ${vista.w} ${vista.h}`);
}

function verTudo() {
    const caixa = $("#tabuleiro").getBoundingClientRect();
    const proporcao = caixa.width > 0 ? caixa.height / caixa.width : BH / BW;
    vista.w = Math.max(BW, BH / proporcao) + 8;
    vista.x = 0; vista.y = 0;
    aplicarVista();
}

function zoomEm(fator, fx, fy) {
    // fx, fy: ponto do tabuleiro (coordenadas do SVG) que fica parado
    const svgCaixa = $("#tabuleiro").getBoundingClientRect();
    if (fx === undefined) { fx = vista.x + vista.w / 2; fy = vista.y + vista.h / 2; }
    const rx = (fx - vista.x) / vista.w, ry = (fy - vista.y) / vista.h;
    vista.w = vista.w / fator;
    const proporcao = svgCaixa.width > 0 ? svgCaixa.height / svgCaixa.width : BH / BW;
    vista.h = vista.w * proporcao;
    vista.x = fx - rx * vista.w;
    vista.y = fy - ry * vista.h;
    aplicarVista();
}

function zoomInicial() {
    verTudo();
    if (window.matchMedia("(max-width: 900px), (max-height: 560px)").matches) zoomEm(1.7);
}

function pontoSvg(clientX, clientY) {
    const caixa = $("#tabuleiro").getBoundingClientRect();
    return { x: vista.x + (clientX - caixa.left) / caixa.width * vista.w, y: vista.y + (clientY - caixa.top) / caixa.height * vista.h };
}

(function prepararGestos() {
    const svg = $("#tabuleiro");
    const ponteiros = new Map();
    let inicio = null;
    svg.addEventListener("pointerdown", (ev) => {
        ponteiros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (ponteiros.size === 1) { arrastou = false; inicio = { x: ev.clientX, y: ev.clientY, vx: vista.x, vy: vista.y }; }
        else inicio = null;
    });
    svg.addEventListener("pointermove", (ev) => {
        if (!ponteiros.has(ev.pointerId)) return;
        const antes = ponteiros.get(ev.pointerId);
        ponteiros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        const caixa = svg.getBoundingClientRect();
        if (ponteiros.size === 2) {
            const [p1, p2] = [...ponteiros.values()];
            const outro = [...ponteiros.entries()].find(([id]) => id !== ev.pointerId)[1];
            const dAntes = Math.hypot(antes.x - outro.x, antes.y - outro.y);
            const dAgora = Math.hypot(p1.x - p2.x, p1.y - p2.y);
            if (dAntes > 10) {
                const centro = pontoSvg((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
                zoomEm(dAgora / dAntes, centro.x, centro.y);
            }
            arrastou = true;
        } else if (inicio) {
            const dx = ev.clientX - inicio.x, dy = ev.clientY - inicio.y;
            if (Math.hypot(dx, dy) > 8) arrastou = true;
            if (arrastou) {
                vista.x = inicio.vx - dx / caixa.width * vista.w;
                vista.y = inicio.vy - dy / caixa.height * vista.h;
                aplicarVista();
            }
        }
    });
    const soltar = (ev) => {
        ponteiros.delete(ev.pointerId);
        if (ponteiros.size === 1) {
            const [p] = [...ponteiros.values()];
            inicio = { x: p.x, y: p.y, vx: vista.x, vy: vista.y };
        }
        // o clique chega depois do pointerup: zera o "arrastou" um pouco depois
        if (ponteiros.size === 0) setTimeout(() => { arrastou = false; }, 50);
    };
    svg.addEventListener("pointerup", soltar);
    svg.addEventListener("pointercancel", soltar);
    svg.addEventListener("wheel", (ev) => {
        ev.preventDefault();
        const p = pontoSvg(ev.clientX, ev.clientY);
        zoomEm(ev.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
    }, { passive: false });
    $("#zoom-mais").addEventListener("click", () => zoomEm(1.4));
    $("#zoom-menos").addEventListener("click", () => zoomEm(1 / 1.4));
    $("#zoom-tudo").addEventListener("click", verTudo);
    window.addEventListener("resize", aplicarVista);
})();

// ===================== painel =====================
function minhaVez() {
    return eu && eu.fase === "turno" && eu.vez === eu.eu;
}

function aviso(texto) { $("#aviso").textContent = texto || ""; }

function pedirConstruir(ci, lado) {
    if (!minhaVez()) { aviso("Espere a sua vez."); return; }
    if (eu.escolha) { aviso("Escolha suas Missões primeiro."); return; }
    if (eu.acao !== null) { aviso("Você já começou a comprar cartas nesta vez."); return; }
    const c = CONEXOES[ci];
    const o = eu.ocupacao[ci];
    if (o[lado] !== -1) { aviso("Este trilho já está ocupado."); return; }
    if (o[1 - lado] === eu.eu) { aviso("Você não pode ocupar as 2 fileiras da mesma conexão."); return; }
    if (eu.jogadores[eu.eu].vagoes < c.tamanho) { aviso("Faltam vagões para este trilho."); return; }
    const cor = c.trilhos[lado];
    const ops = opcoesPagamento(eu.mao, cor, c.tamanho);
    const nomeT = `${ESTACOES[c.a].nome} — ${ESTACOES[c.b].nome}`;
    if (!ops.length) {
        aviso(`Faltam cartas: ${nomeT} pede ${c.tamanho} × ${cor === "cinza" ? "cartas iguais" : NOME_ZONA[cor]}.`);
        mostrarAba("jogada");
        return;
    }
    $("#pagar-titulo").textContent = `Construir ${nomeT} (${c.tamanho} círculo${c.tamanho > 1 ? "s" : ""})`;
    const lista = $("#opcoes-pagar");
    lista.innerHTML = "";
    ops.forEach((op) => {
        const partes = [];
        if (op.qtd > 0) partes.push(`${op.qtd} × ${NOME_ZONA[op.cor]}`);
        if (op.coringas > 0) partes.push(`${op.coringas} × Coringa`);
        const li = document.createElement("li");
        li.appendChild(botao("Pagar " + partes.join(" + "), "botao", () => {
            $("#janela-pagar").hidden = true;
            enviarAcao("construir", ci, lado, op.cor);
        }));
        lista.appendChild(li);
    });
    $("#janela-pagar").hidden = false;
}

function carta(cor, desabilitada, aoClicar) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "carta cor-" + cor;
    b.textContent = LETRA[cor];
    b.title = cor === "coringa" ? "Coringa" : NOME_ZONA[cor];
    b.disabled = !!desabilitada;
    if (aoClicar) b.addEventListener("click", aoClicar);
    return b;
}

function mostrarAba(aba) {
    $("#painel").dataset.abaAtual = aba;
    document.querySelectorAll(".aba[data-aba]").forEach((b) => b.classList.toggle("ativa", b.dataset.aba === aba));
}

let ultimaEscolha = null;

function atualizarJogo() {
    const e = eu;
    const meu = e.jogadores[e.eu];
    // tabuleiro
    CONEXOES.forEach((c, ci) => {
        for (let lado = 0; lado < 2; lado++) {
            const dono = e.ocupacao[ci][lado];
            tampinhas[ci][lado].forEach((g) => {
                const circ = g.querySelector("circle"), t = g.querySelector("text");
                if (dono !== -1) {
                    circ.setAttribute("fill", e.jogadores[dono].cor);
                    circ.setAttribute("stroke", "#1e2235");
                    circ.setAttribute("stroke-dasharray", "");
                    t.textContent = String(dono + 1);
                    t.setAttribute("fill", "#1e2235");
                } else {
                    const cor = c.trilhos[lado];
                    circ.setAttribute("fill", COR_FUNDO[cor]);
                    circ.setAttribute("stroke", COR[cor]);
                    circ.setAttribute("stroke-dasharray", cor === "cinza" ? "4 3" : "");
                    t.textContent = LETRA[cor];
                    t.setAttribute("fill", COR[cor]);
                }
            });
        }
    });
    const alvo = new Set();
    e.minhas.forEach((m) => estacoesDaMissao(m.numero).forEach((i) => alvo.add(i)));
    molduras.forEach((r, i) => {
        const z = ESTACOES[i].zona;
        r.setAttribute("stroke", alvo.has(i) ? meu.cor : (z === "partida" ? "#1e2235" : COR[z]));
        r.setAttribute("stroke-width", alvo.has(i) ? 7 : (z === "partida" ? 3 : 2.5));
    });
    // vez
    const jv = e.jogadores[e.vez];
    const titulo = $("#vez-nome");
    if (e.fase === "missoes") { titulo.textContent = "Escolha de Missões"; titulo.style.color = "#1e2235"; }
    else if (e.fase === "fim") { titulo.textContent = "Fim dos trilhos"; titulo.style.color = "#1e2235"; }
    else { titulo.textContent = minhaVez() ? "Sua vez!" : `Vez de ${jv.nome}${jv.bot ? " (bot)" : ""}`; titulo.style.color = jv.cor === "#f5c518" ? "#b38f00" : jv.cor; }
    if (e.ultimas) aviso(`Última rodada: faltam ${e.ultimas} jogada(s).`);
    else if (minhaVez() && e.acao === null) aviso("");
    // plataforma e botões
    const pode = minhaVez() && !e.escolha && (e.acao === null || e.acao === "compra");
    const plat = $("#plataforma");
    plat.innerHTML = "";
    e.plataforma.forEach((c, i) => {
        const li = document.createElement("li");
        li.appendChild(carta(c, !pode || (c === "coringa" && e.compras > 0), () => enviarAcao("plataforma", i)));
        plat.appendChild(li);
    });
    $("#botao-monte").textContent = `Comprar do monte (${e.monte})` + (e.acao === "compra" ? ` · compra ${e.compras} de 2` : "");
    $("#botao-monte").classList.toggle("apagado", !pode);
    $("#botao-missoes").textContent = `C · Pegar 2 Missões (${e.missoesMonte})`;
    $("#botao-missoes").classList.toggle("apagado", !(minhaVez() && e.acao === null && !e.escolha));
    $("#botao-passar").hidden = !e.podePassar;
    // mão
    const mao = $("#mao");
    mao.innerHTML = "";
    ["contexto", "persona", "tarefa", "formato", "etica", "coringa"].forEach((cor) => {
        const li = document.createElement("li");
        li.appendChild(carta(cor, false));
        li.append("× " + (e.mao[cor] || 0));
        mao.appendChild(li);
    });
    // Missões
    const minhas = $("#minhas");
    minhas.innerHTML = "";
    if (!e.minhas.length) minhas.innerHTML = "<li>Nenhuma Missão ainda.</li>";
    e.minhas.forEach((mm) => {
        const m = missaoPorNumero[mm.numero];
        const li = document.createElement("li");
        if (mm.completa) li.className = "completa";
        li.innerHTML = `<strong>${mm.completa ? "✔ " : ""}Missão ${m.numero}${m.valor <= 15 ? " ★" : ""} · ${m.valor} pts</strong>`;
        li.append(m.situacao);
        const est = document.createElement("small");
        est.style.display = "block";
        est.textContent = `? ${m.partida} · ${m.estacoes.join(" · ")}`;
        li.appendChild(est);
        const dica = document.createElement("small");
        dica.className = "dica";
        dica.style.display = "block";
        dica.textContent = "Dica de ordem: " + m.dica;
        li.appendChild(dica);
        minhas.appendChild(li);
    });
    // placar e registro
    const placar = $("#placar");
    placar.innerHTML = "";
    e.jogadores.forEach((jg, i) => {
        const li = document.createElement("li");
        li.style.color = jg.cor === "#f5c518" ? "#b38f00" : jg.cor;
        li.textContent = `${i === e.vez ? "▶ " : ""}${i + 1}. ${jg.nome}${jg.bot ? " (bot)" : ""} · ${jg.vagoes} vagões · ${jg.pontos} pts · ${jg.cartas} cartas · ${jg.missoes} Missões`;
        placar.appendChild(li);
    });
    const reg = $("#registro");
    reg.innerHTML = "";
    e.registro.forEach((r) => { const li = document.createElement("li"); li.textContent = r; reg.appendChild(li); });
    // botão do painel escondido
    const abrir = $("#botao-abrir-painel");
    abrir.textContent = minhaVez() ? "◀ Sua vez!" : "◀ Painel";
    abrir.className = "botao abrir-painel" + (minhaVez() ? " botao-verde" : "");
    // janelas
    if (e.escolha && e.escolha.length) {
        const chave = e.escolha.join(",");
        if ($("#janela-missoes").hidden || ultimaEscolha !== chave) { ultimaEscolha = chave; mostrarEscolha(e.escolha); }
    } else {
        $("#janela-missoes").hidden = true;
    }
    if (e.fase === "fim" && e.resultado) { $("#janela-pagar").hidden = true; mostrarFim(); }
    else $("#janela-fim").hidden = true;
}

function mostrarEscolha(opcoes) {
    const lista = $("#opcoes-missoes");
    lista.innerHTML = "";
    const ficar = new Set(opcoes);
    opcoes.forEach((n) => {
        const m = missaoPorNumero[n];
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button";
        b.className = "opcao-missao";
        const marca = document.createElement("small");
        b.innerHTML = `<strong>Missão ${n}${m.valor <= 15 ? " ★" : ""} · ${m.valor} pontos · Partida: ${m.partida}</strong>`;
        b.append(m.situacao);
        const est = document.createElement("small");
        est.textContent = "Estações: " + m.estacoes.join(" · ");
        b.appendChild(est);
        marca.textContent = "✔ vou ficar com esta";
        marca.style.color = "#2e9e5b";
        marca.style.fontWeight = "800";
        b.appendChild(marca);
        b.addEventListener("click", () => {
            if (ficar.has(n)) ficar.delete(n); else ficar.add(n);
            b.classList.toggle("devolver", !ficar.has(n));
            marca.textContent = ficar.has(n) ? "✔ vou ficar com esta" : "✘ devolver";
            marca.style.color = ficar.has(n) ? "#2e9e5b" : "#6e7280";
        });
        li.appendChild(b);
        lista.appendChild(li);
    });
    $("#botao-confirmar-missoes").onclick = () => {
        if (!ficar.size) return;
        $("#janela-missoes").hidden = true;
        enviarAcao("escolher", [...ficar]);
    };
    $("#janela-missoes").hidden = false;
}

function mostrarFim() {
    const r = eu.resultado;
    $("#fim-titulo").textContent = `Fim dos trilhos · à frente: ${r.vencedor}`;
    const corpo = $("#fim-linhas");
    corpo.innerHTML = "";
    const ordem = r.linhas.map((l, i) => i).sort((a, b) => r.linhas[b].total - r.linhas[a].total || r.linhas[b].qtdCompletas - r.linhas[a].qtdCompletas);
    ordem.forEach((i, pos) => {
        const l = r.linhas[i];
        const tr = document.createElement("tr");
        if (pos === 0) tr.className = "vencedor";
        [`${pos + 1}º ${l.nome}`, l.trilhos, "+" + l.mais, "−" + l.menos, (l.bonusExpresso ? "+10 " : "") + "(" + l.expresso + ")", l.total].forEach((v) => {
            const td = document.createElement("td");
            td.textContent = v;
            tr.appendChild(td);
        });
        corpo.appendChild(tr);
    });
    const area = $("#fim-botoes");
    area.innerHTML = "";
    if (souHostNaTela && host && host.partida) {
        area.appendChild(botao("Baixar relatório da partida (JSON)", "botao botao-verde", baixarRelatorio));
        area.appendChild(botao("Nova partida com a mesma sala", "botao", () => enviarAcao("nova")));
    } else {
        const p = document.createElement("p");
        p.className = "ajuda";
        p.textContent = "O anfitrião pode baixar o relatório e começar outra partida.";
        area.appendChild(p);
    }
    area.appendChild(botao("Sair", "botao botao-cinza", () => voltarAoMenu("")));
    $("#janela-fim").hidden = false;
}

function baixarRelatorio() {
    const rel = host.partida.relatorio();
    const blob = new Blob([JSON.stringify(rel, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = rel.id + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function fecharJanelas() {
    document.querySelectorAll(".janela").forEach((j) => { j.hidden = true; });
}

// ===================== botões fixos =====================
$("#botao-criar").addEventListener("click", () => {
    if (typeof Peer === "undefined") { avisoMenu("Sem internet: use \"Jogar só com bots\"."); return; }
    criarSala(false);
});
$("#botao-sozinho").addEventListener("click", () => criarSala(true));
$("#form-entrar").addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (typeof Peer === "undefined") { avisoMenu("Sem internet não dá para entrar numa partida online."); return; }
    entrarNaSala($("#codigo").value);
});
$("#botao-copiar").addEventListener("click", () => {
    const link = location.origin + location.pathname + "?sala=" + host.codigo;
    if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => { $("#botao-copiar").textContent = "Link copiado!"; });
    else prompt("Copie o link:", link);
});
$("#botao-sair-sala").addEventListener("click", () => voltarAoMenu(""));
$("#botao-sair-jogo").addEventListener("click", () => {
    if (confirm(souAnfitriao ? "Você é o anfitrião: se sair, a partida acaba para todos. Sair mesmo?" : "Sair da partida? Um bot assume a sua vez.")) voltarAoMenu("");
});
$("#botao-monte").addEventListener("click", () => { if (!$("#botao-monte").classList.contains("apagado")) enviarAcao("monte"); });
$("#botao-missoes").addEventListener("click", () => { if (!$("#botao-missoes").classList.contains("apagado")) enviarAcao("missoes"); });
$("#botao-passar").addEventListener("click", () => enviarAcao("passar"));
$("#botao-cancelar-pagar").addEventListener("click", () => { $("#janela-pagar").hidden = true; });
document.querySelectorAll(".aba[data-aba]").forEach((b) => b.addEventListener("click", () => mostrarAba(b.dataset.aba)));
$("#botao-esconder").addEventListener("click", () => {
    $("#tela-jogo").classList.add("sem-painel");
    $("#botao-abrir-painel").hidden = false;
    setTimeout(aplicarVista, 50);
});
$("#botao-abrir-painel").addEventListener("click", () => {
    $("#tela-jogo").classList.remove("sem-painel");
    $("#botao-abrir-painel").hidden = true;
    setTimeout(aplicarVista, 50);
});

// nome lembrado neste aparelho e código vindo do link
try { $("#nome").value = localStorage.getItem("expresso-nome") || ""; } catch (e) { /* nada */ }
$("#nome").addEventListener("change", () => { try { localStorage.setItem("expresso-nome", $("#nome").value.trim()); } catch (e) { /* nada */ } });
const codigoDoLink = new URLSearchParams(location.search).get("sala");
if (codigoDoLink) { $("#codigo").value = codigoDoLink.toUpperCase(); avisoMenu("Escreva seu nome e toque em Entrar."); }
window.addEventListener("beforeunload", (ev) => {
    if (souAnfitriao && host && host.estado === "jogo") { ev.preventDefault(); ev.returnValue = ""; }
});
