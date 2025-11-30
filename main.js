const levels = [
  { id: "level1", name: "Level 1", file: "data/level1.csv" },
  { id: "level2", name: "Level 2", file: "data/level2.csv" },
  { id: "level3", name: "Level 3", file: "data/level3.csv" },
  { id: "level4", name: "Level 4", file: "data/level4.csv" },
  { id: "level5", name: "Level 5", file: "data/level5.csv" },
  { id: "level6", name: "Level 6", file: "data/level6.csv" },
];

const STORAGE_KEYS = {
  progress: "vocapp-progress",
  wrong: "vocapp-wrong",
};

const state = {
  dataByLevel: {},
  combinedPool: [],
  currentLevel: null,
  currentIndex: 0,
  wrongIndex: 0,
};

const elements = {
  levelSelect: document.getElementById("level-select"),
  startBtn: document.getElementById("start-btn"),
  progressStatus: document.getElementById("progress-status"),
  questionArea: document.getElementById("question-area"),
  prompt: document.getElementById("prompt"),
  options: document.getElementById("options"),
  feedback: document.getElementById("feedback"),
  postActions: document.getElementById("post-actions"),
  guessBtn: document.getElementById("guess-btn"),
  nextBtn: document.getElementById("next-btn"),
  levelPill: document.getElementById("level-pill"),
  questionCounter: document.getElementById("question-counter"),
  lastProgress: document.getElementById("last-progress"),

  wrongPanelSummary: document.getElementById("wrong-summary"),
  practiceWrongBtn: document.getElementById("practice-wrong-btn"),
  clearWrongBtn: document.getElementById("clear-wrong-btn"),
  wrongArea: document.getElementById("wrong-question-area"),
  wrongPrompt: document.getElementById("wrong-prompt"),
  wrongOptions: document.getElementById("wrong-options"),
  wrongFeedback: document.getElementById("wrong-feedback"),
  wrongPostActions: document.getElementById("wrong-post-actions"),
  wrongNextBtn: document.getElementById("wrong-next-btn"),
  wrongCounter: document.getElementById("wrong-counter"),
};

function parseCSV(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [english, chinese] = line.split(",").map((part) => part.trim());
      return { english, chinese };
    });
}

async function loadLevels() {
  const requests = levels.map(async (level) => {
    const response = await fetch(level.file);
    if (!response.ok) throw new Error(`Unable to load ${level.file}`);
    const text = await response.text();
    state.dataByLevel[level.id] = parseCSV(text);
  });

  await Promise.all(requests);
  state.combinedPool = levels.flatMap((level) => state.dataByLevel[level.id]);
}

function getProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.progress)) || {};
  } catch (err) {
    console.error("Failed to parse progress", err);
    return {};
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress));
}

function getWrongNotebook() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.wrong)) || [];
  } catch (err) {
    console.error("Failed to parse wrong notebook", err);
    return [];
  }
}

function saveWrongNotebook(items) {
  localStorage.setItem(STORAGE_KEYS.wrong, JSON.stringify(items));
}

function setStatus(message) {
  elements.progressStatus.textContent = message;
}

function updateProgressStatus() {
  const progress = getProgress();
  const statusParts = levels.map((level) => {
    const total = state.dataByLevel[level.id]?.length || 0;
    const current = progress[level.id] || 0;
    return `${level.name}: ${current}/${total}`;
  });
  setStatus(statusParts.join(" | "));
}

function populateSelect() {
  elements.levelSelect.innerHTML = "";
  levels.forEach((level) => {
    const option = document.createElement("option");
    option.value = level.id;
    option.textContent = level.name;
    elements.levelSelect.appendChild(option);
  });
}

function getWrongList() {
  return getWrongNotebook();
}

function addToWrongNotebook(item) {
  const current = getWrongNotebook();
  const exists = current.some(
    (entry) => entry.english === item.english && entry.chinese === item.chinese
  );
  if (!exists) {
    current.push(item);
    saveWrongNotebook(current);
  }
  renderWrongSummary();
}

function removeFromWrongNotebook(item) {
  const filtered = getWrongNotebook().filter(
    (entry) => !(entry.english === item.english && entry.chinese === item.chinese)
  );
  saveWrongNotebook(filtered);
  renderWrongSummary();
}

function renderWrongSummary() {
  const count = getWrongNotebook().length;
  elements.wrongPanelSummary.textContent =
    count === 0
      ? "No wrong items recorded yet."
      : `${count} item${count === 1 ? "" : "s"} saved in your wrong notebook.`;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildOptions(correct, pool) {
  const distractors = shuffle(pool.filter((item) => item.chinese !== correct.chinese));
  const options = distractors.slice(0, 4);
  options.push(correct);
  return shuffle(options);
}

function setQuestion(index) {
  const data = state.dataByLevel[state.currentLevel];
  if (!data || data.length === 0) return;

  const question = data[index % data.length];
  const options = buildOptions(question, state.combinedPool);
  const progress = getProgress();

  elements.levelPill.textContent = levels.find((l) => l.id === state.currentLevel).name;
  elements.questionCounter.textContent = `Question ${index + 1} / ${data.length}`;
  elements.lastProgress.textContent = `Resumed from position ${
    (progress[state.currentLevel] || 0) + 1
  }`;
  elements.prompt.textContent = question.english;
  elements.options.innerHTML = "";
  elements.feedback.textContent = "";
  elements.feedback.className = "feedback";
  elements.postActions.classList.add("hidden");
  elements.guessBtn.disabled = false;

  options.forEach((option) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = option.chinese;
    btn.addEventListener("click", () => handleAnswer(btn, option, question));
    elements.options.appendChild(btn);
  });

  elements.questionArea.classList.remove("hidden");
}

