(function () {
  var app = firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();
  var messagesRef = db.collection("messages");

  var MAX_FILE_BYTES = 600 * 1024; // batas aman di bawah limit dokumen Firestore (1 MiB)

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
  var attachBtn = document.getElementById("attachBtn");
  var fileInput = document.getElementById("fileInput");

  var unsubscribe = null;
  var lastItems = [];
  var editingId = null;

  function fmtTime(ts) {
    if (!ts) return "";
    var d = ts.toDate ? ts.toDate() : new Date(ts);
    var h = d.getHours().toString().padStart(2, "0");
    var m = d.getMinutes().toString().padStart(2, "0");
    return h + ":" + m;
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.innerText = s || "";
    return d.innerHTML;
  }

  function extOf(name) {
    var parts = (name || "").split(".");
    return parts.length > 1 ? parts.pop().toUpperCase() : "FILE";
  }

  function openImageViewer(src) {
    var overlay = document.createElement("div");
    overlay.className = "img-viewer";
    var img = document.createElement("img");
    img.src = src;
    var closeBtn = document.createElement("button");
    closeBtn.className = "img-viewer-close";
    closeBtn.textContent = "✕";
    overlay.appendChild(img);
    overlay.appendChild(closeBtn);
    function close() { overlay.remove(); }
    overlay.addEventListener("click", close);
    closeBtn.addEventListener("click", function (e) { e.stopPropagation(); close(); });
    document.body.appendChild(overlay);
  }

  function render(items) {
    lastItems = items;
    if (items.length === 0) {
      messagesEl.innerHTML = '<div class="empty">Belum ada pesan. Mulai obrolan pertama 👋</div>';
      return;
    }
    messagesEl.innerHTML = "";
    items.forEach(function (item) {
      var data = item.data;
      var id = item.id;
      var isMe = data.user === username;

      var row = document.createElement("div");
      row.className = "row " + (isMe ? "me" : "other");

      var col = document.createElement("div");
      col.style.maxWidth = "78%";

      var bubble = document.createElement("div");
      bubble.className = "bubble";

      if (isMe && editingId === id) {
        // --- mode edit inline ---
        var senderHtml = "";
        var editWrap = document.createElement("div");
        editWrap.innerHTML =
          '<input class="edit-input" value="' + escapeHtml(data.text || "") + '">' +
          '<div class="edit-btns">' +
          '<button class="act-wide cancel">Batal</button>' +
          '<button class="act-wide save">Simpan</button>' +
          '</div>';
        bubble.appendChild(editWrap);
        col.appendChild(bubble);
        row.appendChild(col);
        messagesEl.appendChild(row);

        var editInput = editWrap.querySelector(".edit-input");
        editWrap.querySelector(".cancel").addEventListener("click", function () {
          editingId = null;
          render(lastItems);
        });
        editWrap.querySelector(".save").addEventListener("click", function () { saveEdit(id, editInput.value); });
        editInput.addEventListener("keydown", function (e) {
          if (e.key === "Enter") saveEdit(id, editInput.value);
        });
        editInput.focus();
        return;
      }

      var bodyHtml = "";
      if (!isMe) bodyHtml += '<span class="sender">' + escapeHtml(data.user) + '</span>';
      if (data.text) bodyHtml += '<span class="text">' + escapeHtml(data.text) + '</span>';

      bubble.innerHTML = bodyHtml;

      if (data.fileData) {
        var fileWrap = document.createElement("div");
        fileWrap.className = "file";
        if (data.fileType && data.fileType.indexOf("image/") === 0) {
          var img = document.createElement("img");
          img.className = "file-img";
          img.src = data.fileData;
          img.alt = data.fileName || "gambar";
          img.addEventListener("click", function () { openImageViewer(data.fileData); });
          fileWrap.appendChild(img);
        } else {
          var link = document.createElement("a");
          link.className = "file-link";
          link.href = data.fileData;
          link.download = data.fileName || "file";
          link.innerHTML = "📄 " + escapeHtml(data.fileName || "File") + " <em>" + extOf(data.fileName) + "</em>";
          fileWrap.appendChild(link);
        }
        bubble.appendChild(fileWrap);
      }

      var timeSpan = document.createElement("span");
      timeSpan.className = "time";
      timeSpan.textContent = fmtTime(data.createdAt) + (data.edited ? " · diedit" : "");
      bubble.appendChild(timeSpan);

      col.appendChild(bubble);

      if (isMe) {
        var actions = document.createElement("div");
        actions.className = "actions";
        if (data.text && !data.fileData) {
          var editBtn = document.createElement("button");
          editBtn.className = "act";
          editBtn.textContent = "✏️ Edit";
          editBtn.addEventListener("click", function () { editingId = id; render(lastItems); });
          actions.appendChild(editBtn);
        }
        var delBtn = document.createElement("button");
        delBtn.className = "act";
        delBtn.textContent = "🗑️ Hapus";
        delBtn.addEventListener("click", function () { deleteMessage(id); });
        actions.appendChild(delBtn);
        col.appendChild(actions);
      }

      row.appendChild(col);
      messagesEl.appendChild(row);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function saveEdit(id, newText) {
    newText = newText.trim();
    if (!newText) return;
    messagesRef.doc(id).update({
      text: newText,
      edited: true,
      editedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function (err) {
      console.error(err);
      alert("Gagal menyimpan perubahan.");
    });
    editingId = null;
  }

  function deleteMessage(id) {
    if (!confirm("Hapus pesan ini?")) return;
    messagesRef.doc(id).delete().catch(function (err) {
      console.error(err);
      alert("Gagal menghapus pesan.");
    });
  }

  function subscribe() {
    statusLine.textContent = "masuk sebagai " + username;
    unsubscribe = messagesRef
      .orderBy("createdAt", "asc")
      .limitToLast(200)
      .onSnapshot(
        function (snapshot) {
          var items = snapshot.docs.map(function (d) { return { id: d.id, data: d.data() }; });
          render(items);
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

  // --- Kirim file: karena tidak ada bar preview di HTML ini, file langsung
  // dikirim begitu dipilih. Kalau kotak ketik sedang ada isi teksnya, teks
  // itu dikirim jadi caption bareng filenya.
  attachBtn.addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function () {
    var f = fileInput.files[0];
    fileInput.value = "";
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      alert("File terlalu besar. Maksimal " + Math.round(MAX_FILE_BYTES / 1024) + " KB untuk saat ini.");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var payload = {
        user: username,
        fileData: reader.result,
        fileName: f.name,
        fileType: f.type || "application/octet-stream",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      var caption = msgInput.value.trim();
      if (caption) payload.text = caption;
      messagesRef.add(payload).catch(function (err) {
        console.error(err);
        alert("Gagal mengirim file. Cek koneksi & security rules Firestore.");
      });
      msgInput.value = "";
    };
    reader.readAsDataURL(f);
  });

  sendBtn.addEventListener("click", function () {
    var text = msgInput.value.trim();
    if (!text) return;
    sendBtn.disabled = true;
    messagesRef.add({
      user: username,
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function (err) {
      console.error(err);
      alert("Gagal mengirim pesan. Cek koneksi & security rules Firestore.");
    }).finally(function () {
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