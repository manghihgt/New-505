/* ============================================================
   MATH QUIZ CHALLENGE - app.js
   Firebase Realtime DB + Tab Nav + Theme System
   ============================================================ */

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyCSHoQJob7fQSKGTTbGIZqaWmXNsJZxoD8",
    authDomain: "test-e1c5f.firebaseapp.com",
    databaseURL: "https://test-e1c5f-default-rtdb.firebaseio.com",
    projectId: "test-e1c5f",
    storageBucket: "test-e1c5f.firebasestorage.app",
    messagingSenderId: "",
    appId: ""
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- Questions ---
const QUESTIONS = [
    { q: "ลำดับเลขคณิต 2, 5, 8, 11, ... มีค่าผลต่างร่วม (d) เท่าใด?", opts: ["2", "3", "4", "5"], ans: 1, formula: "d = a₂ - a₁" },
    { q: "พจน์ที่ 10 ของลำดับ 3, 7, 11, ... คืออะไร?", opts: ["35", "39", "43", "47"], ans: 1, formula: "aₙ = a₁ + (n−1)d" },
    { q: "ลำดับ 10, 7, 4, ... พจน์ถัดไปคืออะไร?", opts: ["1", "0", "−1", "−2"], ans: 0, formula: "aₙ = a₁ + (n−1)d" },
    { q: "ผลต่างร่วมของลำดับ 1, −2, −5, ... คืออะไร?", opts: ["−2", "−3", "2", "3"], ans: 1, formula: "d = a₂ − a₁" },
    { q: "ลำดับ 5, 13, 21, ... เลข 101 เป็นพจน์ที่เท่าใด?", opts: ["11", "12", "13", "14"], ans: 2, formula: "n = [(aₙ − a₁) / d] + 1" },
    { q: "ผลบวก 10 พจน์แรกของอนุกรม 1+2+3+...+10 คือ?", opts: ["45", "50", "55", "60"], ans: 2, formula: "Sₙ = n/2 (a₁ + aₙ)" },
    { q: "กำหนด a₁=5, d=4 จงหาผลบวก 5 พจน์แรก (S₅)", opts: ["55", "60", "65", "70"], ans: 2, formula: "Sₙ = n/2 [2a₁ + (n−1)d]" },
    { q: "ลำดับ 2, 4, 6, ..., 20 มีทั้งหมดกี่พจน์?", opts: ["8", "9", "10", "11"], ans: 2, formula: "n = (aₙ − a₁)/d + 1" },
    { q: "ผลบวก 5 พจน์แรกของลำดับ 5, 10, 15, ... คือ?", opts: ["65", "70", "75", "80"], ans: 2, formula: "Sₙ = n/2 (a₁ + aₙ)" },
    { q: "กำหนด a₁=100, d=−10 จงหาพจน์ที่ 5 (a₅)", opts: ["50", "60", "70", "80"], ans: 1, formula: "a₅ = a₁ + 4d" }
];

const SHAPES = ["▲", "◆", "●", "■"];
const COLORS = ["opt-red", "opt-blue", "opt-yellow", "opt-green"];

// --- State ---
let role = null, roomId = null, playerId = null, nickname = null;
let totalScore = 0, hasAnswered = false, timerInterval = null, timeLeft = 30, currentQIndex = -1;
let unsubscribe = null;

// ========================================================
// TAB NAVIGATION
// ========================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Deactivate all tabs
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        // Activate clicked
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// ========================================================
// THEME SYSTEM
// ========================================================
const savedTheme = localStorage.getItem('mathquiz-theme') || 'purple';
if (savedTheme !== 'purple') document.documentElement.setAttribute('data-theme', savedTheme);
// Mark saved theme as active
document.querySelectorAll('.theme-card').forEach(card => {
    if (card.dataset.theme === savedTheme) card.classList.add('active');
    else card.classList.remove('active');
});

document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
        const theme = card.dataset.theme;
        document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        if (theme === 'purple') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        localStorage.setItem('mathquiz-theme', theme);
    });
});

// ========================================================
// SCREEN MANAGEMENT
// ========================================================
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + id).classList.add('active');
}

