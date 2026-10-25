// -------------------------
// LISTA DE NÍVEIS
// Para adicionar um nível novo, basta incluir um item aqui.
// -------------------------

const niveis = [
    {
        numero: 1,
        titulo: "Primeiros passos",
        conceito: "Sequência",
        descricao: "Frente, virar e acender. Leve o robô até a lâmpada.",
        icone: "🧭",
        dificuldade: "Fácil",
        cor: "#4dabf7",
        link: "nv1/nv1.html"
    },
    {
        numero: 2,
        titulo: "Cuidado com o buraco",
        conceito: "Sequência",
        descricao: "Agora há buracos no caminho. Planeje a rota com cuidado.",
        icone: "🕳️",
        dificuldade: "Fácil",
        cor: "#69db7c",
        link: "nv2/nv2.html"
    },
    {
        numero: 3,
        titulo: "Repita e economize",
        conceito: "Repetição",
        descricao: "Use Repetir 2x e 3x para fazer o mesmo bloco várias vezes.",
        icone: "🔁",
        dificuldade: "Médio",
        cor: "#ffa94d",
        link: "nv3/nv3.html"
    },
    
    {
        numero: 4,
        titulo: "A escada",
        conceito: "Repetição",
        descricao: "Use as estruturas de repetição para concluir esse nível",
        icone: "🪜",
        dificuldade: "Médio",
        cor: "#ffd43b",
        link: "nv4/nv4.html"
    },

    {
        numero: 5,
        titulo: "Continue repetindo",
        conceito: "Repetição e condição",
        descricao: "Mais estruturas de repetição",
        icone: "🔁",
        dificuldade: "Difícil",
        cor: "#f783ac",
        link: "nv5/nv5.html"
    },

    {
        numero: 6,
        titulo: "Siga a trilha",
        conceito: "Repetição e Condição",
        descricao: "Use o Se para o robô virar sozinho quando achar um buraco.",
        icone: "🦘",
        dificuldade: "Difícil",
        cor: "#c03d2b",
        link: "nv6/nv6.html"
    }
];


// -------------------------
// DESENHAR OS CARTÕES
// -------------------------

function criarCartao(nivel, indice) {
    const cartao = document.createElement("a");
    cartao.className = "nivel";
    cartao.href = nivel.link;
    cartao.style.setProperty("--acento", nivel.cor);
    cartao.style.animationDelay = `${indice * 60}ms`;
    cartao.setAttribute("aria-label", `Nível ${nivel.numero}: ${nivel.titulo}`);

    cartao.innerHTML = `
        <div class="nivel-topo">
            <span class="nivel-numero">${nivel.numero}</span>
            <span class="nivel-icone" aria-hidden="true">${nivel.icone}</span>
        </div>
        <h3>${nivel.titulo}</h3>
        <p>${nivel.descricao}</p>
        <div class="nivel-rodape">
            <span class="etiqueta">${nivel.conceito} · ${nivel.dificuldade}</span>
            <span class="jogar">Jogar ➜</span>
        </div>
    `;

    return cartao;
}

const lista = document.getElementById("niveis");

niveis.forEach((nivel, indice) => {
    lista.appendChild(criarCartao(nivel, indice));
});
