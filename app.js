const elements = {
  postUrl: document.querySelector("#postUrl"),
  commentFile: document.querySelector("#commentFile"),
  commentPaste: document.querySelector("#commentPaste"),
  loadComments: document.querySelector("#loadComments"),
  clearAll: document.querySelector("#clearAll"),
  exportResult: document.querySelector("#exportResult"),
  drawWinner: document.querySelector("#drawWinner"),
  winnerAvatar: document.querySelector("#winnerAvatar"),
  winnerName: document.querySelector("#winnerName"),
  winnerComment: document.querySelector("#winnerComment"),
  drawStatus: document.querySelector("#drawStatus"),
  totalComments: document.querySelector("#totalComments"),
  validEntries: document.querySelector("#validEntries"),
  duplicateCount: document.querySelector("#duplicateCount"),
  filteredCount: document.querySelector("#filteredCount"),
  entryList: document.querySelector("#entryList"),
  entryTemplate: document.querySelector("#entryTemplate"),
  searchEntries: document.querySelector("#searchEntries"),
  uniqueUsers: document.querySelector("#uniqueUsers"),
  requireMention: document.querySelector("#requireMention"),
  minMentions: document.querySelector("#minMentions"),
  requiredHashtag: document.querySelector("#requiredHashtag"),
  blockedUsers: document.querySelector("#blockedUsers"),
  saveRules: document.querySelector("#saveRules"),
  historyList: document.querySelector("#historyList"),
  clearHistory: document.querySelector("#clearHistory"),
  canvas: document.querySelector("#confettiCanvas"),
};

const storageKey = "instagram-giveaway-state";
const historyKey = "instagram-giveaway-history";

let comments = [];
let validEntries = [];
let filteredEntries = [];
let duplicateEntries = [];
let lastWinner = null;

function normalizeUser(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

function displayUser(value) {
  const user = normalizeUser(value);
  return user ? `@${user}` : "@usuario";
}

function countMentions(text) {
  const matches = String(text || "").match(/(^|\s)@[a-zA-Z0-9._]+/g);
  return matches ? matches.length : 0;
}

function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += char;
    }
  }

  cells.push(cell.trim());
  return cells;
}

function parseComments(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return [];

  try {
    const json = JSON.parse(text);
    if (Array.isArray(json)) {
      return json
        .map((item) => ({
          user: item.user || item.username || item.author || "",
          text: item.text || item.comment || item.body || "",
        }))
        .filter((item) => item.user || item.text);
    }
  } catch {
    // Continue with plain text parsing.
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !isInstagramNoiseLine(line))
    .map((line) => {
      const cells = parseCsvLine(line);
      if (cells.length > 1 && normalizeUser(cells[0])) {
        return { user: cells[0], text: cells.slice(1).join(", ") };
      }

      const match = line.match(/^@?([a-zA-Z0-9._]{2,30})\s+(.+)$/);
      if (match) {
        return { user: match[1], text: match[2] };
      }

      return { user: "", text: line };
    })
    .filter((item) => item.user || item.text);
}

function isInstagramNoiseLine(line) {
  const value = line.trim().toLowerCase();
  return (
    value === "responder" ||
    value === "me gusta" ||
    value === "ver traduccion" ||
    value === "ver traducción" ||
    value === "ocultar respuestas" ||
    value === "ver respuestas" ||
    value === "..." ||
    /^\d+\s*(s|seg|m|min|h|d|dia|dias|día|días|sem|semana|semanas)$/i.test(value) ||
    /^\d+\s*(s|seg|m|min|h|d|dia|dias|día|días)\s+responder$/i.test(value)
  );
}

function getRules() {
  const blocked = elements.blockedUsers.value
    .split(/\r?\n|,/)
    .map(normalizeUser)
    .filter(Boolean);

  return {
    uniqueUsers: elements.uniqueUsers.checked,
    requireMention: elements.requireMention.checked,
    minMentions: Math.max(0, Number(elements.minMentions.value) || 0),
    requiredHashtag: elements.requiredHashtag.value.trim().toLowerCase(),
    blockedUsers: new Set(blocked),
  };
}

