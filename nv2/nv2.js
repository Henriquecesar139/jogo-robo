const tamanho = 5;

// Posição inicial do robô (pode manter ou alterar)
let posicaoInicial = {
    linha: 4,
    coluna: 0,
    direcao: 1
};

let robo = { ...posicaoInicial };

// 0 = cima, 1 = direita, 2 = baixo, 3 = esquerda
const direcoes = [
    [-1, 0],
    [0, 1],
    [1, 0],
    [0, -1]
];

// Nova posição da Lâmpada (ex: canto superior direito)
const lampada = {
    linha: 2,
    coluna: 3
};

// Definição dos buracos no Nível 2 (linhas e colunas)
const buracos = [
    { linha: 3, coluna: 0 },
    { linha: 2, coluna: 2 },
    { linha: 1, coluna: 1 },
    { linha: 4, coluna: 3 }
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
const LARGURA = 560, ALTURA = 430;
canvas.width = LARGURA * dpr;
canvas.height = ALTURA * dpr;
ctx.scale(dpr, dpr);

const TW = 100;          // largura do losango do tile
const TH = 50;           // altura do losango do tile
const OX = LARGURA / 2;  // origem X
const OY = 100;          // origem Y

// Estado visual (interpolado para animar suavemente)
let visual = { linha: robo.linha, coluna: robo.coluna, angulo: 0 };
let anguloAlvo = 0;
let queda = 0;   // progresso da queda no buraco

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
    poligono([proj(l, c, fundo), proj(l, c + 1, fundo), proj(l + 1, c + 1, fundo), proj(l + 1, c, fundo)], "#0a0c11");
    // paredes internas do buraco (lados de trás)
    poligono([proj(l, c, fundo), proj(l, c + 1, fundo), proj(l, c + 1, 0), proj(l, c, 0)], "hsl(122 42% 24%)", "rgba(0,0,0,0.3)");
    poligono([proj(l, c, fundo), proj(l + 1, c, fundo), proj(l + 1, c, 0), proj(l, c, 0)], "hsl(122 42% 18%)", "rgba(0,0,0,0.3)");
}