function backToMain() {
    showScreen('main');
}

// ========================================================
// HOME — JOIN ROOM
// ========================================================
document.getElementById('btn-join').addEventListener('click', joinRoom);

async function joinRoom() {
    const pin = document.getElementById('input-pin').value.trim();
    nickname = document.getElementById('input-nickname').value.trim();
    if (!pin || !nickname) return alert('กรุณาใส่ Game PIN และ Nickname');

    try {
        const snap = await db.ref('rooms/' + pin).once('value');
        if (!snap.exists()) return alert('ไม่พบห้องนี้!');
        const room = snap.val();
        if (room.state !== 'lobby') return alert('เกมเริ่มไปแล้ว!');

        roomId = pin;
        role = 'player';
        playerId = 'p' + Date.now();

        await db.ref('rooms/' + pin + '/players/' + playerId).set({
            name: nickname, score: 0, answered: false
        });

        document.getElementById('lobby-pin').textContent = pin;
        showScreen('lobby');
        listenRoom();
    } catch (e) {
        console.error(e);
        alert('เชื่อมต่อ Firebase ไม่ได้! ตรวจสอบ Config');
    }
}

// ========================================================
// CREATE ROOM
// ========================================================
document.getElementById('btn-create-room').addEventListener('click', createRoom);

async function createRoom() {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    roomId = pin;
    role = 'host';

    try {
        await db.ref('rooms/' + pin).set({
            state: 'lobby', qIndex: -1, answersCount: 0, timerStart: 0, players: {}
        });

        document.getElementById('lobby-pin').textContent = pin;
        document.getElementById('host-start-area').classList.remove('hidden');
        showScreen('lobby');
        listenRoom();
    } catch (e) {
        console.error(e);
        alert('เชื่อมต่อ Firebase ไม่ได้! ตรวจสอบ Config');
    }
}

// ========================================================
// ROOM LISTENER
// ========================================================
function listenRoom() {
    if (unsubscribe) unsubscribe();
    const roomRef = db.ref('rooms/' + roomId);
    const handler = roomRef.on('value', snap => {
        const data = snap.val();
        if (!data) return;

        switch (data.state) {
            case 'lobby':
                renderLobbyPlayers(data.players);
                break;
            case 'question':
                if (currentQIndex !== data.qIndex) {
                    currentQIndex = data.qIndex;
                    hasAnswered = false;
                    role === 'host' ? showHostQuestion(data) : showPlayerQuestion(data);
                }
                if (role === 'host') {
                    document.getElementById('host-answers').textContent = data.answersCount || 0;
                    const pc = Object.keys(data.players || {}).length;
                    document.getElementById('host-total-players').textContent = pc;
                    if (pc > 0 && (data.answersCount || 0) >= pc) {
                        clearInterval(timerInterval);
                        setTimeout(() => goLeaderboard(), 500);
                    }
                }
                document.getElementById('ac-count').textContent = data.answersCount || 0;
                break;
            case 'leaderboard':
                renderLeaderboard(data.players);
                break;
            case 'gameover':
                renderGameOver(data.players);
                break;
        }
    });
    unsubscribe = () => roomRef.off('value', handler);
}

// ========================================================
// LOBBY
// ========================================================
function renderLobbyPlayers(players) {
    const container = document.getElementById('lobby-players');
    container.innerHTML = '';
    const arr = Object.values(players || {});
    document.getElementById('lobby-player-count').textContent = arr.length;
    arr.forEach(p => {
        const chip = document.createElement('div');
        chip.className = 'player-chip';
        chip.textContent = p.name;
        container.appendChild(chip);
    });
}

// ========================================================
// START GAME (HOST)
// ========================================================
document.getElementById('btn-start-game').addEventListener('click', async () => {
    if (role !== 'host') return;
    await db.ref('rooms/' + roomId).update({
        state: 'question', qIndex: 0, answersCount: 0, timerStart: Date.now()
    });
    const snap = await db.ref('rooms/' + roomId + '/players').once('value');
    const updates = {};
    snap.forEach(child => { updates[child.key + '/answered'] = false; });
    await db.ref('rooms/' + roomId + '/players').update(updates);
});

