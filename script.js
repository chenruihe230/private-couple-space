const STORAGE_KEY = "couple-space-v1";

const defaultState = {
  settings: {
    startDate: "2025-06-16",
    coupleName: "我们的小世界"
  },
  completedWishes: [],
  moods: {},
  notes: [],
  memories: [],
  datePicks: {},
  users: [],
  closedDays: 0
};

const quizQuestions = [
  {
    text: "如果现在突然放假一天，TA 最想去哪里？",
    answers: ["窝在家里看一部老电影", "去海边吹吹风", "钻进新开的咖啡店", "临时出发去附近城市"],
    correct: 0,
    comment: "选“家里沙发”的人，真的很懂那个喜欢慢慢相处的 TA。"
  },
  {
    text: "当你们发生小分歧时，TA 更希望你先做什么？",
    answers: ["认真讲道理", "先给一个拥抱", "各自冷静十分钟", "马上发一个表情包"],
    correct: 1,
    comment: "有时候，一个拥抱比一百句解释更快把心拉回来。"
  },
  {
    text: "TA 会觉得哪种惊喜最心动？",
    answers: ["准备一顿家常饭", "突然出现在楼下", "认真写一封长信", "安排一场周末短途旅行"],
    correct: 0,
    comment: "越小、越具体、越用心的惊喜，越像只属于彼此的秘密。"
  }
];

const dateIdeas = [
  { id: "sunset-picnic", title: "落日野餐局", text: "带一份喜欢的甜点，找一个能看到天色慢慢变化的地方。", meta: "18:30 · 约 2 小时", mood: "松弛感", image: "assets/date-1.jpg" },
  { id: "city-walk", title: "城市散步挑战", text: "不开导航，在每个路口用猜拳决定向左还是向右。", meta: "全天 · 低预算", mood: "探索感", image: "assets/date-2.jpg" },
  { id: "photo-movie", title: "旧照片电影夜", text: "把以前的合照投到墙上，配爆米花和一份很甜的饮料。", meta: "21:00 · 在家", mood: "纪念感", image: "assets/date-3.jpg" },
  { id: "wish-swap", title: "交换愿望清单", text: "每人写五件想一起做的事，随机抽一张立即行动。", meta: "任意时间", mood: "新鲜感", image: "assets/memory-1.jpg" },
  { id: "window-shopping", title: "只逛不买的约会", text: "去逛书店、唱片店和杂货铺，各自挑一件送给对方。", meta: "下午 · 约 3 小时", mood: "仪式感", image: "assets/memory-3.jpg" },
  { id: "kitchen-challenge", title: "厨房合作挑战", text: "一起做一道没做过的菜，允许摆盘翻车但必须拍照。", meta: "19:00 · 在家", mood: "烟火感", image: "assets/memory-4.jpg" }
];

const surpriseMessages = [
  "今晚的月亮不算满分，但想到你，心情会。",
  "我们的故事不需要剧本，普通日常就是最好看的部分。",
  "喜欢是心动，而爱是每次回头，你都还在那里。",
  "想和你一起浪费很多个明天，从今天晚上开始。",
  "世界很大，但最想去的地方，依然是你在的地方。"
];

let sharedState = structuredClone(defaultState);
let currentUser = "";
let currentQuiz = 0;
let quizScore = 0;
let selectedAnswer = null;
let visibleDateIdeas = dateIdeas.slice(0, 3);

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons({ attrs: { "stroke-width": 1.9 } });
  }
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  document.querySelector("#toastText").textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function normalizeState(state) {
  return {
    ...structuredClone(defaultState),
    ...(state || {}),
    settings: { ...defaultState.settings, ...(state?.settings || {}) },
    completedWishes: Array.isArray(state?.completedWishes) ? state.completedWishes : [],
    moods: state?.moods || {},
    notes: Array.isArray(state?.notes) ? state.notes : [],
    memories: Array.isArray(state?.memories) ? state.memories : [],
    datePicks: state?.datePicks || {},
    users: Array.isArray(state?.users) ? state.users : []
  };
}

function getPartner() {
  return sharedState.users.find((name) => name !== currentUser) || "TA";
}

