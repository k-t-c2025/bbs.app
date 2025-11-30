// Firebase読み込み
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, collection, addDoc, serverTimestamp,
  onSnapshot, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase設定
const firebaseConfig = {
  apiKey: "XXXX",
  authDomain: "XXXX.firebaseapp.com",
  projectId: "XXXX",
  storageBucket: "XXXX.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};

// 初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// HTML要素
const text = document.getElementById("text");
const nameInput = document.getElementById("name");
const posts = document.getElementById("posts");
const send = document.getElementById("send");

// 送信
send.onclick = async () => {
  if (!text.value.trim()) return;

  await addDoc(collection(db, "posts"), {
    name: nameInput.value || "名無し",
    text: text.value,
    time: serverTimestamp()
  });

  text.value = "";
};

// リアルタイム取得
const q = query(collection(db, "posts"), orderBy("time", "desc"));

onSnapshot(q, (snapshot) => {
  posts.innerHTML = "";
  snapshot.forEach((doc) => {
    const data = doc.data();
    const time = data.time?.toDate
      ? data.time.toDate().toLocaleString()
      : "日時取得中…";

    const div = document.createElement("div");
    div.className = "post";
    div.innerHTML = `
      <div class="name">${data.name}</div>
      <div class="time">${time}</div>
      <div class="text">${data.text}</div>
    `;
    posts.appendChild(div);
  });
});