// ========================================================
// HOST QUESTION VIEW
// ========================================================
function showHostQuestion(data) {
    const q = QUESTIONS[data.qIndex];
    document.getElementById('host-q-text').textContent = q.q;
    document.getElementById('host-q-num').textContent = 'ข้อ ' + (data.qIndex + 1) + '/' + QUESTIONS.length;
    document.getElementById('host-formula-text').textContent = q.formula;

    const optsArea = document.getElementById('host-options-display');
    optsArea.innerHTML = '';
    q.opts.forEach((opt, i) => {
        const btn = document.createElement('div');
        btn.className = 'host-opt-big ' + COLORS[i];
        btn.innerHTML = '<span class="opt-shape">' + SHAPES[i] + '</span><span class="opt-text">' + opt + '</span>';
        optsArea.appendChild(btn);
    });
    document.getElementById('host-answers').textContent = data.answersCount || 0;
    document.getElementById('host-total-players').textContent = Object.keys(data.players || {}).length;
    showScreen('host-wait');
    startCountdown('host-timer-text', 'host-timer-ring');
}

// ========================================================
// PLAYER QUESTION VIEW
// ========================================================
function showPlayerQuestion(data) {
    const q = QUESTIONS[data.qIndex];
    document.getElementById('q-text').textContent = q.q;
    document.getElementById('q-progress').textContent = 'ข้อ ' + (data.qIndex + 1) + '/' + QUESTIONS.length;
    document.getElementById('q-footer-pin').textContent = 'PIN: ' + roomId;
    document.getElementById('formula-text').textContent = q.formula;
    document.getElementById('ac-count').textContent = data.answersCount || 0;

    const grid = document.getElementById('options-grid');
    grid.innerHTML = '';
    q.opts.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'opt-btn ' + COLORS[i];
        btn.innerHTML = '<span class="opt-shape">' + SHAPES[i] + '</span><span class="opt-text">' + opt + '</span>';
        btn.addEventListener('click', () => submitAnswer(i));
        grid.appendChild(btn);
    });
    showScreen('question');
    startCountdown('timer-text', 'timer-ring');
}

// ========================================================
// TIMER
// ========================================================
function startCountdown(textId, ringId) {
    clearInterval(timerInterval);
    timeLeft = 30;
    const textEl = document.getElementById(textId);
    const ringEl = document.getElementById(ringId);
    const circumference = 2 * Math.PI * 45;
    textEl.textContent = timeLeft;
    ringEl.style.strokeDashoffset = '0';

    timerInterval = setInterval(() => {
        timeLeft--;
        textEl.textContent = Math.max(timeLeft, 0);
        ringEl.style.strokeDashoffset = ((30 - timeLeft) / 30) * circumference;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (role === 'host') goLeaderboard();
            else if (!hasAnswered) showPlayerResult(false, 0);
        }
    }, 1000);
}

// ========================================================
// SUBMIT ANSWER
// ========================================================
async function submitAnswer(chosenIndex) {
    if (hasAnswered || role !== 'player') return;
    hasAnswered = true;

    document.querySelectorAll('.opt-btn').forEach(b => b.classList.add('disabled'));
    document.querySelectorAll('.opt-btn')[chosenIndex].classList.add('selected');

    const q = QUESTIONS[currentQIndex];
    const correct = (chosenIndex === q.ans);
    let points = 0;
    if (correct) points = 1000 + Math.floor((Math.max(timeLeft, 0) / 30) * 500);
    totalScore += points;

    await db.ref('rooms/' + roomId + '/players/' + playerId).update({ score: totalScore, answered: true });
    const countRef = db.ref('rooms/' + roomId + '/answersCount');
    const snap = await countRef.once('value');
    await countRef.set((snap.val() || 0) + 1);

    setTimeout(() => showPlayerResult(correct, points), 300);
}