function formatTime(time) {
  const timestamp = Number(time);
  if (!Number.isFinite(timestamp)) return "最近";
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return "刚刚";
  if (diff < 86_400_000) return "今天";
  if (diff < 172_800_000) return "昨天";
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    credentials: "same-origin"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) showAuth();
    throw new Error(data.error || "请求失败");
  }
  return data;
}

async function updateShared(action, payload = {}) {
  const data = await api("/api/update", {
    method: "POST",
    body: JSON.stringify({ action, ...payload })
  });
  sharedState = normalizeState(data.state);
  return sharedState;
}

function showAuth(message = "") {
  document.body.classList.add("auth-required");
  document.querySelector("#authScreen").hidden = false;
  document.querySelector("#authError").textContent = message;
  refreshIcons();
}

function showApp() {
  document.body.classList.remove("auth-required");
  document.querySelector("#authScreen").hidden = true;
  document.querySelector("#authError").textContent = "";
}

function calculateDaysTogether() {
  const start = new Date(`${sharedState.settings.startDate}T00:00:00`);
  const now = new Date();
  const days = Math.max(1, Math.floor((now - start) / 86400000) + 1);
  document.querySelector("#daysTogether").textContent = days.toLocaleString("zh-CN");
}

function updateWishProgress() {
  const boxes = [...document.querySelectorAll(".wish-item input")];
  const completed = boxes.filter((box) => box.checked).length;
  const percentage = Math.round((completed / boxes.length) * 100);
  document.querySelector("#wishDone").textContent = completed;
  document.querySelector("#progressText").textContent = `${percentage}%`;
  document.querySelector("#progressRing").style.setProperty("--progress", `${percentage * 3.6}deg`);
  document.querySelector("#heartValue").textContent = Math.min(100, 88 + completed * 2);
}

function initWishes() {
  const boxes = [...document.querySelectorAll(".wish-item input")];
  boxes.forEach((box, index) => {
    box.checked = sharedState.completedWishes.includes(index);
    box.addEventListener("change", async () => {
      const completed = boxes.map((item, itemIndex) => (item.checked ? itemIndex : null)).filter((item) => item !== null);
      try {
        await updateShared("wishes", { completed });
        updateWishProgress();
      } catch (error) {
        showToast(error.message);
      }
    });
  });

  document.querySelector("#resetWishes").addEventListener("click", async () => {
    boxes.forEach((box) => {
      box.checked = false;
    });
    try {
      await updateShared("wishes", { completed: [] });
      updateWishProgress();
      showToast("今天的小愿望已经重新开始");
    } catch (error) {
      showToast(error.message);
    }
  });

  updateWishProgress();
}

function renderMoodPanel() {
  const buttons = [...document.querySelectorAll("#moodOptions button")];
  const result = document.querySelector("#moodResult");
  const partnerMood = sharedState.moods[getPartner()];
  document.querySelector("#partnerMood").textContent = partnerMood
    ? `${getPartner()} 今天是：${partnerMood}`
    : `${getPartner()} 今天还没有留下心情`;

  const selectedMood = sharedState.moods[currentUser];
  buttons.forEach((button) => {
    const active = button.dataset.mood === selectedMood;
    button.classList.toggle("active", active);
    if (active) {
      result.querySelector(".mood-dot").style.background = button.dataset.color;
      result.querySelector("span:last-child").textContent = `我的关键词：${button.dataset.mood}`;
      result.style.color = button.dataset.color;
    }
  });

  if (!selectedMood) {
    result.querySelector(".mood-dot").style.background = "var(--coral)";
    result.querySelector("span:last-child").textContent = "还没有选择今天的关键词";
    result.style.color = "var(--muted)";
  }
}

function initMood() {
  const buttons = [...document.querySelectorAll("#moodOptions button")];
  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await updateShared("mood", { mood: button.dataset.mood });
        renderMoodPanel();
        showToast(`已记下今天是「${button.dataset.mood}」`);
      } catch (error) {
        showToast(error.message);
      }
    });
  });
  renderMoodPanel();
}

