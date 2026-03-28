// Basic configuration
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 400; // 화면에 맞게 조정
const GRID_TOP_OFFSET = 5; // 그리드 상단 여백 (하단 텍스트 공간 확보)
const COLS = 10;
const ROWS = 13; // 15행에서 13행으로 줄여서 HUD까지 보이도록 조정
const CELL_SIZE = 26; // 블록 크기
const FALL_INTERVAL_BASE = 700; // ms

// Level System Configuration
const MAX_LEVEL = 5;

// 레벨별 배경 음악 (각 레벨별로 다른 MP3 파일 지정)
// 현재 사용 가능한 음악 파일:
// - BGM Tetris Bradinsky.mp3
// - tetis2.mp3
// - tetris3.mp3
// - tetris4.mp3
const BASE_LEVEL_MUSIC_SOURCES = [
  './BGM Tetris Bradinsky.mp3',  // Level 1: Beginner
  './tetis2.mp3',                  // Level 2: Easy
  './tetris3.mp3',                 // Level 3: Normal
  './tetris4.mp3',                 // Level 4: Hard
  './BGM Tetris Bradinsky.mp3',   // Level 5: Expert/Master (Level 1과 동일)
];

// 실제로 사용할 레벨별 음악 배열 (게임 시작 시 랜덤으로 섞음)
let LEVEL_MUSIC_SOURCES = [...BASE_LEVEL_MUSIC_SOURCES];

function shuffleLevelMusicSources() {
  LEVEL_MUSIC_SOURCES = [...BASE_LEVEL_MUSIC_SOURCES];
  for (let i = LEVEL_MUSIC_SOURCES.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [LEVEL_MUSIC_SOURCES[i], LEVEL_MUSIC_SOURCES[j]] = [LEVEL_MUSIC_SOURCES[j], LEVEL_MUSIC_SOURCES[i]];
  }
}

// 레벨 완료 조건: 모든 레벨에서 10회 폭발로 고정
// 3개 블록 매칭 = 1회 폭발, 10회 폭발 = 레벨 완료
const EXPLOSIONS_TARGET_PER_LEVEL = 10; // 모든 레벨에서 10회 폭발로 고정
const BLOCKS_PER_EXPLOSION = 3; // 1회 폭발에 필요한 블록 수

const LEVEL_MISSIONS = [
  { level: 1, name: 'Beginner', explosionsTarget: EXPLOSIONS_TARGET_PER_LEVEL, fallInterval: 700, 
    bgTheme: { baseHue: 200, saturation: 70, lightness: 8, name: 'Ocean Blue' } },
  { level: 2, name: 'Easy', explosionsTarget: EXPLOSIONS_TARGET_PER_LEVEL, fallInterval: 650,
    bgTheme: { baseHue: 140, saturation: 65, lightness: 10, name: 'Forest Green' } },
  { level: 3, name: 'Normal', explosionsTarget: EXPLOSIONS_TARGET_PER_LEVEL, fallInterval: 600,
    bgTheme: { baseHue: 280, saturation: 75, lightness: 9, name: 'Purple Dream' } },
  { level: 4, name: 'Hard', explosionsTarget: EXPLOSIONS_TARGET_PER_LEVEL, fallInterval: 450,
    bgTheme: { baseHue: 0, saturation: 80, lightness: 7, name: 'Crimson Night' } },
  { level: 5, name: 'Expert / Master', explosionsTarget: EXPLOSIONS_TARGET_PER_LEVEL, fallInterval: 400,
    bgTheme: { baseHue: 40, saturation: 85, lightness: 6, name: 'Golden Eclipse' } }
];

// Spawn chances
const ENGLISH_SPAWN_CHANCE = 0.25; // 사용자 설정 기반 블록 비율 감소
const KOREAN_SPAWN_CHANCE = 0.15;
const SELPIC_SPAWN_CHANCE = 0.10;
const RANDOM_BLOCK_CHANCE = 0.50; // 랜덤 블록 추가 (매칭 불가)

// 다양한 색상 팔레트
const COLOR_PALETTE = {
  english: ['#38bdf8', '#3b82f6', '#60a5fa', '#2563eb', '#1d4ed8', '#0ea5e9', '#0284c7'],
  korean: ['#f97316', '#fb923c', '#f59e0b', '#ea580c', '#dc2626', '#ef4444', '#f87171'],
  selpic: ['#a855f7', '#0ea5e9', '#22c55e', '#eab308', '#ec4899', '#8b5cf6', '#06b6d4'],
  random: ['#fbbf24', '#f59e0b', '#eab308', '#facc15', '#fde047', '#fef08a', '#fef9c3', '#fefce8']
};

// 랜덤 블록 텍스트 (다양한 기호 및 문자)
const RANDOM_BLOCK_TEXTS = ['★', '◆', '●', '▲', '■', '♦', '♠', '♥', '♣', '☆', '◇', '○', '△', '□', '✿', '✾', '✽', '✼', '✻', '✺'];

// SELPIC 블록 종류 및 특징
const SELPIC_BLOCK_TYPES = [
  {
    name: 'SELPIC',
    displayName: 'SP',
    color: '#a855f7', // 보라색
    colors: ['#a855f8', '#9333ea', '#7c3aed', '#6d28d9', '#5b21b6'],
    icon: '✨',
    pattern: 'shimmer' // 반짝이는 효과
  }
];

// Game state
let canvas, ctx;
let grid;
let currentBlock = null;
let lastFallTime = 0;
let isGameOver = false;
let isPaused = false;
let isGameStarted = false; // 게임 시작 여부
let score = 0;
let level = 1;
let linesCleared = 0;
let gameTime = 0;
let blocksMatched = 0; // 매칭된 블록 수 (점수 계산용)
let explosionsMatched = 0; // 폭발 횟수 (레벨 미션용) - 3개 블록 매칭 = 1회 폭발
let levelCompleted = false; // 현재 레벨 완료 여부
let levelStartScore = 0; // 레벨 시작 시점의 점수
let levelStartExplosionsMatched = 0; // 레벨 시작 시점의 폭발 횟수
let setLevelMusicForLevel = null; // 레벨별 음악 변경 함수 (setupMusicControls에서 설정)

// User configuration (default for standalone testing)
let userNameEnglish = '';
let userNameKorean = '';
let userMaterial = 'SELPIC';
let userId = 'guest'; // 사용자 ID (localStorage 키 분리용)

// Background stars for visual interest
let backgroundStars = [];

// Particle system for visual effects
class Particle {
  constructor(x, y, vx, vy, color, size, life) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.alpha = 1;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1; // gravity
    this.life--;
    this.alpha = this.life / this.maxLife;
  }
  
  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  
  isDead() {
    return this.life <= 0;
  }
}

let particles = [];
let screenShake = { x: 0, y: 0, intensity: 0 };
let backgroundHue = 220; // Starting hue for dynamic background
let backgroundHueDirection = 1;
let currentLevelTheme = null; // 현재 레벨의 배경 테마

let englishNameSet = [];
let koreanNameSet = [];
let collectedKoreanChars = {};

// Input queue: 한 번 키를 누를 때마다 한 칸씩만 이동
const inputQueue = [];

// 애니메이션을 위한 블록 위치 보간
let blockAnimation = {
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  progress: 1
};

class Block {
  constructor(x, y, content, color, options = {}) {
    this.x = x;
    this.y = y;
    this.content = content;
    this.color = color;
    this.isSelpicBlock = !!options.isSelpicBlock;
    this.isKoreanCollectionBlock = !!options.isKoreanCollectionBlock;
    this.isRandomBlock = !!options.isRandomBlock; // 랜덤 블록 (매칭 불가)
    this.isMatchable = !options.isRandomBlock; // 매칭 가능 여부
    this.selpicType = options.selpicType || null; // SELPIC 타입 정보
  }
}

function parseUrlConfig() {
  try {
    const params = new URLSearchParams(window.location.search);
    const en = params.get('en');
    const ko = params.get('ko');
    const mat = params.get('mat');
    const uid = params.get('userId');
    
    // URL 파라미터가 있으면 무조건 업데이트 (빈 문자열도 허용)
    if (en !== null) {
      userNameEnglish = decodeURIComponent(en).trim() || '';
    }
    if (ko !== null) {
      userNameKorean = decodeURIComponent(ko).trim() || '';
    }
    if (mat !== null) {
      userMaterial = decodeURIComponent(mat).trim() || 'SELPIC';
    }
    if (uid !== null) {
      userId = decodeURIComponent(uid).trim() || 'guest';
    }
    
    console.log('URL Config parsed:', { en: userNameEnglish, ko: userNameKorean, mat: userMaterial, userId: userId });
  } catch (e) {
    console.warn('Failed to parse URL params for game config:', e);
  }
}

function initNameSets() {
  englishNameSet = userNameEnglish
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);

  if (userNameKorean && userNameKorean.trim().length > 0) {
    // 한글 이름을 단어 단위로 분리 (쉼표, 공백 기준)
    const trimmed = userNameKorean.trim();
    // 쉼표나 공백으로 분리하고, 각 단어를 블록으로 사용
    const words = trimmed.split(/[,\s]+/).filter(word => word.length > 0);
    koreanNameSet = words.length > 0 ? words : Array.from(trimmed);
  } else {
    koreanNameSet = ['셀픽', '가자'];
  }

  collectedKoreanChars = {};
  koreanNameSet.forEach((ch) => {
    collectedKoreanChars[ch] = false;
  });

  updateSettingsUI();
  updateKoreanCollectionUI();
}

function updateSettingsUI() {
  const enEl = document.getElementById('settingEnglishName');
  const koEl = document.getElementById('settingKoreanName');
  const matEl = document.getElementById('settingMaterial');
  if (enEl) enEl.textContent = userNameEnglish || '-';
  if (koEl) koEl.textContent = userNameKorean || '—';
  if (matEl) matEl.textContent = userMaterial || 'Standard';
}

function updateKoreanCollectionUI() {
  const container = document.getElementById('koreanCollection');
  if (!container) return;
  container.innerHTML = '';
  
  if (koreanNameSet.length === 0) {
    const emptyItem = document.createElement('div');
    emptyItem.className = 'score-board-item';
    emptyItem.innerHTML = '<div class="score-board-label">No characters</div><div class="score-board-value">—</div>';
    container.appendChild(emptyItem);
    return;
  }
  
  koreanNameSet.forEach((ch) => {
    const isCollected = collectedKoreanChars[ch];
    const item = document.createElement('div');
    item.className = 'score-board-item' + (isCollected ? ' collected' : '');
    
    const label = document.createElement('div');
    label.className = 'score-board-label';
    label.textContent = ch;
    
    const value = document.createElement('div');
    value.className = isCollected ? 'score-board-value' : 'score-board-value not-collected';
    value.textContent = isCollected ? '✓' : '—';
    
    item.appendChild(label);
    item.appendChild(value);
    container.appendChild(item);
  });
}

function initGrid() {
  grid = [];
  for (let y = 0; y < ROWS; y++) {
    const row = new Array(COLS).fill(null);
    grid.push(row);
  }
}

function initBackgroundStars() {
  backgroundStars = [];
  const count = 80; // 더 많은 별
  for (let i = 0; i < count; i++) {
    backgroundStars.push({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      radius: 0.5 + Math.random() * 2, // 다양한 크기
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5, // 각 별마다 다른 속도
    });
  }
}

function getRandomColorForType(type) {
  const palette = COLOR_PALETTE[type] || COLOR_PALETTE.random;
  return randomChoice(palette);
}

function getRandomSelpic() {
  // SELPIC 블록 중 랜덤 선택
  return randomChoice(SELPIC_BLOCK_TYPES);
}