function disableOptions() {
  Array.from(elements.options.children).forEach((btn) => {
    btn.disabled = true;
  });
}

function handleAnswer(button, selected, question) {
  disableOptions();
  const correct = selected.chinese === question.chinese;
  button.classList.add(correct ? "correct" : "incorrect");

  if (correct) {
    elements.feedback.textContent = "Correct!";
    elements.feedback.classList.add("correct");
    elements.postActions.classList.remove("hidden");
    elements.guessBtn.onclick = () => {
      addToWrongNotebook({ ...question, level: state.currentLevel });
      elements.guessBtn.disabled = true;
    };
  } else {
    elements.feedback.textContent = `Wrong — correct answer: ${question.chinese}`;
    elements.feedback.classList.add("incorrect");
    addToWrongNotebook({ ...question, level: state.currentLevel });
    elements.postActions.classList.remove("hidden");
    elements.guessBtn.disabled = true;
  }
}

function nextQuestion() {
  const data = state.dataByLevel[state.currentLevel];
  if (!data) return;
  state.currentIndex = (state.currentIndex + 1) % data.length;
  const progress = getProgress();
  progress[state.currentLevel] = state.currentIndex;
  saveProgress(progress);
  setQuestion(state.currentIndex);
  updateProgressStatus();
}

function startLevel() {
  const levelId = elements.levelSelect.value;
  state.currentLevel = levelId;
  const progress = getProgress();
  state.currentIndex = progress[levelId] || 0;
  setQuestion(state.currentIndex);
  updateProgressStatus();
}

function buildWrongQuestion() {
  const wrongItems = getWrongList();
  if (wrongItems.length === 0) {
    elements.wrongArea.classList.add("hidden");
    renderWrongSummary();
    return;
  }

  state.wrongIndex = state.wrongIndex % wrongItems.length;
  const question = wrongItems[state.wrongIndex];
  const options = buildOptions(question, state.combinedPool);

  elements.wrongCounter.textContent = `Question ${state.wrongIndex + 1} / ${wrongItems.length}`;
  elements.wrongPrompt.textContent = question.english;
  elements.wrongOptions.innerHTML = "";
  elements.wrongFeedback.textContent = "";
  elements.wrongFeedback.className = "feedback";
  elements.wrongPostActions.classList.add("hidden");

  options.forEach((option) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = option.chinese;
    btn.addEventListener("click", () => handleWrongAnswer(btn, option, question));
    elements.wrongOptions.appendChild(btn);
  });

  elements.wrongArea.classList.remove("hidden");
}

function handleWrongAnswer(button, selected, question) {
  Array.from(elements.wrongOptions.children).forEach((btn) => {
    btn.disabled = true;
  });
  const correct = selected.chinese === question.chinese;
  button.classList.add(correct ? "correct" : "incorrect");

  if (correct) {
    elements.wrongFeedback.textContent = "Correct!";
    elements.wrongFeedback.classList.add("correct");
    elements.wrongPostActions.classList.remove("hidden");
  } else {
    elements.wrongFeedback.textContent = `Wrong — correct answer: ${question.chinese}`;
    elements.wrongFeedback.classList.add("incorrect");
    elements.wrongPostActions.classList.remove("hidden");
  }
}

function nextWrongQuestion() {
  const wrongItems = getWrongList();
  if (wrongItems.length === 0) {
    renderWrongSummary();
    elements.wrongArea.classList.add("hidden");
    return;
  }
  state.wrongIndex = (state.wrongIndex + 1) % wrongItems.length;
  buildWrongQuestion();
}

function clearWrongNotebook() {
  if (confirm("Clear all wrong items?")) {
    saveWrongNotebook([]);
    renderWrongSummary();
    elements.wrongArea.classList.add("hidden");
  }
}

function initEvents() {
  elements.startBtn.addEventListener("click", startLevel);
  elements.nextBtn.addEventListener("click", nextQuestion);
  elements.practiceWrongBtn.addEventListener("click", buildWrongQuestion);
  elements.wrongNextBtn.addEventListener("click", nextWrongQuestion);
  elements.clearWrongBtn.addEventListener("click", clearWrongNotebook);
}

async function init() {
  populateSelect();
  renderWrongSummary();
  initEvents();
  await loadLevels();
  updateProgressStatus();
  state.currentLevel = levels[0].id;
  elements.levelSelect.value = state.currentLevel;
}

init().catch((err) => {
  console.error(err);
  setStatus("Failed to load vocabulary data.");
});