function renderQuiz() {
  const question = quizQuestions[currentQuiz];
  document.querySelector("#questionNumber").textContent = `问题 ${currentQuiz + 1} / ${quizQuestions.length}`;
  document.querySelector("#questionText").textContent = question.text;
  document.querySelector("#quizFeedback").textContent = "";
  document.querySelector("#nextQuestion").disabled = true;
  document.querySelector("#nextQuestion").innerHTML =
    currentQuiz === quizQuestions.length - 1
      ? '看结果 <i data-lucide="sparkles"></i>'
      : '下一题 <i data-lucide="arrow-right"></i>';
  document.querySelector("#quizProgressBar").style.width =
    `${((currentQuiz + 1) / quizQuestions.length) * 100}%`;

  const answerGrid = document.querySelector("#answerGrid");
  answerGrid.innerHTML = "";
  question.answers.forEach((answer, index) => {
    const button = document.createElement("button");
    button.className = "answer-button";
    button.type = "button";
    button.innerHTML = `<span>${answer}</span><span class="answer-key">${String.fromCharCode(65 + index)}</span>`;
    button.addEventListener("click", () => chooseAnswer(index));
    answerGrid.appendChild(button);
  });

  selectedAnswer = null;
  refreshIcons();
}

function chooseAnswer(index) {
  if (selectedAnswer !== null) return;

  selectedAnswer = index;
  const question = quizQuestions[currentQuiz];
  const buttons = [...document.querySelectorAll(".answer-button")];
  buttons.forEach((button, buttonIndex) => {
    button.disabled = true;
    if (buttonIndex === question.correct) button.classList.add("correct");
    if (buttonIndex === index && index !== question.correct) button.classList.add("wrong");
  });

  const isCorrect = index === question.correct;
  if (isCorrect) quizScore += 1;
  document.querySelector("#quizScore").textContent = quizScore;
  document.querySelector("#quizFeedback").textContent = isCorrect
    ? `答对啦！${question.comment}`
    : `没关系，这就是下次聊天的新话题。${question.comment}`;
  document.querySelector("#nextQuestion").disabled = false;
}

function finishQuiz() {
  const result = document.querySelector("#quizResult");
  const stage = document.querySelector("#quizStage");
  const title = document.querySelector("#resultTitle");
  const copy = document.querySelector("#resultCopy");
  const results = [
    ["默契正在加载中", "看来还有很多值得慢慢了解的小心思。"],
    ["有点懂，但还在猜", "每一次猜错，都是一次更靠近彼此的机会。"],
    ["默契度很不错", "你们已经开始读懂那些没说出口的小细节。"],
    ["心有灵犀认证通过", "不用多说，你们也总能想到一起。"]
  ];
  [title.textContent, copy.textContent] = results[quizScore];
  stage.hidden = true;
  result.hidden = false;
  document.querySelector("#quizProgressBar").style.width = "100%";
  burstHearts(14);
}

function initQuiz() {
  document.querySelector("#nextQuestion").addEventListener("click", () => {
    if (currentQuiz < quizQuestions.length - 1) {
      currentQuiz += 1;
      renderQuiz();
    } else {
      finishQuiz();
    }
  });

  document.querySelector("#restartQuiz").addEventListener("click", () => {
    currentQuiz = 0;
    quizScore = 0;
    document.querySelector("#quizScore").textContent = "0";
    document.querySelector("#quizResult").hidden = true;
    document.querySelector("#quizStage").hidden = false;
    renderQuiz();
  });

  renderQuiz();
}

function renderDateIdeas(ideas = visibleDateIdeas) {
  visibleDateIdeas = ideas;
  const grid = document.querySelector("#dateGrid");
  const picks = sharedState.datePicks[currentUser] || [];
  grid.innerHTML = "";

  ideas.forEach((idea, index) => {
    const article = document.createElement("article");
    article.className = "date-card";
    article.innerHTML = `
      <img src="${idea.image}" alt="${idea.title}" />
      <div class="date-card-content">
        <span class="date-index">IDEA ${String(index + 1).padStart(2, "0")}</span>
        <h3>${idea.title}</h3>
        <p>${idea.text}</p>
        <div class="date-meta">
          <span><i data-lucide="clock-3"></i>${idea.meta}</span>
          <span><i data-lucide="sparkles"></i>${idea.mood}</span>
          <button class="date-choice ${picks.includes(idea.id) ? "active" : ""}" type="button" aria-label="选择${idea.title}"><i data-lucide="heart"></i></button>
        </div>
      </div>
    `;

    article.querySelector(".date-choice").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const currentPicks = sharedState.datePicks[currentUser] || [];
      const nextPicks = currentPicks.includes(idea.id)
        ? currentPicks.filter((id) => id !== idea.id)
        : [...currentPicks, idea.id];
      try {
        await updateShared("datePick", { titles: nextPicks });
        renderDateIdeas(ideas);
        if (nextPicks.includes(idea.id)) {
          showToast(`已把「${idea.title}」放进愿望清单`);
          burstHearts(8);
        }
      } catch (error) {
        showToast(error.message);
      }
    });

    grid.appendChild(article);
  });

  refreshIcons();
}

