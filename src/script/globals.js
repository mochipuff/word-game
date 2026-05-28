// State Manager
const state = {
  stats: {
    name: "Challenger",
    lvl: 1,
    xp: 0,
    totalPlay: 0,
    totalWin: 0,
    totalLose: 0,
    streak: 0
  },
  game: {
    active: false,
    currentWord: "WORK",
    playerHand: [],
    playerDraw: [],
    botHand: [],
    botDraw: [],
    turn: "player",
    selectedCardIndex: null,
    difficulty: "medium",
    timer: 20,
    timerInterval: null
  }
};

// Routing System
function navigate(screenId) {
  document.querySelectorAll('.app-screen').forEach(screen => {
    screen.classList.add('hidden');
  });
  const target = document.getElementById(screenId);
  if (target) target.classList.remove('hidden');

  if (screenId === 'screen-home') {
    renderStatsDashboard();
  }
}

// Local Storage Core
function loadStats() {
  const saved = localStorage.getItem('alphabets_game_progress');
  if (saved) {
    try {
      state.stats = { ...state.stats, ...JSON.parse(saved) };
    } catch (e) {
      console.error("Failed parsing statistics", e);
    }
  }
  renderStatsDashboard();
}

function saveStats() {
  localStorage.setItem('alphabets_game_progress', JSON.stringify(state.stats));
  renderStatsDashboard();
}

function updateXP(amount) {
  state.stats.xp += amount;
  if (state.stats.xp < 0) state.stats.xp = 0;
  
  // Hitung level (tiap 100 XP naik level)
  const previousLevel = state.stats.lvl;
  state.stats.lvl = Math.floor(state.stats.xp / 100) + 1;
  
  if (state.stats.lvl > previousLevel) {
    showToast(`✨ LEVEL UP! You reached Level ${state.stats.lvl}!`, "success");
  }
  saveStats();
}

// UI Render Helpers
function renderStatsDashboard() {
  document.querySelectorAll('.stat-name').forEach(el => el.textContent = state.stats.name);
  document.querySelectorAll('.stat-lvl').forEach(el => el.textContent = state.stats.lvl);
  document.querySelectorAll('.stat-xp').forEach(el => el.textContent = `${state.stats.xp % 100}/100 XP`);
  
  const xpPercent = state.stats.xp % 100;
  document.querySelectorAll('.stat-xp-bar').forEach(bar => bar.style.width = `${xpPercent}%`);

  document.getElementById('dash-play').textContent = state.stats.totalPlay;
  document.getElementById('dash-win').textContent = state.stats.totalWin;
  document.getElementById('dash-lose').textContent = state.stats.totalLose;
  document.getElementById('dash-streak').textContent = state.stats.streak;

  // Settings inputs sync
  const nameInput = document.getElementById('settings-name-input');
  if (nameInput) nameInput.value = state.stats.name;
}

