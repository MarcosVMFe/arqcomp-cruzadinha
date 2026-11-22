"use strict";

/* Palavras do jogo: resposta, posição inicial (linha, coluna), direção e pista.
   H = horizontal, V = vertical. Todas as 16 palavras da lista estão no tabuleiro. */
const PALAVRAS = [
  { a: "MEMORIADEMASSA", r: 0, c: 11, d: "V", pista: "Guarda arquivos e programas permanentemente, em grande capacidade; o HD é o exemplo clássico." },
  { a: "DMA", r: 1, c: 13, d: "V", pista: "Recurso que permite aos periféricos trocar dados com a RAM sem ocupar o processador." },
  { a: "CACHE", r: 1, c: 7, d: "H", pista: "Memória pequena e veloz entre o processador e a RAM, guarda dados muito usados." },
  { a: "ROM", r: 2, c: 5, d: "V", pista: "Memória permanente gravada na fabricação, cujo conteúdo normalmente o usuário não altera." },
  { a: "MICROCONTROLADOR", r: 3, c: 1, d: "H", pista: "Chip único com processador, memória e periféricos, comum em sistemas embarcados como o Arduino." },
  { a: "ADDRESSBUS", r: 5, c: 6, d: "V", pista: "Via de sentido único em que a CPU indica a posição de memória a acessar." },
  { a: "UC", r: 5, c: 13, d: "V", pista: "Parte do processador que comanda os demais circuitos e dirige a busca das ordens." },
  { a: "QUADCORE", r: 6, c: 9, d: "H", pista: "Processador com quatro núcleos de execução no mesmo chip." },
  { a: "REGISTRADORES", r: 8, c: 0, d: "H", pista: "Minimemórias dentro do processador, as mais rápidas, guardam dados em uso imediato." },
  { a: "EEPROM", r: 9, c: 14, d: "V", pista: "Memória não volátil regravável por pulsos elétricos, apaga e escreve byte a byte." },
  { a: "ULA", r: 10, c: 3, d: "V", pista: "Parte do processador que faz as contas e as comparações." },
  { a: "RAM", r: 10, c: 10, d: "H", pista: "Memória principal volátil onde ficam os softwares em uso; apaga ao desligar o computador." },
  { a: "CPU", r: 11, c: 13, d: "H", pista: "Chip que executa as instruções dos programas; é o cérebro do computador." },
  { a: "DATABUS", r: 12, c: 2, d: "H", pista: "Via bidirecional que transporta os valores lidos ou escritos entre CPU, memória e periféricos." },
  { a: "DUALCORE", r: 13, c: 9, d: "H", pista: "Processador com dois núcleos de execução no mesmo chip." },
  { a: "FLASH", r: 14, c: 3, d: "H", pista: "Memória não volátil regravável em blocos, usada em pendrives e cartões de memória." },
];

const LINHAS = 15;
const COLUNAS = 17;

/* ---------- Monta a estrutura do jogo ---------- */
const celulas = new Map(); // "r,c" -> { r, c, letra, palavras: [idx], el, input }
PALAVRAS.forEach((p, idx) => {
  p.cels = [];
  for (let i = 0; i < p.a.length; i++) {
    const r = p.r + (p.d === "V" ? i : 0);
    const c = p.c + (p.d === "H" ? i : 0);
    const k = r + "," + c;
    if (!celulas.has(k)) celulas.set(k, { r, c, letra: p.a[i], palavras: [] });
    celulas.get(k).palavras.push(idx);
    p.cels.push(k);
  }
});

// Numeração: ordem de leitura (linha, coluna); H e V que começam na mesma casa compartilham o número
const inicios = [...new Set(PALAVRAS.map((p) => p.r + "," + p.c))]
  .map((k) => k.split(",").map(Number))
  .sort((x, y) => x[0] - y[0] || x[1] - y[1]);
const numeroDe = new Map(inicios.map((s, i) => [s[0] + "," + s[1], i + 1]));
PALAVRAS.forEach((p) => (p.n = numeroDe.get(p.r + "," + p.c)));

/* ---------- Estado ---------- */
let direcao = "H";
let atual = null; // chave da célula ativa

const $tab = document.getElementById("tabuleiro");
const $contador = document.getElementById("contador");
const $msg = document.getElementById("mensagem");
const $listaH = document.getElementById("pistas-h");
const $listaV = document.getElementById("pistas-v");

