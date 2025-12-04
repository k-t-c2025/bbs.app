import {
  getFirestore, collection, addDoc, serverTimestamp,
  onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Firestore / Storage
const db = getFirestore();
const storage = getStorage();

const postsCol = collection(db, "posts");

// ---------------------------
// 投稿処理
// ---------------------------
document.getElementById("send").addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const text = document.getElementById("text").value.trim();
  const imageFile = document.getElementById("image").files[0];

  if (!name || !text) {
    alert("名前と内容を入力してください");
    return;
  }

  let imageUrl = null;

  // --- Firebase Storage へ画像をアップ ---
  if (imageFile) {
    const storageRef = ref(storage, "images/" + Date.now() + "_" + imageFile.name);
    await uploadBytes(storageRef, imageFile);
    imageUrl = await getDownloadURL(storageRef);
  }

  // Firestore へ書き込み
  await addDoc(postsCol, {
    name,
    text,
    imageUrl,
    parentId: null,   // 通常投稿
    createdAt: serverTimestamp()
  });

  document.getElementById("text").value = "";
  document.getElementById("image").value = "";
});

// ---------------------------
// 返信投稿
// ---------------------------
async function sendReply(parentId, replyText, replyName) {
  await addDoc(postsCol, {
    name: replyName,
    text: replyText,
    imageUrl: null,
    parentId,
    createdAt: serverTimestamp()
  });
}

// ---------------------------
// 投稿一覧リアルタイム取得
// ---------------------------
const q = query(postsCol, orderBy("createdAt", "asc"));

onSnapshot(q, (snapshot) => {
  const posts = [];
  snapshot.forEach((doc) => {
    posts.push({ id: doc.id, ...doc.data() });
  });

  renderPosts(posts);
  updateBadge(posts);
});

// ---------------------------
// 投稿レンダリング（返信ツリー）
// ---------------------------
function renderPosts(posts) {
  const container = document.getElementById("posts");
  container.innerHTML = "";

  const roots = posts.filter(p => !p.parentId);
  const replies = posts.filter(p => p.parentId);

  roots.forEach(root => {
    const card = createPostCard(root);
    container.appendChild(card);

    // 子（返信）
    const childList = replies.filter(r => r.parentId === root.id);

    childList.forEach(reply => {
      const replyCard = createPostCard(reply, true);
      container.appendChild(replyCard);
    });
  });
}

// ---------------------------
// 未読管理（7日保持）
// ---------------------------
function isUnread(post) {
  if (!post.createdAt) return false;

  const now = Date.now();
  const t = post.createdAt.toDate().getTime();
  const diff = now - t;

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return diff < sevenDays;
}

// ---------------------------
// バッジ更新 & タイトル点滅
// ---------------------------
let blinkTimer = null;

function updateBadge(posts) {
  const unreadCount = posts.filter(isUnread).length;
  const badge = document.getElementById("badge");

  if (unreadCount > 0) {
    badge.style.display = "inline-block";
    badge.textContent = unreadCount;

    startBlink();
  } else {
    badge.style.display = "none";
    stopBlink();
  }
}

function startBlink() {
  if (blinkTimer) return;

  blinkTimer = setInterval(() => {
    document.title =
      document.title.includes("★") ? "掲示板" : "★新着あり★ 掲示板";
  }, 900);
}

function stopBlink() {
  clearInterval(blinkTimer);
  blinkTimer = null;
  document.title = "掲示板";
}

// ---------------------------
// 投稿カード（返信ボタンつき）
// ---------------------------
function createPostCard(post, isReply = false) {
  const div = document.createElement("div");
  div.className = "post";

  if (isUnread(post)) {
    div.classList.add("unread");
  }

  div.style.marginLeft = isReply ? "20px" : "0px";

  const date = post.createdAt
    ? post.createdAt.toDate().toLocaleString()
    : "日時なし";

  div.innerHTML = `
    <b>${post.name}</b>（${date}）<br>
    <div class="post-text">${post.text}</div>
    ${post.imageUrl ? `<img src="${post.imageUrl}" style="max-width:200px;">` : ""}
    <br>
    <button class="replyBtn">返信</button>
    <div class="replyForm" style="display:none; margin-top:6px;">
      <input type="text" class="replyName" placeholder="名前"><br>
      <textarea class="replyText" rows="3" cols="20" placeholder="返信内容"></textarea><br>
      <button class="sendReply">返信を送信</button>
    </div>
  `;

  // ▼ 返信ボタン動作
  const replyBtn = div.querySelector(".replyBtn");
  const replyForm = div.querySelector(".replyForm");

  replyBtn.addEventListener("click", () => {
    replyForm.style.display = replyForm.style.display === "none" ? "block" : "none";
  });

  // ▼ 返信送信
  div.querySelector(".sendReply").addEventListener("click", () => {
    const replyName = div.querySelector(".replyName").value.trim();
    const replyText = div.querySelector(".replyText").value.trim();

    if (!replyName || !replyText) {
      alert("返信の名前・内容を入力してください");
      return;
    }

    sendReply(post.id, replyText, replyName);

    replyForm.style.display = "none";
    div.querySelector(".replyName").value = "";
    div.querySelector(".replyText").value = "";
  });

  return div;
}