function applyRules() {
  const rules = getRules();
  const seen = new Set();
  validEntries = [];
  filteredEntries = [];
  duplicateEntries = [];

  comments.forEach((comment, index) => {
    const user = normalizeUser(comment.user);
    const text = String(comment.text || "");
    const lowerText = text.toLowerCase();
    const entry = {
      id: `${user || "anon"}-${index}`,
      user,
      text,
      index,
      mentions: countMentions(text),
    };

    const blocked = rules.blockedUsers.has(user);
    const missingMention = rules.requireMention && entry.mentions === 0;
    const tooFewMentions = entry.mentions < rules.minMentions;
    const missingHashtag = rules.requiredHashtag && !lowerText.includes(rules.requiredHashtag);
    const duplicate = rules.uniqueUsers && user && seen.has(user);

    if (duplicate) {
      duplicateEntries.push(entry);
      return;
    }

    if (blocked || missingMention || tooFewMentions || missingHashtag || !user) {
      filteredEntries.push(entry);
      return;
    }

    seen.add(user);
    validEntries.push(entry);
  });

  render();
  persistState();
}

function render() {
  elements.totalComments.textContent = comments.length;
  elements.validEntries.textContent = validEntries.length;
  elements.duplicateCount.textContent = duplicateEntries.length;
  elements.filteredCount.textContent = filteredEntries.length;
  elements.drawWinner.disabled = validEntries.length === 0;
  renderEntries();
  renderHistory();
}

function renderEntries() {
  const query = elements.searchEntries.value.trim().toLowerCase();
  const visible = validEntries.filter((entry) => {
    return !query || entry.user.includes(query) || entry.text.toLowerCase().includes(query);
  });

  elements.entryList.innerHTML = "";

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = validEntries.length ? "Sin resultados" : "Aun no hay participantes validos";
    elements.entryList.append(empty);
    return;
  }

  visible.slice(0, 250).forEach((entry) => {
    const node = elements.entryTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".avatar").textContent = entry.user.slice(0, 1).toUpperCase();
    node.querySelector("h4").textContent = displayUser(entry.user);
    node.querySelector("p").textContent = entry.text || "Sin texto";
    node.querySelector("span").textContent = entry.mentions ? `@${entry.mentions}` : "";
    elements.entryList.append(node);
  });
}

function renderHistory() {
  const history = getHistory();
  elements.historyList.innerHTML = "";

  if (!history.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Sin sorteos guardados";
    elements.historyList.append(empty);
    return;
  }

  history.slice(0, 8).forEach((item) => {
    const node = document.createElement("article");
    node.className = "history-item";
    node.innerHTML = `<strong>${displayUser(item.user)}</strong><small>${item.date} · ${item.total} participantes</small>`;
    elements.historyList.append(node);
  });
}

async function readSelectedFile() {
  const file = elements.commentFile.files[0];
  return file ? file.text() : "";
}

async function loadComments() {
  const fileText = await readSelectedFile();
  const pastedText = elements.commentPaste.value;
  comments = parseComments([fileText, pastedText].filter(Boolean).join("\n"));
  lastWinner = null;
  resetWinner();
  applyRules();
}

function resetWinner() {
  elements.winnerAvatar.textContent = "?";
  elements.winnerName.textContent = "Sin ganador";
  elements.winnerComment.textContent = comments.length
    ? "Participantes cargados. Puedes sortear."
    : "Carga comentarios y pulsa sortear.";
  elements.drawStatus.textContent = "Listo para sortear";
}

function drawWinner() {
  if (!validEntries.length) return;

  elements.drawWinner.disabled = true;
  elements.drawStatus.textContent = "Sorteando...";
  let ticks = 0;
  const maxTicks = 28;

  const animation = window.setInterval(() => {
    const preview = validEntries[Math.floor(Math.random() * validEntries.length)];
    updateWinner(preview, false);
    ticks += 1;

    if (ticks >= maxTicks) {
      window.clearInterval(animation);
      const winner = validEntries[cryptoRandomIndex(validEntries.length)];
      lastWinner = {
        ...winner,
        postUrl: elements.postUrl.value.trim(),
        date: new Date().toLocaleString("es-ES"),
        total: validEntries.length,
      };
      updateWinner(winner, true);
      saveHistory(lastWinner);
      renderHistory();
      launchConfetti();
      elements.drawWinner.disabled = false;
    }
  }, 70);
}

function cryptoRandomIndex(length) {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return array[0] % length;
}

