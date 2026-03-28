import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export interface WatermarkSettings {
  enabled: boolean
  imageUrl: string | null // 워터마크 이미지 URL (Base64 또는 URL)
  position: WatermarkPosition
  opacity: number // 0-1 사이 값
  size: number // 워터마크 크기 (원본 이미지 대비 비율, 0-1)
  margin: number // 여백 (픽셀)
}

interface WatermarkStore {
  settings: WatermarkSettings
  setWatermarkImage: (imageUrl: string) => void
  updateWatermarkSettings: (settings: Partial<WatermarkSettings>) => void
  resetWatermarkSettings: () => void
}

const defaultSettings: WatermarkSettings = {
  enabled: false,
  imageUrl: null,
  position: 'bottom-right',
  opacity: 0.7,
  size: 0.15, // 원본 이미지의 15%
  margin: 10
}

export const useWatermarkStore = create<WatermarkStore>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      
      setWatermarkImage: (imageUrl) => {
        set((state) => ({
          settings: {
            ...state.settings,
            imageUrl,
            enabled: !!imageUrl // 이미지가 설정되면 자동으로 활성화
          }
        }))
      },
      
      updateWatermarkSettings: (updates) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...updates
          }
        }))
      },
      
      resetWatermarkSettings: () => {
        set({ settings: defaultSettings })
      }
    }),
    {
      name: 'watermark-settings',
      partialize: (state) => ({ settings: state.settings })
    }
  )
)