function showPlayerResult(correct, points) {
    clearInterval(timerInterval);
    const box = document.getElementById('result-box');
    box.innerHTML = correct
        ? '<div class="result-emoji">✅</div><div class="result-title" style="color:#5efc5e;">Correct!</div><div class="result-points">+' + points + ' points</div><div class="result-total">Total: ' + totalScore.toLocaleString() + '</div>'
        : '<div class="result-emoji">❌</div><div class="result-title" style="color:#ff6b6b;">Incorrect</div><div class="result-points">+0 points</div><div class="result-total">Total: ' + totalScore.toLocaleString() + '</div>';
    showScreen('result');
}

// ========================================================
// LEADERBOARD
// ========================================================
async function goLeaderboard() {
    if (role !== 'host') return;
    clearInterval(timerInterval);
    await db.ref('rooms/' + roomId).update({ state: 'leaderboard' });
}

function renderLeaderboard(players) {
    clearInterval(timerInterval);
    const list = document.getElementById('lb-list');
    list.innerHTML = '';
    const sorted = Object.entries(players || {}).map(([id, d]) => ({ id, ...d })).sort((a, b) => b.score - a.score);

    sorted.forEach((p, i) => {
        const row = document.createElement('div');
        row.className = 'lb-row' + (p.id === playerId ? ' me' : '');
        row.style.animationDelay = (i * 0.08) + 's';
        row.innerHTML = '<div class="lb-left"><span class="lb-rank">' + (i + 1) + '</span><span class="lb-name">' + p.name + '</span></div><span class="lb-score">' + (p.score || 0).toLocaleString() + '</span>';
        list.appendChild(row);
    });

    document.getElementById('lb-host-controls').classList[role === 'host' ? 'remove' : 'add']('hidden');
    showScreen('leaderboard');
}

// ========================================================
// NEXT QUESTION
// ========================================================
document.getElementById('btn-next-q').addEventListener('click', async () => {
    if (role !== 'host') return;
    const nextIdx = currentQIndex + 1;
    if (nextIdx >= QUESTIONS.length) {
        await db.ref('rooms/' + roomId).update({ state: 'gameover' });
        return;
    }
    const snap = await db.ref('rooms/' + roomId + '/players').once('value');
    const updates = {};
    snap.forEach(child => { updates[child.key + '/answered'] = false; });
    await db.ref('rooms/' + roomId + '/players').update(updates);
    await db.ref('rooms/' + roomId).update({ state: 'question', qIndex: nextIdx, answersCount: 0, timerStart: Date.now() });
});

// ========================================================
// GAME OVER
// ========================================================
function renderGameOver(players) {
    clearInterval(timerInterval);
    const sorted = Object.values(players || {}).sort((a, b) => b.score - a.score);
    const podium = document.getElementById('podium');
    podium.innerHTML = '';

    const order = [];
    if (sorted[1]) order.push({ ...sorted[1], rank: 2 });
    if (sorted[0]) order.push({ ...sorted[0], rank: 1 });
    if (sorted[2]) order.push({ ...sorted[2], rank: 3 });

    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    order.forEach(p => {
        const col = document.createElement('div');
        col.className = 'podium-col podium-' + p.rank;
        col.innerHTML = '<div class="podium-medal">' + medals[p.rank] + '</div><div class="podium-name">' + p.name + '</div><div class="podium-score">' + (p.score || 0).toLocaleString() + '</div>';
        podium.appendChild(col);
    });

    spawnConfetti();
    showScreen('gameover');
}

function spawnConfetti() {
    const area = document.getElementById('confetti-area');
    area.innerHTML = '';
    const colors = ['#e21b3c', '#1368ce', '#d89e00', '#26890c', '#ffd700', '#ff69b4'];
    for (let i = 0; i < 60; i++) {
        const c = document.createElement('div');
        c.style.cssText = 'position:fixed;width:10px;height:10px;border-radius:2px;background:' + colors[Math.floor(Math.random() * colors.length)] + ';top:-10px;left:' + Math.random() * 100 + 'vw;animation:confettiFall ' + (2 + Math.random() * 3) + 's linear forwards;animation-delay:' + (Math.random() * 2) + 's;opacity:0.8;z-index:999;';
        area.appendChild(c);
    }
    if (!document.getElementById('confetti-style')) {
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.textContent = '@keyframes confettiFall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}';
        document.head.appendChild(style);
    }
}

console.log('✅ Math Quiz Challenge loaded!');