function initDates() {
  renderDateIdeas(dateIdeas.slice(0, 3));
  document.querySelector("#shuffleDates").addEventListener("click", () => {
    const shuffled = [...dateIdeas].sort(() => Math.random() - 0.5).slice(0, 3);
    renderDateIdeas(shuffled);
    showToast("新的约会灵感已经换好");
  });
}

function renderNotes() {
  const list = document.querySelector("#notesList");
  list.innerHTML = "";
  sharedState.notes.slice(0, 5).forEach((note) => {
    const item = document.createElement("article");
    item.className = "note-item";
    const tag = document.createElement("span");
    tag.className = "note-tag";
    tag.textContent = note.tag || "想念";
    const text = document.createElement("p");
    text.textContent = note.text;
    const time = document.createElement("span");
    time.className = "note-time";
    time.textContent = `${note.author ? `${note.author} · ` : ""}${formatTime(note.time)}`;
    item.append(tag, text, time);
    list.appendChild(item);
  });

  if (!sharedState.notes.length) {
    const empty = document.createElement("p");
    empty.textContent = "写下第一句悄悄话吧。";
    list.appendChild(empty);
  }
}

function initNotes() {
  const form = document.querySelector("#noteForm");
  const textarea = document.querySelector("#noteText");
  const charCount = document.querySelector("#charCount");
  const tags = [...document.querySelectorAll("#tagPicker button")];
  let selectedTag = "想念";

  textarea.addEventListener("input", () => {
    charCount.textContent = `${textarea.value.length} / 120`;
  });

  tags.forEach((tagButton) => {
    tagButton.addEventListener("click", () => {
      selectedTag = tagButton.dataset.tag;
      tags.forEach((item) => item.classList.toggle("selected", item === tagButton));
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = textarea.value.trim();
    if (!text) return;
    try {
      await updateShared("note", { text, tag: selectedTag });
      renderNotes();
      form.reset();
      charCount.textContent = "0 / 120";
      showToast("这句话已经悄悄放进小信箱");
      burstHearts(10);
    } catch (error) {
      showToast(error.message);
    }
  });

  renderNotes();
}

function renderMemoryAddition(memory) {
  const grid = document.querySelector(".memory-grid");
  const figure = document.createElement("figure");
  figure.className = "memory-card";
  const image = document.createElement("img");
  image.src = "assets/memory-2.jpg";
  image.alt = memory.title;
  const caption = document.createElement("figcaption");
  const title = document.createElement("strong");
  title.textContent = memory.title;
  const description = document.createElement("small");
  description.textContent = `${memory.author ? `${memory.author} · ` : ""}${memory.caption}`;
  caption.append(title, description);
  figure.append(image, caption);
  grid.appendChild(figure);
}

function initMemoryDialog() {
  const dialog = document.querySelector("#memoryDialog");
  const form = document.querySelector("#memoryForm");

  document.querySelector("#openMemory").addEventListener("click", () => dialog.showModal());
  document.querySelector("#closeMemory").addEventListener("click", () => dialog.close());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = document.querySelector("#memoryTitle").value.trim();
    const caption = document.querySelector("#memoryCaption").value.trim();
    if (!title || !caption) return;
    try {
      await updateShared("memory", { title, caption });
      renderMemoryAddition({ title, caption, author: currentUser });
      form.reset();
      dialog.close();
      showToast("新的记忆已经放进纪念册");
      burstHearts(12);
    } catch (error) {
      showToast(error.message);
    }
  });

  sharedState.memories.forEach(renderMemoryAddition);
}