function getSelpicColor(selpicType) {
  if (selpicType && selpicType.colors) {
    return randomChoice(selpicType.colors);
  }
  return randomChoice(COLOR_PALETTE.selpic);
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function spawnNewBlock() {
  const r = Math.random();
  let type = 'english';
  
  // 블록 타입 결정 (사용자 설정 기반 + 랜덤 블록)
  if (r < ENGLISH_SPAWN_CHANCE) {
    type = 'english';
  } else if (r < ENGLISH_SPAWN_CHANCE + KOREAN_SPAWN_CHANCE) {
    type = 'korean';
  } else if (r < ENGLISH_SPAWN_CHANCE + KOREAN_SPAWN_CHANCE + SELPIC_SPAWN_CHANCE) {
    type = 'selpic';
  } else {
    type = 'random'; // 랜덤 블록 (매칭 불가)
  }

  let content = '';
  let options = {};
  let color = '';

  if (type === 'english') {
    // 사용자 설정 기반 영어 블록 (매칭 가능)
    content = englishNameSet.length > 0 ? randomChoice(englishNameSet) : 'NAME';
    color = getRandomColorForType('english');
  } else if (type === 'korean') {
    // 사용자 설정 기반 한국어 블록 (매칭 가능)
    content = koreanNameSet.length > 0 ? randomChoice(koreanNameSet) : 'ㅎ';
    options.isKoreanCollectionBlock = true;
    color = getRandomColorForType('korean');
  } else if (type === 'selpic') {
    // SELPIC 블록 생성
    const selpicType = randomChoice(SELPIC_BLOCK_TYPES);
    content = selpicType.displayName;
    options.isSelpicBlock = true;
    options.selpicType = selpicType; // SELPIC 타입 정보 저장
    color = randomChoice(selpicType.colors);
  } else {
    // 랜덤 블록 (매칭 불가, 장애물 역할)
    content = randomChoice(RANDOM_BLOCK_TEXTS);
    options.isRandomBlock = true;
    color = getRandomColorForType('random');
  }

  const x = Math.floor(COLS / 2);
  const y = 0;
  
  const newBlock = new Block(x, y, content, color, options);
  
  // 애니메이션 초기화
  blockAnimation.x = x;
  blockAnimation.y = y;
  blockAnimation.targetX = x;
  blockAnimation.targetY = y;
  blockAnimation.progress = 1;

  if (grid[y][x]) {
    triggerGameOver();
    return;
  }

  currentBlock = newBlock;
}

function triggerGameOver() {
  isGameOver = true;
  
  // GAME OVER 시 음악 완전 정지 (하드코딩된 모든 경로 정지)
  // 1. stopMusic 함수 호출
  if (stopMusic) {
    stopMusic();
  }
  
  // 2. 직접 오디오 요소 정지 (fallback)
  const audio = document.getElementById('bgm');
  if (audio) {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {
      console.warn('Error stopping audio in triggerGameOver:', e);
    }
  }
  
  // 3. 전역 변수 직접 설정
  if (typeof isMusicPlaying !== 'undefined') {
    isMusicPlaying = false;
  }
  if (typeof musicTimeoutId !== 'undefined' && musicTimeoutId) {
    clearTimeout(musicTimeoutId);
    musicTimeoutId = null;
  }
  
  // 4. AudioContext 정지
  if (typeof audioContext !== 'undefined' && audioContext && audioContext.state !== 'closed') {
    try {
      audioContext.suspend();
    } catch (e) {
      console.warn('Failed to suspend audio context in triggerGameOver:', e);
    }
  }
  
  // 게임 오버 패널 표시 및 메시지 설정
  const panel = document.getElementById('gameOverPanel');
  
  if (panel) {
    panel.classList.remove('hidden');
    
    // 게임 오버 제목과 메시지 업데이트
    const gameOverLabel = panel.querySelector('.score-board-label');
    const gameOverValue = panel.querySelector('.score-board-value');
    
    if (gameOverLabel) {
      gameOverLabel.textContent = 'GAME OVER';
      gameOverLabel.style.color = '#fecaca';
      gameOverLabel.style.fontSize = '16px';
      gameOverLabel.style.fontWeight = 'bold';
    }
    
    if (gameOverValue) {
      gameOverValue.textContent = 'Blocks reached the top row. Click Play Again to restart.';
      gameOverValue.style.color = '#fca5a5';
      gameOverValue.style.fontSize = '12px';
      gameOverValue.style.textAlign = 'left';
    }
  }
  
  setStatusMessage('GAME OVER - Blocks reached the top row. Click Play Again to restart.');
}

function resetGame() {
  isGameOver = false;
  isPaused = false;
  isGameStarted = true; // 게임 재시작

  // 새 게임마다 레벨별 음악 순서를 랜덤으로 섞기
  shuffleLevelMusicSources();

  score = 0;
  level = 1;
  linesCleared = 0;
  gameTime = 0;
  blocksMatched = 0; // 블록 카운터 초기화
  explosionsMatched = 0; // 폭발 횟수 초기화
  levelCompleted = false; // 레벨 완료 상태 초기화
  levelStartScore = 0; // 레벨 시작 점수 초기화
  levelStartExplosionsMatched = 0; // 레벨 시작 폭발 횟수 초기화
  particles = []; // 파티클 초기화
  screenShake = { x: 0, y: 0, intensity: 0 }; // 화면 흔들림 초기화
  
  // URL 파라미터 다시 읽기 (게임 재시작 시 최신 이름 반영)
  parseUrlConfig();
  initGrid();
  initNameSets();
  initBackgroundStars(); // 별 재생성
  
  // 레벨 1 배경 테마 초기화
  const mission = getCurrentLevelMission();
  if (mission && mission.bgTheme) {
    currentLevelTheme = mission.bgTheme;
    backgroundHue = mission.bgTheme.baseHue;
  }

  // 레벨 1용 배경 음악 설정 (게임 시작 시 강제 자동 재생)
  if (typeof setLevelMusicForLevel === 'function') {
    setLevelMusicForLevel(level, true); // forceAutoPlay = true로 게임 시작 시 자동 재생
  }
  
  const panel = document.getElementById('gameOverPanel');
  if (panel) panel.classList.add('hidden');
  const startScreen = document.getElementById('startScreen');
  if (startScreen) {
    startScreen.style.display = 'none'; // 시작 화면 숨기기
  }
  
  // 레벨 1 미션 안내
  setStatusMessage(`Level ${level}: ${mission.name} - Complete ${EXPLOSIONS_TARGET_PER_LEVEL} explosions to advance`);
  spawnNewBlock();
  updatePauseButton();
  
  // 음악은 setLevelMusicForLevel에서 자동으로 재생됨 (forceAutoPlay=true)
  
  requestAnimationFrame((ts) => {
    lastTimestamp = ts;
    requestAnimationFrame(gameLoop);
  });
  updateHud();
}

function togglePause() {
  if (isGameOver) return;
  
  isPaused = !isPaused;
  updatePauseButton();
  
  if (isPaused) {
    // 일시정지 시 음악도 정지
    if (pauseMusic) {
      pauseMusic();
    }
    setStatusMessage('Game Paused. Press SPACE or P to resume.');
  } else {
    // 재개 시 음악도 다시 재생 (일시정지 전에 재생 중이었던 경우)
    if (resumeMusic) {
      resumeMusic();
    }
    setStatusMessage('Game Resumed!');
    // 일시정지 해제 시 타임스탬프 업데이트 (delta 계산 오류 방지)
    lastTimestamp = performance.now();
  }
}

function updatePauseButton() {
  const pauseButton = document.getElementById('pauseButton');
  if (pauseButton) {
    if (isPaused) {
      pauseButton.textContent = '▶️ Resume';
      pauseButton.classList.add('paused');
    } else {
      pauseButton.textContent = '⏸️ Pause';
      pauseButton.classList.remove('paused');
    }
  }
}

function updateHud() {
  const scoreEl = document.getElementById('scoreValue');
  const levelEl = document.getElementById('levelValue');
  const linesEl = document.getElementById('linesValue');
  if (scoreEl) scoreEl.textContent = String(score);
  if (levelEl) levelEl.textContent = String(level);
  if (linesEl) linesEl.textContent = String(linesCleared);
  
  // 사이드바 스코어 전광판 업데이트
  const sidebarPlayerEl = document.getElementById('sidebarPlayerValue');
  const sidebarScoreEl = document.getElementById('sidebarScoreValue');
  const sidebarLevelEl = document.getElementById('sidebarLevelValue');
  const sidebarMissionProgressEl = document.getElementById('sidebarMissionProgress');
  
  // 플레이어 이름 업데이트 (Custom Design Studio에서 전달된 이름 사용)
  // 영어 이름 우선, 없으면 한글 이름, 둘 다 없으면 "SELPIC" 기본값
  if (sidebarPlayerEl) {
    let playerName = 'SELPIC'; // 기본값
    
    // 영어 이름이 있으면 사용 (Custom Design Studio의 Sticker Text 첫 줄)
    if (userNameEnglish && userNameEnglish.trim()) {
      playerName = userNameEnglish.trim();
    } 
    // 영어 이름이 없고 한글 이름이 있으면 한글 이름 사용
    else if (userNameKorean && userNameKorean.trim()) {
      playerName = userNameKorean.trim();
    }
    
    sidebarPlayerEl.textContent = playerName;
  }
  
  if (sidebarScoreEl) sidebarScoreEl.textContent = String(score);
  if (sidebarLevelEl) sidebarLevelEl.textContent = String(level);
  
  // 미션 진행률 업데이트 (레벨별로 0%에서 시작)
  // 진행률 계산: 1회 폭발 = 10% 진행, 10회 폭발 = 100% (레벨 완료)
  if (sidebarMissionProgressEl) {
    // 현재 레벨에서의 폭발 횟수 계산
    const currentLevelExplosions = explosionsMatched - levelStartExplosionsMatched;
    // 1회 폭발 = 10% 진행
    const explosionsProgress = Math.min(100, Math.floor((currentLevelExplosions / EXPLOSIONS_TARGET_PER_LEVEL) * 100));
    
    sidebarMissionProgressEl.textContent = `${explosionsProgress}%`;
  }
  
  // 레벨 미션 진행률 업데이트
  updateLevelProgress();
}

function getCurrentLevelMission() {
  return LEVEL_MISSIONS[level - 1] || LEVEL_MISSIONS[LEVEL_MISSIONS.length - 1];
}

function checkLevelCompletion() {
  // 이미 완료되었거나 최대 레벨을 초과한 경우 리턴
  if (levelCompleted) {
    console.log(`Level ${level} already completed, skipping check`);
    return;
  }
  if (level > MAX_LEVEL) {
    console.log(`Level ${level} exceeds MAX_LEVEL ${MAX_LEVEL}, skipping check`);
    return;
  }
  
  // 현재 레벨에서의 폭발 횟수 계산
  const currentLevelExplosions = explosionsMatched - levelStartExplosionsMatched;
  
  console.log(`checkLevelCompletion: level=${level}, currentLevelExplosions=${currentLevelExplosions}, target=${EXPLOSIONS_TARGET_PER_LEVEL}`);
  
  // 10회 폭발 시 레벨 완료 (3개 블록 매칭 = 1회 폭발)
  if (currentLevelExplosions >= EXPLOSIONS_TARGET_PER_LEVEL) {
    console.log(`Level ${level} completed! currentLevelExplosions=${currentLevelExplosions} >= ${EXPLOSIONS_TARGET_PER_LEVEL}`);
    levelCompleted = true;
    completeLevel();
  }
}

function completeLevel() {
  const mission = getCurrentLevelMission();
  
  // 최종 레벨 완료 시 배경 음악 정지
  if (level >= MAX_LEVEL && typeof stopMusic === 'function') {
    stopMusic();
  }
  
  // 완료 음악 재생
  playLevelCompleteSound();
  
  // 게임 일시정지 (레벨 완료 화면 표시 중)
  isPaused = true;
  updatePauseButton();
  
  if (level >= MAX_LEVEL) {
    // 최종 레벨 완료 - Promo Code 생성
    const promoCode = generatePromoCode();
    showLevelCompleteScreen(true, promoCode);
    setStatusMessage(`🎉 Final Level Complete! Promo Code: ${promoCode}`);
  } else {
    // 다음 레벨로 진행
    showLevelCompleteScreen(false);
    setStatusMessage(`Level ${level} Complete! Moving to Level ${level + 1}...`);
  }
}

// 사운드 효과 재생을 위한 AudioContext 초기화
function initSoundContext() {
  if (soundContext && soundContext.state !== 'closed') {
    return soundContext;
  }
  
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }
  
  try {
    soundContext = new AudioContextClass();
    return soundContext;
  } catch (err) {
    console.warn('Failed to create sound context:', err);
    return null;
  }
}

