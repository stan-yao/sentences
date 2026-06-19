// ====================================================================
// 設定區：你只需要修改這裡
// ====================================================================
const CONFIG = {
  // 通行密語：兩人都用同一個密碼進站
  PASSWORD: "1001",

  // 兩個人的名字（會顯示在「我是」按鈕、積分板上）
  NAME_A: "Stan",
  NAME_B: "Eirene",

  // Firebase 設定，從 Firebase 主控台「專案設定」貼過來（教學見 README）
  firebaseConfig:// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB1f4c0-m_uapAqoUhnVIIG5htUs45QVTU",
  authDomain: "sentences-d12f3.firebaseapp.com",
  projectId: "sentences-d12f3",
  storageBucket: "sentences-d12f3.firebasestorage.app",
  messagingSenderId: "117935388501",
  appId: "1:117935388501:web:5aa84e92227dc9dfb2a1dc",
  measurementId: "G-58RS9W2EX0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// ====================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const fbApp = initializeApp(CONFIG.firebaseConfig);
const db = getFirestore(fbApp);
const sentencesCol = collection(db, "sentences");

let allSentences = []; // 本地快取，從 Firestore 同步

// ---------------- 把名字套進畫面 ----------------
document.querySelectorAll('[data-who="A"]').forEach(el => el.textContent = CONFIG.NAME_A);
document.querySelectorAll('[data-who="B"]').forEach(el => el.textContent = CONFIG.NAME_B);
document.getElementById("score-name-A").textContent = CONFIG.NAME_A;
document.getElementById("score-name-B").textContent = CONFIG.NAME_B;

// ---------------- 密碼門 ----------------
const gate = document.getElementById("gate");
const app = document.getElementById("app");

function tryEnter(pw) {
  if (pw === CONFIG.PASSWORD) {
    localStorage.setItem("sentence_site_authed", "1");
    gate.classList.add("hidden");
    app.classList.remove("hidden");
    boot();
  } else {
    document.getElementById("gate-error").textContent = "密語不對喔，再試一次。";
  }
}

document.getElementById("gate-btn").addEventListener("click", () => {
  tryEnter(document.getElementById("gate-input").value);
});
document.getElementById("gate-input").addEventListener("keydown", e => {
  if (e.key === "Enter") tryEnter(e.target.value);
});

if (localStorage.getItem("sentence_site_authed") === "1") {
  gate.classList.add("hidden");
  app.classList.remove("hidden");
  boot();
}

// ---------------- 「我是誰」切換（記住裝置） ----------------
function setWhoUI(who) {
  document.querySelectorAll(".who-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.who === who);
  });
}

function initWhoami() {
  let who = localStorage.getItem("sentence_site_who");
  if (!who) {
    who = "A";
    localStorage.setItem("sentence_site_who", who);
  }
  setWhoUI(who);

  document.querySelectorAll(".who-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      localStorage.setItem("sentence_site_who", btn.dataset.who);
      setWhoUI(btn.dataset.who);
    });
  });
}

function currentWho() {
  return localStorage.getItem("sentence_site_who") || "A";
}

function nameOf(who) {
  return who === "A" ? CONFIG.NAME_A : CONFIG.NAME_B;
}

// ---------------- 啟動：訂閱 Firestore ----------------
let booted = false;
function boot() {
  if (booted) return;
  booted = true;
  initWhoami();

  const q = query(sentencesCol, orderBy("createdAt", "desc"));
  onSnapshot(q, snapshot => {
    allSentences = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderScores();
    renderDaily();
    renderList(document.getElementById("search-input").value);
  });

  document.getElementById("search-input").addEventListener("input", e => {
    renderList(e.target.value);
  });

  document.getElementById("add-btn").addEventListener("click", addSentence);
}

// ---------------- 新增句子 ----------------
async function addSentence() {
  const textEl = document.getElementById("new-text");
  const sourceEl = document.getElementById("new-source");
  const msg = document.getElementById("add-msg");
  const text = textEl.value.trim();
  const source = sourceEl.value.trim();

  if (!text) {
    msg.textContent = "先寫下一句話吧。";
    return;
  }

  msg.textContent = "收進去了……";
  try {
    await addDoc(sentencesCol, {
      text,
      source: source || "",
      addedBy: currentWho(),
      addedByName: nameOf(currentWho()),
      createdAt: serverTimestamp()
    });
    textEl.value = "";
    sourceEl.value = "";
    msg.textContent = "已經收進句子盒了 ✓";
    setTimeout(() => (msg.textContent = ""), 2500);
  } catch (err) {
    console.error(err);
    msg.textContent = "出了點問題，請稍後再試。";
  }
}

// ---------------- 積分 ----------------
function renderScores() {
  const scoreA = allSentences.filter(s => s.addedBy === "A").length;
  const scoreB = allSentences.filter(s => s.addedBy === "B").length;
  document.getElementById("score-num-A").textContent = scoreA;
  document.getElementById("score-num-B").textContent = scoreB;
}

// ---------------- 每日一句（同一天兩人看到一樣的句子） ----------------
function renderDaily() {
  const dateStr = new Date().toLocaleDateString("zh-Hant-TW", {
    year: "numeric", month: "long", day: "numeric"
  });
  document.getElementById("today-date").textContent = dateStr;

  if (allSentences.length === 0) return;

  const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const seed = hashString(todayKey);
  const index = seed % allSentences.length;
  const pick = allSentences[index];

  document.getElementById("daily-sentence").textContent = pick.text;
  document.getElementById("daily-source").textContent =
    [pick.source, pick.addedByName].filter(Boolean).join(" · ");
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ---------------- 搜尋列表 ----------------
function renderList(keyword) {
  const list = document.getElementById("sentence-list");
  const kw = (keyword || "").trim().toLowerCase();

  const filtered = allSentences.filter(s => {
    if (!kw) return true;
    return (
      (s.text || "").toLowerCase().includes(kw) ||
      (s.source || "").toLowerCase().includes(kw) ||
      (s.addedByName || "").toLowerCase().includes(kw)
    );
  });

  if (filtered.length === 0) {
    list.innerHTML = `<p class="empty-hint">${allSentences.length === 0 ? "句子盒還是空的，新增第一句吧。" : "沒有找到符合的句子。"}</p>`;
    return;
  }

  list.innerHTML = filtered.map(s => `
    <div class="sentence-item">
      <p class="text">「${escapeHtml(s.text)}」</p>
      <p class="meta">
        ${s.source ? `<span>${escapeHtml(s.source)}</span>` : ""}
        <span class="tag">${escapeHtml(s.addedByName || "")}</span>
      </p>
    </div>
  `).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
