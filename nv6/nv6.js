// Tabuleiro: uma reta de 12 blocos
const LINHAS = 1;
const COLUNAS = 12;

let posicaoInicial = {
    linha: 0,
    coluna: 0,
    direcao: 1   // virado para a direita
};

let robo = { ...posicaoInicial };

const direcoes = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1]
];

const lampada = {
    linha: 0,
    coluna: 11
};

const buracos = [
    { linha: 0, coluna: 3 },
    { linha: 0, coluna: 6 },
    { linha: 0, coluna: 9 }
];

let programa = [];
let executando = false;
let venceu = false;
let caiuNoBuraco = false;


// -------------------------
// RENDERIZAÇÃO ISOMÉTRICA 3D (canvas 2D, sem bibliotecas)
// -------------------------

const canvas = document.getElementById("tabuleiro");
const ctx = canvas.getContext("2d");

const dpr = window.devicePixelRatio || 1;
const LARGURA = 700, ALTURA = 460;
canvas.width = LARGURA * dpr;
canvas.height = ALTURA * dpr;
ctx.scale(dpr, dpr);

const TW = 100;          // largura do losango do tile
const TH = 50;           // altura do losango do tile
const OX = 70;           // origem X (a reta desce para a direita)
const OY = 90;           // origem Y

// Estado visual (interpolado para animar suavemente)
let visual = { linha: robo.linha, coluna: robo.coluna, angulo: 0 };
let anguloAlvo = 0;
let queda = 0;
let saltoInicio = -9999;   // instante do último pulo   // progresso da queda no buraco

// Projeção: linha/coluna (em unidades de tile) + altura z (px) -> tela
function proj(l, c, z = 0) {
    return [OX + (c - l) * TW / 2, OY + (c + l) * TH / 2 - z];
}