// 사운드 재생 헬퍼 함수
async function playSound(frequency, duration, type = 'sine', volume = 0.2) {
  const ctx = initSoundContext();
  if (!ctx) return;
  
  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(volume, now + duration - 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch (err) {
    console.warn('Failed to play sound:', err);
  }
}

// 블록 제거 사운드
function playBlockClearSound(count = 1) {
  const baseFreq = 400 + Math.min(count * 20, 200);
  playSound(baseFreq, 0.1, 'square', 0.15);
}

// 행/열 폭발 사운드
function playExplosionSound() {
  // 폭발음: 낮은 주파수에서 높은 주파수로 급상승
  const ctx = initSoundContext();
  if (!ctx) return;
  
  (async () => {
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.type = 'sawtooth';
      const now = ctx.currentTime;
      
      // 주파수 급상승 효과
      oscillator.frequency.setValueAtTime(100, now);
      oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.2);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(now);
      oscillator.stop(now + 0.2);
    } catch (err) {
      console.warn('Failed to play explosion sound:', err);
    }
  })();
}

// 블록 이동 사운드
function playMoveSound() {
  playSound(200, 0.05, 'sine', 0.1);
}

// 레벨 업 사운드
function playLevelUpSound() {
  const ctx = initSoundContext();
  if (!ctx) return;
  
  (async () => {
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const notes = [
        { freq: 523.25, time: 0 },    // C5
        { freq: 659.25, time: 0.1 },  // E5
        { freq: 783.99, time: 0.2 }   // G5
      ];
      
      const gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      gainNode.gain.value = 0.25;
      
      notes.forEach((note) => {
        const oscillator = ctx.createOscillator();
        const noteGain = ctx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = note.freq;
        
        const startTime = ctx.currentTime + note.time;
        const duration = 0.15;
        
        noteGain.gain.setValueAtTime(0, startTime);
        noteGain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
        noteGain.gain.linearRampToValueAtTime(0.4, startTime + duration - 0.02);
        noteGain.gain.linearRampToValueAtTime(0, startTime + duration);
        
        oscillator.connect(noteGain);
        noteGain.connect(gainNode);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      });
    } catch (err) {
      console.warn('Failed to play level up sound:', err);
    }
  })();
}

function playLevelCompleteSound() {
  try {
    // AudioContext 생성 (브라우저 호환성 고려)
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported for completion sound');
      return;
    }

    // 기존 audioContext 사용 또는 새로 생성
    let ctx = audioContext;
    if (!ctx || ctx.state === 'closed') {
      ctx = new AudioContextClass();
    }

    // AudioContext가 suspended 상태면 resume
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        playCompletionTone(ctx);
      }).catch(err => {
        console.error('Failed to resume audio context for completion sound:', err);
      });
    } else {
      playCompletionTone(ctx);
    }
  } catch (err) {
    console.error('Failed to play level complete sound:', err);
  }
}

function playCompletionTone(audioContext) {
  try {
    // 완료 음악: 승리 멜로디 (C major 스케일 상승)
    const notes = [
      { freq: 523.25, time: 0 },    // C5
      { freq: 587.33, time: 0.1 },  // D5
      { freq: 659.25, time: 0.2 },  // E5
      { freq: 698.46, time: 0.3 },  // F5
      { freq: 783.99, time: 0.4 },  // G5
      { freq: 880.00, time: 0.5 },  // A5
      { freq: 987.77, time: 0.6 },  // B5
      { freq: 1046.50, time: 0.7 }  // C6
    ];

    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = 0.3; // 볼륨 조절

    notes.forEach((note, index) => {
      const oscillator = audioContext.createOscillator();
      const noteGain = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = note.freq;

      // 부드러운 페이드 인/아웃
      const startTime = audioContext.currentTime + note.time;
      const duration = 0.15;
      
      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      noteGain.gain.linearRampToValueAtTime(0.3, startTime + duration - 0.02);
      noteGain.gain.linearRampToValueAtTime(0, startTime + duration);

      oscillator.connect(noteGain);
      noteGain.connect(gainNode);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  } catch (err) {
    console.error('Error playing completion tone:', err);
  }
}

function proceedToNextLevel() {
  // 디버깅을 위한 로그
  console.log(`proceedToNextLevel called: current level = ${level}, MAX_LEVEL = ${MAX_LEVEL}`);
  
  if (level >= MAX_LEVEL) {
    console.warn(`Cannot proceed: current level ${level} >= MAX_LEVEL ${MAX_LEVEL}`);
    return;
  }
  
  // 레벨 변경 전 음악 재생 상태 확인 (음악 정지 전에 확인해야 함)
  const audio = document.getElementById('bgm');
  const wasMusicPlayingBeforeLevelChange = (audio && audio.readyState >= 2 && !audio.paused) || isPlaying;
  
  // 다음 레벨로 진행
  const previousLevel = level;
  level++;
  levelCompleted = false;
  
  console.log(`Level increased from ${previousLevel} to ${level}`);
  
  // 레벨 업 사운드 재생
  playLevelUpSound();
  
  // 현재 레벨 시작 시점의 점수와 폭발 횟수 저장
  levelStartScore = score;
  levelStartExplosionsMatched = explosionsMatched;
  
  // 레벨별 배경 테마 업데이트
  const mission = getCurrentLevelMission();
  if (mission && mission.bgTheme) {
    currentLevelTheme = mission.bgTheme;
    backgroundHue = mission.bgTheme.baseHue; // 배경 색상 초기화
  }
  
  // 레벨별 배경 음악 변경 (이전에 재생 중이었으면 자동 재생)
  if (typeof setLevelMusicForLevel === 'function') {
    // 이전에 음악이 재생 중이었으면 자동 재생하도록 설정
    setLevelMusicForLevel(level, wasMusicPlayingBeforeLevelChange);
  }
  
  // 게임을 처음부터 시작하도록 완전히 초기화
  initGrid(); // 그리드 완전히 초기화
  currentBlock = null; // 현재 블록 초기화 (중요!)
  particles = []; // 파티클 초기화
  screenShake = { x: 0, y: 0, intensity: 0 }; // 화면 흔들림 초기화
  lastFallTime = 0; // 낙하 타이머 리셋
  
  // 입력 큐 초기화 (레벨 전환 시 남아있는 입력 제거)
  inputQueue.length = 0;
  
  // 애니메이션 초기화
  blockAnimation.x = 0;
  blockAnimation.y = 0;
  blockAnimation.targetX = 0;
  blockAnimation.targetY = 0;
  blockAnimation.progress = 1;
  
  // 새 블록 스폰 (그리드가 완전히 비어있고 currentBlock이 null인 상태에서)
  spawnNewBlock();
  
  // 게임 재개
  isPaused = false;
  updatePauseButton();
  
  // HUD를 명시적으로 업데이트하기 전에 모든 Game Score Board 필드를 강제로 초기화
  // DOM 요소를 직접 업데이트하여 즉시 반영 (하드코딩 방지)
  const sidebarPlayerEl = document.getElementById('sidebarPlayerValue');
  const sidebarScoreEl = document.getElementById('sidebarScoreValue');
  const sidebarLevelEl = document.getElementById('sidebarLevelValue');
  const sidebarMissionProgressEl = document.getElementById('sidebarMissionProgress');
  const levelProgressEl = document.getElementById('levelProgress');
  
  // 모든 필드를 현재 상태로 명시적으로 업데이트
  if (sidebarLevelEl) {
    sidebarLevelEl.textContent = String(level);
  }
  if (sidebarScoreEl) {
    sidebarScoreEl.textContent = String(score);
  }
  if (sidebarMissionProgressEl) {
    sidebarMissionProgressEl.textContent = '0%';
  }
  if (levelProgressEl) {
    levelProgressEl.textContent = `Mission: 0/${EXPLOSIONS_TARGET_PER_LEVEL} explosions (0%)`;
  }
  // 플레이어 이름은 updateHud()에서 처리 (변경되지 않으므로)
  
  // HUD 전체 업데이트 (모든 필드 동기화)
  updateHud();
  
  const nextMission = getCurrentLevelMission();
  setStatusMessage(`Level ${level}: ${nextMission.name} - Complete ${EXPLOSIONS_TARGET_PER_LEVEL} explosions to advance`);
}

function showLevelCompleteScreen(isFinalLevel, promoCode = null) {
  const modal = document.getElementById('levelCompleteModal');
  const title = document.getElementById('levelCompleteTitle');
  const message = document.getElementById('levelCompleteMessage');
  const promoCodeSection = document.getElementById('promoCodeSection');
  const promoCodeInput = document.getElementById('promoCodeValue');
  const continueButton = document.getElementById('continueButton');
  
  if (!modal) return;
  
  if (isFinalLevel && promoCode) {
    // 최종 레벨 완료
    if (title) title.textContent = '🎉 All Levels Complete! 🎉';
    if (message) message.textContent = `Congratulations! You've completed all ${MAX_LEVEL} levels!`;
    if (promoCodeSection) promoCodeSection.classList.remove('hidden');
    if (promoCodeInput) promoCodeInput.value = promoCode;
    
    // Promo Code 복사 기능
    const copyButton = document.getElementById('copyPromoCode');
    if (copyButton) {
      copyButton.onclick = () => {
        if (promoCodeInput) {
          promoCodeInput.select();
          document.execCommand('copy');
          copyButton.textContent = 'Copied!';
          setTimeout(() => {
            copyButton.textContent = 'Copy';
          }, 2000);
        }
      };
    }
    
    if (continueButton) {
      continueButton.textContent = 'Close';
      continueButton.onclick = () => {
        modal.classList.add('hidden');
        // 게임 오버 상태로 전환 (최종 레벨 완료)
        triggerGameOver();
      };
    }
  } else {
    // 중간 레벨 완료
    if (title) title.textContent = `Level ${level} Complete!`;
    if (message) {
      // 다음 레벨의 미션을 가져오기 위해 level + 1 사용
      const nextLevel = level + 1;
      const nextMission = LEVEL_MISSIONS[nextLevel - 1] || LEVEL_MISSIONS[LEVEL_MISSIONS.length - 1];
      message.textContent = `Great job! Moving to Level ${nextLevel}: ${nextMission.name}`;
    }
    if (promoCodeSection) promoCodeSection.classList.add('hidden');
    
    if (continueButton) {
      continueButton.textContent = 'Continue to Next Level';
      continueButton.onclick = () => {
        modal.classList.add('hidden');
        proceedToNextLevel();
      };
    }
  }
  
  modal.classList.remove('hidden');
}

function generatePromoCode() {
  // 사용자별로 localStorage 키를 분리
  // 로그인한 사용자는 사용자 ID를 키에 포함, 비로그인 사용자는 'guest' 사용
  const storageKey = userId && userId !== 'guest' 
    ? `selpic-game-completed-${userId}` 
    : 'selpic-game-completed-guest';
  
  // 1) 기존에 발급된 게임 프로모 코드가 있는지 확인
  //    - 한 "고객(사용자)"당 1번만 발급하기 위함
  const raw = localStorage.getItem(storageKey) || '[]';
  let completedGames = [];
  try {
    completedGames = JSON.parse(raw);
    if (!Array.isArray(completedGames)) {
      completedGames = [];
    }
  } catch {
    completedGames = [];
  }

  // 기존에 game_level_5(최종 레벨)로 발급된 코드가 있다면, 새로 만들지 않고 그 코드 재사용
  const existing = completedGames.find(
    (entry) => entry && entry.source === 'game_level_5'
  );
  if (existing && existing.code) {
    return existing.code;
  }

  // 2) 기존 코드가 없다면 새 코드 생성
  // 고유한 Promo Code 생성: SELPIC-GAME-XXXXXX
  const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const promoCode = `SELPIC-GAME-${randomCode}`;
  
  // localStorage에 저장 (나중에 확인 가능) - 사용자별로 분리된 키 사용
  completedGames.push({
    code: promoCode,
    date: new Date().toISOString(),
    score: score,
    level: level,
    source: 'game_level_5', // 최종 레벨 보상임을 명시
  });
  localStorage.setItem(storageKey, JSON.stringify(completedGames));
  
  // contentStore에 추가하기 위해 특별한 키로도 저장 (Next.js 앱이 감지)
  localStorage.setItem('selpic-game-promo-pending', JSON.stringify({
    code: promoCode,
    source: 'game_level_5',
    level: level,
    score: score,
    timestamp: new Date().toISOString(),
  }));
  
  return promoCode;
}

function updateLevelProgress() {
  const progressEl = document.getElementById('levelProgress');
  
  if (progressEl) {
    // 현재 레벨에서의 폭발 횟수 진행률 계산
    // 진행률 계산: 1회 폭발 = 10% 진행, 10회 폭발 = 100% (레벨 완료)
    const currentLevelExplosions = explosionsMatched - levelStartExplosionsMatched;
    const explosionsProgress = Math.min(100, Math.floor((currentLevelExplosions / EXPLOSIONS_TARGET_PER_LEVEL) * 100));
    
    progressEl.textContent = `Mission: ${currentLevelExplosions}/${EXPLOSIONS_TARGET_PER_LEVEL} explosions (${explosionsProgress}%)`;
  }
}

function setStatusMessage(msg) {
  const el = document.getElementById('statusMessage');
  if (el) el.textContent = msg || '';
}

function canMove(block, dx, dy) {
  const newX = block.x + dx;
  const newY = block.y + dy;
  if (newX < 0 || newX >= COLS || newY < 0 || newY >= ROWS) {
    return false;
  }
  if (grid[newY][newX]) {
    return false;
  }
  return true;
}

function settleCurrentBlock() {
  if (!currentBlock) return;
  const { x, y } = currentBlock;
  
  // 경계 체크
  if (y < 0 || y >= ROWS || x < 0 || x >= COLS) {
    triggerGameOver();
    return;
  }
  
  // 맨 위 행(y=0)에 블록이 쌓이면 게임 실패
  if (y === 0) {
    triggerGameOver();
    return;
  }
  
  grid[y][x] = currentBlock;

  if (currentBlock.isKoreanCollectionBlock) {
    checkKoreanNameCollection(currentBlock);
  }

  const matches = findMatches();
  if (matches.length > 0) {
    clearMatches(matches);
  }

  spawnNewBlock();
}

function updateFall(delta) {
  // 레벨별 낙하 속도 적용
  const mission = getCurrentLevelMission();
  const fallInterval = mission ? mission.fallInterval : FALL_INTERVAL_BASE;
  lastFallTime += delta;
  if (lastFallTime >= fallInterval) {
    lastFallTime = 0;
    if (!currentBlock) return;
    if (canMove(currentBlock, 0, 1)) {
      currentBlock.y += 1;
    } else {
      settleCurrentBlock();
    }
  }
}

function handleInput() {
  if (!currentBlock || isPaused) return;
  const command = inputQueue.shift();
  if (!command) return;
  let moved = false;
  if (command === 'left' && canMove(currentBlock, -1, 0)) {
    currentBlock.x -= 1;
    blockAnimation.targetX = currentBlock.x;
    blockAnimation.progress = 0; // 애니메이션 재시작
    moved = true;
  } else if (command === 'right' && canMove(currentBlock, 1, 0)) {
    currentBlock.x += 1;
    blockAnimation.targetX = currentBlock.x;
    blockAnimation.progress = 0; // 애니메이션 재시작
    moved = true;
  } else if (command === 'down' && canMove(currentBlock, 0, 1)) {
    currentBlock.y += 1;
    blockAnimation.targetY = currentBlock.y;
    blockAnimation.progress = 0; // 애니메이션 재시작
    moved = true;
  }
  // 이동 사운드 (너무 자주 재생되지 않도록 제한)
  if (moved && Math.random() < 0.3) {
    playMoveSound();
  }
}

function findMatches() {
  const matches = [];
  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  const rowsToClear = new Set(); // 가로 매치로 인한 행 전체 클리어
  const colsToClear = new Set(); // 세로 매치로 인한 열 전체 클리어

  const directions = [
    [1, 0],  // 가로
    [0, 1],  // 세로
    [1, 1],  // 대각선
    [1, -1], // 대각선
  ];

  function dfs(x, y, dirX, dirY, content, collection, localVisited) {
    const nx = x + dirX;
    const ny = y + dirY;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) return;
    
    // 이미 이번 탐색에서 방문한 셀은 건너뛰기
    if (localVisited[ny][nx]) return;
    
    const cell = grid[ny][nx];
    // 랜덤 블록은 매칭되지 않도록 체크, content가 다르면 중단
    if (!cell || !cell.isMatchable || cell.content !== content) return;
    
    // 같은 content를 가진 블록을 찾았으므로 추가하고 계속 탐색
    localVisited[ny][nx] = true;
    collection.push({ x: nx, y: ny });
    dfs(nx, ny, dirX, dirY, content, collection, localVisited);
  }

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = grid[y][x];
      // 랜덤 블록은 매칭 체크에서 제외, 이미 처리된 블록도 제외
      if (!cell || visited[y][x] || !cell.isMatchable) continue;
      
      const baseContent = cell.content;
      
      // 각 방향별로 독립적으로 탐색
      for (const [dx, dy] of directions) {
        // 이번 탐색에서 사용할 로컬 방문 배열 (각 방향별로 독립적)
        const localVisited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
        localVisited[y][x] = true; // 시작 블록은 이미 방문한 것으로 표시
        
        // 시작 블록을 포함한 컬렉션
        const collection = [{ x, y }];
        
        // 같은 방향으로 연속된 같은 content 블록 찾기
        dfs(x, y, dx, dy, baseContent, collection, localVisited);
        
        // 정확히 3개 이상 연속으로 같은 블록이 있어야 매칭
        if (collection.length >= 3) {
          // 매칭된 블록들을 전역 visited에 표시하여 중복 처리 방지
          collection.forEach(({ x: cx, y: cy }) => {
            visited[cy][cx] = true;
          });
          
          // 가로 매치 (dx=1, dy=0)인 경우 행 전체 클리어
          if (dx === 1 && dy === 0) {
            rowsToClear.add(y);
          }
          // 세로 매치 (dx=0, dy=1)인 경우 열 전체 클리어
          else if (dx === 0 && dy === 1) {
            colsToClear.add(x);
          }
          
          matches.push(collection);
        }
      }
    }
  }

  // 행/열 전체 클리어 정보를 matches에 추가
  if (rowsToClear.size > 0 || colsToClear.size > 0) {
    matches.push({
      isRowClear: Array.from(rowsToClear),
      isColClear: Array.from(colsToClear)
    });
  }

  return matches;
}