function showToast(message, type = "info") {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `p-4 rounded-lg shadow-lg text-white font-medium flex items-center gap-2 transform translate-y-2 opacity-0 transition-all duration-300 ${
    type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-slate-800 border border-slate-700'
  }`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-[-10px]');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Game Core Logic
async function triggerStartGame() {
  clearInterval(state.game.timerInterval);
  try {
    const res = await fetch('/api/start');
    if (!res.ok) throw new Error("Could not initialize game api session.");
    const data = await res.json();

    state.game.currentWord = data.start_word.toUpperCase();
    state.game.playerHand = data.player.hand;
    state.game.playerDraw = data.player.draw;
    state.game.botHand = data.bot.hand;
    state.game.botDraw = data.bot.draw;
    state.game.turn = "player";
    state.game.selectedCardIndex = null;
    state.game.active = true;

    // Sinkronisasi Difficulty
    state.game.difficulty = document.getElementById('difficulty-selector').value;

    navigate('screen-game');
    renderActiveBoard();
    startTurnTimer();
    showToast("Game started! Your turn.", "info");
  } catch (err) {
    showToast(err.message, "error");
  }
}

function renderActiveBoard() {
  // Render Word Panel
  const wordContainer = document.getElementById('game-word-display');
  wordContainer.innerHTML = '';
  
  const wordLetters = state.game.currentWord.split('');
  wordLetters.forEach((char, idx) => {
    const slot = document.createElement('button');
    slot.className = `w-14 h-16 md:w-16 md:h-20 rounded-xl flex flex-col justify-center items-center text-3xl font-extrabold transition-all duration-200 border-2 ${
      state.game.selectedCardIndex !== null 
        ? 'border-dashed border-violet-400 bg-violet-950/20 text-violet-300 hover:scale-105 cursor-pointer hover:border-violet-300'
        : 'border-slate-700 bg-slate-900/60 text-slate-100'
    }`;
    slot.innerHTML = `
      <span class="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">${idx + 1}</span>
      <span>${char}</span>
    `;
    slot.onclick = () => handleTargetSlotClick(idx);
    wordContainer.appendChild(slot);
  });

  // Render Player Hand
  const handContainer = document.getElementById('player-hand');
  handContainer.innerHTML = '';
  state.game.playerHand.forEach((char, idx) => {
    const card = document.createElement('button');
    card.className = `w-12 h-16 md:w-16 md:h-22 rounded-xl flex items-center justify-center text-2xl font-extrabold glass-card uppercase animate-appear ${
      state.game.selectedCardIndex === idx ? 'glass-card-active' : ''
    }`;
    card.textContent = char;
    card.onclick = () => selectHandCard(idx);
    handContainer.appendChild(card);
  });

  // Render Card Counts
  document.getElementById('player-deck-count').textContent = state.game.playerDraw.length;
  document.getElementById('bot-deck-count').textContent = state.game.botDraw.length;
  document.getElementById('bot-hand-count').textContent = state.game.botHand.length;

  // Turn Indicator
  const turnBanner = document.getElementById('turn-status-banner');
  if (state.game.turn === 'player') {
    turnBanner.textContent = "YOUR TURN";
    turnBanner.className = "text-xl font-bold tracking-widest text-emerald-400 animate-pulse";
  } else {
    turnBanner.textContent = "BOT IS THINKING...";
    turnBanner.className = "text-xl font-bold tracking-widest text-violet-400 animate-pulse";
  }
}

function selectHandCard(index) {
  if (state.game.turn !== 'player' || !state.game.active) return;
  state.game.selectedCardIndex = state.game.selectedCardIndex === index ? null : index;
  renderActiveBoard();
}

async function handleTargetSlotClick(position) {
  if (state.game.turn !== 'player' || state.game.selectedCardIndex === null || !state.game.active) return;
  
  const playedLetter = state.game.playerHand[state.game.selectedCardIndex];
  const oldWord = state.game.currentWord;

  try {
    const res = await fetch('/api/validate-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_word: oldWord,
        letter: playedLetter,
        position: position
      })
    });
    
    const data = await res.json();
    if (data.valid) {
      // Perbarui state kata yang dimainkan
      state.game.currentWord = data.new_word;
      
      // Buang kartu dari hand
      state.game.playerHand.splice(state.game.selectedCardIndex, 1);
      
      // Draw kartu baru dari sisa tumpukan draw deck
      if (state.game.playerDraw.length > 0) {
        state.game.playerHand.push(state.game.playerDraw.shift());
      }
      
      state.game.selectedCardIndex = null;
      state.game.turn = "bot";
      renderActiveBoard();
      
      showToast(`Nice! Changed to: ${state.game.currentWord}`, "success");
      
      clearInterval(state.game.timerInterval);
      
      // Trigger aksi Bot play
      setTimeout(executeBotTurn, 1500);
    } else {
      // Animasi getar ketika gagal merangkai kata valid
      const displayEl = document.getElementById('game-word-display');
      displayEl.classList.add('animate-shake');
      setTimeout(() => displayEl.classList.remove('animate-shake'), 400);
      showToast("Invalid move! Word does not exist in word bank.", "error");
    }
  } catch (err) {
    showToast("Server validation error", "error");
  }
}

