export type FontUsageType = 'sticker' | 'stamp' | 'designer'

export interface FontConfig {
  id: string                    // 내부 식별자
  displayName: string           // UI에 표시할 영어 명칭 (호주 고객용)
  fontFamily: string            // CSS font-family 값 (실제 폰트 이름)
  supportsKorean: boolean       // 한글 지원 여부
  lang: 'ko' | 'en' | 'both'   // 주요 사용 언어
  type: FontUsageType           // 사용 위치
  googleFontsUrl?: string       // Google Fonts URL (있는 경우)
  machineName: string           // 자판기에서 선택할 실제 폰트명
}

// ✅ 스템프존 자판기 연동용 폰트 리스트
export const FONT_LIST: FontConfig[] = [
  // Font 1: Andika (스티커용, 읽기 쉬운 산세리프)
  {
    id: 'andika',
    displayName: 'Font 1',
    fontFamily: '"Andika", "Andika New", sans-serif',
    supportsKorean: false,
    lang: 'en',
    type: 'sticker',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Andika:ital,wght@0,400;0,700;1,400;1,700&display=swap',
    machineName: 'Andika'
  },
  // Font 7: 궁서체 스타일 (스티커용)
  {
    id: 'nanum-myeongjo',
    displayName: 'Font 7',
    fontFamily: '"Gungsuh", "궁서", "Nanum Myeongjo", "나눔명조", "Noto Serif KR", serif',
    supportsKorean: true,
    lang: 'both',
    type: 'sticker',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&display=swap',
    machineName: 'Nanum Myeongjo'
  },
  // Font 3: Edu NSW ACT Foundation (NSW·ACT 교육용 손글씨 폰트)
  {
    id: 'edu-nsw-act-foundation',
    displayName: 'Font 2',
    fontFamily: '"Edu NSW ACT Foundation", cursive',
    supportsKorean: false,
    lang: 'en',
    type: 'sticker',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Edu+NSW+ACT+Foundation:wght@400;500;600;700&display=swap',
    machineName: 'Edu NSW ACT Foundation'
  },
  {
    id: 'k-round-joy',
    displayName: 'Font 6',
    fontFamily: '"Jua", "배달의민족 주아", sans-serif',
    supportsKorean: true,
    lang: 'both',
    type: 'sticker',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Jua&display=swap',
    machineName: '배달의민족 주아'
  },
  // Font 4: Edu AU VIC WA NT Hand (VIC·WA·NT 교육용 손글씨)
  {
    id: 'edu-au-vic-wa-nt-hand',
    displayName: 'Font 3',
    fontFamily: '"Edu AU VIC WA NT Hand", cursive',
    supportsKorean: false,
    lang: 'en',
    type: 'sticker',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Edu+AU+VIC+WA+NT+Hand:wght@400;500;600;700&display=swap',
    machineName: 'Edu AU VIC WA NT Hand'
  },
  // Edu AU regional beginner fonts (TAS, SA) - sticker use
  {
    id: 'edu-tas-beginner',
    displayName: 'Font 5',
    fontFamily: '"Edu TAS Beginner", cursive',
    supportsKorean: false,
    lang: 'en',
    type: 'sticker',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Edu+TAS+Beginner:wght@400;500;600;700&display=swap',
    machineName: 'Edu TAS Beginner'
  },
  {
    id: 'edu-sa-beginner',
    displayName: 'Font 4',
    fontFamily: '"Edu SA Beginner", cursive',
    supportsKorean: false,
    lang: 'en',
    type: 'sticker',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Edu+SA+Beginner:wght@400;500;600;700&display=swap',
    machineName: 'Edu SA Beginner'
  },
  {
    id: 'k-sweet-candy',
    displayName: 'K-Sweet Candy',
    fontFamily: '"Do Hyeon", "빙그레체", "Noto Sans KR", sans-serif',
    supportsKorean: true,
    lang: 'both',
    type: 'sticker',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Do+Hyeon&display=swap',
    machineName: '빙그레체'
  },
  {
    id: 'k-clean-soft',
    displayName: 'Font 5',
    fontFamily: '"Nanum Gothic", "나눔스퀘어 라운드", "Noto Sans KR", sans-serif',
    supportsKorean: true,
    lang: 'both',
    type: 'sticker',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700;800&display=swap',
    machineName: '나눔스퀘어 라운드'
  },
  {
    id: 'k-strong-impact',
    displayName: 'K-Strong Impact',
    fontFamily: '"Black Han Sans", "카페24 써라운드", "Noto Sans KR", sans-serif',
    supportsKorean: true,
    lang: 'both',
    type: 'sticker',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap',
    machineName: '카페24 써라운드'
  },
  {
    id: 'k-stamp-antique',
    displayName: 'K-Stamp Antique',
    fontFamily: '"Nanum Brush Script", "KStampAntique", "국립중앙도서관 고인체", "Noto Serif KR", serif',
    supportsKorean: true,
    lang: 'both',
    type: 'stamp',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Nanum+Brush+Script&display=swap',
    machineName: '국립중앙도서관 고인체'
  },
  {
    id: 'k-classic-seal',
    displayName: 'K-Classic Seal',
    fontFamily: '"Black Han Sans", "KClassicSeal", "해수체", "Noto Sans KR", sans-serif',
    supportsKorean: true,
    lang: 'both',
    type: 'stamp',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap',
    machineName: '해수체'
  },

  // 영어 전용 폰트
  {
    id: 'aussie-script',
    displayName: 'Aussie Script',
    fontFamily: 'Pacifico, cursive',
    supportsKorean: false,
    lang: 'en',
    type: 'stamp',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Pacifico&display=swap',
    machineName: 'Pacifico'
  },
  {
    id: 'elegant-flow',
    displayName: 'Elegant Flow',
    fontFamily: 'Dancing Script, cursive',
    supportsKorean: false,
    lang: 'en',
    type: 'stamp',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400;700&display=swap',
    machineName: 'Dancing Script'
  },
  {
    id: 'premium-sans',
    displayName: 'Premium Sans',
    fontFamily: 'Montserrat, sans-serif',
    supportsKorean: false,
    lang: 'en',
    type: 'designer',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap',
    machineName: 'Montserrat'
  },
  {
    id: 'bubble-pop',
    displayName: 'Bubble Pop',
    fontFamily: 'Bubble Gum Sans, cursive',
    supportsKorean: false,
    lang: 'en',
    type: 'sticker',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap',
    machineName: 'Bubble Gum Sans'
  },
  {
    id: 'friendly-bold',
    displayName: 'Friendly Bold',
    fontFamily: 'Fredoka One, cursive',
    supportsKorean: false,
    lang: 'en',
    type: 'sticker',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap',
    machineName: 'Fredoka One'
  },
]