function updateWinner(entry, final) {
  elements.winnerAvatar.textContent = entry.user.slice(0, 1).toUpperCase();
  elements.winnerName.textContent = displayUser(entry.user);
  elements.winnerComment.textContent = entry.text || "Sin texto";
  elements.drawStatus.textContent = final ? "Ganador seleccionado" : "Sorteando...";
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(historyKey)) || [];
  } catch {
    return [];
  }
}

function saveHistory(winner) {
  const history = getHistory();
  history.unshift(winner);
  localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 30)));
}

function persistState() {
  const state = {
    postUrl: elements.postUrl.value,
    commentPaste: elements.commentPaste.value,
    uniqueUsers: elements.uniqueUsers.checked,
    requireMention: elements.requireMention.checked,
    minMentions: elements.minMentions.value,
    requiredHashtag: elements.requiredHashtag.value,
    blockedUsers: elements.blockedUsers.value,
  };
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function restoreState() {
  try {
    const state = JSON.parse(localStorage.getItem(storageKey));
    if (!state) return;

    elements.postUrl.value = state.postUrl || "";
    elements.commentPaste.value = state.commentPaste || "";
    elements.uniqueUsers.checked = state.uniqueUsers ?? true;
    elements.requireMention.checked = state.requireMention ?? false;
    elements.minMentions.value = state.minMentions || 0;
    elements.requiredHashtag.value = state.requiredHashtag || "";
    elements.blockedUsers.value = state.blockedUsers || "";

    comments = parseComments(elements.commentPaste.value);
    applyRules();
  } catch {
    render();
  }
}

function exportResult() {
  const payload = {
    generatedAt: new Date().toISOString(),
    postUrl: elements.postUrl.value.trim(),
    totalComments: comments.length,
    validEntries: validEntries.length,
    duplicateEntries: duplicateEntries.length,
    filteredEntries: filteredEntries.length,
    winner: lastWinner,
    entries: validEntries,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sorteo-instagram-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function clearAll() {
  comments = [];
  validEntries = [];
  filteredEntries = [];
  duplicateEntries = [];
  lastWinner = null;
  elements.commentFile.value = "";
  elements.commentPaste.value = "";
  elements.searchEntries.value = "";
  localStorage.removeItem(storageKey);
  resetWinner();
  render();
}

function launchConfetti() {
  const canvas = elements.canvas;
  const context = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = rect.width * scale;
  canvas.height = rect.height * scale;
  context.scale(scale, scale);

  const colors = ["#e33f5f", "#ffb000", "#168a76", "#7c3aed", "#17202a"];
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * rect.width,
    y: -20 - Math.random() * rect.height * 0.4,
    size: 5 + Math.random() * 8,
    speed: 2 + Math.random() * 4,
    drift: -1.5 + Math.random() * 3,
    rotation: Math.random() * Math.PI,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  let frame = 0;

  function animate() {
    context.clearRect(0, 0, rect.width, rect.height);
    pieces.forEach((piece) => {
      piece.x += piece.drift;
      piece.y += piece.speed;
      piece.rotation += 0.08;
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.rotation);
      context.fillStyle = piece.color;
      context.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.55);
      context.restore();
    });
    frame += 1;

    if (frame < 130) {
      requestAnimationFrame(animate);
    } else {
      context.clearRect(0, 0, rect.width, rect.height);
    }
  }

  animate();
}

elements.loadComments.addEventListener("click", loadComments);
elements.clearAll.addEventListener("click", clearAll);
elements.drawWinner.addEventListener("click", drawWinner);
elements.exportResult.addEventListener("click", exportResult);
elements.searchEntries.addEventListener("input", renderEntries);
elements.clearHistory.addEventListener("click", () => {
  localStorage.removeItem(historyKey);
  renderHistory();
});

[
  elements.postUrl,
  elements.commentPaste,
  elements.uniqueUsers,
  elements.requireMention,
  elements.minMentions,
  elements.requiredHashtag,
  elements.blockedUsers,
].forEach((element) => {
  element.addEventListener("input", () => {
    if (comments.length) applyRules();
    persistState();
  });
  element.addEventListener("change", () => {
    if (comments.length) applyRules();
    persistState();
  });
});

elements.saveRules.addEventListener("click", () => {
  applyRules();
  elements.drawStatus.textContent = "Reglas guardadas";
});

restoreState();
render();