function desenharChao() {
    for (let l = 0; l < tamanho; l++) {
        for (let c = 0; c < tamanho; c++) {
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
    const quica = Math.abs(Math.sin(performance.now() / 300)) * 1.5 - queda;
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

const LIMITE_COMANDOS = 10;
let contadorExec = 0;   // muda a cada execução/reinício para cancelar a execução antiga

// Ao editar o programa, o robô volta ao início e o estado da fase é zerado
function prepararEdicao() {
    fecharVitoria();
    robo = { ...posicaoInicial };
    venceu = false;
    caiuNoBuraco = false;
    posicionarRoboImediato();
    mostrarMensagem("");
}

function adicionarComando(comando) {
    if (executando) return false;

    prepararEdicao();

    if (programa.length >= LIMITE_COMANDOS) {
        mostrarMensagem(`Máximo de ${LIMITE_COMANDOS} comandos!`);
        return false;
    }

    programa.push(comando);
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
// MOSTRAR PROGRAMA (um comando embaixo do outro)
// -------------------------

const ROTULOS = {
    frente: "⬆️ Frente",
    esquerda: "↩️ Esquerda",
    direita: "↪️ Direita",
    acender: "💡 Acender"
};

function mostrarPrograma() {
    const elemento = document.getElementById("programa");
    elemento.innerHTML = "";

    programa.forEach((comando, indice) => {
        const item = document.createElement("div");
        item.className = "comando";
        item.dataset.indice = indice;
        item.innerHTML =
            `<span class="num">${indice + 1}</span>` +
            `<span class="txt">${ROTULOS[comando]}</span>`;
        elemento.appendChild(item);
    });
}


// -------------------------
// ARRASTAR E SOLTAR (mouse e toque)
// -------------------------
// Arraste um comando da lista da esquerda para a área "Programa".
// Ele sempre entra no final da lista: não dá para encaixar antes de outro comando.
// Teclado: Enter/Espaço no botão do comando também adiciona no final.

let arraste = null;   // { comando, x, y, ativo, fantasma, sobre }

function iniciarArraste(e, comando) {
    if (executando) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    arraste = { comando, x: e.clientX, y: e.clientY, ativo: false, fantasma: null, sobre: false };

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
    }

    arraste.fantasma.style.transform = `translate(${e.clientX + 12}px, ${e.clientY + 12}px)`;

    // está sobre a área do programa?
    const lista = document.getElementById("programa");
    const caixa = lista.getBoundingClientRect();
    arraste.sobre = e.clientX >= caixa.left && e.clientX <= caixa.right &&
                    e.clientY >= caixa.top && e.clientY <= caixa.bottom;
    lista.classList.toggle("sobre", arraste.sobre);
}

function finalizarArraste() {
    window.removeEventListener("pointermove", moverArraste);
    window.removeEventListener("pointerup", soltarArraste);
    window.removeEventListener("pointercancel", finalizarArraste);

    if (arraste && arraste.fantasma) arraste.fantasma.remove();
    document.body.classList.remove("arrastando");
    document.getElementById("programa").classList.remove("sobre");

    arraste = null;
}

function soltarArraste() {
    const a = arraste;
    finalizarArraste();

    if (a && a.ativo && a.sobre) adicionarComando(a.comando);   // sempre no final
}

document.querySelectorAll("[data-comando]").forEach(botao => {
    botao.addEventListener("pointerdown", e => iniciarArraste(e, botao.dataset.comando));
    botao.addEventListener("click", e => {
        if (e.detail === 0) adicionarComando(botao.dataset.comando);   // clique vindo do teclado
    });
});


// -------------------------


// -------------------------
// EXECUTAR PROGRAMA
// -------------------------

async function executar() {
    if (executando) return;

    if (programa.length === 0) {
        mostrarMensagem("Adicione alguns comandos!");
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

    for (const comando of programa) {
        await esperar(500);
        if (id !== contadorExec) return;   // foi reiniciado
        executarComando(comando);
        desenharTabuleiro();

        if (venceu || caiuNoBuraco) break;
    }

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

    // Verificar parede
    if (novaLinha < 0 || novaLinha >= tamanho || novaColuna < 0 || novaColuna >= tamanho) {
        mostrarMensagem("🚧 O robô bateu na parede!");
        return;
    }

    robo.linha = novaLinha;
    robo.coluna = novaColuna;

    // Verificar se caiu em um buraco
    const caiu = buracos.some(b => b.linha === robo.linha && b.coluna === robo.coluna);
    if (caiu) {
        caiuNoBuraco = true;
        mostrarMensagem("🕳️ Oh não! O robô caiu no buraco!");
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
// JANELA DE AVISO
// -------------------------

function mostrarAviso(titulo, texto) {
    document.getElementById("aviso-titulo").innerText = titulo;
    document.getElementById("aviso-texto").innerText = texto;
    document.getElementById("aviso").hidden = false;
    document.querySelector(".aviso-ok").focus();
}

function fecharAviso() {
    document.getElementById("aviso").hidden = true;
}

// Fecha com a tecla Esc
document.addEventListener("keydown", e => {
    if (e.key === "Escape") fecharAviso();
});

// Fecha clicando fora da janela
document.getElementById("aviso").addEventListener("click", e => {
    if (e.target.id === "aviso") fecharAviso();
});

// Aviso que aparece ao abrir o nível (troque o texto ou apague esta linha)
mostrarAviso("Nível 2", "Cuidado com os buracos, pois o robô pode cair!!!");

// -------------------------
// JANELA DE VITÓRIA
// -------------------------

function mostrarVitoria() {
    document.getElementById("vitoria").hidden = false;
    document.querySelector("#vitoria .aviso-ok").focus();
}

function fecharVitoria() {
    document.getElementById("vitoria").hidden = true;
}

document.getElementById("vitoria").addEventListener("click", e => {
    if (e.target.id === "vitoria") fecharVitoria();
});

document.addEventListener("keydown", e => {
    if (e.key === "Escape") fecharVitoria();
});