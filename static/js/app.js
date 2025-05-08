document.addEventListener("DOMContentLoaded", () => {
    const loginDiv = document.getElementById("login");
    const chatDiv = document.getElementById("chat");
    const usernameInput = document.getElementById("usernameInput");
    const loginBtn = document.getElementById("loginBtn");
    const usersList = document.getElementById("usersList");
    const messagesDiv = document.getElementById("messages");
    const chatWithHeader = document.getElementById("chatWith");
    const messageInput = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");

    let ws, currentChat = null;
    const savedName = localStorage.getItem('username');

    function showLogin() {
        loginDiv.classList.remove('hidden');
        chatDiv.classList.add('hidden');
    }
    function showChat() {
        loginDiv.classList.add('hidden');
        chatDiv.classList.remove('hidden');
    }

    function connect(name) {
        ws = new WebSocket(`ws://${window.location.host}/ws/${encodeURIComponent(name)}`);
        ws.onopen = () => console.log("WebSocket: соединение установлено");
        ws.onmessage = e => {
            const msg = JSON.parse(e.data);
            if (msg.type === "users") {
                renderUsers(msg.users);
            } else if (msg.type === "message") {
                if (msg.from === currentChat) {
                    appendMessage(msg.from, msg.message);
                }
            } else if (msg.type === "history") {
                if (msg.with === currentChat) {
                    messagesDiv.innerHTML = '';
                    if (msg.history.length === 0) {
                        messagesDiv.innerHTML = '<div class="empty">Нет сообщений</div>';
                    } else {
                        msg.history.forEach(m => appendMessage(m.sender, m.content, m.sender === savedName));
                    }
                }
            } else if (msg.type === "error") {
                alert(`Ошибка: ${msg.message}`);
            }
        };
        ws.onclose = () => {
            console.log("WebSocket: соединение закрыто");
            usersList.innerHTML = '<li class="empty">Отключено</li>';
        };
    }

    function renderUsers(list) {
        usersList.innerHTML = '';
        if (list.length <= 1) {
            usersList.innerHTML = '<li class="empty">Пользователей нет</li>';
            return;
        }
        list.filter(u => u !== savedName).forEach(u => {
            const li = document.createElement('li');
            li.textContent = u;
            li.onclick = () => selectUser(u);
            if (u === currentChat) li.classList.add('selected');
            usersList.appendChild(li);
        });
    }

    function selectUser(user) {
        currentChat = user;
        chatWithHeader.textContent = `Чат с ${user}`;
        messageInput.disabled = false;
        sendBtn.disabled = false;
        Array.from(usersList.children).forEach(li => {
            li.classList.toggle('selected', li.textContent === user);
        });
        ws.send(JSON.stringify({ type: 'history', with: user }));
    }

    function appendMessage(sender, text, own = false) {
        const div = document.createElement('div');
        div.textContent = `${sender}: ${text}`;
        if (own) div.classList.add('own');
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    loginBtn.onclick = () => {
        const name = usernameInput.value.trim();
        if (!name) return alert("Введите имя!");
        localStorage.setItem('username', name);
        window.location.reload();
    };

    sendBtn.onclick = () => {
        if (!currentChat) return alert("Выберите собеседника!");
        const text = messageInput.value.trim();
        if (!text) return;
        ws.send(JSON.stringify({ type: 'message', to: currentChat, message: text }));
        appendMessage('Я', text, true);
        messageInput.value = '';
    };

    // Авто-вход
    if (savedName) {
        showChat();
        connect(savedName);
    } else {
        showLogin();
    }
});

messageInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        sendBtn.click();
    }
});