// -----------------------------------------------------------
// Firebase 初期化
// -----------------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, onSnapshot,
  query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// ★ あなたの Firebase 設定を必ず貼る
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const postsCol = collection(db, "posts");

// -----------------------------------------------------------
// DOM 取得
// -----------------------------------------------------------
const nameInput = document.getElementById("name");
const textInput = document.getElementById("text");
const imageInput = document.getElementById("image");
const sendBtn = document.getElementById("send");

const yearArea = document.getElementById("yearTags");
const monthArea = document.getElementById("monthTags");
const dayArea = document.getElementById("dayTags");
const postsArea = document.getElementById("posts");

const badge = document.getElementById("badge");

let allPosts = [];
let blinkTimer = null;

// -----------------------------------------------------------
// 画像アップロード（Storage）
// -----------------------------------------------------------
async function uploadImage(file) {
  if (!file) return "";
  const storageRef = ref(storage, "images/" + Date.now() + "_" + file.name);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

// -----------------------------------------------------------
// 投稿（画像付き）
// -----------------------------------------------------------
sendBtn.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const text = textInput.value.trim();
  const file = imageInput.files[0];

  if (!name || !text) {
    alert("名前と内容を入力してください");
    return;
  }

  let imageUrl = "";
  if (file) {
    imageUrl = await uploadImage(file);
  }

  await addDoc(postsCol, {
    name,
    text,
    imageUrl,
    parentId: null,
    createdAt: serverTimestamp()
  });

  textInput.value = "";
  imageInput.value = "";
});

// -----------------------------------------------------------
// 返信投稿
// -----------------------------------------------------------
async function sendReply(parentId, replyName, replyText) {
  await addDoc(postsCol, {
    name: replyName,
    text: replyText,
    imageUrl: "",
    parentId,
    createdAt: serverTimestamp()
  });
}

// -----------------------------------------------------------
// 未読判定（7日以内）
// -----------------------------------------------------------
function isUnread(ts) {
  if (!ts || typeof ts.toDate !== "function") return false;
  const diff = Date.now() - ts.toDate().getTime();
  return diff < 7 * 24 * 60 * 60 * 1000; // 7日
}

// -----------------------------------------------------------
// バッジ更新 & タイトル点滅
// -----------------------------------------------------------
function updateBadge(posts) {
  const unreadCount = posts.filter(p => isUnread(p.createdAt)).length;

  if (unreadCount > 0) {
    badge.style.display = "inline-block";
    badge.textContent = unreadCount;

    if (!blinkTimer) {
      blinkTimer = setInterval(() => {
        document.title = document.title.includes("★")
          ? "掲示板"
          : "★新着あり★ 掲示板";
      }, 900);
    }
  } else {
    badge.style.display = "none";
    clearInterval(blinkTimer);
    blinkTimer = null;
    document.title = "掲示板";
  }
}

