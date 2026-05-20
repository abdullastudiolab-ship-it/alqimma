/**
 * القمة | Al-Qimma — Game Server
 * Elimination-style audience game for 300-400 participants
 * Node.js + WebSocket + Express
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.use(express.static(path.join(__dirname, 'public')));

// ─── STATION STOP MESSAGES (positive framing) ───────────────────────
const STOP_EMOJIS = ['⛺','🏕️','🌄','☕','🎒','🌅','📸','🏔️','🧭','🗺️'];
const STOP_MESSAGES = [
  'حطّوا الشنط هنا... الرحلة حلوة لحد هنا! ☕',
  'مخيّمكم جاهز... استريحوا وشجّعوا! 📣',
  'الطريق كان حلو... بس هنا محطتكم 🌄',
  'ما وصلتوا القمة... بس وصلتوا قلوبنا ❤️',
  'خلاص... الشاي جاهز والمنظر حلو من هنا! ☕',
  'حتى أبطال الجبل يحتاجون راحة! 🏅',
  'خيّمتوا بمكان حلو... استمتعوا بالمنظر 🌅',
  'الجبل ما خلص... بس رحلتكم اليوم خلصت 🎒',
  'نقطة توقف مشرّفة... شدّوا حيلكم السنة الجاية! 💪',
  'أنتم أثبتوا إنكم حاولتوا... وهذا يكفي 🌟'
];
const CLIMBING_MESSAGES = [
  'شامّين ريحة القمة! 🏔️',
  'في قلب الجبل... كملوا! ⬆️',
  'خطوة وتوصلون! 🚩',
  'ثابتين على الطريق! 💪',
  'الهواء صار بارد... يعني قربتوا! 🌬️'
];

// ─── DEFAULT QUESTIONS ──────────────────────────────────────────────
const DEFAULT_QUESTIONS = [
  { text: 'إلى ماذا تشير هذه الأيقونات: 👩‍🎓👨‍🎓 + 📜 + 🎉 + 📸', choices: ['التسجيل المبكر','حفل التخرج','الإرشاد الأكاديمي','الأسبوع التعريفي'], correctIndex: 1 },
  { text: 'ما اسم أصغر دولة في العالم من حيث المساحة؟', choices: ['موناكو','الفاتيكان','سان مارينو','البحرين'], correctIndex: 1 },
  { text: 'ما هي الخدمة المقدمة: 🧑‍🎓 + 🛏️ + 🏢 + 🔑', choices: ['النقل الجامعي','السكن الطلابي','القبول والتسجيل','الأنشطة الطلابية'], correctIndex: 1 },
  { text: 'ما الهدف الأساسي لمحور التنمية البشرية في رؤية قطر 2030؟', choices: ['زيادة عدد السكان فقط','بناء مجتمع متعلم وصحي ومنتج','تقليل الهجرة','تعظيم التوظيف'], correctIndex: 1 },
  { text: 'عدد المنتخبات المشاركة في كأس العالم 2026', choices: ['32','46','52','48'], correctIndex: 3 },
  { text: 'ما هي الوحدة المشار إليها: 🎤 + 🎭 + 🧑‍🎓 + 🏆', choices: ['الإرشاد المهني','الأنشطة الطلابية','الخدمات الصحية','القبول والتسجيل'], correctIndex: 1 },
  { text: 'من هو أول رئيس لجامعة قطر؟', choices: ['محمد إبراهيم كاظم','د. شيخة المسند','د. إبراهيم الخليفي','د. إبراهيم صالح النعيمي'], correctIndex: 0 },
  { text: 'ما الذي تشير إليه هذه الأيقونات: 📅 + 🧑‍🎓 + 🏃‍♂️💨 + ⏰❗', choices: ['بداية الفصل','الحذف والإضافة','تأجيل الاختبارات','التسجيل المتأخر'], correctIndex: 3 },
  { text: 'في أي عام تم افتتاح كلية طب الأسنان في جامعة قطر؟', choices: ['2015','2017','2019','2022'], correctIndex: 2 },
  { text: 'إحدى اللجان الهامة في قطاع شؤون الطلاب: 📄❌ + 🧑‍🎓 + ⚖️ + 🏛️', choices: ['لجنة القبول المشروط','لجنة الشكاوى الطلابية','لجنة السلوك الطلابي','لجنة الانسحاب النهائي'], correctIndex: 2 },
  { text: 'كم عدد خريجي دفعة 2026 من جامعة قطر؟', choices: ['4024','3122','4124','4020'], correctIndex: 0 },
  { text: 'خدمة متاحة لطلبة جامعة قطر: 🧑‍🎓 + 🏢➡️🏢 + 🌍', choices: ['نقل جامعي','تبادل طلابي','تخرج','تسجيل'], correctIndex: 1 },
  { text: 'ما الدولة التي ستلعب قطر ضدها في 24 يونيو 2026 خلال كأس العالم؟', choices: ['كندا','البوسنة والهرسك','إيطاليا','سويسرا'], correctIndex: 1 },
  { text: 'ما الخدمة التي تمثلها الأيقونات: 💳 + 🍽️ + 🧑‍🎓 + 🏫', choices: ['المكافآت المالية','البطاقة الجامعية','المطاعم داخل الحرم','المنح الدراسية'], correctIndex: 1 },
  { text: 'ما هي الدولة التي تُعرف بأرض الشمس المشرقة؟', choices: ['الصين','اليابان','كوريا الجنوبية','كوريا الشمالية'], correctIndex: 1 },
  { text: 'يجب على الطلاب الانتهاء منه: 🏫 + 🧑‍🎓 + 🤝 + 🏢 + 💼', choices: ['الأنشطة الطلابية','التدريب الميداني','الإرشاد الأكاديمي','السكن الطلابي'], correctIndex: 1 },
  { text: 'ما هي الدولة التي تضم أكبر عدد من الجزر في العالم؟', choices: ['النرويج','إندونيسيا','الفلبين','السويد'], correctIndex: 3 },
  { text: 'ما الذي يشير إليه هذا الإيموجي: 📚 + ⏳ + 🔁 + 🧑‍🎓 + 😓', choices: ['إعادة المقرر','التخرج','الإجازة','القبول'], correctIndex: 0 },
  { text: 'من هو/هي أقدم موظف في قطاع شؤون الطلاب؟', choices: ['إيمان المجلي','محمد المرزوقي','لينا العبدالله','يعقوب الجناحي'], correctIndex: 3 },
];

// ─── GAME STATE ─────────────────────────────────────────────────────
const PHASES = {
  SETUP: 'SETUP',
  LOBBY: 'LOBBY',
  ROUND_INTRO: 'ROUND_INTRO',
  QUESTION: 'QUESTION',
  QUESTION_CLOSED: 'QUESTION_CLOSED',
  ELIMINATION: 'ELIMINATION',
  RESULTS: 'RESULTS',
  NEXT_ROUND: 'NEXT_ROUND',
  WINNER: 'WINNER',
  END: 'END',
  PAUSED: 'PAUSED'
};

let gameState = {
  phase: PHASES.SETUP,
  previousPhase: null,
  eventName: 'اللقاء السنوي لقطاع شؤون الطلاب',
  tableCount: 30,
  questionTimer: 20,
  currentRound: 0,
  totalRounds: 10,
  eliminationsPerRound: 4,
  timer: 0,
  timerRunning: false,
  // Questions (admin can customize)
  questions: [...DEFAULT_QUESTIONS],
  currentQuestion: null,
  // Per-round data
  answers: {},             // { playerId: choiceIndex }
  answerTimes: {},         // { playerId: timestamp }
  // Tables
  activeTables: [],        // tables still in the game
  eliminatedTables: [],    // tables eliminated so far
  tableCorrectCounts: {},  // { tableNum: correctCount } for current round
  tableResults: {},        // { tableNum: { correct, total, rate, eliminated, rank } }
  roundEliminated: [],     // tables eliminated this round
  // Cumulative
  tableScores: {},         // { tableNum: totalCorrect across rounds }
  roundHistory: [],
  // Players
  players: {},
  adminWs: null,
  displayWs: null
};

let timerInterval = null;
let playerIdCounter = 0;
let joinBroadcastPending = false;

// ─── HELPERS ────────────────────────────────────────────────────────

function generateRoomCode() { return 'QM' + new Date().getFullYear(); }

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

function getPlayerCount() {
  return Object.values(gameState.players).filter(p => p.connected).length;
}

function getPlayersAtTable(t) {
  return Object.values(gameState.players).filter(p => p.table === t && p.connected);
}

function getTablePlayerCounts() {
  const counts = {};
  for (let t = 1; t <= gameState.tableCount; t++) counts[t] = 0;
  Object.values(gameState.players).forEach(p => {
    if (p.connected && p.table) counts[p.table] = (counts[p.table] || 0) + 1;
  });
  return counts;
}

function isTableActive(t) {
  return gameState.activeTables.includes(t);
}

function isPlayerActive(playerId) {
  const p = gameState.players[playerId];
  return p && p.connected && isTableActive(p.table);
}

function initGame() {
  // Setup active tables (only those with players)
  gameState.activeTables = [];
  gameState.eliminatedTables = [];
  gameState.tableScores = {};
  gameState.roundHistory = [];
  gameState.currentRound = 0;

  for (let t = 1; t <= gameState.tableCount; t++) {
    if (getPlayersAtTable(t).length > 0) {
      gameState.activeTables.push(t);
      gameState.tableScores[t] = 0;
    }
  }

  // Calculate eliminations per round
  const activeCount = gameState.activeTables.length;
  const totalQ = Math.min(gameState.questions.length, gameState.totalRounds);
  gameState.totalRounds = totalQ;
  
  if (activeCount <= 1) {
    gameState.eliminationsPerRound = 0;
  } else {
    gameState.eliminationsPerRound = Math.max(1, Math.floor((activeCount - 1) / totalQ));
  }
}

function computeRoundResults() {
  const q = gameState.currentQuestion;
  const results = {};
  const activeScores = [];

  for (const t of gameState.activeTables) {
    const players = getPlayersAtTable(t);
    let correct = 0;
    let total = 0;

    players.forEach(p => {
      if (gameState.answers[p.id] !== undefined) {
        total++;
        if (gameState.answers[p.id] === q.correctIndex) correct++;
      }
    });

    const rate = total > 0 ? correct / total : 0;
    gameState.tableScores[t] = (gameState.tableScores[t] || 0) + correct;

    results[t] = { correct, total, rate, eliminated: false, rank: 0 };
    activeScores.push({ table: t, rate, correct, total, avgTime: getAvgTime(t) });
  }

  // Sort: lowest rate first (to eliminate), tiebreaker: slower avg time
  activeScores.sort((a, b) => {
    if (a.rate !== b.rate) return a.rate - b.rate;
    return b.avgTime - a.avgTime; // slower = worse
  });

  // Determine how many to eliminate this round
  let toEliminate = gameState.eliminationsPerRound;
  const remaining = gameState.activeTables.length;
  
  // Don't eliminate if this would leave 0 or is the last round
  if (gameState.currentRound >= gameState.totalRounds) {
    // Final round: eliminate all but top 1
    toEliminate = remaining - 1;
  } else if (remaining - toEliminate < 1) {
    toEliminate = remaining - 1;
  }

  // Mark eliminated tables
  const eliminated = [];
  for (let i = 0; i < toEliminate && i < activeScores.length; i++) {
    const t = activeScores[i].table;
    results[t].eliminated = true;
    eliminated.push(t);
  }

  // Assign ranks to remaining
  let rank = 1;
  for (let i = activeScores.length - 1; i >= 0; i--) {
    results[activeScores[i].table].rank = rank++;
  }

  gameState.tableResults = results;
  gameState.roundEliminated = eliminated;

  // Update active/eliminated lists
  gameState.activeTables = gameState.activeTables.filter(t => !eliminated.includes(t));
  gameState.eliminatedTables.push(...eliminated);

  // Save history
  gameState.roundHistory.push({
    round: gameState.currentRound,
    question: q.text,
    eliminated: [...eliminated],
    remaining: [...gameState.activeTables]
  });
}

function getAvgTime(tableNum) {
  const players = getPlayersAtTable(tableNum);
  let sum = 0, count = 0;
  players.forEach(p => {
    if (gameState.answerTimes[p.id]) {
      sum += gameState.answerTimes[p.id];
      count++;
    }
  });
  return count > 0 ? sum / count : Infinity;
}

function getLeaderboard() {
  return gameState.activeTables
    .map(t => ({
      table: t,
      score: gameState.tableScores[t] || 0,
      players: getPlayersAtTable(t).length
    }))
    .sort((a, b) => b.score - a.score);
}

function getRandomStopMsg() {
  return STOP_MESSAGES[Math.floor(Math.random() * STOP_MESSAGES.length)];
}
function getRandomStopEmoji() {
  return STOP_EMOJIS[Math.floor(Math.random() * STOP_EMOJIS.length)];
}
function getRandomClimbMsg() {
  return CLIMBING_MESSAGES[Math.floor(Math.random() * CLIMBING_MESSAGES.length)];
}

// ─── TIMER ──────────────────────────────────────────────────────────

function startTimer(seconds, onComplete) {
  clearTimer();
  gameState.timer = seconds;
  gameState.timerRunning = true;
  broadcastState();
  timerInterval = setInterval(() => {
    gameState.timer--;
    broadcastTimer();
    if (gameState.timer <= 0) { clearTimer(); if (onComplete) onComplete(); }
  }, 1000);
}

function clearTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  gameState.timerRunning = false;
}

// ─── THROTTLED ANSWER COUNT BROADCAST ────────────────────────────────
let answerBroadcastPending = false;
function broadcastAnswerCount() {
  if (answerBroadcastPending) return; // Already scheduled
  answerBroadcastPending = true;
  setTimeout(() => {
    answerBroadcastPending = false;
    if (gameState.phase !== PHASES.QUESTION) return;
    const count = Object.keys(gameState.answers).length;
    const msg = JSON.stringify({ type: 'answer_count', data: { count } });
    wss.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN && (ws._role === 'display' || ws._role === 'admin')) {
        ws.send(msg);
      }
    });
  }, 300); // Max 3 broadcasts per second
}

function buildStateForClient(role, playerId) {
  const base = {
    phase: gameState.phase,
    eventName: gameState.eventName,
    tableCount: gameState.tableCount,
    currentRound: gameState.currentRound,
    totalRounds: gameState.totalRounds,
    timer: gameState.timer,
    timerRunning: gameState.timerRunning,
    playerCount: getPlayerCount(),
    roomCode: generateRoomCode(),
    activeTables: gameState.activeTables,
    eliminatedTables: gameState.eliminatedTables,
    activeTableCount: gameState.activeTables.length,
    eliminationsPerRound: gameState.eliminationsPerRound,
  };

  if (role === 'admin') {
    base.tableCounts = getTablePlayerCounts();
    base.questions = gameState.questions.map((q, i) => ({
      index: i, text: q.text, choices: q.choices, correctIndex: q.correctIndex
    }));
  }

  // Question data
  if (gameState.currentQuestion && ['QUESTION','QUESTION_CLOSED','ELIMINATION','RESULTS'].includes(gameState.phase)) {
    base.question = {
      text: gameState.currentQuestion.text,
      choices: gameState.currentQuestion.choices,
    };
    base.answerCount = Object.keys(gameState.answers).length;
    // Show correct answer after question closes
    if (['QUESTION_CLOSED','ELIMINATION','RESULTS'].includes(gameState.phase)) {
      base.correctIndex = gameState.currentQuestion.correctIndex;
    }
  }

  // Elimination data
  if (['ELIMINATION','RESULTS','NEXT_ROUND','WINNER','END'].includes(gameState.phase)) {
    base.tableResults = gameState.tableResults;
    base.roundEliminated = gameState.roundEliminated;
    base.leaderboard = getLeaderboard();
  }

  // Winner
  if (['WINNER','END'].includes(gameState.phase)) {
    base.leaderboard = getLeaderboard();
    if (gameState.activeTables.length === 1) {
      base.winner = gameState.activeTables[0];
    } else if (gameState.activeTables.length > 1) {
      // Admin declared winner early — pick table with highest cumulative score
      const lb = getLeaderboard();
      base.winner = lb.length > 0 ? lb[0].table : null;
    } else {
      base.winner = null;
    }
  }

  // Player-specific
  if (role === 'player' && playerId) {
    const p = gameState.players[playerId];
    if (p) {
      base.player = { id: playerId, name: p.name, table: p.table };
      base.isActive = isTableActive(p.table);
      base.isEliminated = gameState.eliminatedTables.includes(p.table);
      base.hasAnswered = gameState.answers[playerId] !== undefined;
      base.myAnswer = gameState.answers[playerId];

      if (base.isEliminated) {
        base.stopEmoji = getRandomStopEmoji();
        base.stopMsg = getRandomStopMsg();
      }

      // Was my table just eliminated this round?
      base.justEliminated = gameState.roundEliminated.includes(p.table);
      if (base.justEliminated) {
        base.stopEmoji = getRandomStopEmoji();
        base.stopMsg = getRandomStopMsg();
      }

      // Table result
      if (gameState.tableResults[p.table]) {
        base.myTableResult = gameState.tableResults[p.table];
      }
      base.myTableScore = gameState.tableScores[p.table] || 0;
    }
  }

  return base;
}

function broadcastState() {
  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      const state = buildStateForClient(ws._role || 'player', ws._playerId);
      ws.send(JSON.stringify({ type: 'state', data: state }));
    }
  });
}

function broadcastTimer() {
  const msg = JSON.stringify({ type: 'timer', data: { timer: gameState.timer, timerRunning: gameState.timerRunning } });
  wss.clients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
}

function sendToClient(ws, type, data) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, data }));
}

// ─── GAME FLOW ──────────────────────────────────────────────────────

function advanceToPhase(phase) {
  gameState.phase = phase;

  switch (phase) {
    case PHASES.LOBBY:
      initGame();
      break;

    case PHASES.ROUND_INTRO:
      gameState.currentRound++;
      gameState.answers = {};
      gameState.answerTimes = {};
      gameState.tableResults = {};
      gameState.roundEliminated = [];

      const qIdx = gameState.currentRound - 1;
      if (qIdx < gameState.questions.length) {
        gameState.currentQuestion = gameState.questions[qIdx];
      }

      broadcastState();
      setTimeout(() => {
        if (gameState.phase === PHASES.ROUND_INTRO) advanceToPhase(PHASES.QUESTION);
      }, 3000);
      return;

    case PHASES.QUESTION:
      startTimer(gameState.questionTimer, () => advanceToPhase(PHASES.QUESTION_CLOSED));
      break;

    case PHASES.QUESTION_CLOSED:
      broadcastState();
      setTimeout(() => {
        if (gameState.phase === PHASES.QUESTION_CLOSED) {
          computeRoundResults();
          advanceToPhase(PHASES.ELIMINATION);
        }
      }, 2500);
      return;

    case PHASES.ELIMINATION:
      broadcastState();
      setTimeout(() => {
        if (gameState.phase === PHASES.ELIMINATION) advanceToPhase(PHASES.RESULTS);
      }, 6000);
      return;

    case PHASES.RESULTS:
      // Check if game is over
      if (gameState.activeTables.length <= 1 || gameState.currentRound >= gameState.totalRounds) {
        setTimeout(() => {
          if (gameState.phase === PHASES.RESULTS) advanceToPhase(PHASES.WINNER);
        }, 5000);
      }
      break;

    case PHASES.WINNER:
      break;

    case PHASES.END:
      break;
  }

  broadcastState();
}

// ─── WEBSOCKET HANDLING ─────────────────────────────────────────────

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const role = url.searchParams.get('role') || 'player';
  ws._role = role;
  ws._playerId = null;

  if (role === 'admin') gameState.adminWs = ws;
  if (role === 'display') gameState.displayWs = ws;

  sendToClient(ws, 'welcome', { role });
  const state = buildStateForClient(role, null);
  sendToClient(ws, 'state', state);

  ws.on('message', (raw) => {
    try { handleMessage(ws, JSON.parse(raw)); } catch (e) { console.error('Bad msg:', e.message); }
  });

  ws.on('close', () => {
    if (ws._playerId && gameState.players[ws._playerId]) {
      gameState.players[ws._playerId].connected = false;
      gameState.players[ws._playerId].ws = null;
      broadcastState();
    }
    if (ws === gameState.adminWs) gameState.adminWs = null;
    if (ws === gameState.displayWs) gameState.displayWs = null;
  });

  ws.on('error', (err) => console.error('WS error:', err.message));
});

function handleMessage(ws, msg) {
  switch (msg.type) {

    // ── Player ──
    case 'join': {
      const { name, tableNumber } = msg.data;
      if (!name || !tableNumber) return sendToClient(ws, 'error', { message: 'الاسم ورقم الطاولة مطلوبان' });
      if (tableNumber < 1 || tableNumber > gameState.tableCount) return sendToClient(ws, 'error', { message: 'رقم طاولة غير صحيح' });
      playerIdCounter++;
      const playerId = 'P' + playerIdCounter;
      ws._playerId = playerId;
      ws._role = 'player';
      gameState.players[playerId] = {
        id: playerId, name: name.trim(), table: parseInt(tableNumber),
        ws, connected: true, joinedAt: Date.now()
      };
      sendToClient(ws, 'joined', { playerId, name: name.trim(), table: parseInt(tableNumber) });
      // Throttle broadcast during mass join to avoid O(n²) messages
      broadcastAnswerCount(); // Reuse throttle — just triggers count update to admin/display
      // Full state sent only to admin periodically
      if (!joinBroadcastPending) {
        joinBroadcastPending = true;
        setTimeout(() => { joinBroadcastPending = false; broadcastState(); }, 500);
      }
      break;
    }

    case 'answer': {
      if (gameState.phase !== PHASES.QUESTION) return;
      const pid = ws._playerId;
      if (!pid || !gameState.players[pid]) return;
      if (!isPlayerActive(pid)) return;
      if (gameState.answers[pid] !== undefined) return;
      const { choiceIndex } = msg.data;
      if (choiceIndex < 0 || choiceIndex >= gameState.currentQuestion.choices.length) return;
      gameState.answers[pid] = choiceIndex;
      gameState.answerTimes[pid] = Date.now();
      sendToClient(ws, 'answer_confirmed', { correct: choiceIndex === gameState.currentQuestion.correctIndex });
      // Lightweight broadcast — only send count to display/admin, NOT full state to all 400+ players
      broadcastAnswerCount();
      break;
    }

    case 'reconnect': {
      const { playerId } = msg.data;
      if (playerId && gameState.players[playerId]) {
        ws._playerId = playerId;
        ws._role = 'player';
        gameState.players[playerId].ws = ws;
        gameState.players[playerId].connected = true;
        sendToClient(ws, 'reconnected', { playerId });
        const state = buildStateForClient('player', playerId);
        sendToClient(ws, 'state', state);
      }
      break;
    }

    // ── Admin ──
    case 'admin_setup': {
      if (ws._role !== 'admin') return;
      const { tableCount, eventName, questionTimer } = msg.data;
      if (tableCount) gameState.tableCount = Math.min(Math.max(parseInt(tableCount), 5), 60);
      if (eventName) gameState.eventName = eventName;
      if (questionTimer) gameState.questionTimer = Math.min(Math.max(parseInt(questionTimer), 10), 60);
      broadcastState();
      break;
    }

    case 'admin_set_questions': {
      if (ws._role !== 'admin') return;
      const { questions } = msg.data;
      if (Array.isArray(questions) && questions.length > 0) {
        gameState.questions = questions.map(q => ({
          text: q.text || '',
          choices: q.choices || ['', '', '', ''],
          correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0
        }));
        gameState.totalRounds = gameState.questions.length;
      }
      broadcastState();
      break;
    }

    case 'admin_start_lobby': {
      if (ws._role !== 'admin') return;
      advanceToPhase(PHASES.LOBBY);
      break;
    }

    case 'admin_start_round': {
      if (ws._role !== 'admin') return;
      if (['LOBBY','NEXT_ROUND','RESULTS'].includes(gameState.phase)) {
        // Always re-init when starting from LOBBY to pick up joined players
        if (gameState.phase === PHASES.LOBBY) initGame();
        
        // Need at least 2 active tables to play
        if (gameState.phase === PHASES.LOBBY && gameState.activeTables.length < 2) {
          sendToClient(ws, 'error', { message: `يوجد ${gameState.activeTables.length} طاولة فقط — تحتاج طاولتين على الأقل لبدء اللعبة` });
          gameState.phase = PHASES.LOBBY; // Stay in LOBBY
          broadcastState();
          return;
        }
        
        if (gameState.activeTables.length <= 1) {
          advanceToPhase(PHASES.WINNER);
        } else if (gameState.currentRound >= gameState.totalRounds) {
          advanceToPhase(PHASES.WINNER);
        } else {
          advanceToPhase(PHASES.ROUND_INTRO);
        }
      }
      break;
    }

    case 'admin_next': {
      if (ws._role !== 'admin') return;
      clearTimer();
      if (gameState.phase === PHASES.QUESTION) advanceToPhase(PHASES.QUESTION_CLOSED);
      else if (gameState.phase === PHASES.ELIMINATION) advanceToPhase(PHASES.RESULTS);
      else if (gameState.phase === PHASES.RESULTS) {
        if (gameState.activeTables.length <= 1) advanceToPhase(PHASES.WINNER);
        else { gameState.phase = PHASES.NEXT_ROUND; broadcastState(); }
      }
      break;
    }

    case 'admin_show_winner': {
      if (ws._role !== 'admin') return;
      advanceToPhase(PHASES.WINNER);
      break;
    }

    case 'admin_end': {
      if (ws._role !== 'admin') return;
      advanceToPhase(PHASES.END);
      break;
    }

    case 'admin_reset': {
      if (ws._role !== 'admin') return;
      clearTimer();
      gameState.phase = PHASES.SETUP;
      gameState.previousPhase = null;
      gameState.currentRound = 0;
      gameState.answers = {};
      gameState.answerTimes = {};
      gameState.tableResults = {};
      gameState.tableScores = {};
      gameState.activeTables = [];
      gameState.eliminatedTables = [];
      gameState.roundEliminated = [];
      gameState.roundHistory = [];
      gameState.currentQuestion = null;
      Object.values(gameState.players).forEach(p => { if (p.ws) p.ws._playerId = null; });
      gameState.players = {};
      playerIdCounter = 0;
      broadcastState();
      break;
    }

    case 'admin_pause': {
      if (ws._role !== 'admin') return;
      if (gameState.timerRunning) {
        clearTimer();
        gameState.previousPhase = gameState.phase;
        gameState.phase = PHASES.PAUSED;
        broadcastState();
      }
      break;
    }

    case 'admin_resume': {
      if (ws._role !== 'admin') return;
      if (gameState.phase === PHASES.PAUSED && gameState.previousPhase) {
        gameState.phase = gameState.previousPhase;
        gameState.previousPhase = null;
        if (gameState.phase === PHASES.QUESTION)
          startTimer(gameState.timer || gameState.questionTimer, () => advanceToPhase(PHASES.QUESTION_CLOSED));
        broadcastState();
      }
      break;
    }

    case 'admin_skip_round': {
      if (ws._role !== 'admin') return;
      clearTimer();
      gameState.phase = PHASES.NEXT_ROUND;
      broadcastState();
      break;
    }
  }
}

// ─── SERVER ─────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       القمة | Al-Qimma Game Server       ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Local:   http://localhost:${PORT}                  ║`);
  console.log(`║  Network: http://${ip}:${PORT}              ║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Display: http://${ip}:${PORT}/display.html      ║`);
  console.log(`║  Player:  http://${ip}:${PORT}/player.html       ║`);
  console.log(`║  Admin:   http://${ip}:${PORT}/admin.html        ║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
});