function initSettings() {
  const dialog = document.querySelector("#settingsDialog");
  const form = document.querySelector("#settingsForm");
  const startDate = document.querySelector("#startDate");
  const coupleName = document.querySelector("#coupleName");

  startDate.value = sharedState.settings.startDate;
  coupleName.value = sharedState.settings.coupleName;
  document.querySelector("#openSettings").addEventListener("click", () => dialog.showModal());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await updateShared("settings", {
        startDate: startDate.value,
        coupleName: coupleName.value.trim()
      });
      calculateDaysTogether();
      document.title = `${sharedState.settings.coupleName} · 情侣互动空间`;
      dialog.close();
      showToast("纪念日设置好啦");
    } catch (error) {
      showToast(error.message);
    }
  });
}

function burstHearts(count = 10) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let index = 0; index < count; index += 1) {
    const heart = document.createElement("span");
    heart.textContent = Math.random() > 0.35 ? "♥" : "✦";
    heart.style.position = "fixed";
    heart.style.left = `${42 + Math.random() * 16}%`;
    heart.style.top = `${42 + Math.random() * 12}%`;
    heart.style.zIndex = "300";
    heart.style.pointerEvents = "none";
    heart.style.color = Math.random() > 0.5 ? "#e8645a" : "#d6a84a";
    heart.style.fontSize = `${16 + Math.random() * 22}px`;
    heart.style.opacity = "0";
    heart.style.transform = "translate(0, 0) rotate(0deg)";
    heart.style.transition = `transform ${700 + Math.random() * 650}ms ease, opacity 950ms ease`;
    document.body.appendChild(heart);
    requestAnimationFrame(() => {
      heart.style.opacity = "1";
      heart.style.transform = `translate(${(Math.random() - 0.5) * 260}px, ${-80 - Math.random() * 170}px) rotate(${(Math.random() - 0.5) * 100}deg)`;
    });
    setTimeout(() => heart.remove(), 1550);
  }
}

function initGlobalActions() {
  window.addEventListener("scroll", () => {
    document.querySelector(".topbar").classList.toggle("scrolled", window.scrollY > 56);
  }, { passive: true });

  document.querySelector("#surpriseBtn").addEventListener("click", () => {
    const message = surpriseMessages[Math.floor(Math.random() * surpriseMessages.length)];
    document.querySelector("#noteText").value = message;
    document.querySelector("#charCount").textContent = `${message.length} / 120`;
    document.querySelector("#letters").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => burstHearts(18), 500);
    showToast("悄悄准备好了一句想对 TA 说的话");
  });

  document.querySelector("#closeDayBtn").addEventListener("click", async () => {
    try {
      await updateShared("closeDay");
      burstHearts(22);
      showToast("今天已经被好好收藏，晚安");
      document.querySelector("#home").scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      showToast(error.message);
    }
  });
}

function initApp() {
  calculateDaysTogether();
  initWishes();
  initMood();
  initQuiz();
  initDates();
  initNotes();
  initMemoryDialog();
  initSettings();
  initGlobalActions();
  document.title = `${sharedState.settings.coupleName} · 情侣互动空间`;
  refreshIcons();
}

async function refreshFromServer() {
  if (!currentUser) return;
  try {
    const data = await api("/api/state");
    sharedState = normalizeState(data.state);
    calculateDaysTogether();
    updateWishProgress();
    renderMoodPanel();
    renderNotes();
    renderDateIdeas(visibleDateIdeas);
  } catch {
    showAuth("登录已过期，请重新进入");
  }
}

async function boot() {
  document.body.classList.add("auth-required");
  try {
    const data = await api("/api/session");
    currentUser = data.user;
    sharedState = normalizeState(data.state);
    showApp();
    initApp();
    setInterval(refreshFromServer, 20000);
    window.addEventListener("focus", refreshFromServer);
  } catch {
    showAuth();
  }
}

function initLogin() {
  const form = document.querySelector("#loginForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.querySelector("#loginName").value.trim();
    const code = document.querySelector("#loginCode").value;
    const error = document.querySelector("#authError");
    error.textContent = "";
    try {
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ name, code })
      });
      currentUser = data.user;
      sharedState = normalizeState(data.state);
      showApp();
      initApp();
      setInterval(refreshFromServer, 20000);
      window.addEventListener("focus", refreshFromServer);
    } catch (err) {
      error.textContent = err.message;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initLogin();
  boot();
});
