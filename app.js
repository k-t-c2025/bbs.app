// app.js（完成版）
// -----------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  onSnapshot, query, orderBy, deleteDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// --- Firebase 設定（あなたの設定） ---
const firebaseConfig = {
    apiKey: "AIzaSyC10ERewIkpD_ZjQPneF3hWyunEKwBMCAQ",
    authDomain: "keijibann-b44b8.firebaseapp.com",
    projectId: "keijibann-b44b8",
    storageBucket: "keijibann-b44b8.appspot.com",
    messagingSenderId: "267259675864",
    appId: "1:267259675864:web:971536e4f188051db5c3ad",
    measurementId: "G-WW1ZETJDN8"
};

// ---- Firebase 初期化 ----
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// HTML 要素
const nameInput = document.getElementById("name");
const textInput = document.getElementById("text");
const sendBtn = document.getElementById("send");
const postsDiv = document.getElementById("posts");

// ---- 投稿（メイン投稿） ----
sendBtn.addEventListener("click", async () => {
  const name = (nameInput.value || "名無し").trim();
  const text = (textInput.value || "").trim();
  if (!text) return;

  try {
    await addDoc(collection(db, "posts"), {
      name,
      text,
      createdAt: serverTimestamp()
    });
    textInput.value = "";
  } catch (err) {
    console.error("投稿エラー:", err);
  }
});

// ---- リアルタイムで投稿取得 ----
const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

onSnapshot(q, (snapshot) => {
  postsDiv.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    // 時間表示
    let timeText = "日時なし";
    if (data.createdAt?.toDate) {
      timeText = data.createdAt.toDate().toLocaleString("ja-JP");
    }

    // 投稿カード
    const card = document.createElement("div");
    card.className = "post";

    card.innerHTML = `
      <div class="name">${escapeHtml(data.name)}</div>
      <div class="time">${escapeHtml(timeText)}</div>
      <div class="text">${escapeHtml(data.text).replace(/\n/g, "<br>")}</div>
    `;

    // --- 削除ボタン ---
    const delBtn = document.createElement("button");
    delBtn.className = "deleteBtn";
    delBtn.textContent = "削除";
    delBtn.onclick = async () => {
      if (!confirm("削除しますか？")) return;
      await deleteDoc(doc(db, "posts", docSnap.id));
    };
    card.appendChild(delBtn);

    // --- 返信フォーム表示ボタン ---
    const replyBtn = document.createElement("button");
    replyBtn.className = "replyBtn";
    replyBtn.textContent = "返信";
    card.appendChild(replyBtn);

    // --- 返信入力ボックス ---
    const replyBox = document.createElement("div");
    replyBox.className = "replyBox hidden";
    replyBox.innerHTML = `
      <input class="replyName" placeholder="名前">
      <textarea class="replyText" placeholder="返信内容"></textarea>
      <button class="replySend">送信</button>
    `;
    card.appendChild(replyBox);

    // 返信フォーム開閉
    replyBtn.addEventListener("click", () => {
      replyBox.classList.toggle("hidden");
    });

    // 返信送信
    replyBox.querySelector(".replySend").addEventListener("click", async () => {
      const replyName = replyBox.querySelector(".replyName").value || "名無し";
      const replyText = replyBox.querySelector(".replyText").value;
      if (!replyText.trim()) return;

      await addDoc(collection(db, "posts", docSnap.id, "replies"), {
        name: replyName,
        text: replyText,
        createdAt: serverTimestamp()
      });

      replyBox.querySelector(".replyText").value = "";
    });

    // --- 返信リスト ---
    const repliesDiv = document.createElement("div");
    repliesDiv.className = "replies";
    card.appendChild(repliesDiv);

    // replies をリアルタイム取得
    const rq = query(
      collection(db, "posts", docSnap.id, "replies"),
      orderBy("createdAt", "asc")
    );

    onSnapshot(rq, (replySnap) => {
      repliesDiv.innerHTML = "";

      replySnap.forEach((r) => {
        const rd = r.data();
        let rtime = rd.createdAt?.toDate
          ? rd.createdAt.toDate().toLocaleString("ja-JP")
          : "日時なし";

        repliesDiv.innerHTML += `
          <div class="reply">
            <div class="replyName">${escapeHtml(rd.name)}</div>
            <div class="replyTime">${escapeHtml(rtime)}</div>
            <div class="replyText">${escapeHtml(rd.text).replace(/\n/g, "<br>")}</div>
          </div>
        `;
      });
    });

    postsDiv.appendChild(card);
  });
});

// ---- HTML エスケープ ----
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