function createExplosionParticles(x, y, color, count = 15) {
  const px = x * CELL_SIZE + (CANVAS_WIDTH - COLS * CELL_SIZE) / 2 + CELL_SIZE / 2;
  const py = y * CELL_SIZE + GRID_TOP_OFFSET + CELL_SIZE / 2;
  
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 2 + Math.random() * 3;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const size = 2 + Math.random() * 3;
    const life = 30 + Math.random() * 20;
    
    particles.push(new Particle(px, py, vx, vy, color, size, life));
  }
}

function createBonusParticles(x, y, count = 50) {
  const px = x * CELL_SIZE + (CANVAS_WIDTH - COLS * CELL_SIZE) / 2 + CELL_SIZE / 2;
  const py = y * CELL_SIZE + GRID_TOP_OFFSET + CELL_SIZE / 2;
  
  const colors = ['#fbbf24', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#3b82f6'];
  
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 5;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const size = 3 + Math.random() * 4;
    const life = 40 + Math.random() * 30;
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    particles.push(new Particle(px, py, vx, vy, color, size, life));
  }
}

function addScreenShake(intensity = 5) {
  screenShake.intensity = Math.max(screenShake.intensity, intensity);
}

function clearMatches(matchGroups) {
  let blocksCleared = 0;
  const affectedSelpics = [];
  let rowsToClear = [];
  let colsToClear = [];
  
  matchGroups.forEach((group) => {
    // 행/열 전체 클리어 정보 처리
    if (group && typeof group === 'object' && !Array.isArray(group)) {
      if (group.isRowClear) {
        rowsToClear = group.isRowClear;
        return;
      }
      if (group.isColClear) {
        colsToClear = group.isColClear;
        return;
      }
    }
    
    // 일반 매치 그룹 처리 (배열인 경우만)
    if (Array.isArray(group) && group.length > 0) {
      group.forEach(({ x, y }) => {
        // 유효한 좌표인지 확인
        if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
          const block = grid[y][x];
          if (block) {
            blocksCleared++;
            // 폭발 파티클 생성
            createExplosionParticles(x, y, block.color, 12);
            if (block.isSelpicBlock) {
              affectedSelpics.push(block);
              // SELPIC 블록은 더 화려한 폭발
              createExplosionParticles(x, y, '#eab308', 20);
            }
          }
          grid[y][x] = null;
        }
      });
    }
  });

  // 가로 3개 매치로 인한 행 전체 폭발
  if (rowsToClear.length > 0) {
    playExplosionSound(); // 행 폭발 사운드
  }
  rowsToClear.forEach((row) => {
    for (let x = 0; x < COLS; x++) {
      const block = grid[row][x];
      if (block) {
        blocksCleared++;
        createExplosionParticles(x, row, block.color, 15);
        if (block.isSelpicBlock) {
          affectedSelpics.push(block);
        }
        grid[row][x] = null;
      }
    }
    // 행 전체 폭발 파티클 효과
    addScreenShake(5);
  });

  // 세로 3개 매치로 인한 열 전체 폭발
  if (colsToClear.length > 0) {
    playExplosionSound(); // 열 폭발 사운드
  }
  colsToClear.forEach((col) => {
    for (let y = 0; y < ROWS; y++) {
      const block = grid[y][col];
      if (block) {
        blocksCleared++;
        createExplosionParticles(col, y, block.color, 15);
        if (block.isSelpicBlock) {
          affectedSelpics.push(block);
        }
        grid[y][col] = null;
      }
    }
    // 열 전체 폭발 파티클 효과
    addScreenShake(5);
  });

  // 화면 흔들림 효과
  if (blocksCleared > 0) {
    addScreenShake(3 + blocksCleared * 0.5);
    // 블록 제거 사운드 (일반 매칭)
    if (rowsToClear.length === 0 && colsToClear.length === 0) {
      playBlockClearSound(blocksCleared);
    }
  }

  // SELPIC 효과는 현재는 없음 (행/열 폭발이 주 효과)

  applyGravity();

  const totalBlocksCleared = blocksCleared;
  
  // 각 블록마다 랜덤 점수 부여 (5~50점 범위)
  let totalPoints = 0;
  for (let i = 0; i < totalBlocksCleared; i++) {
    const randomPoints = Math.floor(Math.random() * 46) + 5; // 5~50점
    totalPoints += randomPoints;
  }
  
  score += totalPoints;
  linesCleared += totalBlocksCleared;
  blocksMatched += totalBlocksCleared; // 모든 블록 카운트 (점수 계산용)
  
  // 폭발 횟수 계산: 3개 블록 매칭 = 1회 폭발
  // 일반 매칭 그룹과 행/열 폭발을 모두 카운트
  let explosionsThisTurn = 0;
  
  // 행/열 전체 폭발 카운트 (SELPIC 블록 효과 - 우선 카운트)
  if (rowsToClear.length > 0) {
    explosionsThisTurn += rowsToClear.length; // 각 행 폭발 = 1회 폭발
  }
  if (colsToClear.length > 0) {
    explosionsThisTurn += colsToClear.length; // 각 열 폭발 = 1회 폭발
  }
  
  // 일반 매칭 그룹 카운트 (3개 이상 블록이 매칭된 그룹)
  // 행/열 전체 클리어는 이미 카운트했으므로 제외
  matchGroups.forEach((group) => {
    // 행/열 전체 클리어는 이미 카운트했으므로 제외
    if (group && typeof group === 'object' && !Array.isArray(group)) {
      if (group.isRowClear || group.isColClear) {
        return;
      }
    }
    // 일반 매칭 그룹: 3개 이상 블록이 매칭되면 1회 폭발
    if (Array.isArray(group) && group.length >= BLOCKS_PER_EXPLOSION) {
      explosionsThisTurn++;
    }
  });
  
  // 레벨 완료 체크를 위해 현재 레벨에서의 폭발 횟수 계산
  const currentLevelExplosions = explosionsMatched - levelStartExplosionsMatched;
  const remainingExplosionsNeeded = EXPLOSIONS_TARGET_PER_LEVEL - currentLevelExplosions;
  
  // 이번 턴의 폭발 중에서 필요한 만큼만 카운트
  // 예: 현재 7회 폭발, 10회 필요 → 이번에 5회 폭발되면 3회만 카운트, 나머지 2회는 무시
  // 단, 레벨이 이미 완료된 경우에는 카운트하지 않음
  let explosionsToCount = 0;
  if (!levelCompleted && remainingExplosionsNeeded > 0) {
    explosionsToCount = Math.min(explosionsThisTurn, remainingExplosionsNeeded);
  }
  
  explosionsMatched += explosionsToCount; // 필요한 만큼만 카운트 (10회를 초과하지 않도록)
  
  // 디버깅 로그
  if (explosionsToCount > 0) {
    console.log(`Explosions matched: ${explosionsMatched}, Level explosions: ${currentLevelExplosions + explosionsToCount}/${EXPLOSIONS_TARGET_PER_LEVEL}`);
  }
  
  // 레벨은 미션 완료 시에만 증가 (자동 증가 제거)
  // level = 1 + Math.floor(linesCleared / 20); // 기존 자동 레벨 증가 제거
  
  updateHud();
  
  // 레벨 완료 체크 (레벨이 완료되지 않은 경우에만)
  if (!levelCompleted) {
    checkLevelCompletion();
  }
}

