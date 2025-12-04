// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  onSnapshot, query, orderBy, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyC10ERewIkpD_ZjQPneF3hWyunEKwBMCAQ",
  authDomain: "keijibann-b44b8.firebaseapp.com",
  projectId: "keijibann-b44b8",
  storageBucket: "keijibann-b44b8.appspot.com",
  messagingSenderId: "267259675864",
  appId: "1:267259675864:web:971536e4f188051db5c3ad",
  measurementId: "G-WW1ZETJDN8"
};

// 初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// HTML要素
const nameInput = document.getElementById("name");
const textInput = document.getElementById("text");
const sendBtn = document.getElementById("send");
const postsDiv = document.getElementById("posts");

// --- 新規投稿 ---
sendBtn.addEventListener("click", async () => {
  const name = (nameInput.value || "名無し").trim();
  const text = (textInput.value || "").trim();
  if (!text) return;

  await addDoc(collection(db, "posts"), {
    name,
    text,
    createdAt: serverTimestamp()
  });

  textInput.value = "";
});

// --- Firestore からリアルタイム取得 ---
const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  postsDiv.innerHTML = "";

  // 大分類を作る { "2025-11": { "2025-11-30": [投稿,...], ... } }
  const groups = {};

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data.createdAt?.toDate) return;

    const date = data.createdAt.toDate();
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();

    const ymKey = `${y}-${m}`;
    const ymdKey = `${y}-${m}-${d}`;

    if (!groups[ymKey]) groups[ymKey] = {};
    if (!groups[ymKey][ymdKey]) groups[ymKey][ymdKey] = [];

    groups[ymKey][ymdKey].push({ id: docSnap.id, ...data });
  });

  // --- 月一覧を生成 ---
  for (const ym in groups) {
    const [year, month] = ym.split("-");

    // 月タイトル
    const monthDiv = document.createElement("div");
    monthDiv.className = "month";
    monthDiv.textContent = `${year}年 ${month}月`;
    monthDiv.style.cursor = "pointer";

    // 月クリック → 日ブロックの表示切り替え
    monthDiv.addEventListener("click", () => {
      dayBox.style.display =
        dayBox.style.display === "none" ? "block" : "none";
    });

    postsDiv.appendChild(monthDiv);

    // 日一覧を格納する div
    const dayBox = document.createElement("div");
    dayBox.className = "day-box";
    dayBox.style.display = "none";
    dayBox.style.marginLeft = "20px";

    postsDiv.appendChild(dayBox);

    // --- 日一覧を生成 ---
    for (const ymd in groups[ym]) {
      const [, , day] = ymd.split("-");

      const dayDiv = document.createElement("div");
      dayDiv.className = "day";
      dayDiv.textContent = `${day}日`;
      dayDiv.style.cursor = "pointer";
      dayDiv.style.marginBottom = "4px";

      // クリックで投稿一覧を開閉
      const postBox = document.createElement("div");
      postBox.className = "post-box";
      postBox.style.display = "none";
      postBox.style.marginLeft = "20px";

      dayDiv.addEventListener("click", () => {
        postBox.style.display =
          postBox.style.display === "none" ? "block" : "none";
      });

      dayBox.appendChild(dayDiv);
      dayBox.appendChild(postBox);

      // --- 投稿を追加 ---
      groups[ym][ymd].forEach((post) => {
        const card = document.createElement("div");
        card.className = "post";
        const timeText = post.createdAt.toDate().toLocaleString("ja-JP");

        card.innerHTML = `
          <div class="name">${escapeHtml(post.name)}</div>
          <div class="time">${escapeHtml(timeText)}</div>
          <div class="text">${escapeHtml(post.text).replace(/\n/g, "<br>")}</div>
          <button class="deleteBtn" data-id="${post.id}">削除</button>
          <button class="reply-btn">返信</button>

          <div class="reply-form">
            <input type="text" class="reply-name" placeholder="返信者名">
            <textarea class="reply-text" rows="3" placeholder="返信内容"></textarea>
            <button class="reply-send">返信する</button>
          </div>
        `;

        postBox.appendChild(card);
      });
    }
  }
});


// --- 削除処理（イベントデリゲーション） ---
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("deleteBtn")) {
    const id = e.target.dataset.id;

    if (!confirm("この投稿を削除しますか？")) return;

    await deleteDoc(doc(getFirestore(), "posts", id));
  }
});

// --- 返信フォームの表示切り替え ---
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("reply-btn")) {
    const form = e.target.nextElementSibling;
    form.style.display = form.style.display === "block" ? "none" : "block";
  }
});

// ==== 設定 ====
// バッジと点滅を保持する期間（ミリ秒）→ 7日
const HOLD_DURATION = 7 * 24 * 60 * 60 * 1000; 

// 保存キー
const STORAGE_KEY = "lastPostTime";

// ----------------------------------
// タイトル点滅
// ----------------------------------
let blinkInterval;
let isBlinking = false;

function startTitleBlink(message = "🔔 新着あり!") {
    if (isBlinking) return;
    isBlinking = true;

    const originalTitle = document.title;
    let flag = false;

    blinkInterval = setInterval(() => {
        document.title = flag ? message : originalTitle;
        flag = !flag;
    }, 800);
}

function stopTitleBlink() {
    clearInterval(blinkInterval);
    isBlinking = false;
    document.title = "掲示板";
}

// ----------------------------------
// バッジ表示
// ----------------------------------
function updateBadge(count) {
    const badge = document.getElementById("badge");
    if (count > 0) {
        badge.style.display = "inline-block";
        badge.textContent = count;
    } else {
        badge.style.display = "none";
    }
}

// ----------------------------------
// 新着があった瞬間に呼ぶ関数
// ----------------------------------
function onNewPost() {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, now);

    updateBadge(1);
    startTitleBlink();
}

// ----------------------------------
// ページ表示時に実行 → 7日以内なら通知維持
// ----------------------------------
function checkNotificationStatus() {
    const lastPost = localStorage.getItem(STORAGE_KEY);
    if (!lastPost) return;

    const now = Date.now();
    const diff = now - Number(lastPost);

    if (diff < HOLD_DURATION) {
        // 7日以内 → 通知を維持
        updateBadge(1);
        startTitleBlink();
    } else {
        // 7日経過 → 自動消去
        onUserViewed();
    }
}

// ----------------------------------
// ユーザーが確認したとき（掲示板開くなど）
function onUserViewed() {
    updateBadge(0);
    stopTitleBlink();
    localStorage.removeItem(STORAGE_KEY);
}

// ----------------------------------
// ページ読み込み時に自動チェック
window.onload = checkNotificationStatus;


// HTMLエスケープ
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
