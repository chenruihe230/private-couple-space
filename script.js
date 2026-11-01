// 关键配置：纪念日、周日下课时间、她的名字和暖心文案都可以在这里快速修改
const USER_CONFIG = {
  defaultStartDate: "2026-10-22",
  defaultGirlName: "她",
  defaultSundayClassEndTime: "17:00",
  warmMessages: [
    "今天辛苦了，你已经做得比自己想象中更好。",
    "不用一直坚强，累了就靠过来一点。",
    "世界偶尔催促你，但我们可以慢慢来。",
    "你不是一个人在撑过这个星期。",
    "等下课以后，把烦恼留在教室里吧。",
    "今天也有在认真喜欢你。",
    "我们不用赶路，慢慢走向同一个方向就好。"
  ],
  hiddenLetter: "这是一封只留给你的小字信。\n\n我知道有些疲惫不需要被解决，只需要被看见。谢谢你一直在认真生活，也谢谢你愿意把一部分普通日子交给我。等下课以后，记得把肩膀放松一点。今天不用成为很厉害的人，只要还是你就好。"
};

const defaultState = {
  settings: {
    startDate: USER_CONFIG.defaultStartDate,
    coupleName: "我们的小世界",
    girlName: USER_CONFIG.defaultGirlName,
    sundayClassEndTime: USER_CONFIG.defaultSundayClassEndTime
  },
  completedWishes: [],
  moods: {},
  notes: [],
  memories: [],
  datePicks: {},
  vents: [],
  coupons: [],
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
    vents: Array.isArray(state?.vents) ? state.vents : [],
    coupons: Array.isArray(state?.coupons) ? state.coupons : [],
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
  const grid = document.querySelector("#memoryGrid");
  const figure = document.createElement("figure");
  figure.className = "memory-card";

  const image = document.createElement("img");
  // 自定义图片 URL 可以展示异地合照、聊天截图或共同旅行照片
  image.src = memory.image || "assets/memory-2.jpg";
  image.alt = memory.title;
  image.addEventListener("error", () => {
    image.src = "assets/memory-2.jpg";
  });

  const caption = document.createElement("figcaption");
  const title = document.createElement("strong");
  title.textContent = memory.title;
  const description = document.createElement("small");
  description.textContent = `${memory.author ? `${memory.author} · ` : ""}${memory.caption}`;
  caption.append(title, description);
  figure.append(image, caption);
  grid.appendChild(figure);
  document.querySelector("#memoryEmpty").hidden = true;
}

function renderMemories() {
  const grid = document.querySelector("#memoryGrid");
  grid.innerHTML = "";
  sharedState.memories.forEach(renderMemoryAddition);
  document.querySelector("#memoryEmpty").hidden = sharedState.memories.length > 0;
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
    const image = document.querySelector("#memoryImage").value.trim();
    if (!title || !caption) return;
    try {
      await updateShared("memory", { title, caption, image });
      renderMemories();
      form.reset();
      dialog.close();
      showToast("新的记忆已经放进纪念册");
      burstHearts(12);
    } catch (error) {
      showToast(error.message);
    }
  });

  renderMemories();
}

function initSettings() {
  const dialog = document.querySelector("#settingsDialog");
  const form = document.querySelector("#settingsForm");
  const startDate = document.querySelector("#startDate");
  const coupleName = document.querySelector("#coupleName");
  const girlName = document.querySelector("#girlName");
  const classTime = document.querySelector("#settingsClassTime");

  startDate.value = sharedState.settings.startDate;
  coupleName.value = sharedState.settings.coupleName;
  girlName.value = sharedState.settings.girlName || USER_CONFIG.defaultGirlName;
  classTime.value = sharedState.settings.sundayClassEndTime || USER_CONFIG.defaultSundayClassEndTime;
  document.querySelector("#openSettings").addEventListener("click", () => dialog.showModal());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await updateShared("settings", {
        startDate: startDate.value,
        coupleName: coupleName.value.trim(),
        girlName: girlName.value.trim(),
        sundayClassEndTime: classTime.value
      });
      calculateDaysTogether();
      renderCountdown();
      renderStation();
      document.title = `${sharedState.settings.coupleName} · 情侣互动空间`;
      dialog.close();
      showToast("纪念日设置好啦");
    } catch (error) {
      showToast(error.message);
    }
  });

  document.querySelector("#exportData").addEventListener("click", downloadExport);
}