function applyGravity() {
  for (let x = 0; x < COLS; x++) {
    let writeRow = ROWS - 1;
    for (let y = ROWS - 1; y >= 0; y--) {
      if (grid[y][x]) {
        if (y !== writeRow) {
          grid[writeRow][x] = grid[y][x];
          grid[y][x] = null;
        }
        writeRow--;
      }
    }
  }
}

function checkKoreanNameCollection(block) {
  const ch = block.content;
  if (collectedKoreanChars.hasOwnProperty(ch) && !collectedKoreanChars[ch]) {
    collectedKoreanChars[ch] = true;
    updateKoreanCollectionUI();
    setStatusMessage(`Collected: ${ch}`);
    
    // 수집 시 작은 파티클 효과
    const px = block.x * CELL_SIZE + (CANVAS_WIDTH - COLS * CELL_SIZE) / 2 + CELL_SIZE / 2;
    const py = block.y * CELL_SIZE + GRID_TOP_OFFSET + CELL_SIZE / 2;
    createExplosionParticles(block.x, block.y, '#f97316', 8);
  }

  const allCollected = koreanNameSet.length > 0 && koreanNameSet.every((c) => collectedKoreanChars[c]);

  if (allCollected) {
    score += 500;
    setStatusMessage('Special characters complete! Bonus triggered!');
    
    // 완성 시 대규모 파티클 효과
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        if (grid[y][x]) {
          createBonusParticles(x, y, 3);
        }
      }
    }
    
    // 강한 화면 흔들림
    addScreenShake(10);
    
    applyKoreanBonus();
    koreanNameSet.forEach((c) => {
      collectedKoreanChars[c] = false;
    });
    updateKoreanCollectionUI();
    updateHud();
  }
}

function applyKoreanBonus() {
  const clearedRows = new Set();
  for (let i = 0; i < 3; i++) {
    const row = Math.floor(Math.random() * ROWS);
    clearedRows.add(row);
  }
  clearedRows.forEach((row) => {
    for (let x = 0; x < COLS; x++) {
      if (grid[row][x]) {
        createBonusParticles(x, row, 5);
      }
      grid[row][x] = null;
    }
  });
  applyGravity();
}

function applyMaterialEffects(materialBlocks) {
  if (!materialBlocks || materialBlocks.length === 0) return 0;
  
  let totalCleared = 0;
  materialBlocks.forEach((block) => {
    if (!block.materialType) {
      // 이전 방식 호환성 (materialType이 없는 경우)
      const type = userMaterial ? userMaterial.toLowerCase() : '';
      let cleared = 0;
      if (type.includes('hologram')) {
        cleared = clearByContent(block.content);
      } else if (type.includes('water')) {
        cleared = clearRow(block.y);
      } else {
        cleared = clearArea(block.x, block.y, 1);
      }
      totalCleared += cleared;
      return;
    }
    
    // Material 타입에 따른 효과 적용
    const materialType = block.materialType;
    let cleared = 0;
    
    switch (materialType.effect) {
      case 'clearByContent':
        // 홀로그램: 같은 내용의 모든 블록 제거
        cleared = clearByContent(block.content);
        break;
      case 'clearRow':
        // 방수: 전체 행 제거
        cleared = clearRow(block.y);
        break;
      case 'clearCross':
        // 엠보: 십자 모양 제거
        cleared = clearCross(block.x, block.y);
        break;
      case 'clearArea':
      default:
        // 종이, 글로시, 매트: 3x3 영역 제거
        cleared = clearArea(block.x, block.y, 1);
        break;
    }
    
    totalCleared += cleared;
  });
  
  return totalCleared;
}

function clearCross(cx, cy) {
  let cleared = 0;
  // 십자 모양으로 제거 (상하좌우)
  const directions = [[0, -1], [0, 1], [-1, 0], [1, 0], [0, 0]]; // 중앙 포함
  directions.forEach(([dx, dy]) => {
    const x = cx + dx;
    const y = cy + dy;
    if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
      if (grid[y][x]) {
        if (grid[y][x].isMatchable) {
          cleared++;
        }
        grid[y][x] = null;
      }
    }
  });
  return cleared;
}

function clearByContent(content) {
  let cleared = 0;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x] && grid[y][x].content === content && grid[y][x].isMatchable) {
        // 매칭 가능한 블록만 카운트 (랜덤 블록 제외)
        grid[y][x] = null;
        cleared++;
      } else if (grid[y][x] && grid[y][x].content === content) {
        // 랜덤 블록도 제거하지만 카운트는 하지 않음
        grid[y][x] = null;
      }
    }
  }
  return cleared;
}

function clearRow(row) {
  if (row < 0 || row >= ROWS) return 0;
  let cleared = 0;
  for (let x = 0; x < COLS; x++) {
    if (grid[row][x]) {
      // 매칭 가능한 블록만 카운트
      if (grid[row][x].isMatchable) {
        cleared++;
      }
      grid[row][x] = null;
    }
  }
  return cleared;
}

function clearArea(cx, cy, radius) {
  let cleared = 0;
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
        if (grid[y][x]) {
          // 매칭 가능한 블록만 카운트
          if (grid[y][x].isMatchable) {
            cleared++;
          }
          grid[y][x] = null;
        }
      }
    }
  }
  return cleared;
}

