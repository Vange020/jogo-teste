// Expresso do Prompt · regras da partida (roda só no aparelho do anfitrião)
// Sem cronômetro e sem validador: a Hora do Prompt é com o professor, fora do jogo.

const CORES = ["contexto", "persona", "tarefa", "formato", "etica"];
const PONTOS_TRILHO = { 1: 1, 2: 2, 3: 4 };
const CORES_JOGADOR = ["#f5c518", "#ff4fa3", "#00a6c7", "#8b5a2b", "#a3d117"];
const MAX_JOGADORES = 5;

const indicePorNome = {};
ESTACOES.forEach((e, i) => { indicePorNome[e.nome] = i; });
const missaoPorNumero = {};
MISSOES.forEach((m) => { missaoPorNumero[m.numero] = m; });

function estacoesDaMissao(numero) {
    const m = missaoPorNumero[numero];
    return [indicePorNome[m.partida], ...m.estacoes.map((n) => indicePorNome[n])];
}

function embaralhar(lista) {
    for (let i = lista.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
}

// formas de pagar um trilho com a mão do jogador
function opcoesPagamento(mao, cor, tamanho) {
    const opcoes = [];
    const coringas = mao.coringa || 0;
    const cores = cor === "cinza" ? CORES : [cor];
    for (const c of cores) {
        const usar = Math.min(mao[c] || 0, tamanho);
        if (usar > 0 && coringas >= tamanho - usar) opcoes.push({ cor: c, qtd: usar, coringas: tamanho - usar });
    }
    if (coringas >= tamanho) opcoes.push({ cor: "coringa", qtd: 0, coringas: tamanho });
    return opcoes;
}

class Partida {
    // assentos: [{nome, bot}] · avisar(partida) é chamado sempre que o estado muda
    constructor(assentos, rapida, avisar) {
        this.avisar = avisar || (() => {});
        this.rapida = !!rapida;
        const n = assentos.length;
        this.vagoesIniciais = this.rapida ? 22 : (n <= 3 ? 30 : 24);
        this.jogadores = assentos.map((a, i) => ({
            nome: a.nome, bot: !!a.bot, cor: CORES_JOGADOR[i], vagoes: this.vagoesIniciais, pontos: 0, missoes: [],
            mao: { contexto: 0, persona: 0, tarefa: 0, formato: 0, etica: 0, coringa: 0 },
            stats: { vezes: 0, tempoTotal: 0, cartas: 0, trilhos: 0, vagoesUsados: 0, coringas: 0, missoesPegas: 0 },
        }));
        this.monte = []; this.descarte = []; this.plataforma = [];
        this.ocupacao = CONEXOES.map(() => [-1, -1]);
        this.missoesMonte = MISSOES.filter((m) => !this.rapida || m.valor <= 15).map((m) => m.numero);
        this.registro = []; this.pendente = {}; this.fase = "missoes";
        this.vez = 0; this.compras = 0; this.acao = null; this.ultimas = null; this.passesSeguidos = 0;
        this.resultado = null;
        this.rel = { id: "partida_" + Date.now(), inicio: Date.now(), vezes: 0, bots: assentos.filter((a) => a.bot).length,
            monteReembaralhado: 0, plataformaTrocada: 0, missoesCompletadas: [], linha: [], motivoFim: null };
        for (const cor of CORES) for (let k = 0; k < 11; k++) this.monte.push(cor);
        for (let k = 0; k < 9; k++) this.monte.push("coringa");
        embaralhar(this.monte);
        embaralhar(this.missoesMonte);
        for (const jg of this.jogadores) for (let k = 0; k < 4; k++) jg.mao[this.comprarDoMonte()]++;
        this.reporPlataforma();
        this.vez = Math.floor(Math.random() * n);
        this.registrar(`Partida começou com ${this.vagoesIniciais} vagões por jogador${this.rapida ? " (Partida Rápida)" : ""}.`);
        this.jogadores.forEach((jg, j) => this.oferecerMissoes(j, true));
        this.jogadores.forEach((jg, j) => { if (jg.bot) this.botEscolher(j); });
    }

    registrar(texto) {
        this.registro.unshift(texto);
        if (this.registro.length > 14) this.registro.pop();
    }

    comprarDoMonte() {
        if (this.monte.length === 0) {
            if (this.descarte.length === 0) return null;
            this.monte = embaralhar(this.descarte);
            this.descarte = [];
            this.rel.monteReembaralhado++;
            this.registrar("O monte acabou: o descarte foi embaralhado.");
        }
        return this.monte.pop();
    }

    reporPlataforma() {
        for (let t = 0; t < 5; t++) {
            while (this.plataforma.length < 5) {
                const c = this.comprarDoMonte();
                if (!c) break;
                this.plataforma.push(c);
            }
            if (this.plataforma.filter((c) => c === "coringa").length < 3) return;
            this.descarte.push(...this.plataforma);
            this.plataforma = [];
            this.rel.plataformaTrocada++;
            this.registrar("3 Coringas na Plataforma: as 5 cartas foram trocadas.");
        }
    }

    // ===== trilhos e Missões =====
    meu(j, ci) { const o = this.ocupacao[ci]; return o[0] === j || o[1] === j; }
    usavel(j, ci) { const o = this.ocupacao[ci]; return !this.meu(j, ci) && (o[0] === -1 || o[1] === -1); }

    alcancaveis(j, inicio) {
        const vistos = new Set([inicio]);
        const pilha = [inicio];
        while (pilha.length) {
            const u = pilha.pop();
            CONEXOES.forEach((c, ci) => {
                if (!this.meu(j, ci)) return;
                const v = c.a === u ? c.b : (c.b === u ? c.a : null);
                if (v !== null && !vistos.has(v)) { vistos.add(v); pilha.push(v); }
            });
        }
        return vistos;
    }

    missaoCompleta(j, numero) {
        const alvo = estacoesDaMissao(numero);
        const vistos = this.alcancaveis(j, alvo[0]);
        return alvo.every((e) => vistos.has(e));
    }

    maiorExpresso(j) {
        const minhas = CONEXOES.map((c, ci) => ci).filter((ci) => this.meu(j, ci));
        let melhor = 0, passos = 0;
        const usadas = new Set();
        const andar = (e, total) => {
            if (total > melhor) melhor = total;
            if (++passos > 200000) return;
            for (const ci of minhas) {
                if (usadas.has(ci)) continue;
                const c = CONEXOES[ci];
                if (c.a === e || c.b === e) {
                    usadas.add(ci);
                    andar(c.a === e ? c.b : c.a, total + c.tamanho);
                    usadas.delete(ci);
                }
            }
        };
        ESTACOES.forEach((e, i) => andar(i, 0));
        return melhor;
    }

    // ===== vez =====
    semCompra() {
        const restante = 2 - this.compras;
        if (restante <= 0) return true;
        if (this.monte.length + this.descarte.length > 0) return false;
        return !this.plataforma.some((c) => c !== "coringa" || restante >= 2);
    }

    podeComprarMais() { return !this.semCompra(); }

    iniciarVez() {
        this.compras = 0; this.acao = null; this.ultimaAcao = null;
        this.inicioVez = Date.now();
        this.avisar(this);
    }

    fimDaVez() {
        if (this.fase !== "turno") return;
        const jg = this.jogadores[this.vez];
        const duracao = (Date.now() - (this.inicioVez || Date.now())) / 1000;
        jg.stats.vezes++; jg.stats.tempoTotal += duracao;
        this.rel.vezes++;
        this.rel.linha.push(`${this.rel.vezes}|${jg.nome}|${this.ultimaAcao || "-"}|${Math.round(duracao)}s`);
        if (this.rel.linha.length > 500) this.rel.linha.shift();
        delete this.pendente[this.vez];
        if (this.ultimas === null) {
            if (jg.vagoes <= 2) {
                this.ultimas = this.jogadores.length;
                this.registrar(`Última rodada! Todos, inclusive ${jg.nome}, jogam mais uma vez.`);
            }
        } else if (--this.ultimas <= 0) {
            return this.encerrar("vagões");
        }
        if (this.rel.vezes > 400) return this.encerrar("limite de vezes");
        this.vez = (this.vez + 1) % this.jogadores.length;
        this.iniciarVez();
    }

    passar(j) {
        if (this.fase !== "turno" || this.vez !== j) return false;
        if (!(this.acao === null || this.acao === "compra") || !this.semCompra()) return false;
        this.ultimaAcao = "passou";
        this.passesSeguidos++;
        this.registrar(`${this.jogadores[j].nome} passou a vez (sem cartas para comprar).`);
        if (this.passesSeguidos >= this.jogadores.length * 2) this.encerrar("ninguém conseguia mais jogar");
        else this.fimDaVez();
        return true;
    }

    comprar(j, origem) {
        if (this.fase !== "turno" || this.vez !== j || this.pendente[j]) return false;
        if (this.acao !== null && this.acao !== "compra") return false;
        const jg = this.jogadores[j];
        const restante = 2 - this.compras;
        let carta, custo = 1;
        if (origem === "monte") {
            carta = this.comprarDoMonte();
            if (!carta) return false;
        } else {
            carta = this.plataforma[origem];
            if (!carta) return false;
            if (carta === "coringa") custo = 2;
            if (custo > restante) return false;
            this.plataforma.splice(origem, 1);
            this.reporPlataforma();
        }
        jg.mao[carta]++; jg.stats.cartas++;
        this.passesSeguidos = 0;
        this.compras += custo;
        this.acao = "compra"; this.ultimaAcao = "compra";
        if (!this.podeComprarMais()) {
            this.registrar(`${jg.nome} comprou cartas.`);
            this.fimDaVez();
        } else {
            this.avisar(this);
        }
        return true;
    }

    construir(j, ci, lado, corEscolhida) {
        if (this.fase !== "turno" || this.vez !== j || this.pendente[j] || this.acao !== null) return false;
        const jg = this.jogadores[j];
        const c = CONEXOES[ci];
        if (!c || (lado !== 0 && lado !== 1)) return false;
        const o = this.ocupacao[ci];
        if (o[lado] !== -1 || o[1 - lado] === j || jg.vagoes < c.tamanho) return false;
        const opcoes = opcoesPagamento(jg.mao, c.trilhos[lado], c.tamanho);
        const escolhida = opcoes.find((op) => corEscolhida == null || op.cor === corEscolhida);
        if (!escolhida) return false;
        const antes = {};
        jg.missoes.forEach((m) => { antes[m] = this.missaoCompleta(j, m); });
        if (escolhida.cor !== "coringa") {
            jg.mao[escolhida.cor] -= escolhida.qtd;
            for (let k = 0; k < escolhida.qtd; k++) this.descarte.push(escolhida.cor);
        }
        jg.mao.coringa -= escolhida.coringas;
        for (let k = 0; k < escolhida.coringas; k++) this.descarte.push("coringa");
        o[lado] = j;
        this.passesSeguidos = 0;
        jg.vagoes -= c.tamanho;
        jg.pontos += PONTOS_TRILHO[c.tamanho];
        jg.stats.trilhos++; jg.stats.vagoesUsados += c.tamanho; jg.stats.coringas += escolhida.coringas;
        this.acao = "trilho";
        const nomeT = `${ESTACOES[c.a].nome} — ${ESTACOES[c.b].nome}`;
        this.ultimaAcao = "trilho " + nomeT;
        let texto = `${jg.nome} construiu ${nomeT} (+${PONTOS_TRILHO[c.tamanho]}).`;
        jg.missoes.forEach((m) => {
            if (!antes[m] && this.missaoCompleta(j, m)) {
                texto += " Completou uma Missão!";
                this.rel.missoesCompletadas.push({ jogador: jg.nome, missao: m, vez: this.rel.vezes + 1 });
            }
        });
        this.registrar(texto);
        this.fimDaVez();
        return true;
    }

    oferecerMissoes(j, inicial) {
        const opcoes = [];
        for (let k = 0; k < 2; k++) {
            const m = this.missoesMonte.pop();
            if (m !== undefined) opcoes.push(m);
        }
        this.pendente[j] = { opcoes, inicial };
        return opcoes;
    }

    pegarMissoes(j) {
        if (this.fase !== "turno" || this.vez !== j || this.acao !== null || this.missoesMonte.length === 0) return false;
        this.acao = "missoes"; this.ultimaAcao = "missoes";
        this.jogadores[j].stats.missoesPegas++;
        this.oferecerMissoes(j, false);
        this.avisar(this);
        return true;
    }

    escolher(j, manter) {
        const pend = this.pendente[j];
        if (!pend) return false;
        if (!Array.isArray(manter) || !pend.opcoes.some((m) => manter.includes(m))) manter = [pend.opcoes[0]];
        for (const m of pend.opcoes) {
            if (manter.includes(m)) this.jogadores[j].missoes.push(m);
            else this.missoesMonte.unshift(m);
        }
        delete this.pendente[j];
        if (pend.inicial) {
            if (Object.keys(this.pendente).length === 0) {
                this.fase = "turno";
                this.registrar(`${this.jogadores[this.vez].nome} começa a partida.`);
                this.iniciarVez();
            } else {
                this.avisar(this);
            }
        } else {
            this.registrar(`${this.jogadores[j].nome} pegou Missões.`);
            this.fimDaVez();
        }
        return true;
    }

    // ===== fim =====
    calcularResultado() {
        let maiorLinha = 0;
        const linhas = this.jogadores.map((jg, i) => {
            let mais = 0, menos = 0, completas = 0;
            const lista = jg.missoes.map((m) => {
                const ok = this.missaoCompleta(i, m);
                const v = missaoPorNumero[m].valor;
                if (ok) { mais += v; completas++; } else menos += v;
                return { numero: m, completa: ok };
            });
            const ex = this.maiorExpresso(i);
            maiorLinha = Math.max(maiorLinha, ex);
            return { nome: jg.nome, cor: jg.cor, trilhos: jg.pontos, mais, menos, expresso: ex, missoes: lista, qtdCompletas: completas };
        });
        linhas.forEach((l) => {
            l.bonusExpresso = maiorLinha > 0 && l.expresso === maiorLinha ? 10 : 0;
            l.total = l.trilhos + l.mais - l.menos + l.bonusExpresso;
        });
        let melhor = 0;
        linhas.forEach((l, i) => {
            const b = linhas[melhor];
            if (l.total > b.total || (l.total === b.total && l.qtdCompletas > b.qtdCompletas)) melhor = i;
        });
        this.resultado = { linhas, vencedor: linhas[melhor].nome };
    }

    encerrar(motivo) {
        this.fase = "fim";
        this.rel.motivoFim = motivo;
        this.calcularResultado();
        this.registrar("Fim dos trilhos! A Hora do Prompt é com o professor.");
        this.avisar(this);
    }

    relatorio() {
        const rel = this.rel;
        return {
            versao: "web-v1 (mapa v5, 30 missões)", id: rel.id, data: new Date().toISOString(),
            config: { rapida: this.rapida, jogadores: this.jogadores.length, bots: rel.bots },
            duracaoMin: Math.round((Date.now() - rel.inicio) / 6000) / 10,
            rodadas: Math.ceil(rel.vezes / this.jogadores.length), vezes: rel.vezes, motivoFim: rel.motivoFim,
            monteReembaralhado: rel.monteReembaralhado, plataformaTrocada: rel.plataformaTrocada,
            vencedor: this.resultado ? this.resultado.vencedor : null,
            jogadores: this.jogadores.map((jg, i) => {
                const r = this.resultado ? this.resultado.linhas[i] : {};
                const st = jg.stats;
                return {
                    nome: jg.nome, bot: jg.bot, vezes: st.vezes,
                    tempoMedioVez: st.vezes ? Math.round(st.tempoTotal / st.vezes * 10) / 10 : 0,
                    cartasCompradas: st.cartas, trilhosConstruidos: st.trilhos, vagoesUsados: st.vagoesUsados,
                    coringasUsados: st.coringas, missoesPegasNoJogo: st.missoesPegas,
                    missoes: r.missoes, pontosTrilhos: r.trilhos, missoesMais: r.mais, missoesMenos: r.menos,
                    maiorExpresso: r.expresso, bonusExpresso: r.bonusExpresso, total: r.total,
                };
            }),
            conexoesUsadas: CONEXOES.map((c, ci) => ({ c, o: this.ocupacao[ci] })).filter((x) => x.o[0] !== -1 || x.o[1] !== -1)
                .map((x) => `${ESTACOES[x.c.a].nome} - ${ESTACOES[x.c.b].nome} (${x.c.tamanho})`),
            missoesCompletadas: rel.missoesCompletadas, linhaDoTempo: rel.linha,
        };
    }

    // ===== bots (rota pela heurística de árvore de Steiner) =====
    planoDeRota(j, terminais) {
        if (!terminais.length) return new Set();
        const arvore = this.alcancaveis(j, terminais[0]);
        const resta = new Set(terminais.slice(1).filter((t) => !arvore.has(t)));
        const plano = new Set();
        while (resta.size) {
            const dist = new Map(), prev = new Map(), feitos = new Set();
            arvore.forEach((v) => dist.set(v, 0));
            for (;;) {
                let u = null, du = Infinity;
                dist.forEach((d, v) => { if (!feitos.has(v) && d < du) { u = v; du = d; } });
                if (u === null) break;
                feitos.add(u);
                CONEXOES.forEach((c, ci) => {
                    const v = c.a === u ? c.b : (c.b === u ? c.a : null);
                    if (v === null) return;
                    let w = null;
                    if (this.meu(j, ci)) w = 0; else if (this.usavel(j, ci)) w = c.tamanho;
                    if (w !== null && du + w < (dist.has(v) ? dist.get(v) : Infinity)) { dist.set(v, du + w); prev.set(v, [u, ci]); }
                });
            }
            let alvo = null, da = Infinity;
            resta.forEach((t) => { if (dist.has(t) && dist.get(t) < da) { alvo = t; da = dist.get(t); } });
            if (alvo === null) break;
            let v = alvo;
            while (!arvore.has(v)) {
                const [u, ci] = prev.get(v);
                if (!this.meu(j, ci)) plano.add(ci);
                arvore.add(v);
                v = u;
            }
            resta.delete(alvo);
            resta.forEach((t) => { if (arvore.has(t)) resta.delete(t); });
        }
        return plano;
    }

    custoMissoes(j, lista) {
        const t = [];
        lista.forEach((m) => t.push(...estacoesDaMissao(m)));
        let custo = 0;
        this.planoDeRota(j, t).forEach((ci) => { custo += CONEXOES[ci].tamanho; });
        return custo;
    }

    botEscolher(j) {
        const pend = this.pendente[j];
        if (!pend) return;
        const jg = this.jogadores[j];
        let manter;
        if (pend.opcoes.length >= 2 && this.custoMissoes(j, pend.opcoes) <= jg.vagoes - 6) {
            manter = pend.opcoes.slice(0, 2);
        } else {
            let melhor = pend.opcoes[0], cm = Infinity;
            pend.opcoes.forEach((m) => { const c = this.custoMissoes(j, [m]); if (c < cm) { melhor = m; cm = c; } });
            manter = [melhor];
        }
        this.escolher(j, manter);
    }

    botJogar() {
        if (this.fase !== "turno") return;
        const j = this.vez;
        const jg = this.jogadores[j];
        if (!jg.bot) return;
        if (this.pendente[j]) return this.botEscolher(j);
        const abertas = jg.missoes.filter((m) => !this.missaoCompleta(j, m));
        let plano = new Set();
        if (abertas.length) {
            const t = [];
            abertas.forEach((m) => t.push(...estacoesDaMissao(m)));
            plano = this.planoDeRota(j, t);
        }
        if (abertas.length === 0 && this.missoesMonte.length >= 1 && jg.vagoes >= 12) {
            this.pegarMissoes(j);
            return this.botEscolher(j);
        }
        let melhor = null;
        CONEXOES.forEach((c, ci) => {
            if (!(plano.has(ci) || abertas.length === 0) || c.tamanho > jg.vagoes) return;
            for (let lado = 0; lado < 2; lado++) {
                const o = this.ocupacao[ci];
                if (o[lado] !== -1 || o[1 - lado] === j) continue;
                const ops = opcoesPagamento(jg.mao, c.trilhos[lado], c.tamanho).sort((x, y) => x.coringas - y.coringas);
                if (!ops.length) continue;
                const nota = c.tamanho * 10 - ops[0].coringas * 3;
                if (!melhor || nota > melhor.nota) melhor = { ci, lado, cor: ops[0].cor, nota };
            }
        });
        if (melhor) return this.construir(j, melhor.ci, melhor.lado, melhor.cor);
        const precisa = new Set();
        plano.forEach((ci) => {
            const c = CONEXOES[ci];
            for (let lado = 0; lado < 2; lado++) if (this.ocupacao[ci][lado] === -1) precisa.add(c.trilhos[lado]);
        });
        for (let k = 0; k < 2; k++) {
            if (this.fase !== "turno" || this.vez !== j || this.acao === "trilho") return;
            let pegou = false;
            const i = this.plataforma.findIndex((carta) => carta !== "coringa" && precisa.has(carta));
            if (i >= 0) pegou = this.comprar(j, i);
            if (!pegou) {
                const iCoringa = this.plataforma.indexOf("coringa");
                if (this.compras === 0 && iCoringa >= 0 && precisa.size) { this.comprar(j, iCoringa); return; }
                if (!this.comprar(j, "monte")) {
                    if (!(this.plataforma.length && this.comprar(j, 0))) {
                        if (this.vez === j && this.fase === "turno") this.passar(j);
                        return;
                    }
                }
            }
            if (this.vez !== j) return;
        }
        if (this.fase === "turno" && this.vez === j) this.passar(j);
    }

    // o que cada jogador pode ver (a mão dos outros fica escondida)
    estadoPara(j) {
        const publicos = this.jogadores.map((jg) => ({
            nome: jg.nome, cor: jg.cor, bot: jg.bot, vagoes: jg.vagoes, pontos: jg.pontos,
            cartas: Object.values(jg.mao).reduce((a, b) => a + b, 0), missoes: jg.missoes.length,
        }));
        const jg = this.jogadores[j];
        const pend = this.pendente[j];
        return {
            fase: this.fase, eu: j, vez: this.vez, jogadores: publicos,
            ocupacao: this.ocupacao.map((o) => [o[0], o[1]]), plataforma: this.plataforma.slice(),
            monte: this.monte.length + this.descarte.length, missoesMonte: this.missoesMonte.length,
            mao: Object.assign({}, jg.mao), minhas: jg.missoes.map((m) => ({ numero: m, completa: this.missaoCompleta(j, m) })),
            compras: this.compras, acao: this.acao, ultimas: this.ultimas, registro: this.registro.slice(0, 8),
            escolha: pend ? pend.opcoes.slice() : null, resultado: this.resultado, rapida: this.rapida,
            podePassar: this.fase === "turno" && this.vez === j && (this.acao === null || this.acao === "compra") && this.semCompra(),
        };
    }
}