function renderVents() {
  const list = document.querySelector("#ventList");
  list.innerHTML = "";

  if (!sharedState.vents.length) {
    const empty = document.createElement("div");
    empty.className = "vent-empty";
    empty.textContent = "还没有碎碎念。写一句不需要认真解释的话也可以。";
    list.appendChild(empty);
    return;
  }

  sharedState.vents.slice(0, 5).forEach((vent) => {
    const item = document.createElement("article");
    item.className = "vent-item";

    const mark = document.createElement("span");
    mark.className = "vent-mark";
    mark.innerHTML = '<i data-lucide="cloud"></i>';

    const text = document.createElement("p");
    text.textContent = vent.text;

    const meta = document.createElement("span");
    meta.textContent = `${vent.author || "我"} · ${formatTime(vent.time)}`;

    item.append(mark, text, meta);
    list.appendChild(item);
  });

  refreshIcons();
}

function initVents() {
  const form = document.querySelector("#ventForm");
  const input = document.querySelector("#ventText");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    try {
      await updateShared("vent", { text });
      renderVents();
      form.reset();
      playSound("write");
      showToast("已经轻轻放下这句疲惫");
    } catch (error) {
      showToast(error.message);
    }
  });

  renderVents();
}

function renderCoupons() {
  const grid = document.querySelector("#couponGrid");
  grid.innerHTML = "";

  if (!sharedState.coupons.length) {
    const empty = document.createElement("div");
    empty.className = "coupon-empty";
    empty.textContent = "还没有兑换券。先把一个想为对方做的小事写下来吧。";
    grid.appendChild(empty);
    return;
  }

  sharedState.coupons.forEach((coupon) => {
    const uses = Array.isArray(coupon.uses) ? coupon.uses : [];
    const used = coupon.active === false;
    const card = document.createElement("article");
    card.className = `coupon-card ${used ? "used" : ""}`;

    const top = document.createElement("div");
    top.className = "coupon-topline";
    top.innerHTML = `<span>LOVE COUPON</span><span>${used ? "已核销" : "可使用"}</span>`;

    const title = document.createElement("h3");
    title.className = "coupon-title";
    title.textContent = coupon.title;

    const note = document.createElement("p");
    note.className = "coupon-note";
    note.textContent = coupon.note || "由送出的人认真兑现。";

    const log = document.createElement("div");
    log.className = "coupon-log";
    if (uses.length) {
      const latest = uses[uses.length - 1];
      log.textContent = `使用日志：${latest.by || "对方"} 于 ${formatTime(latest.time)} 核销 · 累计 ${uses.length} 次`;
    } else {
      log.textContent = `由 ${coupon.issuer || "我"} 制作 · 还没有核销记录`;
    }

    const actions = document.createElement("div");
    actions.className = "coupon-actions";

    const redeem = document.createElement("button");
    redeem.type = "button";
    redeem.className = "primary-button";
    redeem.innerHTML = used
      ? '<i data-lucide="rotate-ccw"></i> 恢复可使用'
      : '<i data-lucide="ticket-check"></i> 标记核销';
    redeem.addEventListener("click", async () => {
      try {
        await updateShared(used ? "couponReset" : "couponRedeem", { id: coupon.id });
        renderCoupons();
        playSound(used ? "reset" : "coupon");
        showToast(used ? "兑换券已经恢复" : "兑换券已核销，使用记录已保存");
        if (!used) burstHearts(10);
      } catch (error) {
        showToast(error.message);
      }
    });

    actions.append(redeem);
    card.append(top, title, note, log, actions);
    grid.appendChild(card);
  });

  refreshIcons();
}

function initCoupons() {
  const dialog = document.querySelector("#couponDialog");
  const form = document.querySelector("#couponForm");

  document.querySelector("#openCoupon").addEventListener("click", () => dialog.showModal());
  document.querySelector("#closeCoupon").addEventListener("click", () => dialog.close());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = document.querySelector("#couponTitle").value.trim();
    const note = document.querySelector("#couponNote").value.trim();
    if (!title) return;
    try {
      await updateShared("couponCreate", { title, note });
      renderCoupons();
      form.reset();
      dialog.close();
      playSound("coupon");
      showToast("新的兑换券已经做好");
    } catch (error) {
      showToast(error.message);
    }
  });

  renderCoupons();
}

function nextSundayTarget(timeValue) {
  const [hour, minute] = String(timeValue || USER_CONFIG.defaultSundayClassEndTime)
    .split(":")
    .map(Number);
  const target = new Date();
  target.setHours(hour || 17, minute || 0, 0, 0);

  const daysUntilSunday = (7 - target.getDay()) % 7;
  target.setDate(target.getDate() + daysUntilSunday);
  if (target <= new Date()) {
    target.setDate(target.getDate() + 7);
  }
  return target;
}