function drawGrid() {
  // 화면 흔들림 적용
  ctx.save();
  if (screenShake.intensity > 0) {
    screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
    screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
    screenShake.intensity *= 0.9;
    if (screenShake.intensity < 0.1) screenShake.intensity = 0;
    ctx.translate(screenShake.x, screenShake.y);
  }
  
  // 레벨별 배경 테마 가져오기
  const mission = getCurrentLevelMission();
  if (mission && mission.bgTheme) {
    currentLevelTheme = mission.bgTheme;
  }
  
  // 레벨별 배경 그리기
  if (currentLevelTheme) {
    // 레벨별 고정된 배경 테마 사용
    const theme = currentLevelTheme;
    
    // 동적 색상 변화 (레벨 테마 기반)
    backgroundHue = theme.baseHue + Math.sin(gameTime * 0.0005) * 10;
    
    // 레벨별 그라디언트 배경
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    const hue1 = backgroundHue;
    const hue2 = (backgroundHue + 15) % 360;
    const hue3 = (backgroundHue + 30) % 360;
    
    gradient.addColorStop(0, `hsl(${hue1}, ${theme.saturation}%, ${theme.lightness + 2}%)`);
    gradient.addColorStop(0.3, `hsl(${hue2}, ${theme.saturation - 5}%, ${theme.lightness + 4}%)`);
    gradient.addColorStop(0.6, `hsl(${hue3}, ${theme.saturation}%, ${theme.lightness + 1}%)`);
    gradient.addColorStop(1, `hsl(${hue1}, ${theme.saturation}%, ${theme.lightness}%)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else {
    // 기본 배경 (레벨 정보가 없을 때)
    backgroundHue += backgroundHueDirection * 0.1;
    if (backgroundHue > 280 || backgroundHue < 200) {
      backgroundHueDirection *= -1;
    }
    
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    const hue1 = backgroundHue;
    const hue2 = (backgroundHue + 20) % 360;
    const hue3 = (backgroundHue + 40) % 360;
    gradient.addColorStop(0, `hsl(${hue1}, 70%, 8%)`);
    gradient.addColorStop(0.3, `hsl(${hue2}, 60%, 12%)`);
    gradient.addColorStop(0.6, `hsl(${hue3}, 65%, 10%)`);
    gradient.addColorStop(1, `hsl(${hue1}, 70%, 6%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // 움직이는 별들 (레벨별 색상 적용)
  if (backgroundStars && backgroundStars.length) {
    backgroundStars.forEach((star, index) => {
      const speed = star.speed || 1;
      const t = gameTime * 0.001 * speed + star.phase;
      const alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2));
      const size = star.radius * (1 + 0.4 * Math.sin(t * 3));
      
      // 레벨별 테마에 맞는 별 색상
      let starHue;
      if (currentLevelTheme) {
        starHue = (currentLevelTheme.baseHue + index * 3 + Math.sin(t) * 20) % 360;
      } else {
        starHue = (backgroundHue + index * 5) % 360;
      }
      
      // 별 본체
      ctx.fillStyle = `hsla(${starHue}, 85%, 75%, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // 별 주변 글로우 (더 강하게)
      ctx.save();
      ctx.shadowBlur = 10 + size * 2;
      ctx.shadowColor = `hsl(${starHue}, 85%, 75%)`;
      ctx.fill();
      ctx.restore();
      
      // 별 중심 하이라이트
      ctx.fillStyle = `hsla(${starHue}, 100%, 90%, ${alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  
  // 파티클 렌더링
  particles.forEach(particle => {
    particle.draw(ctx);
  });

  // 그리드 그리기
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const cell = grid[y][x];
      if (cell) {
        drawCell(x, y, cell);
      } else {
        // 그리드 라인을 더 화려하게
        const px = x * CELL_SIZE + (CANVAS_WIDTH - COLS * CELL_SIZE) / 2;
        const py = y * CELL_SIZE + GRID_TOP_OFFSET;
        const alpha = 0.1 + 0.1 * Math.sin(gameTime * 0.002 + x + y);
        ctx.strokeStyle = `hsla(${backgroundHue}, 60%, 60%, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, CELL_SIZE, CELL_SIZE);
      }
    }
  }

  // 현재 블록에 트레일 효과
  if (currentBlock) {
    // 트레일 (2개 레이어)
    for (let i = 1; i <= 2; i++) {
      const trailY = currentBlock.y + i;
      if (trailY < ROWS) {
        ctx.save();
        ctx.globalAlpha = 0.2 / i;
        drawCell(currentBlock.x, trailY, {
          ...currentBlock,
          color: currentBlock.color
        });
        ctx.restore();
      }
    }
    drawCell(currentBlock.x, currentBlock.y, currentBlock);
  }
  
  ctx.restore();
}

function drawPauseOverlay() {
  // 반투명 배경
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // 일시정지 텍스트
  ctx.save();
  ctx.font = 'bold 36px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
  ctx.shadowBlur = 20;
  ctx.fillText('PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
  
  ctx.font = '16px Arial';
  ctx.shadowBlur = 10;
  ctx.fillText('Press SPACE or P to Resume', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
  ctx.restore();
}

function drawGameOverOverlay() {
  // 반투명 배경
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // GAME OVER 텍스트
  ctx.save();
  ctx.font = 'bold 48px Arial';
  ctx.fillStyle = '#ef4444';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
  ctx.shadowBlur = 30;
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
  
  // 서브 메시지
  ctx.font = '18px Arial';
  ctx.fillStyle = '#fca5a5';
  ctx.shadowColor = 'rgba(252, 165, 165, 0.6)';
  ctx.shadowBlur = 15;
  ctx.fillText('Blocks reached the top row', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
  
  // 안내 메시지
  ctx.font = '14px Arial';
  ctx.fillStyle = '#cbd5e1';
  ctx.shadowBlur = 10;
  ctx.fillText('Click Play Again button to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
  ctx.restore();
}

function drawCell(x, y, block) {
  const px = x * CELL_SIZE + (CANVAS_WIDTH - COLS * CELL_SIZE) / 2;
  const py = y * CELL_SIZE + GRID_TOP_OFFSET;

  // 3D 입체형 블록 설정
  const depth = 4; // 블록 깊이 (픽셀)
  const offsetX = 3; // 등각 투영 X 오프셋
  const offsetY = 2; // 등각 투영 Y 오프셋
  
  // 투명도 설정
  let alpha = 1.0;
  if (block.isRandomBlock) {
    alpha = 0.7;
  } else if (block.isSelpicBlock && block.selpicType) {
    const selpicType = block.selpicType;
    if (selpicType.pattern === 'shimmer') {
      alpha = Math.sin(gameTime * 0.01 + x + y) * 0.3 + 0.7;
    }
  }
  
  ctx.save();
  ctx.globalAlpha = alpha;
  
  // 블록 색상 설정
  const baseColor = block.color;
  const lightColor = adjustBrightness(baseColor, 40); // 밝은 면
  const darkColor = adjustBrightness(baseColor, -40); // 어두운 면
  const topColor = adjustBrightness(baseColor, 20); // 상단 면
  
  // 3D 박스 그리기 (등각 투영)
  // 1. 상단 면 (가장 밝음)
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + CELL_SIZE, py);
  ctx.lineTo(px + CELL_SIZE + offsetX, py - offsetY);
  ctx.lineTo(px + offsetX, py - offsetY);
  ctx.closePath();
  ctx.fillStyle = topColor;
  ctx.fill();
  
  // 상단 면 하이라이트
  const topGradient = ctx.createLinearGradient(px, py, px + CELL_SIZE, py - offsetY);
  topGradient.addColorStop(0, adjustBrightness(topColor, 30));
  topGradient.addColorStop(1, topColor);
  ctx.fillStyle = topGradient;
  ctx.fill();
  
  // 2. 오른쪽 면 (중간 밝기)
  ctx.beginPath();
  ctx.moveTo(px + CELL_SIZE, py);
  ctx.lineTo(px + CELL_SIZE + offsetX, py - offsetY);
  ctx.lineTo(px + CELL_SIZE + offsetX, py + CELL_SIZE - offsetY);
  ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
  ctx.closePath();
  ctx.fillStyle = baseColor;
  ctx.fill();
  
  // 오른쪽 면 그라디언트
  const rightGradient = ctx.createLinearGradient(px + CELL_SIZE, py, px + CELL_SIZE + offsetX, py);
  rightGradient.addColorStop(0, adjustBrightness(baseColor, 10));
  rightGradient.addColorStop(1, darkColor);
  ctx.fillStyle = rightGradient;
  ctx.fill();
  
  // 3. 앞면 (메인 면)
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + CELL_SIZE, py);
  ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
  ctx.lineTo(px, py + CELL_SIZE);
  ctx.closePath();
  
  // 앞면 그라디언트
  const frontGradient = ctx.createLinearGradient(px, py, px + CELL_SIZE, py + CELL_SIZE);
  frontGradient.addColorStop(0, lightColor);
  frontGradient.addColorStop(0.5, baseColor);
  frontGradient.addColorStop(1, adjustBrightness(baseColor, -20));
  ctx.fillStyle = frontGradient;
  ctx.fill();
  
  // SELPIC 블록 특수 효과
  if (block.isSelpicBlock && block.selpicType) {
    const selpicType = block.selpicType;
    if (selpicType.pattern === 'shimmer') {
      // SELPIC: 무지개 효과
      const shimmerGradient = ctx.createLinearGradient(px, py, px + CELL_SIZE, py + CELL_SIZE);
      const hue = (gameTime * 0.1 + x + y) % 360;
      shimmerGradient.addColorStop(0, `hsl(${hue}, 70%, 60%)`);
      shimmerGradient.addColorStop(0.5, `hsl(${(hue + 60) % 360}, 70%, 60%)`);
      shimmerGradient.addColorStop(1, `hsl(${(hue + 120) % 360}, 70%, 60%)`);
      ctx.fillStyle = shimmerGradient;
      ctx.fill();
    }
  }
  
  // 테두리 (3D 효과를 위한)
  ctx.strokeStyle = adjustBrightness(baseColor, -30);
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // 글로우 효과
  if (block.isKoreanCollectionBlock) {
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#f97316';
  } else if (block.isSelpicBlock) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = block.color;
  } else if (!block.isRandomBlock) {
    ctx.shadowBlur = 4;
    ctx.shadowColor = block.color;
  }
  
  ctx.restore();

  // 텍스트에 그림자 효과 (3D 블록 위에 표시)
  ctx.save();
  
  // 3D 블록의 앞면 중앙에 텍스트 표시
  const textX = px + CELL_SIZE / 2;
  const textY = py + CELL_SIZE / 2;
  
  if (block.isRandomBlock) {
    // 랜덤 블록 텍스트는 약간 더 밝게
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#e2e8f0';
    ctx.shadowBlur = 3;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = String(block.content).slice(0, 5);
    ctx.fillText(text, textX, textY);
  } else if (block.isSelpicBlock && block.selpicType) {
    // SELPIC 블록 텍스트 (아이콘 포함)
    const selpicType = block.selpicType;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 아이콘과 텍스트 함께 표시
    const icon = selpicType.icon || '';
    const text = String(block.content).slice(0, 4);
    ctx.fillText(icon + ' ' + text, textX, textY);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 3;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = String(block.content).slice(0, 5);
    ctx.fillText(text, textX, textY);
  }
  ctx.restore();
}

function adjustBrightness(color, amount) {
  // 간단한 밝기 조정 (hex 색상)
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

let lastTimestamp = 0;

function gameLoop(timestamp) {
  if (!isGameStarted) {
    // 게임이 시작되지 않았으면 화면만 그리고 리턴
    drawGrid();
    requestAnimationFrame(gameLoop);
    return;
  }
  
  // 게임 오버일 때는 화면을 그리고 오버레이 표시
  if (isGameOver) {
    drawGrid();
    drawGameOverOverlay();
    requestAnimationFrame(gameLoop);
    return;
  }
  
  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  
  // 일시정지 중에는 화면만 다시 그리고 게임 로직은 건너뛰기
  if (isPaused) {
    drawGrid();
    // 일시정지 메시지 오버레이 그리기
    drawPauseOverlay();
    requestAnimationFrame(gameLoop);
    return;
  }
  
  gameTime += delta;

  // 파티클 업데이트
  particles = particles.filter(particle => {
    particle.update();
    return !particle.isDead();
  });

  handleInput();
  updateFall(delta);
  drawGrid();

  requestAnimationFrame(gameLoop);
}

function setupInput() {
  window.addEventListener('keydown', (e) => {
    // 일시정지 단축키 (SPACE 또는 P)
    if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
      if (!isGameOver) {
        e.preventDefault();
        togglePause();
      }
      return;
    }
    
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
    }
    
    // 일시정지 중에는 게임 입력 무시
    if (isPaused) return;
    
    if (e.key === 'ArrowLeft') {
      inputQueue.push('left');
    } else if (e.key === 'ArrowRight') {
      inputQueue.push('right');
    } else if (e.key === 'ArrowDown') {
      inputQueue.push('down');
    }
  });

  const restartButton = document.getElementById('restartButton');
  if (restartButton) {
    restartButton.addEventListener('click', () => {
      resetGame();
    });
  }
  
  const pauseButton = document.getElementById('pauseButton');
  if (pauseButton) {
    pauseButton.addEventListener('click', () => {
      togglePause();
    });
  }
}

// Web Audio API를 사용한 프로그래밍 방식 배경음악 생성
let audioContext = null;
let musicGainNode = null;
let isMusicPlaying = false;
let musicTimeoutId = null;

// 사운드 효과용 AudioContext (별도로 관리)
let soundContext = null;

// 전역 음악 제어 함수 (일시정지에서 사용)
let pauseMusic = null;
let resumeMusic = null;
let playMusic = null; // 게임 시작 시 음악 재생
let stopMusic = null; // 게임 오버 시 음악 완전 정지

function generateBackgroundMusic() {
  try {
    // AudioContext 생성 (브라우저 호환성 고려)
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported');
      return null;
    }

    // AudioContext는 사용자 상호작용 시점에 생성 (브라우저 정책 준수)
    // 여기서는 함수만 반환하고, 실제 생성은 start()에서 수행

    // 간단한 멜로디 생성 (C major 스케일 기반)
    const notes = [
      261.63, // C4
      293.66, // D4
      329.63, // E4
      349.23, // F4
      392.00, // G4
      440.00, // A4
      493.88, // B4
      523.25  // C5
    ];

    const melody = [0, 2, 4, 2, 0, 4, 2, 0, 4, 5, 4, 2, 0, 2, 4, 2]; // 간단한 멜로디 패턴
    let noteIndex = 0;
    const noteDuration = 0.4; // 각 음표 길이 (초)

    function playNextNote() {
      if (!audioContext || !isMusicPlaying) {
        return;
      }

      // AudioContext가 suspended 상태면 resume
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          if (isMusicPlaying) {
            playNextNote();
          }
        }).catch(err => {
          console.error('Failed to resume audio context:', err);
        });
        return;
      }

      if (audioContext.state !== 'running') {
        return;
      }

      const note = notes[melody[noteIndex % melody.length]];
      noteIndex++;

      try {
        // 오실레이터 생성 (사인파)
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = note;

        // 부드러운 페이드 인/아웃
        const now = audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.15, now + noteDuration - 0.05);
        gainNode.gain.linearRampToValueAtTime(0, now + noteDuration);

        oscillator.connect(gainNode);
        gainNode.connect(musicGainNode);

        oscillator.start(now);
        oscillator.stop(now + noteDuration);

        // 다음 음표 스케줄링
        musicTimeoutId = setTimeout(() => {
          if (isMusicPlaying && audioContext && audioContext.state === 'running') {
            playNextNote();
          }
        }, noteDuration * 1000);
      } catch (err) {
        console.error('Error playing note:', err);
      }
    }

    return {
      start: async () => {
        // AudioContext 생성 (사용자 상호작용 시점에 생성)
        if (!audioContext) {
          try {
            audioContext = new AudioContextClass();
            musicGainNode = audioContext.createGain();
            musicGainNode.gain.value = 0.25; // 볼륨 조절 (0.25 = 25%)
            musicGainNode.connect(audioContext.destination);
            console.log('AudioContext created');
          } catch (err) {
            console.error('Failed to create AudioContext:', err);
            return;
          }
        }

        isMusicPlaying = true;
        
        // AudioContext가 suspended 상태면 resume
        if (audioContext.state === 'suspended') {
          try {
            await audioContext.resume();
            console.log('AudioContext resumed, state:', audioContext.state);
          } catch (err) {
            console.error('Failed to resume audio context:', err);
            isMusicPlaying = false;
            return;
          }
        }

        // 첫 음표 재생
        console.log('Starting to play notes, AudioContext state:', audioContext.state);
        playNextNote();
      },
      stop: () => {
        isMusicPlaying = false;
        if (musicTimeoutId) {
          clearTimeout(musicTimeoutId);
          musicTimeoutId = null;
        }
        if (audioContext && audioContext.state === 'running') {
          audioContext.suspend().catch(err => {
            console.error('Failed to suspend audio context:', err);
          });
        }
      },
      isPlaying: () => {
        return isMusicPlaying && audioContext && audioContext.state === 'running';
      }
    };
  } catch (err) {
    console.error('Failed to generate background music:', err);
    return null;
  }
}

function setupMusicControls() {
  const audio = document.getElementById('bgm');
  const toggle = document.getElementById('musicToggle');
  if (!audio || !toggle) {
    console.warn('Music controls not found');
    return;
  }

  let isPlaying = false;
  let wasPlayingBeforePause = false; // 일시정지 전 음악 재생 상태 저장
  let audioAvailable = false;
  let generatedMusic = null;

  // 오디오 파일 존재 여부 확인
  const checkAudioAvailability = () => {
    // 오디오가 로드되었는지 확인
    if (audio.readyState >= 2) { // HAVE_CURRENT_DATA 이상
      audioAvailable = true;
      return true;
    }
    return false;
  };

  // 오디오 로드 성공 - 파일 음악 사용
  audio.addEventListener('loadeddata', () => {
    console.log('Background music loaded from file:', audio.src);
    audioAvailable = true;
    // 생성된 음악은 사용하지 않음 (파일이 있으므로)
    if (generatedMusic) {
      generatedMusic.stop();
      generatedMusic = null;
    }
    toggle.disabled = false;
    updateLabel();
    setStatusMessage('저장된 음악 파일이 로드되었습니다.');
  });

  // 오디오 로드 완료 (모든 데이터 로드됨)
  audio.addEventListener('canplaythrough', () => {
    console.log('Audio file can play through:', audio.src);
    // 파일이 완전히 로드되었으므로 생성된 음악 비활성화
    if (generatedMusic) {
      generatedMusic.stop();
      generatedMusic = null;
    }
  });

  // 오디오 로드 실패 (파일 없음 또는 형식 오류) - 생성된 음악 사용
  audio.addEventListener('error', (e) => {
    console.error('Audio file load error:', e);
    console.log('Audio file not found:', audio.src);
    console.log('Using generated music instead');
    
    // 파일이 없으므로 생성된 음악 초기화 (한 번만)
    if (!generatedMusic) {
      generatedMusic = generateBackgroundMusic();
    }
    if (generatedMusic) {
      audioAvailable = true; // 생성된 음악 사용 가능
      toggle.disabled = false;
      updateLabel();
      setStatusMessage('음악 파일을 찾을 수 없어 생성된 음악을 사용합니다. MP3 파일을 추가하면 저장된 음악이 재생됩니다.');
    } else {
      toggle.disabled = true;
      toggle.textContent = '🎵 Music: Not Available';
      toggle.title = 'Web Audio API를 지원하지 않는 브라우저입니다.';
      setStatusMessage('음악을 재생할 수 없습니다. 게임은 정상 작동합니다.');
    }
  });

  // 오디오 로드 시도 (파일이 없으면 error 이벤트 발생)
  audio.load();

  // 파일 로드 확인 (더 긴 타임아웃으로 변경)
  setTimeout(() => {
    const isFileLoaded = checkAudioAvailability();
    console.log('Audio file check after timeout:', {
      readyState: audio.readyState,
      isFileLoaded: isFileLoaded,
      hasGeneratedMusic: !!generatedMusic,
      src: audio.src
    });

    // 파일이 로드되지 않았고, 생성된 음악도 없으면 생성된 음악 사용
    if (!isFileLoaded && !generatedMusic && !toggle.disabled) {
      console.log('Audio file not found after timeout, using generated music');
      generatedMusic = generateBackgroundMusic();
      if (generatedMusic) {
        audioAvailable = true;
        toggle.disabled = false;
        updateLabel();
        setStatusMessage('음악 파일을 찾을 수 없어 생성된 음악을 사용합니다. MP3 파일을 추가하면 저장된 음악이 재생됩니다.');
      }
    }
  }, 3000); // 타임아웃을 2초에서 3초로 증가

  const updateLabel = () => {
    if (toggle.disabled) return;
    toggle.textContent = isPlaying ? '⏸️ Music: ON' : '🎵 Music: OFF';
    if (isPlaying) {
      toggle.classList.add('playing');
    } else {
      toggle.classList.remove('playing');
    }
  };

  toggle.addEventListener('click', async () => {
    if (toggle.disabled || !audioAvailable) {
      if (!generatedMusic) {
        setStatusMessage('음악을 재생할 수 없습니다.');
      }
      return;
    }
    
    try {
      if (!isPlaying) {
        // 파일이 로드되었는지 확인 (readyState >= 2: HAVE_CURRENT_DATA 이상)
        const isFileLoaded = audio.readyState >= 2 && !audio.error;
        
        if (isFileLoaded) {
          // 파일 음악 재생 (우선순위 1)
          console.log('Playing audio file:', audio.src);
          console.log('Audio readyState:', audio.readyState);
          
          // 생성된 음악이 재생 중이면 먼저 정지
          if (generatedMusic) {
            generatedMusic.stop();
          }
          
          await audio.play();
          isPlaying = true;
          setStatusMessage('저장된 음악이 재생됩니다!');
        } else if (generatedMusic) {
          // 생성된 음악 재생 (파일이 없을 때만)
          console.log('Starting generated music (file not available)');
          console.log('Audio readyState:', audio.readyState, 'error:', audio.error);
          
          // 파일 재생 중이면 먼저 정지
          if (audio.readyState >= 2) {
            audio.pause();
            audio.currentTime = 0;
          }
          
          await generatedMusic.start();
          isPlaying = true;
          setStatusMessage('생성된 음악이 재생됩니다!');
          console.log('Generated music started, isPlaying:', isPlaying);
        } else {
          console.warn('No audio source available');
          setStatusMessage('음악 소스를 찾을 수 없습니다.');
        }
      } else {
        // 음악 정지
        console.log('Stopping music...');
        
        // 파일 음악 정지
        if (audio.readyState >= 2) {
          audio.pause();
          audio.currentTime = 0; // 처음부터 재생되도록
        }
        
        // 생성된 음악 정지
        if (generatedMusic) {
          generatedMusic.stop();
        }
        
        isPlaying = false;
        wasPlayingBeforePause = false; // 수동으로 정지했으므로 일시정지 전 상태도 초기화
        setStatusMessage('음악이 정지되었습니다.');
      }
      updateLabel();
    } catch (err) {
      console.error('Failed to play background music:', err);
      // 더 구체적인 에러 메시지
      if (err.name === 'NotAllowedError') {
        setStatusMessage('브라우저가 음악 재생을 차단했습니다. 브라우저 설정에서 사이트 소리를 허용해주세요.');
      } else if (err.name === 'NotSupportedError') {
        setStatusMessage('오디오 형식을 지원하지 않습니다. MP3 파일을 확인해주세요.');
      } else {
        setStatusMessage(`음악 재생 실패: ${err.message || '알 수 없는 오류'}`);
      }
      isPlaying = false;
      updateLabel();
    }
  });

  // 오디오 재생 상태 추적
  audio.addEventListener('play', () => {
    isPlaying = true;
    updateLabel();
  });

  audio.addEventListener('pause', () => {
    isPlaying = false;
    updateLabel();
  });

  audio.addEventListener('ended', () => {
    // loop 속성이 있으면 ended 이벤트가 발생하지 않지만, 혹시 모르니
    isPlaying = false;
    updateLabel();
  });

  // 초기 상태 설정
  if (checkAudioAvailability()) {
    updateLabel();
  } else {
    toggle.disabled = true;
    toggle.textContent = '🎵 Music: Loading...';
  }

  // 전역 음악 제어 함수 설정 (일시정지에서 사용)
  pauseMusic = () => {
    // 일시정지 전 음악 재생 상태 저장
    wasPlayingBeforePause = isPlaying;
    
    if (isPlaying) {
      // 파일 음악 정지
      if (audio.readyState >= 2) {
        audio.pause();
      }
      // 생성된 음악 정지
      if (generatedMusic) {
        generatedMusic.stop();
      }
      // isPlaying 상태는 유지하지 않음 (실제로는 정지되었으므로)
      // 대신 wasPlayingBeforePause에 저장된 상태를 사용
    }
  };

  resumeMusic = async () => {
    // 일시정지 전에 재생 중이 아니었으면 무시
    if (!wasPlayingBeforePause) {
      return;
    }

    if (toggle.disabled || !audioAvailable) {
      return; // 음악을 재생할 수 없으면 무시
    }

    try {
      // 일시정지 전에 재생 중이었으면 다시 재생
      const isFileLoaded = audio.readyState >= 2 && !audio.error;
      
      if (isFileLoaded) {
        // 파일 음악 재생
        console.log('Resuming audio file after pause');
        
        // 생성된 음악이 재생 중이면 먼저 정지
        if (generatedMusic) {
          generatedMusic.stop();
        }
        
        await audio.play();
        isPlaying = true;
        updateLabel();
      } else if (generatedMusic) {
        // 생성된 음악 재생
        console.log('Resuming generated music after pause');
        
        // 파일 재생 중이면 먼저 정지
        if (audio.readyState >= 2) {
          audio.pause();
          audio.currentTime = 0;
        }
        
        await generatedMusic.start();
        isPlaying = true;
        updateLabel();
      }
      
      // 재생 상태 초기화
      wasPlayingBeforePause = false;
    } catch (err) {
      console.warn('Failed to resume music after pause:', err);
      wasPlayingBeforePause = false;
      // 에러가 발생해도 게임은 계속 진행
    }
  };

  // 레벨별 배경 음악을 설정하는 함수 (외부에서 호출)
  setLevelMusicForLevel = async (level, forceAutoPlay = false) => {
    if (!audio || !LEVEL_MUSIC_SOURCES || !LEVEL_MUSIC_SOURCES.length) return;
    const index = Math.max(0, Math.min(level - 1, LEVEL_MUSIC_SOURCES.length - 1));
    const src = LEVEL_MUSIC_SOURCES[index];
    if (!src) return;

    console.log(`Setting music for level ${level}: ${src} (index: ${index}), forceAutoPlay: ${forceAutoPlay}`);

    // 레벨 변경 전 음악 재생 상태 저장 (음악 정지 전에 확인)
    // forceAutoPlay가 true이면 강제 재생, false이면 재생 안 함, undefined이면 현재 상태 확인
    let wasMusicPlaying = false;
    if (forceAutoPlay === true) {
      wasMusicPlaying = true; // 강제 재생 (게임 시작 시)
    } else if (forceAutoPlay === false) {
      wasMusicPlaying = false; // 재생 안 함 (명시적으로 false 전달)
    } else {
      // forceAutoPlay가 전달되지 않았거나 undefined이면 현재 상태 확인
      wasMusicPlaying = isPlaying || (audio.readyState >= 2 && !audio.paused);
    }

    // 현재 재생 중인 음악 정지
    try {
      if (audio && audio.readyState >= 2) {
        audio.pause();
        audio.currentTime = 0;
      }
    } catch (e) {
      console.warn('Error stopping audio before switching level music:', e);
    }

    if (generatedMusic) {
      try {
        generatedMusic.stop();
      } catch (e) {
        console.warn('Error stopping generated music before switching level music:', e);
      }
      generatedMusic = null;
    }

    // 새로운 소스로 교체
    const oldSrc = audio.src;
    audio.src = src;
    audio.load();

    // 상태 초기화 (재생 상태는 유지하지 않음, 로드 후 다시 재생)
    isPlaying = false;
    audioAvailable = false;
    // wasPlayingBeforePause는 유지하지 않음 (레벨 변경이므로)

    if (toggle) {
      toggle.disabled = true;
      toggle.textContent = '🎵 Music: Loading...';
    }

    // 음악 로드 후 자동 재생 조건:
    // 1. forceAutoPlay가 true이면 강제 재생
    // 2. 또는 게임이 진행 중이고 일시정지 상태가 아니고 게임 오버가 아니고 이전에 음악이 재생 중이었으면
    const shouldAutoPlay = forceAutoPlay === true || (isGameStarted && !isPaused && !isGameOver && wasMusicPlaying);
    
    audio.addEventListener('canplaythrough', async function onCanPlay() {
      audio.removeEventListener('canplaythrough', onCanPlay);
      
      if (toggle) {
        toggle.disabled = false;
        updateLabel();
      }
      
      audioAvailable = true;
      
      // 자동 재생이 필요한 경우 (이전에 재생 중이었고, 게임이 진행 중이면)
      if (shouldAutoPlay && playMusic) {
        try {
          await playMusic();
          console.log(`Level ${level} music auto-played: ${src} (forceAutoPlay: ${forceAutoPlay})`);
        } catch (err) {
          console.warn('Failed to auto-play level music:', err);
        }
      } else {
        console.log(`Level ${level} music loaded but not auto-playing (wasPlaying: ${wasMusicPlaying}, gameStarted: ${isGameStarted}, paused: ${isPaused}, forceAutoPlay: ${forceAutoPlay})`);
      }
    }, { once: true });

    // 로드 실패 시 처리
    audio.addEventListener('error', function onError() {
      audio.removeEventListener('error', onError);
      console.warn(`Failed to load music for level ${level}: ${src}`);
      if (toggle) {
        toggle.disabled = false;
        updateLabel();
      }
    }, { once: true });
  };

  // 게임 오버 시 음악 완전 정지 함수
  stopMusic = () => {
    // 재생 상태 완전히 초기화
    wasPlayingBeforePause = false;
    isPlaying = false;
    
    // 전역 isMusicPlaying도 false로 설정 (generatedMusic용)
    if (typeof isMusicPlaying !== 'undefined') {
      isMusicPlaying = false;
    }
    
    // musicTimeoutId 정리
    if (musicTimeoutId) {
      clearTimeout(musicTimeoutId);
      musicTimeoutId = null;
    }
    
    // 파일 음악 정지 및 리셋
    try {
      if (audio && audio.readyState >= 2) {
        audio.pause();
        audio.currentTime = 0; // 처음부터 재생되도록 리셋
      }
    } catch (e) {
      console.warn('Error stopping audio file:', e);
    }
    
    // 생성된 음악 정지
    try {
      if (generatedMusic) {
        generatedMusic.stop();
      }
    } catch (e) {
      console.warn('Error stopping generated music:', e);
    }
    
    // AudioContext도 정지
    try {
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.suspend();
      }
    } catch (e) {
      console.warn('Error suspending audio context:', e);
    }
    
    // UI 업데이트
    updateLabel();
  };

  // 게임 시작 시 음악 자동 재생 함수
  playMusic = async () => {
    if (toggle.disabled || !audioAvailable) {
      return; // 음악을 재생할 수 없으면 무시
    }

    if (isPlaying) {
      return; // 이미 재생 중이면 무시
    }

    try {
      // 파일이 로드되었는지 확인 (readyState >= 2: HAVE_CURRENT_DATA 이상)
      const isFileLoaded = audio.readyState >= 2 && !audio.error;
      
      if (isFileLoaded) {
        // 파일 음악 재생 (우선순위 1)
        console.log('Auto-playing audio file on game start:', audio.src);
        
        // 생성된 음악이 재생 중이면 먼저 정지
        if (generatedMusic) {
          generatedMusic.stop();
        }
        
        await audio.play();
        isPlaying = true;
        updateLabel();
      } else if (generatedMusic) {
        // 생성된 음악 재생 (파일이 없을 때만)
        console.log('Auto-playing generated music on game start');
        
        // 파일 재생 중이면 먼저 정지
        if (audio.readyState >= 2) {
          audio.pause();
          audio.currentTime = 0;
        }
        
        await generatedMusic.start();
        isPlaying = true;
        updateLabel();
      }
    } catch (err) {
      console.warn('Failed to auto-play music on game start:', err);
      // 에러가 발생해도 게임은 계속 진행
    }
  };
}

function setupSidebarToggle() {
  const sidebar = document.getElementById('gameSidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarCloseButton = document.getElementById('sidebarCloseButton');
  const gameLayout = document.querySelector('.game-layout');
  
  if (!sidebar || !gameLayout) return;

  const toggleSidebar = () => {
    gameLayout.classList.toggle('sidebar-collapsed');
    const isCollapsed = gameLayout.classList.contains('sidebar-collapsed');
    const toggleIcon = document.getElementById('sidebarToggleIcon');
    if (toggleIcon) {
      toggleIcon.textContent = isCollapsed ? '▶' : '◀';
    }
  };

  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', toggleSidebar);
  }

  if (sidebarCloseButton) {
    sidebarCloseButton.addEventListener('click', toggleSidebar);
  }
}

function startGame() {
  if (isGameStarted) return;
  
  isGameStarted = true;
  isGameOver = false;
  isPaused = false;
  
  // 시작 화면 숨기기
  const startScreen = document.getElementById('startScreen');
  if (startScreen) {
    startScreen.style.display = 'none';
  }
  
  // 게임 초기화 (resetGame 내부에서 음악 자동 재생됨)
  resetGame();
  
  // 게임 루프 시작
  requestAnimationFrame((ts) => {
    lastTimestamp = ts;
    requestAnimationFrame(gameLoop);
  });
  
  setStatusMessage('Game Started! Collect characters and match blocks!');
}

function init() {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }
  ctx = canvas.getContext('2d');
  parseUrlConfig();
  initGrid();
  initBackgroundStars();
  initNameSets();
  setupInput();
  setupMusicControls();
  setupSidebarToggle();
  updatePauseButton();
  // initPromoBanner(); // 슬라이드 홍보 배너 초기화 - 헤더로 이동됨
  
  // 시작 버튼 이벤트 리스너
  const startButton = document.getElementById('startButton');
  if (startButton) {
    startButton.addEventListener('click', startGame);
  }
  
  // 튜토리얼 버튼 이벤트 리스너
  const tutorialButton = document.getElementById('tutorialButton');
  const tutorialModal = document.getElementById('tutorialModal');
  const tutorialClose = document.getElementById('tutorialClose');
  const tutorialStartButton = document.getElementById('tutorialStartButton');
  
  if (tutorialButton && tutorialModal) {
    tutorialButton.addEventListener('click', () => {
      tutorialModal.classList.remove('hidden');
    });
  }
  
  if (tutorialClose) {
    tutorialClose.addEventListener('click', () => {
      tutorialModal.classList.add('hidden');
    });
  }
  
  if (tutorialStartButton) {
    tutorialStartButton.addEventListener('click', () => {
      tutorialModal.classList.add('hidden');
      startGame();
    });
  }
  
  // 튜토리얼 모달 외부 클릭 시 닫기
  if (tutorialModal) {
    tutorialModal.addEventListener('click', (e) => {
      if (e.target === tutorialModal) {
        tutorialModal.classList.add('hidden');
      }
    });
  }
  
  // 초기 화면 그리기 (게임 시작 전)
  drawGrid();
  updateHud();
  
  // 게임 루프는 시작하지 않음 (버튼 클릭 시 시작)
  requestAnimationFrame((ts) => {
    lastTimestamp = ts;
    requestAnimationFrame(gameLoop);
  });
}

// 슬라이드 홍보 배너 초기화 (게임 로직과 완전히 분리)
function initPromoBanner() {
  const banner = document.getElementById('promoBanner');
  if (!banner) return;
  
  const company = banner.querySelector('.promo-company');
  
  
  function startAnimation() {
    const words = banner.querySelectorAll('.promo-word');
    
    if (words.length === 0) return;
    
    // 모든 단어 초기화
    words.forEach((word) => {
      word.style.opacity = '0';
      word.classList.remove('active');
    });
    
    // 단어별 롤링 순서 정의
    // "Stick" (0), "it" (1), "stamp" (2), "it" (3), "you little ripper!" (4)
    const wordTimings = [
      { index: 0, delay: 0 },      // "Stick" - 롤링
      { index: 1, delay: 600 },     // "it" - 롤링
      { index: 2, delay: 1200 },    // "stamp" - 롤링
      { index: 3, delay: 1800 },    // "it" - 롤링
      { index: 4, delay: 2400 },    // "you little ripper!" - bounce-in (강조 색상)
    ];
    
    // 각 단어를 순차적으로 표시
    wordTimings.forEach(({ index, delay }) => {
      if (words[index]) {
        setTimeout(() => {
          words[index].style.opacity = '1';
          words[index].classList.add('active');
        }, delay);
      }
    });
    
    // 모든 단어가 표시된 후 (약 4.5초 후) SELPIC 도장 효과
    setTimeout(() => {
      // 모든 단어 페이드 아웃
      words.forEach(word => {
        word.style.transition = 'opacity 0.5s ease-out';
        word.style.opacity = '0';
        word.classList.remove('active');
      });
      
      // SELPIC 도장 효과
      if (company) {
        // 애니메이션을 위해 초기 상태 리셋
        company.style.opacity = '0';
        company.style.transform = 'translate(-50%, -50%) scale(0)';
        company.style.animation = 'none';
        
        // 약간의 지연 후 애니메이션 시작 (리플로우 트리거)
        setTimeout(() => {
          company.style.animation = '';
          company.classList.add('stamp-in');
          company.style.opacity = '1';
        }, 10);
      }
    }, 4500);
    
    // SELPIC도 페이드 아웃 후 다시 시작
    setTimeout(() => {
      if (company) {
        company.style.transition = 'opacity 0.5s ease-out';
        company.style.opacity = '0';
      }
      
      // 모든 요소 리셋
      setTimeout(() => {
        words.forEach(word => {
          word.style.opacity = '0';
          word.style.transition = 'none';
          word.style.animation = 'none';
          word.classList.remove('active');
        });
        if (company) {
          company.classList.remove('stamp-in');
          company.style.opacity = '0';
          company.style.transition = 'none';
          company.style.animation = 'none';
        }
        
        // 애니메이션 재시작
        setTimeout(() => {
          words.forEach(word => {
            word.style.animation = '';
          });
          startAnimation();
        }, 100);
      }, 500);
    }, 5500);
  }
  
  // 애니메이션 시작
  startAnimation();
}

window.addEventListener('load', init);


