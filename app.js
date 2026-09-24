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
  var previewBar = document.getElementById("previewBar");
  var previewContent = document.getElementById("previewContent");
  var removePreviewBtn = document.getElementById("removePreviewBtn");

  var unsubscribe = null;
  var lastItems = [];
  var editingId = null;
  var pendingFile = null; // { name, type, size, dataUrl }

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

  function fmtSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  var DOC_COLORS = {
    PDF: "#E5484D",
    DOC: "#2F6FED", DOCX: "#2F6FED",
    XLS: "#1F9D55", XLSX: "#1F9D55", CSV: "#1F9D55",
    PPT: "#E86A33", PPTX: "#E86A33",
    ZIP: "#6B7280", RAR: "#6B7280", "7Z": "#6B7280",
    MP3: "#8B5CF6", WAV: "#8B5CF6",
    MP4: "#EC4899", MOV: "#EC4899"
  };
  function docColor(ext) { return DOC_COLORS[ext] || "#6B7A74"; }

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
      col.className = "msg-col";

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
          var ext = extOf(data.fileName);
          var link = document.createElement("a");
          link.className = "file-doc";
          link.href = data.fileData;
          link.download = data.fileName || "file";
          link.innerHTML =
            '<span class="file-doc-icon" style="background:' + docColor(ext) + '">' + ext + '</span>' +
            '<span class="file-doc-info">' +
            '<span class="file-doc-name">' + escapeHtml(data.fileName || "File") + '</span>' +
            '<span class="file-doc-size">' + fmtSize(data.fileSize) + '</span>' +
            '</span>' +
            '<span class="file-doc-dl">⬇</span>';
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
    var firstSnapshot = true;
    unsubscribe = messagesRef
      .orderBy("createdAt", "asc")
      .limitToLast(200)
      .onSnapshot(
        function (snapshot) {
          var items = snapshot.docs.map(function (d) { return { id: d.id, data: d.data() }; });
          render(items);

          if (!firstSnapshot) {
            snapshot.docChanges().forEach(function (change) {
              if (change.type === "added") notifyNewMessage(change.doc.data());
            });
          }
          firstSnapshot = false;
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
    requestNotifyPermission();
    subscribe();
    msgInput.focus();
  }

  // --- Notifikasi browser (aktif selama tab/browser masih terbuka) ---
  function requestNotifyPermission() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  function notifyNewMessage(data) {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (data.user === username) return;
    // jangan ganggu kalau tab ini sedang aktif dilihat
    if (!document.hidden && document.hasFocus()) return;

    var body = data.text
      ? data.text
      : (data.fileData ? "Mengirim file: " + (data.fileName || "file") : "Pesan baru");

    var notif;
    try {
      notif = new Notification(data.user, { body: body, icon: "pvc-team-logo.png" });
    } catch (e) {
      return;
    }
    notif.onclick = function () {
      window.focus();
      notif.close();
    };
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

  // --- Pilih file: tampilkan preview dulu (mirip WA), belum langsung terkirim ---
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
      pendingFile = { name: f.name, type: f.type || "application/octet-stream", size: f.size, dataUrl: reader.result };
      showPreview();
    };
    reader.readAsDataURL(f);
  });

  function showPreview() {
    previewContent.innerHTML = "";
    if (pendingFile.type.indexOf("image/") === 0) {
      var img = document.createElement("img");
      img.className = "preview-img";
      img.src = pendingFile.dataUrl;
      previewContent.appendChild(img);
    } else {
      var ext = extOf(pendingFile.name);
      var iconWrap = document.createElement("div");
      iconWrap.style.display = "flex";
      iconWrap.style.alignItems = "center";
      iconWrap.style.gap = "10px";
      iconWrap.style.flex = "1";
      iconWrap.style.minWidth = "0";
      iconWrap.innerHTML =
        '<span class="preview-doc-icon" style="background:' + docColor(ext) + '">' + ext + '</span>' +
        '<span class="preview-info">' +
        '<span class="preview-name">' + escapeHtml(pendingFile.name) + '</span>' +
        '<span class="preview-size">' + fmtSize(pendingFile.size) + '</span>' +
        '</span>';
      previewContent.appendChild(iconWrap);
    }
    previewBar.style.display = "flex";
    msgInput.placeholder = "Tambahkan keterangan (opsional)…";
    msgInput.focus();
  }

  function clearPreview() {
    pendingFile = null;
    previewBar.style.display = "none";
    previewContent.innerHTML = "";
    msgInput.placeholder = "Ketik pesan…";
  }
  removePreviewBtn.addEventListener("click", clearPreview);

  sendBtn.addEventListener("click", function () {
    var text = msgInput.value.trim();
    if (!text && !pendingFile) return;

    var payload = {
      user: username,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (text) payload.text = text;
    if (pendingFile) {
      payload.fileData = pendingFile.dataUrl;
      payload.fileName = pendingFile.name;
      payload.fileType = pendingFile.type;
      payload.fileSize = pendingFile.size;
    }

    sendBtn.disabled = true;
    messagesRef.add(payload).catch(function (err) {
      console.error(err);
      alert("Gagal mengirim pesan. Cek koneksi & security rules Firestore.");
    }).finally(function () {
      sendBtn.disabled = false;
    });

    msgInput.value = "";
    clearPreview();
    msgInput.focus();
  });
  msgInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") sendBtn.click();
  });

  if (username) startChat(username);
  else nameInput.focus();
})();