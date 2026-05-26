/** Preview slot on the product sheet image (percent of container). */
export type MixedLabelsPreviewSlot = {
  x: number
  y: number
  /** rem-based font size for overlay text */
  fontSizeRem: number
  rotateDeg?: number
}

export type MixedLabelsTemplateConfig = {
  id: string
  label: string
  fontId: string
  fontFamily: string
  previewSlots: MixedLabelsPreviewSlot[]
}

const DEFAULT_SLOTS: MixedLabelsPreviewSlot[] = [
  { x: 28, y: 22, fontSizeRem: 0.7 },
  { x: 68, y: 28, fontSizeRem: 0.65 },
  { x: 42, y: 58, fontSizeRem: 0.75 },
  { x: 75, y: 62, fontSizeRem: 0.6 },
  { x: 18, y: 72, fontSizeRem: 0.55 },
]

export const MIXED_LABELS_TEMPLATES: Record<string, MixedLabelsTemplateConfig> = {
  default: {
    id: 'default',
    label: 'Mixed sheet',
    fontId: 'andika',
    fontFamily: 'Andika, sans-serif',
    previewSlots: DEFAULT_SLOTS,
  },
  'dino-friends-v1': {
    id: 'dino-friends-v1',
    label: 'Dino Friends',
    fontId: 'andika',
    fontFamily: 'Andika, "Comic Sans MS", sans-serif',
    previewSlots: [
      { x: 24, y: 16, fontSizeRem: 0.62, rotateDeg: -4 },
      { x: 62, y: 14, fontSizeRem: 0.58, rotateDeg: 3 },
      { x: 38, y: 38, fontSizeRem: 0.72 },
      { x: 78, y: 42, fontSizeRem: 0.55, rotateDeg: -6 },
      { x: 20, y: 55, fontSizeRem: 0.6, rotateDeg: 5 },
      { x: 55, y: 68, fontSizeRem: 0.68 },
      { x: 82, y: 74, fontSizeRem: 0.52 },
    ],
  },
}

export function getMixedLabelsTemplate(templateId?: string): MixedLabelsTemplateConfig {
  const key = (templateId || '').trim().toLowerCase()
  return (
    MIXED_LABELS_TEMPLATES[key] ?? {
      id: key || 'default',
      label: key || 'Mixed sheet',
      fontId: 'andika',
      fontFamily: 'Andika, sans-serif',
      previewSlots: DEFAULT_SLOTS,
    }
  )
}
