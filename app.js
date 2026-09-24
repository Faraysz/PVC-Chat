(function () {
  var app = firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();
  var messagesRef = db.collection("messages");

  var SESSION_KEY = "teamchat_username";
  var username = null;
  try { username = sessionStorage.getItem(SESSION_KEY); } catch (e) {}

  var loginEl = document.getElementById("login");
  var chatEl = document.getElementById("chat");
  var nameInput = document.getElementById("nameInput");
  var joinBtn = document.getElementById("joinBtn");
  var loginError = document.getElementById("loginError");
  var messagesEl = document.getElementById("messages");
  var msgInput = document.getElementById("msgInput");
  var sendBtn = document.getElementById("sendBtn");
  var statusLine = document.getElementById("statusLine");
  var leaveBtn = document.getElementById("leaveBtn");

  var unsubscribe = null;

  function fmtTime(ts) {
    if (!ts) return "";
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var h = d.getHours().toString().padStart(2, "0");
    var m = d.getMinutes().toString().padStart(2, "0");
    return h + ":" + m;
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.innerText = s;
    return d.innerHTML;
  }

  function renderMessages(docs) {
    if (docs.length === 0) {
      messagesEl.innerHTML = '<div class="empty">Belum ada pesan. Mulai obrolan pertama 👋</div>';
      return;
    }
    messagesEl.innerHTML = "";
    docs.forEach(function (data) {
      var row = document.createElement("div");
      row.className = "row " + (data.user === username ? "me" : "other");
      var bubble = document.createElement("div");
      bubble.className = "bubble";
      var senderHtml = data.user === username ? "" : '<span class="sender">' + escapeHtml(data.user) + '</span>';
      bubble.innerHTML = senderHtml + escapeHtml(data.text) + '<span class="time">' + fmtTime(data.createdAt) + '</span>';
      row.appendChild(bubble);
      messagesEl.appendChild(row);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function subscribe() {
    statusLine.textContent = "masuk sebagai " + username;
    unsubscribe = messagesRef
      .orderBy("createdAt", "asc")
      .limitToLast(200)
      .onSnapshot(
        function (snapshot) {
          var docs = snapshot.docs.map(function (d) { return d.data(); });
          renderMessages(docs);
        },
        function (err) {
          console.error(err);
          statusLine.textContent = "gagal terhubung — cek firebase-config.js & security rules";
        }
      );
  }

  function startChat(name) {
    username = name;
    try { sessionStorage.setItem(SESSION_KEY, name); } catch (e) {}
    loginEl.style.display = "none";
    chatEl.style.display = "flex";
    subscribe();
    msgInput.focus();
  }

  function leaveChat() {
    if (unsubscribe) unsubscribe();
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    username = null;
    chatEl.style.display = "none";
    loginEl.style.display = "flex";
    nameInput.value = "";
    nameInput.focus();
  }

  joinBtn.addEventListener("click", function () {
    var v = nameInput.value.trim();
    if (!v) {
      loginError.textContent = "Isi nama dulu ya.";
      return;
    }
    loginError.textContent = "";
    startChat(v);
  });
  nameInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") joinBtn.click();
  });
  leaveBtn.addEventListener("click", leaveChat);

  sendBtn.addEventListener("click", function () {
    var v = msgInput.value.trim();
    if (!v) return;
    sendBtn.disabled = true;
    messagesRef
      .add({
        user: username,
        text: v,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      })
      .catch(function (err) {
        console.error(err);
        alert("Gagal mengirim pesan. Cek koneksi & security rules Firestore.");
      })
      .finally(function () {
        sendBtn.disabled = false;
      });
    msgInput.value = "";
    msgInput.focus();
  });
  msgInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") sendBtn.click();
  });

  if (username) startChat(username);
  else nameInput.focus();
})();