/* ---------- Tabuleiro ---------- */
$tab.style.setProperty("--colunas", COLUNAS);
for (let r = 0; r < LINHAS; r++) {
  for (let c = 0; c < COLUNAS; c++) {
    const k = r + "," + c;
    const div = document.createElement("div");
    const cel = celulas.get(k);
    if (!cel) {
      div.className = "bloco";
    } else {
      div.className = "celula";
      const num = numeroDe.get(k);
      if (num) {
        const s = document.createElement("span");
        s.className = "num";
        s.textContent = num;
        div.appendChild(s);
      }
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 2;
      input.autocomplete = "off";
      input.autocapitalize = "characters";
      input.spellcheck = false;
      input.setAttribute("aria-label", "Linha " + (r + 1) + ", coluna " + (c + 1));
      input.dataset.k = k;
      div.appendChild(input);
      cel.el = div;
      cel.input = input;
    }
    $tab.appendChild(div);
  }
}

/* ---------- Pistas ---------- */
const itensPista = new Map(); // idx -> <li>
function montaPistas() {
  const ordenadas = PALAVRAS.map((p, idx) => ({ p, idx })).sort((x, y) => x.p.n - y.p.n);
  ordenadas.forEach(({ p, idx }) => {
    const li = document.createElement("li");
    li.innerHTML = '<span class="n">' + p.n + '.</span> <span class="t"></span> <span class="sel" aria-hidden="true"></span>';
    li.querySelector(".t").textContent = p.pista;
    li.addEventListener("click", () => {
      direcao = p.d;
      foca(p.cels[0]);
    });
    itensPista.set(idx, li);
    (p.d === "H" ? $listaH : $listaV).appendChild(li);
  });
}
montaPistas();

/* ---------- Navegação ---------- */
function palavraAtiva() {
  if (!atual) return null;
  const cel = celulas.get(atual);
  const candidatas = cel.palavras.filter((i) => PALAVRAS[i].d === direcao);
  if (candidatas.length) return candidatas[0];
  return cel.palavras[0];
}

function foca(k) {
  const cel = celulas.get(k);
  if (!cel) return;
  cel.input.focus();
  cel.input.select();
}

function atualizaDestaque() {
  celulas.forEach((c) => c.el.classList.remove("ativa", "palavra"));
  itensPista.forEach((li) => li.classList.remove("ativa"));
  const idx = palavraAtiva();
  if (idx === null) return;
  const p = PALAVRAS[idx];
  direcao = p.d;
  p.cels.forEach((k) => celulas.get(k).el.classList.add("palavra"));
  celulas.get(atual).el.classList.add("ativa");
  const li = itensPista.get(idx);
  li.classList.add("ativa");
  if (li.scrollIntoView && window.innerWidth > 800) li.scrollIntoView({ block: "nearest" });
}

function vizinha(k, dr, dc) {
  const cel = celulas.get(k);
  const nk = cel.r + dr + "," + (cel.c + dc);
  return celulas.has(nk) ? nk : null;
}

function passo(k, sentido) {
  // sentido: +1 avança, -1 volta, na direção atual
  const dr = direcao === "V" ? sentido : 0;
  const dc = direcao === "H" ? sentido : 0;
  return vizinha(k, dr, dc);
}

$tab.addEventListener("focusin", (e) => {
  const k = e.target.dataset && e.target.dataset.k;
  if (!k) return;
  atual = k;
  const cel = celulas.get(k);
  if (!cel.palavras.some((i) => PALAVRAS[i].d === direcao)) direcao = PALAVRAS[cel.palavras[0]].d;
  atualizaDestaque();
});

$tab.addEventListener("mousedown", (e) => {
  // clicar de novo na casa ativa que cruza duas palavras alterna a direção
  const k = e.target.dataset && e.target.dataset.k;
  if (k && k === atual && document.activeElement === e.target) {
    const cel = celulas.get(k);
    const outra = direcao === "H" ? "V" : "H";
    if (cel.palavras.some((i) => PALAVRAS[i].d === outra)) {
      direcao = outra;
      atualizaDestaque();
    }
  }
});

function limpaStatusDaCelula(k) {
  const cel = celulas.get(k);
  cel.el.classList.remove("certa", "errada");
  cel.palavras.forEach((i) => itensPista.get(i).classList.remove("certa", "errada"));
}