function renderCountdown() {
  const display = document.querySelector("#sundayCountdown");
  if (!display) return;

  const timeValue = sharedState.settings.sundayClassEndTime || USER_CONFIG.defaultSundayClassEndTime;
  const target = nextSundayTarget(timeValue);
  const diff = Math.max(0, target - new Date());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  display.textContent = `${days}天 ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function initCountdown() {
  const homeInput = document.querySelector("#sundayClassTime");
  const settingsInput = document.querySelector("#settingsClassTime");
  const value = sharedState.settings.sundayClassEndTime || USER_CONFIG.defaultSundayClassEndTime;
  homeInput.value = value;
  settingsInput.value = value;

  const update = async (nextValue) => {
    try {
      await updateShared("settings", {
        startDate: sharedState.settings.startDate,
        coupleName: sharedState.settings.coupleName,
        girlName: sharedState.settings.girlName,
        sundayClassEndTime: nextValue
      });
      homeInput.value = nextValue;
      settingsInput.value = nextValue;
      renderCountdown();
      showToast("周日下课时间已经更新");
    } catch (error) {
      showToast(error.message);
    }
  };

  homeInput.addEventListener("change", () => update(homeInput.value));
  settingsInput.addEventListener("change", () => update(settingsInput.value));
  renderCountdown();
  setInterval(renderCountdown, 1000);
}

async function downloadExport() {
  try {
    const response = await fetch("/api/export", { credentials: "same-origin" });
    if (!response.ok) throw new Error("导出失败，请重新登录后再试");
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `两个人的小世界-备份-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("完整记录已导出，请妥善保存");
  } catch (error) {
    showToast(error.message);
  }
}

// 默认静音，避免页面打开时突然播放声音
let soundEnabled = false;
let audioContext = null;
let backgroundMusic = null;
let ambientParts = [];
let ambientTimer = null;
let ambientChordIndex = 0;

// WebAudio 合成轻柔背景和声，作为 MP3 无法播放时的备用方案
const ambientChords = [
  [174.61, 220.00, 261.63],
  [196.00, 246.94, 293.66],
  [164.81, 207.65, 246.94],
  [174.61, 220.00, 261.63]
];

function ensureAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  audioContext ||= new AudioContextClass();
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function startAmbientMusic() {
  const context = ensureAudio();
  if (!context || ambientParts.length) return;

  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, context.currentTime);
  master.gain.exponentialRampToValueAtTime(0.022, context.currentTime + 1.8);
  master.connect(context.destination);

  const voices = ambientChords[0].map((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index === 1 ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = index === 1 ? 0.13 : 0.18;
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start();
    return { oscillator, gain };
  });

  const lfo = context.createOscillator();
  const lfoGain = context.createGain();
  lfo.frequency.value = 0.075;
  lfoGain.gain.value = 0.0045;
  lfo.connect(lfoGain);
  lfoGain.connect(master.gain);
  lfo.start();

  ambientParts = [{ master }, ...voices, { oscillator: lfo, gain: lfoGain }];
  ambientTimer = window.setInterval(() => {
    ambientChordIndex = (ambientChordIndex + 1) % ambientChords.length;
    const nextChord = ambientChords[ambientChordIndex];
    voices.forEach((voice, index) => {
      voice.oscillator.frequency.linearRampToValueAtTime(nextChord[index], context.currentTime + 4.5);
    });
  }, 9000);
}

function stopAmbientMusic() {
  if (ambientTimer) {
    clearInterval(ambientTimer);
    ambientTimer = null;
  }

  if (!ambientParts.length || !audioContext) return;
  const masterPart = ambientParts.find((part) => part.master)?.master;
  if (masterPart) {
    masterPart.gain.cancelScheduledValues(audioContext.currentTime);
    masterPart.gain.setValueAtTime(Math.max(masterPart.gain.value, 0.0001), audioContext.currentTime);
    masterPart.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.65);
  }

  ambientParts.forEach((part) => {
    if (part.oscillator) {
      try {
        part.oscillator.stop(audioContext.currentTime + 0.8);
      } catch {}
    }
  });
  ambientParts = [];
}

function playSound(type = "soft") {
  if (!soundEnabled) return;
  const context = ensureAudio();
  if (!context) return;

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  const presets = {
    soft: [520, 0.08],
    heart: [660, 0.12],
    write: [420, 0.07],
    coupon: [740, 0.12],
    reset: [360, 0.08]
  };
  const [frequency, duration] = presets[type] || presets.soft;

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.18, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.075, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.12);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.15);
}

