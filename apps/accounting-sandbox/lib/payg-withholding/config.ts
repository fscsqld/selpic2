/**
 * PAYG Withholding Configuration Manager
 * 
 * PAYG 등록 상태를 관리하고 On/Off 제어
 */

import { PAYGConfig } from './types'

const STORAGE_KEY = 'selpic_payg_config'

export class PAYGConfigManager {
  /**
   * PAYG 설정 로드
   */
  static loadConfig(): PAYGConfig {
    if (typeof window === 'undefined') {
      // Server-side: 기본값 반환
      return this.getDefaultConfig()
    }
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const config = JSON.parse(stored) as PAYGConfig
        // 기본값과 병합하여 누락된 필드 보완
        return { ...this.getDefaultConfig(), ...config }
      }
    } catch (error) {
      console.error('[PAYG-CONFIG] Failed to load config:', error)
    }
    
    // 기본값: PAYG 미등록 상태
    return this.getDefaultConfig()
  }

  /**
   * 기본 설정 반환
   */
  private static getDefaultConfig(): PAYGConfig {
    return {
      isEnabled: false,
      autoCalculate: false,
      showWarnings: true,  // 경고는 항상 표시
    }
  }

  /**
   * PAYG 설정 저장
   */
  static saveConfig(config: PAYGConfig): void {
    if (typeof window === 'undefined') {
      console.warn('[PAYG-CONFIG] Cannot save config on server-side')
      return
    }
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
      console.log('[PAYG-CONFIG] ✅ Config saved:', config)
    } catch (error) {
      console.error('[PAYG-CONFIG] Failed to save config:', error)
    }
  }

  /**
   * PAYG 활성화
   */
  static enablePAYG(registrationDate: string, registrationNumber?: string): void {
    const config: PAYGConfig = {
      isEnabled: true,
      registrationDate,
      registrationNumber,
      autoCalculate: true,
      showWarnings: true,
    }
    this.saveConfig(config)
    console.log('[PAYG-CONFIG] ✅ PAYG enabled:', { registrationDate, registrationNumber })
  }

  /**
   * PAYG 비활성화
   */
  static disablePAYG(): void {
    const config: PAYGConfig = {
      isEnabled: false,
      autoCalculate: false,
      showWarnings: true,  // 경고는 유지
    }
    this.saveConfig(config)
    console.log('[PAYG-CONFIG] ✅ PAYG disabled')
  }

  /**
   * PAYG 등록 여부 확인
   */
  static isPAYGEnabled(): boolean {
    const config = this.loadConfig()
    return config.isEnabled
  }

  /**
   * 설정 초기화 (테스트용)
   */
  static resetConfig(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
      console.log('[PAYG-CONFIG] ✅ Config reset')
    }
  }
}