function normaliza(ch) {
  return ch.normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase();
}

$tab.addEventListener("input", (e) => {
  const input = e.target;
  const k = input.dataset.k;
  if (!k) return;
  const letras = normaliza(input.value);
  input.value = letras.slice(-1);
  limpaStatusDaCelula(k);
  if (input.value) {
    const prox = passo(k, 1);
    if (prox) foca(prox);
  }
});

$tab.addEventListener("keydown", (e) => {
  const input = e.target;
  const k = input.dataset && input.dataset.k;
  if (!k) return;
  const setas = { ArrowLeft: [0, -1, "H"], ArrowRight: [0, 1, "H"], ArrowUp: [-1, 0, "V"], ArrowDown: [1, 0, "V"] };
  if (setas[e.key]) {
    e.preventDefault();
    const [dr, dc, dir] = setas[e.key];
    const cel = celulas.get(k);
    if (direcao !== dir && cel.palavras.some((i) => PALAVRAS[i].d === dir)) {
      direcao = dir;
      atualizaDestaque();
      return;
    }
    const nk = vizinha(k, dr, dc);
    if (nk) {
      direcao = dir;
      foca(nk);
    }
  } else if (e.key === "Backspace") {
    e.preventDefault();
    if (input.value) {
      input.value = "";
      limpaStatusDaCelula(k);
    } else {
      const ant = passo(k, -1);
      if (ant) {
        celulas.get(ant).input.value = "";
        limpaStatusDaCelula(ant);
        foca(ant);
      }
    }
  } else if (e.key === "Delete") {
    e.preventDefault();
    input.value = "";
    limpaStatusDaCelula(k);
  } else if (e.key === " ") {
    e.preventDefault();
    const outra = direcao === "H" ? "V" : "H";
    if (celulas.get(k).palavras.some((i) => PALAVRAS[i].d === outra)) {
      direcao = outra;
      atualizaDestaque();
    }
  } else if (e.key === "Enter") {
    e.preventDefault();
    conferir();
  }
});

/* ---------- Conferir / Reiniciar ---------- */
function conferir() {
  const certas = new Set();
  PALAVRAS.forEach((p, idx) => {
    const digitada = p.cels.map((k) => celulas.get(k).input.value).join("");
    if (digitada === p.a) certas.add(idx);
  });

  celulas.forEach((c) => c.el.classList.remove("certa", "errada"));
  PALAVRAS.forEach((p, idx) => {
    const ok = certas.has(idx);
    const li = itensPista.get(idx);
    li.classList.remove("certa", "errada");
    li.classList.add(ok ? "certa" : "errada");
    li.querySelector(".sel").textContent = ok ? "✔ certa" : "✘ errada";
    p.cels.forEach((k) => {
      const el = celulas.get(k).el;
      if (ok) {
        el.classList.add("certa");
        el.classList.remove("errada");
      } else if (!el.classList.contains("certa")) {
        el.classList.add("errada");
      }
    });
  });

  const total = PALAVRAS.length;
  $contador.textContent = certas.size + " de " + total + " palavras";
  if (certas.size === total) {
    $msg.textContent = "🎉 Parabéns! Você acertou todas as palavras!";
    $msg.className = "mensagem ok";
  } else {
    const faltam = total - certas.size;
    $msg.textContent = "Verde = palavra certa, vermelho = palavra errada ou incompleta. Faltam " + faltam + ".";
    $msg.className = "mensagem";
  }
}

function reiniciar() {
  celulas.forEach((c) => {
    c.input.value = "";
    c.el.classList.remove("certa", "errada", "ativa", "palavra");
  });
  itensPista.forEach((li) => {
    li.classList.remove("certa", "errada", "ativa");
    li.querySelector(".sel").textContent = "";
  });
  $contador.textContent = "0 de " + PALAVRAS.length + " palavras";
  $msg.textContent = "";
  $msg.className = "mensagem";
  atual = null;
  direcao = "H";
  const primeira = PALAVRAS.slice().sort((x, y) => x.n - y.n)[0];
  foca(primeira.cels[0]);
}

document.getElementById("btn-conferir").addEventListener("click", conferir);
document.getElementById("btn-reiniciar").addEventListener("click", reiniciar);
$contador.textContent = "0 de " + PALAVRAS.length + " palavras";