async function executeBotTurn() {
  if (!state.game.active) return;
  
  try {
    const res = await fetch('/api/bot-move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_word: state.game.currentWord,
        bot_hand: state.game.botHand,
        difficulty: state.game.difficulty
      })
    });
    
    const data = await res.json();
    if (data.played) {
      // Update kata hasil play Bot
      state.game.currentWord = data.new_word;
      
      // Ambil index huruf yang dibuang Bot
      const indexInHand = state.game.botHand.indexOf(data.letter.toLowerCase());
      const cleanIndex = indexInHand !== -1 ? indexInHand : state.game.botHand.indexOf(data.letter.toUpperCase());
      
      if (cleanIndex !== -1) {
        state.game.botHand.splice(cleanIndex, 1);
      } else {
        state.game.botHand.shift(); // Fallback safety
      }
      
      // Draw kartu baru untuk Bot
      if (state.game.botDraw.length > 0) {
        state.game.botHand.push(state.game.botDraw.shift());
      }
      
      state.game.turn = "player";
      renderActiveBoard();
      showToast(`Bot played ${data.letter}! Word is now: ${state.game.currentWord}`, "info");
      startTurnTimer();
    } else {
      // Bot tidak memiliki valid moves
      concludeGame(true, "Bot could not make any valid moves!");
    }
  } catch (err) {
    concludeGame(true, "Bot conceded due to computation error");
  }
}

// Timer Logic
function startTurnTimer() {
  clearInterval(state.game.timerInterval);
  state.game.timer = 20;
  
  const timerBar = document.getElementById('game-timer-bar');
  const timerText = document.getElementById('game-timer-text');
  
  timerText.textContent = state.game.timer;
  timerBar.style.width = "100%";
  timerBar.className = "h-full bg-emerald-500 transition-all duration-300";

  state.game.timerInterval = setInterval(() => {
    state.game.timer--;
    timerText.textContent = state.game.timer;
    
    const percentage = (state.game.timer / 20) * 100;
    timerBar.style.width = `${percentage}%`;

    if (state.game.timer <= 10) {
      timerBar.className = "h-full bg-amber-500 transition-all duration-300";
    }
    if (state.game.timer <= 5) {
      timerBar.className = "h-full bg-rose-500 transition-all duration-300 animate-pulse";
    }

    if (state.game.timer <= 0) {
      clearInterval(state.game.timerInterval);
      concludeGame(false, "Turn Timer expired!");
    }
  }, 1000);
}

// Conclude / End Screen Handler
function concludeGame(isPlayerWin, reason) {
  state.game.active = false;
  clearInterval(state.game.timerInterval);
  
  state.stats.totalPlay += 1;
  if (isPlayerWin) {
    state.stats.totalWin += 1;
    state.stats.streak += 1;
    updateXP(25);
    document.getElementById('end-title').textContent = "Victory!";
    document.getElementById('end-title').className = "text-4xl font-extrabold text-emerald-400 mb-2";
    document.getElementById('end-xp-alert').textContent = "+25 XP Earned";
    document.getElementById('end-xp-alert').className = "text-emerald-300 text-sm font-semibold";
  } else {
    state.stats.totalLose += 1;
    state.stats.streak = 0;
    updateXP(-10);
    document.getElementById('end-title').textContent = "Defeat!";
    document.getElementById('end-title').className = "text-4xl font-extrabold text-rose-500 mb-2";
    document.getElementById('end-xp-alert').textContent = "-10 XP Lost";
    document.getElementById('end-xp-alert').className = "text-rose-400 text-sm font-semibold";
  }

  document.getElementById('end-reason').textContent = reason;
  document.getElementById('end-final-word').textContent = state.game.currentWord;
  
  saveStats();
  navigate('screen-end');
}

// Settings Controls
function savePlayerSettings() {
  const nameVal = document.getElementById('settings-name-input').value.trim();
  if (nameVal) {
    state.stats.name = nameVal;
    showToast("Profile settings saved successfully", "success");
    saveStats();
    navigate('screen-home');
  }
}

// Initialize Application on load
window.addEventListener('DOMContentLoaded', () => {
  loadStats();
  navigate('screen-home');
});