function poligono(pontos, cor, borda) {
    ctx.beginPath();
    pontos.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fillStyle = cor;
    ctx.fill();
    if (borda) {
        ctx.strokeStyle = borda;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}

// Caixa 3D: faces de cima, esquerda (frente) e direita (frente)
function caixa(l0, c0, l1, c1, z0, z1, cor) {
    const [h, s, l] = cor;
    const topo = `hsl(${h} ${s}% ${l}%)`;
    const esq = `hsl(${h} ${s}% ${l - 14}%)`;
    const dir = `hsl(${h} ${s}% ${l - 26}%)`;
    const b = "rgba(0,0,0,0.25)";
    poligono([proj(l1, c0, z0), proj(l1, c1, z0), proj(l1, c1, z1), proj(l1, c0, z1)], esq, b);
    poligono([proj(l0, c1, z0), proj(l1, c1, z0), proj(l1, c1, z1), proj(l0, c1, z1)], dir, b);
    poligono([proj(l0, c0, z1), proj(l0, c1, z1), proj(l1, c1, z1), proj(l1, c0, z1)], topo, b);
}

function esfera(l, c, z, raio, cor) {
    const [x, y] = proj(l, c, z);
    const g = ctx.createRadialGradient(x - raio / 3, y - raio / 3, raio / 6, x, y, raio);
    g.addColorStop(0, "#fff");
    g.addColorStop(1, cor);
    ctx.beginPath();
    ctx.arc(x, y, raio, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
}

function ehBuraco(l, c) {
    return buracos.some(b => b.linha === l && b.coluna === c);
}

function desenharBuraco(l, c) {
    const fundo = -16;
    // abismo: sombra escura onde o chão não existe
    poligono([proj(l, c, fundo), proj(l, c + 1, fundo), proj(l + 1, c + 1, fundo), proj(l + 1, c, fundo)], "rgba(0,0,0,0.45)");
    // paredes internas só onde existe chão vizinho
    if (dentroDoTabuleiro(l - 1, c) && !ehBuraco(l - 1, c))
        poligono([proj(l, c, fundo), proj(l, c + 1, fundo), proj(l, c + 1, 0), proj(l, c, 0)], "hsl(122 42% 24%)", "rgba(0,0,0,0.3)");
    if (dentroDoTabuleiro(l, c - 1) && !ehBuraco(l, c - 1))
        poligono([proj(l, c, fundo), proj(l + 1, c, fundo), proj(l + 1, c, 0), proj(l, c, 0)], "hsl(122 42% 18%)", "rgba(0,0,0,0.3)");
}

function desenharChao() {
    for (let l = 0; l < LINHAS; l++) {
        for (let c = 0; c < COLUNAS; c++) {
            if (ehBuraco(l, c)) {
                desenharBuraco(l, c);
                continue;
            }
            let cor = (l + c) % 2 ? [122, 42, 40] : [122, 42, 46];
            if (l === lampada.linha && c === lampada.coluna) cor = [45, 85, 60];
            if (l === posicaoInicial.linha && c === posicaoInicial.coluna) cor = [205, 60, 50];
            caixa(l, c, l + 1, c + 1, -16, 0, cor);
        }
    }
}

function desenharLampada(t) {
    const { linha: l, coluna: c } = lampada;
    caixa(l + .3, c + .3, l + .7, c + .7, 0, 12, [220, 8, 35]);
    caixa(l + .42, c + .42, l + .58, c + .58, 12, 30, [220, 8, 45]);

    if (venceu) {
        const [x, y] = proj(l + .5, c + .5, 44);
        const pulso = 70 + Math.sin(t / 250) * 8;
        const g = ctx.createRadialGradient(x, y, 4, x, y, pulso);
        g.addColorStop(0, "rgba(255,236,130,0.9)");
        g.addColorStop(1, "rgba(255,236,130,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - pulso, y - pulso, pulso * 2, pulso * 2);
        esfera(l + .5, c + .5, 44, 15, "#ffd54f");
    } else {
        esfera(l + .5, c + .5, 44, 15, "#8a8466");
    }
}

function desenharRobo() {
    const l = visual.linha + .5, c = visual.coluna + .5;
    const dl = -Math.cos(visual.angulo), dc = Math.sin(visual.angulo);
    const k = (performance.now() - saltoInicio) / 450;
    const salto = k < 1 ? Math.sin(k * Math.PI) * 38 : 0;
    const quica = Math.abs(Math.sin(performance.now() / 300)) * 1.5 - queda + salto;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - queda / 60);

    // sombra
    const [sx, sy] = proj(l, c, 0);
    if (queda === 0) {
        ctx.beginPath();
        ctx.ellipse(sx, sy, 24, 12, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fill();
    }

    const visor = () => {
        const vl = l + dl * .24, vc = c + dc * .24;
        caixa(vl - .1, vc - .1, vl + .1, vc + .1, 40 + quica, 50 + quica, [185, 90, 55]);
    };

    const atras = dl + dc < 0;      // visor virado para longe da câmera
    if (atras) visor();

    caixa(l - .26, c - .26, l + .26, c + .26, 6 + quica, 34 + quica, [210, 80, 50]);   // corpo
    caixa(l - .2, c - .2, l + .2, c + .2, 34 + quica, 54 + quica, [210, 75, 65]);      // cabeça
    caixa(l - .03, c - .03, l + .03, c + .03, 54 + quica, 64 + quica, [0, 0, 70]);     // antena
    esfera(l, c, 68 + quica, 5, "#f44336");

    if (!atras) visor();
    ctx.restore();
}

function quadro(t) {
    // interpolação suave
    visual.linha += (robo.linha - visual.linha) * 0.2;
    visual.coluna += (robo.coluna - visual.coluna) * 0.2;
    visual.angulo += (anguloAlvo - visual.angulo) * 0.2;

    queda = caiuNoBuraco ? Math.min(queda + 2, 60) : 0;

    ctx.clearRect(0, 0, LARGURA, ALTURA);
    desenharChao();

    // ordena objetos pela profundidade (linha + coluna) — algoritmo do pintor
    const objetos = [
        { z: lampada.linha + lampada.coluna + 1, fn: () => desenharLampada(t) },
        { z: visual.linha + visual.coluna + 1.01, fn: desenharRobo }
    ].sort((a, b) => a.z - b.z);
    objetos.forEach(o => o.fn());

    requestAnimationFrame(quadro);
}

// Mantida com o mesmo nome: sincroniza o alvo visual com o estado do robô
function desenharTabuleiro() {
    let alvo = robo.direcao * Math.PI / 2;
    let dif = ((alvo - anguloAlvo) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    anguloAlvo += dif;
}

function posicionarRoboImediato() {
    desenharTabuleiro();
    visual.linha = robo.linha;
    visual.coluna = robo.coluna;
    visual.angulo = anguloAlvo;
    queda = 0;
}

requestAnimationFrame(quadro);


// -------------------------
// ADICIONAR / REMOVER / REINICIAR
// -------------------------

const LIMITE_COMANDOS = 16;

// Ao editar o programa, o robô volta ao início e o estado da fase é zerado
function prepararEdicao() {
    indicesAbertos = [];
    fecharVitoria();
    robo = { ...posicaoInicial };
    venceu = false;
    caiuNoBuraco = false;
    posicionarRoboImediato();
    mostrarMensagem("");
}

function adicionarComando(comando, indice = programa.length) {
    if (executando) return false;

    prepararEdicao();

    if (programa.length >= LIMITE_COMANDOS) {
        mostrarMensagem(`Máximo de ${LIMITE_COMANDOS} comandos!`);
        return false;
    }

    programa.splice(indice, 0, comando);
    mostrarPrograma();
    return true;
}

function removerUltimo() {
    if (executando) return;

    if (programa.length === 0) {
        mostrarMensagem("Não há comandos para remover.");
        return;
    }

    prepararEdicao();
    programa.pop();
    mostrarPrograma();
}

function reiniciar() {
    contadorExec++;        // cancela qualquer execução em andamento
    executando = false;
    programa = [];         // apaga todos os comandos
    prepararEdicao();      // robô na posição inicial, sem mensagens
    mostrarPrograma();
}


// -------------------------
// VERIFICAR BLOCOS ABERTOS (repetição / condição)
// -------------------------

const ABRE = { repetirAte: "repetição", seBuraco: "condição" };
const FECHA = { fimRepetir: "repetição", fimSe: "condição" };
const BOTAO_FECHAR = { "repetição": "🛑 Fim Repetir", "condição": "🛑 Fim Se" };
const PLURAL = { "repetição": "repetições", "condição": "condições" };

let indicesAbertos = [];   // posições dos blocos sem fechamento (ficam em vermelho)

// Devolve null se estiver tudo fechado, ou { indices, resumo, texto }
function verificarBlocos(cmds) {
    const abertos = [];       // pilha de { tipo, indice }
    const esquecidos = [];    // blocos que ficaram abertos dentro de outro que foi fechado

    cmds.forEach((c, indice) => {
        if (ABRE[c]) {
            abertos.push({ tipo: ABRE[c], indice });
        } else if (FECHA[c]) {
            const pos = abertos.map(b => b.tipo).lastIndexOf(FECHA[c]);
            if (pos !== -1) esquecidos.push(...abertos.splice(pos).slice(1));   // fecha este bloco
        }
    });

    const semFim = [...esquecidos, ...abertos];
    if (semFim.length === 0) return null;

    const tipos = [...new Set(semFim.map(b => b.tipo))];
    const partes = tipos.map(t => {
        const n = semFim.filter(b => b.tipo === t).length;
        return `${n} ${n === 1 ? t : PLURAL[t]}`;
    });
    const botoes = tipos.map(t => BOTAO_FECHAR[t]);

    return {
        indices: semFim.map(b => b.indice),
        resumo: `Falta fechar ${partes.join(" e ")}!`,
        texto: `Você deixou ${partes.join(" e ")} sem fechar. ` +
               `Adicione ${botoes.join(" e ")} no fim do bloco e tente de novo.`
    };
}


// -------------------------
// MOSTRAR PROGRAMA (um comando embaixo do outro)
// -------------------------

const ROTULOS = {
    frente: "⬆️ Frente",
    esquerda: "↩️ Esquerda",
    direita: "↪️ Direita",
    pular: "🦘 Pular",
    acender: "💡 Acender",
    repetirAte: "🔁 Até 💡 {",
    fimRepetir: "🛑 Fim Repetir }",
    seBuraco: "❓ Se 🕳️ à frente {",
    fimSe: "🛑 Fim Se }"
};

function mostrarPrograma() {
    const elemento = document.getElementById("programa");
    elemento.innerHTML = "";

    let nivel = 0;   // recuo: comandos dentro de um bloco ficam deslocados

    programa.forEach((comando, indice) => {
        if (FECHA[comando]) nivel = Math.max(0, nivel - 1);

        const item = document.createElement("div");
        item.className = "comando";
        if (comando.startsWith("repetir") || comando === "fimRepetir") item.classList.add("comando-loop");
        else if (comando === "seBuraco" || comando === "fimSe") item.classList.add("comando-se");
        item.dataset.indice = indice;
        if (indicesAbertos.includes(indice)) item.classList.add("erro");
        item.style.marginLeft = `${Math.min(nivel, 3) * 18}px`;
        item.innerHTML =
            `<span class="alca" title="Arraste para mover" aria-hidden="true">⋮⋮</span>` +
            `<span class="num">${indice + 1}</span>` +
            `<span class="txt">${ROTULOS[comando]}</span>`;
        elemento.appendChild(item);

        if (ABRE[comando]) nivel++;
    });
}


// -------------------------
// ARRASTAR E SOLTAR (mouse e toque)
// -------------------------
// 1) Arraste um comando da lista da esquerda para a área "Programa".
// 2) Arraste pela alça ⋮⋮ para reordenar; solte fora da área para remover.
// 3) Teclado: Enter/Espaço no botão do comando adiciona no final.

let arraste = null;   // { comando, origem, x, y, ativo, fantasma, indice }

function iniciarArraste(e, comando, origem) {
    if (executando) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    arraste = { comando, origem, x: e.clientX, y: e.clientY, ativo: false, fantasma: null, indice: null };

    window.addEventListener("pointermove", moverArraste);
    window.addEventListener("pointerup", soltarArraste);
    window.addEventListener("pointercancel", finalizarArraste);
}

function moverArraste(e) {
    if (!arraste) return;

    if (!arraste.ativo) {
        // só começa a arrastar depois de mover alguns pixels
        if (Math.hypot(e.clientX - arraste.x, e.clientY - arraste.y) < 6) return;

        arraste.ativo = true;

        const fantasma = document.createElement("div");
        fantasma.className = "fantasma";
        fantasma.textContent = ROTULOS[arraste.comando];
        document.body.appendChild(fantasma);
        arraste.fantasma = fantasma;

        document.body.classList.add("arrastando");

        if (arraste.origem !== null) {
            const itens = document.getElementById("programa").children;
            if (itens[arraste.origem]) itens[arraste.origem].classList.add("arrastado");
        }
    }

    arraste.fantasma.style.transform = `translate(${e.clientX + 12}px, ${e.clientY + 12}px)`;
    atualizarAlvo(e.clientX, e.clientY);
}

function limparMarcas() {
    document.querySelectorAll("#programa .marca-antes, #programa .marca-depois").forEach(item => {
        item.classList.remove("marca-antes", "marca-depois");
    });
}

// Descobre em que posição da lista o comando seria solto
function atualizarAlvo(x, y) {
    const lista = document.getElementById("programa");
    const caixa = lista.getBoundingClientRect();
    const sobre = x >= caixa.left && x <= caixa.right && y >= caixa.top && y <= caixa.bottom;

    limparMarcas();
    lista.classList.toggle("sobre", sobre);
    arraste.indice = null;

    if (!sobre) return;

    const itens = [...lista.children];
    let indice = itens.findIndex(item => {
        const r = item.getBoundingClientRect();
        return y < r.top + r.height / 2;
    });
    if (indice === -1) indice = itens.length;

    arraste.indice = indice;

    if (indice < itens.length) itens[indice].classList.add("marca-antes");
    else if (itens.length) itens[itens.length - 1].classList.add("marca-depois");
}

function finalizarArraste() {
    window.removeEventListener("pointermove", moverArraste);
    window.removeEventListener("pointerup", soltarArraste);
    window.removeEventListener("pointercancel", finalizarArraste);

    if (arraste && arraste.fantasma) arraste.fantasma.remove();
    document.body.classList.remove("arrastando");

    const lista = document.getElementById("programa");
    lista.classList.remove("sobre");
    limparMarcas();
    [...lista.children].forEach(item => item.classList.remove("arrastado"));

    arraste = null;
}

function soltarArraste() {
    const a = arraste;
    finalizarArraste();

    if (!a || !a.ativo || executando) return;

    if (a.origem === null) {
        // veio da lista de comandos: insere onde foi solto
        if (a.indice !== null) adicionarComando(a.comando, a.indice);
        return;
    }

    // veio do programa: reordena (ou remove, se solto fora da área)
    programa.splice(a.origem, 1);
    if (a.indice !== null) {
        const destino = a.indice > a.origem ? a.indice - 1 : a.indice;
        programa.splice(destino, 0, a.comando);
    }
    prepararEdicao();
    mostrarPrograma();
}

document.querySelectorAll("[data-comando]").forEach(botao => {
    botao.addEventListener("pointerdown", e => iniciarArraste(e, botao.dataset.comando, null));
    botao.addEventListener("click", e => {
        if (e.detail === 0) adicionarComando(botao.dataset.comando);   // clique vindo do teclado
    });
});

document.getElementById("programa").addEventListener("pointerdown", e => {
    const alca = e.target.closest(".alca");
    if (!alca) return;
    const indice = Number(alca.closest(".comando").dataset.indice);
    iniciarArraste(e, programa[indice], indice);
    e.preventDefault();
});


// -------------------------


// -------------------------
// ANALISAR BLOCOS (REPETIÇÃO + CONDICIONAIS)
// -------------------------
// Transforma a lista linear de comandos em uma árvore:
//   { tipo: "cmd", c }  |  { tipo: "repetir", ate, corpo }  |  { tipo: "se", corpo, senao }

function analisarPrograma(cmds) {
    const raiz = [];
    const pilha = [{ lista: raiz }];

    for (const c of cmds) {
        const topo = pilha[pilha.length - 1];

        if (c === "repetirAte") {
            const no = { tipo: "repetir", ate: true, corpo: [] };
            topo.lista.push(no);
            pilha.push({ lista: no.corpo, repetir: true });

        } else if (c === "seBuraco") {
            const no = { tipo: "se", corpo: [], senao: [] };
            topo.lista.push(no);
            pilha.push({ lista: no.corpo, se: no });

        } else if (c === "senao") {
            // só vale dentro de um "Se" que ainda não tem "Senão"
            if (topo.se && topo.lista === topo.se.corpo) {
                topo.lista = topo.se.senao;
            }

        } else if (c === "fimSe") {
            // fecha o "Se" aberto; solto (sem "Se" aberto) é ignorado
            if (topo.se) pilha.pop();

        } else if (c === "fimRepetir") {
            // fecha a repetição aberta (fechando antes qualquer "Se" esquecido dentro dela)
            if (pilha.some(p => p.repetir)) {
                while (!pilha.pop().repetir) { /* sobe até sair da repetição */ }
            }

        } else {
            topo.lista.push({ tipo: "cmd", c });
        }
    }

    return raiz;
}


// -------------------------
// SENSORES (usados pelas condições)
// -------------------------

function buracoAFrente() {
    const [dl, dc] = direcoes[robo.direcao];
    const l = robo.linha + dl;
    const c = robo.coluna + dc;
    return buracos.some(b => b.linha === l && b.coluna === c);
}

function naLampada() {
    return robo.linha === lampada.linha && robo.coluna === lampada.coluna;
}

let contadorExec = 0;   // muda a cada execução/reinício para cancelar a execução antiga

function terminou(id) {
    return venceu || caiuNoBuraco || id !== contadorExec;
}


// -------------------------
// INTERPRETAR (executa a árvore em tempo real)
// -------------------------

const LIMITE_LOOP = 40;   // proteção contra "repetir até" infinito

async function rodarBloco(lista, id) {
    for (const no of lista) {
        if (terminou(id)) return;

        if (no.tipo === "cmd") {
            await esperar(500);
            if (terminou(id)) return;
            executarComando(no.c);
            desenharTabuleiro();

        } else if (no.tipo === "repetir") {
            // "Repetir até a lâmpada"
            let voltas = 0;
            while (!naLampada() && voltas++ < LIMITE_LOOP) {
                await rodarBloco(no.corpo, id);
                if (terminou(id)) return;
            }

        } else if (no.tipo === "se") {
            await esperar(250);   // pausa curta para "olhar" à frente
            await rodarBloco(buracoAFrente() ? no.corpo : no.senao, id);
        }
    }
}


// -------------------------
// EXECUTAR PROGRAMA
// -------------------------

async function executar() {
    if (executando) return;

    if (programa.length === 0) {
        mostrarMensagem("Adicione alguns comandos!");
        return;
    }

    // Bloco aberto e não fechado: avisa e não executa
    const problema = verificarBlocos(programa);
    if (problema) {
        indicesAbertos = problema.indices;
        mostrarPrograma();
        mostrarMensagem("⚠️ " + problema.resumo);
        mostrarAviso("Falta fechar!", problema.texto);
        return;
    }

    // Sempre começa da posição inicial
    robo = { ...posicaoInicial };
    venceu = false;
    caiuNoBuraco = false;
    posicionarRoboImediato();

    executando = true;
    mostrarMensagem("Executando...");

    const id = ++contadorExec;
    await rodarBloco(analisarPrograma(programa), id);

    if (id !== contadorExec) return;   // foi reiniciado no meio da execução

    executando = false;

    if (!venceu && !caiuNoBuraco) {
        mostrarMensagem("❌ O robô não conseguiu acender a lâmpada.");
    }
}


// -------------------------
// EXECUTAR COMANDO
// -------------------------

function executarComando(comando) {
    switch (comando) {
        case "frente":
            moverFrente();
            break;
        case "esquerda":
            robo.direcao = (robo.direcao + 3) % 4;
            break;
        case "direita":
            robo.direcao = (robo.direcao + 1) % 4;
            break;
        case "pular":
            pular();
            break;
        case "acender":
            acender();
            break;
    }
}


// -------------------------
// MOVER
// -------------------------

function moverFrente() {
    const movimento = direcoes[robo.direcao];
    const novaLinha = robo.linha + movimento[0];
    const novaColuna = robo.coluna + movimento[1];

    if (novaLinha < 0 || novaLinha >= LINHAS || novaColuna < 0 || novaColuna >= COLUNAS) {
        mostrarMensagem("🚧 O robô bateu na parede!");
        return;
    }

    robo.linha = novaLinha;
    robo.coluna = novaColuna;

    const caiu = buracos.some(b => b.linha === robo.linha && b.coluna === robo.coluna);
    if (caiu) {
        caiuNoBuraco = true;
        mostrarMensagem("🕳️ Oh não! O robô caiu no buraco!");
    }
}


// -------------------------
// PULAR (salta por cima da casa da frente e cai na seguinte)
// -------------------------

function dentroDoTabuleiro(l, c) {
    return l >= 0 && l < LINHAS && c >= 0 && c < COLUNAS;
}

function pular() {
    const [dl, dc] = direcoes[robo.direcao];
    const l2 = robo.linha + dl * 2;
    const c2 = robo.coluna + dc * 2;

    if (!dentroDoTabuleiro(l2, c2)) {
        mostrarMensagem("🚧 O robô bateu na parede!");
        return;
    }

    saltoInicio = performance.now();
    robo.linha = l2;
    robo.coluna = c2;

    // A casa do meio é ignorada; só importa onde ele pousa
    if (buracos.some(b => b.linha === l2 && b.coluna === c2)) {
        caiuNoBuraco = true;
        mostrarMensagem("🕳️ Oh não! O robô pousou num buraco!");
    }
}


// -------------------------
// ACENDER
// -------------------------

function acender() {
    if (robo.linha === lampada.linha && robo.coluna === lampada.coluna) {
        venceu = true;
        setTimeout(mostrarVitoria, 900);
        mostrarMensagem("🎉 Você venceu! A lâmpada foi acesa!");
    } else {
        mostrarMensagem("💡 Não há nenhuma lâmpada aqui.");
    }
}


// -------------------------
// UTILIDADE
// -------------------------

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function mostrarMensagem(texto) {
    document.getElementById("mensagem").innerText = texto;
}

// Iniciar jogo
posicionarRoboImediato();

// -------------------------
// JANELAS DE AVISO E VITÓRIA
// -------------------------

function mostrarAviso(titulo, texto) {
    document.getElementById("aviso-titulo").innerText = titulo;
    document.getElementById("aviso-texto").innerText = texto;
    document.getElementById("aviso").hidden = false;
    document.querySelector("#aviso .aviso-ok").focus();
}

function fecharAviso() {
    document.getElementById("aviso").hidden = true;
}

function mostrarVitoria() {
    document.getElementById("vitoria").hidden = false;
    document.querySelector("#vitoria .aviso-ok").focus();
}

function fecharVitoria() {
    document.getElementById("vitoria").hidden = true;
}

// Esc fecha qualquer janela aberta
document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        fecharAviso();
        fecharVitoria();
    }
});

// Clicar fora da janela também fecha
document.getElementById("aviso").addEventListener("click", e => {
    if (e.target.id === "aviso") fecharAviso();
});

document.getElementById("vitoria").addEventListener("click", e => {
    if (e.target.id === "vitoria") fecharVitoria();
});

// Aviso ao abrir o nível (troque o texto ou apague esta linha)
mostrarAviso("Nível 6", "Agora que você já entendeu sobre estruturas de repetição e condição, use o comando de pular para saltar sobre o buraco");
