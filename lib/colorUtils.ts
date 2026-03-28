/**
 * Hex 색상 코드를 영어 색상명으로 변환
 */
export function getColorName(hex: string): string {
  if (!hex || !hex.startsWith('#')) {
    return hex
  }

  // 대소문자 구분 없이 비교하기 위해 대문자로 변환
  const upperHex = hex.toUpperCase()

  // 일반적인 색상 매핑
  const colorMap: Record<string, string> = {
    '#000000': 'Black',
    '#FFFFFF': 'White',
    '#FF0000': 'Red',
    '#00FF00': 'Green',
    '#0000FF': 'Blue',
    '#FFFF00': 'Yellow',
    '#FF00FF': 'Magenta',
    '#00FFFF': 'Cyan',
    '#FFA500': 'Orange',
    '#800080': 'Purple',
    '#FFC0CB': 'Pink',
    '#A52A2A': 'Brown',
    '#808080': 'Gray',
    '#C0C0C0': 'Silver',
    '#FFD700': 'Gold',
    // Sticker Customization에서 사용하는 색상들
    '#3B82F6': 'Blue',
    '#EF4444': 'Red',
    '#10B981': 'Green',
    '#F59E0B': 'Orange',
    '#8B5CF6': 'Purple',
    '#EC4899': 'Pink',
    '#06B6D4': 'Cyan',
    '#84CC16': 'Lime',
  }

  // 정확히 매칭되는 색상이 있으면 반환
  if (colorMap[upperHex]) {
    return colorMap[upperHex]
  }

  // RGB 값으로 변환하여 근사치 찾기
  const rgb = hexToRgb(hex)
  if (!rgb) {
    return hex // 변환 실패 시 원본 반환
  }

  // 가장 가까운 색상 찾기
  let closestColor = hex
  let minDistance = Infinity

  for (const [hexCode, colorName] of Object.entries(colorMap)) {
    const targetRgb = hexToRgb(hexCode)
    if (targetRgb) {
      const distance = colorDistance(rgb, targetRgb)
      if (distance < minDistance) {
        minDistance = distance
        closestColor = colorName
      }
    }
  }

  // 너무 다른 색상이면 hex 코드 반환, 아니면 근사 색상명 반환
  return minDistance < 50 ? closestColor : hex
}

/**
 * Hex 색상을 RGB로 변환
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

/**
 * 두 RGB 색상 간의 거리 계산 (유클리드 거리)
 */
function colorDistance(
  rgb1: { r: number; g: number; b: number },
  rgb2: { r: number; g: number; b: number }
): number {
  const dr = rgb1.r - rgb2.r
  const dg = rgb1.g - rgb2.g
  const db = rgb1.b - rgb2.b
  return Math.sqrt(dr * dr + dg * dg + db * db)
}