function renderSoundButton() {
  const button = document.querySelector("#soundToggle");
  button.innerHTML = `<i data-lucide="${soundEnabled ? "volume-2" : "volume-x"}"></i>`;
  button.setAttribute("aria-label", soundEnabled ? "关闭背景音乐与音效" : "开启背景音乐与音效");
  button.title = soundEnabled ? "背景音乐与音效已开启" : "背景音乐与音效已静音";
  refreshIcons();
}

function initSound() {
  const button = document.querySelector("#soundToggle");
  backgroundMusic = document.querySelector("#backgroundMusic");
  backgroundMusic.volume = 0.18;

  backgroundMusic.addEventListener("error", () => {
    if (soundEnabled) {
      startAmbientMusic();
      showToast("音乐文件暂时无法播放，已切换为合成背景声");
    }
  });

  button.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    renderSoundButton();

    if (soundEnabled) {
      ensureAudio();
      const playPromise = backgroundMusic.play();
      if (playPromise?.then) {
        playPromise
          .then(() => stopAmbientMusic())
          .catch(() => {
            startAmbientMusic();
          });
      } else {
        stopAmbientMusic();
      }
      playSound("heart");
      showToast("背景音乐与音效已开启");
    } else {
      backgroundMusic.pause();
      stopAmbientMusic();
      showToast("背景音乐与音效已静音");
    }
  });

  renderSoundButton();
}

function createHeartParticle(rain = false) {
  const heart = document.createElement("span");
  heart.className = "heart-particle";
  heart.textContent = Math.random() > 0.28 ? "♥" : "✦";
  heart.style.left = `${8 + Math.random() * 84}vw`;
  heart.style.top = `${18 + Math.random() * 48}vh`;
  heart.style.color = Math.random() > 0.52 ? "#e8645a" : "#d88969";
  heart.style.fontSize = `${rain ? 18 : 13}px`;
  heart.style.setProperty("--drift", `${(Math.random() - 0.5) * (rain ? 320 : 180)}px`);
  heart.style.animationDuration = `${rain ? 2.4 : 1.7}s`;
  document.body.appendChild(heart);
  setTimeout(() => heart.remove(), 3100);
}

function softHeartBurst(count = 8) {
  for (let index = 0; index < count; index += 1) {
    setTimeout(() => createHeartParticle(false), index * 70);
  }
}

function heartRain(count = 32) {
  for (let index = 0; index < count; index += 1) {
    setTimeout(() => createHeartParticle(true), index * 45);
  }
}

function renderStation() {
  const name = sharedState.settings.girlName || USER_CONFIG.defaultGirlName;
  document.querySelector("#stationName").textContent = name;
}

function initStation() {
  const dialog = document.querySelector("#stationDialog");
  const screen = document.querySelector("#stationScreen");
  const quote = document.querySelector("#stationQuote");
  const nameButton = document.querySelector("#stationName");
  const hint = document.querySelector("#secretLetterHint");
  const letter = document.querySelector("#hiddenLetter");
  let holdTimer = null;

  renderStation();
  document.querySelector("#hiddenLetterText").textContent = USER_CONFIG.hiddenLetter;

  document.querySelector("#stationButton").addEventListener("click", () => {
    letter.hidden = true;
    dialog.showModal();
    renderStation();
  });

  document.querySelector("#closeStation").addEventListener("click", () => dialog.close());

  screen.addEventListener("click", () => {
    const message = USER_CONFIG.warmMessages[Math.floor(Math.random() * USER_CONFIG.warmMessages.length)];
    quote.textContent = message;
    quote.classList.remove("show");
    requestAnimationFrame(() => quote.classList.add("show"));
    softHeartBurst(8);
    playSound("soft");
  });

  nameButton.addEventListener("click", (event) => {
    event.stopPropagation();
    heartRain(34);
    quote.textContent = `${nameButton.textContent}，今天也已经很努力了。`;
    quote.classList.add("show");
    playSound("heart");
  });

  const openLetter = () => {
    letter.hidden = false;
    playSound("heart");
    softHeartBurst(10);
  };

  hint.addEventListener("pointerdown", () => {
    holdTimer = setTimeout(openLetter, 800);
  });

  ["pointerup", "pointerleave", "pointercancel"].forEach((eventName) => {
    hint.addEventListener(eventName, () => clearTimeout(holdTimer));
  });

  hint.addEventListener("click", (event) => {
    event.stopPropagation();
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
  initVents();
  initCoupons();
  initNotes();
  initMemoryDialog();
  initSettings();
  initCountdown();
  initSound();
  initStation();
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
    renderVents();
    renderCoupons();
    renderCountdown();
    renderStation();
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