// -----------------------------------------------------------
// 投稿リスト表示（親 → 返信）
// -----------------------------------------------------------
function renderPosts(posts) {
  postsArea.innerHTML = "";

  const rootPosts = posts.filter(p => !p.parentId);
  const replyPosts = posts.filter(p => p.parentId);

  rootPosts.forEach(post => {
    const div = document.createElement("div");
    div.className = isUnread(post.createdAt) ? "post unread" : "post";

    const dateStr = post.createdAt.toDate().toLocaleString();

    div.innerHTML = `
      <b>${post.name}</b> (${dateStr})<br>
      <div class="post-text">${post.text}</div>
      ${post.imageUrl ? `<img src="${post.imageUrl}" class="post-image">` : ""}
      <br>
      <button class="replyBtn">返信</button>

      <div class="replyForm" style="display:none; margin:5px 0 10px;">
        <input type="text" class="replyName" placeholder="名前"><br>
        <textarea class="replyText" rows="3" cols="20" placeholder="返信内容"></textarea><br>
        <button class="sendReplyBtn">返信送信</button>
      </div>
    `;

    // 返信ボタン
    const replyBtn = div.querySelector(".replyBtn");
    const replyForm = div.querySelector(".replyForm");

    replyBtn.addEventListener("click", () => {
      replyForm.style.display =
        replyForm.style.display === "none" ? "block" : "none";
    });

    div.querySelector(".sendReplyBtn").addEventListener("click", () => {
      const replyName = div.querySelector(".replyName").value.trim();
      const replyText = div.querySelector(".replyText").value.trim();

      if (!replyName || !replyText) {
        alert("返信の名前と内容を入力してください");
        return;
      }

      sendReply(post.id, replyName, replyText);
      replyForm.style.display = "none";
      div.querySelector(".replyName").value = "";
      div.querySelector(".replyText").value = "";
    });

    postsArea.appendChild(div);

    // ▼ 返信追加
    replyPosts
      .filter(r => r.parentId === post.id)
      .forEach(r => {
        const rdiv = document.createElement("div");
        rdiv.className = isUnread(r.createdAt) ? "reply unread" : "reply";
        rdiv.style.marginLeft = "20px";

        const rdate = r.createdAt.toDate().toLocaleString();

        rdiv.innerHTML = `
          <b>${r.name}</b> (${rdate})<br>
          <div>${r.text}</div>
        `;

        postsArea.appendChild(rdiv);
      });
  });
}

// -----------------------------------------------------------
// 年 → 月 → 日 のツリー作成
// -----------------------------------------------------------
function renderDateTree(posts) {
  yearArea.innerHTML = "";
  monthArea.innerHTML = "";
  dayArea.innerHTML = "";

  const map = {};

  posts.forEach(p => {
    if (!p.createdAt) return;

    const d = p.createdAt.toDate();

    const y = d.getFullYear();
    const m = ("0" + (d.getMonth() + 1)).slice(-2);
    const mkey = `${y}-${m}`;
    const dkey = `${mkey}-${("0" + d.getDate()).slice(-2)}`;

    if (!map[y]) map[y] = {};
    if (!map[y][mkey]) map[y][mkey] = new Set();
    map[y][mkey].add(dkey);
  });

  // 年タグ
  Object.keys(map).forEach(year => {
    const yBtn = document.createElement("button");
    yBtn.className = "year-btn";
    yBtn.textContent = year;

    yBtn.onclick = () => {
      monthArea.innerHTML = "";
      dayArea.innerHTML = "";
      Object.keys(map[year]).forEach(month => {
        const mBtn = document.createElement("button");
        mBtn.className = "month-btn";
        mBtn.textContent = month;
        mBtn.onclick = () => renderDays(map[year][month]);
        monthArea.appendChild(mBtn);
      });
    };

    yearArea.appendChild(yBtn);
  });
}

// 日タグ
function renderDays(daySet) {
  dayArea.innerHTML = "";

  [...daySet].sort().forEach(dayStr => {
    const dBtn = document.createElement("button");
    dBtn.className = "day-btn";
    dBtn.textContent = dayStr;

    dBtn.onclick = () => {
      const filtered = allPosts.filter(p => {
        if (!p.createdAt) return false;
        const d = p.createdAt.toDate();
        const key = `${d.getFullYear()}-${("0"+(d.getMonth()+1)).slice(-2)}-${("0"+d.getDate()).slice(-2)}`;
        return key === dayStr;
      });

      renderPosts(filtered);
    };

    dayArea.appendChild(dBtn);
  });
}

// -----------------------------------------------------------
// Firestore リアルタイム監視
// -----------------------------------------------------------
const q = query(postsCol, orderBy("createdAt", "asc"));

onSnapshot(q, (snap) => {
  allPosts = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  updateBadge(allPosts);     // 未読バッジ
  renderDateTree(allPosts);  // 年 → 月 → 日ツリー
});