// ✅ 한글 fallback 폰트 (영어 전용 폰트 선택 시 자동 사용)
export const KOREAN_FALLBACK_FONT: FontConfig = {
  id: 'k-round-joy',
  displayName: 'K-Round Joy',
  fontFamily: '"Jua", "배달의민족 주아", sans-serif',
  supportsKorean: true,
  lang: 'both',
  type: 'sticker',
  googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Jua&display=swap',
  machineName: '배달의민족 주아'
}

// ✅ 텍스트에 한글이 포함되어 있는지 확인
export const containsKorean = (text: string): boolean => {
  return /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text)
}

// ✅ 선택한 폰트가 한글을 지원하지 않고 텍스트에 한글이 있으면 fallback 폰트 반환
export const getEffectiveFont = (selectedFontId: string, text: string): FontConfig => {
  const selectedFont = FONT_LIST.find(f => f.id === selectedFontId)
  if (!selectedFont) return KOREAN_FALLBACK_FONT

  // 영어 전용 폰트이고 텍스트에 한글이 포함되어 있으면 fallback 사용
  if (!selectedFont.supportsKorean && containsKorean(text)) {
    return KOREAN_FALLBACK_FONT
  }

  return selectedFont
}

// ✅ 스티커용 폰트 7종 (Font 1=Andika, 2=nanum, 3=Edu NSW ACT, 4=Edu AU VIC WA NT Hand, 5=Edu SA Beginner, 6=Edu TAS Beginner, 7=Jua/K-Round Joy)
const STICKER_FONT_IDS = ['andika', 'edu-nsw-act-foundation', 'edu-au-vic-wa-nt-hand', 'edu-sa-beginner', 'edu-tas-beginner', 'k-round-joy', 'nanum-myeongjo'] as const

export const getStickerFonts = () => {
  return STICKER_FONT_IDS
    .map(id => FONT_LIST.find(f => f.id === id))
    .filter((f): f is FontConfig => !!f)
}

// ✅ 스탬프용 폰트 필터링 (모든 폰트 사용 가능)
export const getStampFonts = () => {
  // 모든 폰트를 스탬프 페이지에서도 사용 가능하도록 변경
  return FONT_LIST
}

// ✅ 모든 Google Fonts URL 수집 (중복 제거)
export const getAllGoogleFontsUrls = (): string[] => {
  const urls = FONT_LIST
    .map(font => font.googleFontsUrl)
    .filter((url): url is string => !!url)
  
  // 중복 제거
  return Array.from(new Set(urls))
}

// ✅ 폰트 ID로 자판기 설정 폰트명 가져오기
export const getMachineFontName = (fontId: string): string => {
  const font = FONT_LIST.find(f => f.id === fontId)
  if (!font) {
    // 폰트를 찾을 수 없으면 fallback 폰트의 machineName 반환
    return KOREAN_FALLBACK_FONT.machineName
  }
  return font.machineName
}
