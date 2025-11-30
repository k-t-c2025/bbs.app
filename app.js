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

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const postId = docSnap.id;

    const card = document.createElement("div");
    card.className = "post";

    // 日時整形
    let timeText = "日時なし";
    if (data.createdAt?.toDate) {
      timeText = data.createdAt.toDate().toLocaleString("ja-JP");
    }

    // 投稿カード
    card.innerHTML = `
      <div class="name">${escapeHtml(data.name || "名無し")}</div>
      <div class="time">${escapeHtml(timeText)}</div>
      <div class="text">${escapeHtml(data.text || "").replace(/\n/g, "<br>")}</div>

      <!-- 削除ボタン -->
      <button class="deleteBtn" data-id="${postId}">削除</button>

      <!-- 返信ボタン -->
      <button class="reply-btn">返信</button>

      <!-- 最初は非表示の返信フォーム -->
      <div class="reply-form">
        <input type="text" class="reply-name" placeholder="返信者名">
        <textarea class="reply-text" rows="3" placeholder="返信内容"></textarea>
        <button class="reply-send">返信する</button>
      </div>
    `;

    postsDiv.appendChild(card);
  });
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

// HTMLエスケープ
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
