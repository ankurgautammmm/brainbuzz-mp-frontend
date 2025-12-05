
const API_BASE = "https://brainbuzz-mp-backend.onrender.com";

(function () {

  let AUTH_TOKEN = localStorage.getItem("bb_jwt") || null;
  function setToken(t) { AUTH_TOKEN = t; localStorage.setItem("bb_jwt", t); }
  function clearToken() { AUTH_TOKEN = null; localStorage.removeItem("bb_jwt"); }
  function authHeaders() { return AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}; }
  function isLoggedIn() { return !!AUTH_TOKEN; }

 
  const $ = id => document.getElementById(id);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

   
  function hashStr(s = "guest") {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
    return Math.abs(h);
  }
  function cartoonAvatar(username = "guest") {
    const h = hashStr(username);
    const C = document.createElement("canvas");
    C.width = 200; C.height = 200;
    const ctx = C.getContext("2d");
    ctx.fillStyle = `hsl(${(h % 360)},70%,55%)`;
    ctx.beginPath(); ctx.arc(100, 100, 90, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(75, 95, 8, 0, Math.PI * 2); ctx.arc(125, 95, 8, 0, Math.PI * 2); ctx.fill();
    return C.toDataURL("image/png");
  }
  function paintAvatarEl(el, username) {
    if (!el) return;
    el.style.backgroundImage = `url(${cartoonAvatar(username)})`;
    el.style.backgroundSize = "cover";
  }

 
  const sections = [
    "home","features","about","contact","subjectChooser","loginPage","signupPage",
    "profile","quiz","dashboard","leaderboard","rights"
  ];
  function show(id) {
    sections.forEach(s => { const el = $(s); if (el) el.classList.add("hidden"); });
    const t = $(id);
    if (t) t.classList.remove("hidden");
     $$(".nav-btn").forEach(b => b.classList.remove("active"));
    $$(".nav-btn").filter(b => b.dataset && b.dataset.target === id).forEach(b => b.classList.add("active"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

 
  function showError(id, msg) {
    const el = $(id);
    if (el) { el.textContent = msg; el.classList.remove("hidden"); }
    else console.warn("Missing error element:", id, msg);
  }
  function hideErrors() {
    ["loginError","signupError"].forEach(id => $(id) && $(id).classList.add("hidden"));
  }

    function refreshHeaderAuth() {
    const loginNav = $("loginNav"), signupNav = $("signupNav"),
          avatarNav = $("avatarNav"), logoutBtn = $("logoutBtn"),
          avatarBubble = $("avatarBubble");

    if (isLoggedIn()) {
      loginNav?.classList.add("hidden");
      signupNav?.classList.add("hidden");
      avatarNav?.classList.remove("hidden");
      logoutBtn?.classList.remove("hidden");
      paintAvatarEl(avatarBubble, "user");
    } else {
      loginNav?.classList.remove("hidden");
      signupNav?.classList.remove("hidden");
      avatarNav?.classList.add("hidden");
      logoutBtn?.classList.add("hidden");
    }
  }

  
  async function loadProfileDB() {
    try {
      const res = await fetch(`${API_BASE}/api/profile`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Profile fetch failed (${res.status})`);
      const p = await res.json();
      if (!p) return;
      $("pName") && ($("pName").value = p.fullName || "");
      $("pEmail") && ($("pEmail").value = p.email || "");
      $("pPhone") && ($("pPhone").value = p.phone || "");
      $("pClass") && ($("pClass").value = p.classYear || "");
      $("pDob") && ($("pDob").value = p.dob || "");
      $("pAge") && ($("pAge").value = p.age || "");
      paintAvatarEl($("bigAvatar"), p.username || "user");
    } catch (err) {
      console.error("loadProfileDB:", err);
    }
  }

    let currentQuiz = [], currentQuestion = 0, score = 0, incorrect = 0, timer = null, timeLeft = 30, currentSubject = "";

  
  async function startQuiz(subject) {
    currentSubject = subject || "General";
    try {
      const res = await fetch(`${API_BASE}/api/generate-questions?subject=${encodeURIComponent(subject)}&count=10`);
      if (!res.ok) throw new Error(`Questions fetch failed (${res.status})`);
      currentQuiz = await res.json();
      if (!Array.isArray(currentQuiz) || currentQuiz.length === 0) {
        currentQuiz = [{
          q: `No generated questions for ${subject}. Sample question: 1+1=?`,
          options: ["1","2","3","4"],
          answer: "2",
          explain: "2 is correct"
        }];
      }
    } catch (err) {
      console.error("startQuiz error:", err);
      currentQuiz = [{
        q: `Unable to fetch questions: ${err.message}`,
        options: ["OK"],
        answer: "OK",
        explain: ""
      }];
    }

    currentQuestion = 0; score = 0; incorrect = 0;
    $("qTotal") && ($("qTotal").textContent = currentQuiz.length);
    $("qIndex") && ($("qIndex").textContent = 1);
    show("quiz");
    loadQuestion();
  }

  function clearTimer() { if (timer) { clearInterval(timer); timer = null; } }

  function selectOption(div, value) {
    clearTimer();
    const q = currentQuiz[currentQuestion];
    const oc = $("optionsContainer");
    if (oc) [...oc.children].forEach(d => d.style.pointerEvents = "none");
    if (value === q.answer) {
      score++;
      div.style.background = "rgba(0,200,0,0.45)";
    } else {
      incorrect++;
      div.style.background = "rgba(200,0,0,0.45)";
      if (oc) [...oc.children].forEach(ch => { if (ch.textContent === q.answer) ch.style.outline = "2px solid #0f0"; });
    }
    $("nextBtn")?.classList.remove("hidden");
  }

  function loadQuestion() {
    clearTimer();
    timeLeft = 30;
    const q = currentQuiz[currentQuestion];
    if (!q) return;
    $("questionText") && ($("questionText").textContent = q.q);
    const oc = $("optionsContainer");
    if (!oc) return;
    oc.innerHTML = "";
    q.options.forEach(opt => {
      const d = document.createElement("div");
      d.className = "option-item p-3 mb-2 rounded bg-black border border-gray-700 text-white cursor-pointer";
      d.textContent = opt;
      d.onclick = () => selectOption(d, opt);
      oc.appendChild(d);
    });
    $("nextBtn") && $("nextBtn").classList.add("hidden");

    const timerEl = $("timer");
    if (timerEl) {
      timerEl.textContent = timeLeft;
      timer = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;
        if (timeLeft <= 0) {
          clearTimer();
          const qcur = currentQuiz[currentQuestion];
          if (oc) [...oc.children].forEach(ch => {
            ch.style.pointerEvents = "none";
            if (ch.textContent === qcur.answer) ch.style.outline = "2px solid #0f0";
          });
          $("nextBtn")?.classList.remove("hidden");
        }
      }, 1000);
    }
  }

  async function finishQuiz() {
    clearTimer();
    const pct = Math.round((score / currentQuiz.length) * 100);
    try {
      await fetch(`${API_BASE}/api/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          subject: currentSubject,
          scorePct: pct,
          correct: score,
          total: currentQuiz.length
        })
      });
    } catch (err) {
      console.error("finishQuiz save error:", err);
    }
    await loadLeaderboard();
    show("leaderboard");
  }

  
  async function loadLeaderboard() {
    try {
      const res = await fetch(`${API_BASE}/api/leaderboard`);
      if (!res.ok) throw new Error(`Leaderboard failed (${res.status})`);
      const rows = await res.json();
      const lb = $("lbList");
      if (!lb) return;
      lb.innerHTML = "";
      rows.forEach((r, i) => {
        const item = document.createElement("div");
        item.className = "leaderboard-item p-3 mb-2 border rounded";
        item.innerHTML = `<div><b>#${i + 1} ${r.username}</b></div>
          <div class="text-sm">Avg: ${r.avg}% | Best: ${r.best}% | Played: ${r.played}</div>`;
        lb.appendChild(item);
      });
    } catch (err) { console.error("loadLeaderboard:", err); }
  }

  
  document.addEventListener("DOMContentLoaded", () => {
    

     
    $("logoBtn")?.addEventListener("click", () => show("home"));
    $$(".toFeatures").forEach(b => b.addEventListener("click", () => show("features")));
    $$(".nav-btn").forEach(b => { if (b.dataset && b.dataset.target) b.addEventListener("click", () => show(b.dataset.target)); });

  
    $("loginNav")?.addEventListener("click", () => show("loginPage"));
    $("signupNav")?.addEventListener("click", () => show("signupPage"));
    $("goToSignup")?.addEventListener("click", () => show("signupPage"));
    $("backToLogin")?.addEventListener("click", () => show("loginPage"));


    $("startCTA")?.addEventListener("click", () => { if (isLoggedIn()) show("subjectChooser"); else show("loginPage"); });

    
    $("openPrivacy")?.addEventListener("click", (e) => { e.preventDefault(); $("privacyModal") && ($("privacyModal").style.display = "flex"); });
    $("closePrivacy")?.addEventListener("click", () => { $("privacyModal") && ($("privacyModal").style.display = "none"); });
    $("openRights")?.addEventListener("click", (e) => { e.preventDefault(); show("rights"); });


    $("avatarNav")?.addEventListener("click", () => { if (isLoggedIn()) loadProfileDB(); show("profile"); });
    $("logoutBtn")?.addEventListener("click", () => { clearToken(); refreshHeaderAuth(); show("home"); });

    
    const loginForm = $("loginForm");
    if (loginForm) loginForm.addEventListener("submit", async (ev) => {
      ev.preventDefault(); hideErrors();
      const username = $("username")?.value?.trim() || "";
      const password = $("password")?.value || "";
      if (!username || !password) return showError("loginError", "Enter username and password.");

      try {
        const res = await fetch(`${API_BASE}/api/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!data.ok) return showError("loginError", data.error || "Login failed");
        if (!data.token) return showError("loginError", "No token returned");
        setToken(data.token);
        refreshHeaderAuth();
         
        paintAvatarEl($("avatarBubble"), data.username || username);
        await loadProfileDB();
        show("subjectChooser");
      } catch (err) {
        console.error("login error:", err);
        showError("loginError", "Network error: " + (err.message || err));
      }
    });

     
    const signupForm = $("signupForm");
    if (signupForm) signupForm.addEventListener("submit", async (ev) => {
      ev.preventDefault(); hideErrors();
      const u = $("signupUsername")?.value?.trim() || "";
      const p = $("signupPassword")?.value || "";
      const p2 = $("signupConfirmPassword")?.value || "";
      if (!u || !p) return showError("signupError", "Enter username and password.");
      if (p !== p2) return showError("signupError", "Passwords do not match.");

      try {
        const res = await fetch(`${API_BASE}/api/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        if (!data.ok) return showError("signupError", data.error || "Signup failed");
        alert("Signup successful — please login");
        show("loginPage");
      } catch (err) {
        console.error("signup error:", err);
        showError("signupError", "Network error: " + (err.message || err));
      }
    });

   
    $("profileForm")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const payload = {
        fullName: $("pName")?.value || "",
        email: $("pEmail")?.value || "",
        phone: $("pPhone")?.value || "",
        classYear: $("pClass")?.value || "",
        dob: $("pDob")?.value || "",
        age: $("pAge")?.value || "",
      };
      try {
        await fetch(`${API_BASE}/api/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(payload)
        });
        alert("Profile saved");
      } catch (err) {
        console.error("profile save error:", err);
        alert("Failed to save profile");
      }
    });

     
    $$(".subject-card").forEach(card => {
      card.addEventListener("click", () => {
        const subject = card.dataset.subject || card.textContent.trim();
        if (!isLoggedIn()) return show("loginPage");
        startQuiz(subject);
      });
    });

    
    $("nextBtn")?.addEventListener("click", () => {
      currentQuestion++;
      if (currentQuestion < currentQuiz.length) {
        $("qIndex") && ($("qIndex").textContent = currentQuestion + 1);
        loadQuestion();
      } else {
        finishQuiz();
      }
    });

 
    $("yr") && ($("yr").textContent = new Date().getFullYear());
    $("yr2") && ($("yr2").textContent = new Date().getFullYear());
    $("logoImg") && ($("logoImg").src = "assets/logo.jpg");

    refreshHeaderAuth();
    show("home");
    loadLeaderboard();
  });

})();  








