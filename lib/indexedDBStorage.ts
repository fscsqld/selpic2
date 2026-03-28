// IndexedDB를 사용한 대용량 파일 저장 유틸리티

const DB_NAME = 'selpic-media-db'
const DB_VERSION = 2 // ArrayBuffer 지원을 위해 버전 업그레이드
const STORE_NAME = 'media-files'

interface IndexedDBStorage {
  init: () => Promise<IDBDatabase>
  saveFile: (id: string, dataUrl: string, arrayBuffer?: ArrayBuffer) => Promise<void>
  getFile: (id: string) => Promise<string | null>
  getFileAsBlob: (id: string) => Promise<Blob | null>
  getAllFileIds: () => Promise<string[]>
  deleteFile: (id: string) => Promise<void>
  clearAll: () => Promise<void>
}

export const indexedDBStorage: IndexedDBStorage = {
  init: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported'))
        return
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        reject(request.error)
      }

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        const oldVersion = event.oldVersion || 0
        
        // 기존 objectStore가 없으면 생성
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          objectStore.createIndex('id', 'id', { unique: true })
        } else if (oldVersion < 2) {
          // 버전 2로 업그레이드: ArrayBuffer 지원을 위해 기존 데이터는 그대로 유지
          console.log('IndexedDB upgraded to version 2 for ArrayBuffer support')
        }
      }
    })
  },

  saveFile: async (id: string, dataUrl: string, arrayBuffer?: ArrayBuffer): Promise<void> => {
    console.log('💾 [IndexedDB] saveFile called:', {
      id,
      hasArrayBuffer: !!arrayBuffer,
      arrayBufferSize: arrayBuffer ? `${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(2)}MB` : 'N/A',
      dataUrlPrefix: dataUrl.substring(0, 50)
    })
    
    try {
      const db = await indexedDBStorage.init()
      console.log('✅ [IndexedDB] Database initialized successfully')
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        
        // 동영상의 경우 원본 바이너리 데이터 저장, 이미지의 경우 Base64 저장
        // dataUrl에서 MIME 타입 추출 (예: "data:video/mp4;base64,...")
        const mimeType = dataUrl.includes(',') ? dataUrl.split(',')[0].split(':')[1].split(';')[0] : undefined
        const dataToStore = arrayBuffer 
          ? { id, arrayBuffer, dataUrl, mimeType, isBinary: true, savedAt: new Date().toISOString() }
          : { id, dataUrl, isBinary: false, savedAt: new Date().toISOString() }
        
        console.log('💾 [IndexedDB] Storing data:', {
          id,
          isBinary: !!arrayBuffer,
          mimeType,
          dataSize: arrayBuffer ? `${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(2)}MB` : 'N/A'
        })
        
        const request = store.put(dataToStore)

        request.onsuccess = () => {
          console.log('✅ [IndexedDB] File saved successfully:', id)
          resolve()
        }

        request.onerror = () => {
          console.error('❌ [IndexedDB] Error saving file:', {
            id,
            error: request.error,
            errorName: request.error?.name,
            errorMessage: request.error?.message
          })
          reject(request.error)
        }
        
        transaction.onerror = () => {
          console.error('❌ [IndexedDB] Transaction error:', {
            id,
            error: transaction.error,
            errorName: transaction.error?.name,
            errorMessage: transaction.error?.message
          })
        }
      })
    } catch (error) {
      console.error('❌ [IndexedDB] Failed to initialize database or save file:', {
        id,
        error,
        errorName: (error as Error)?.name,
        errorMessage: (error as Error)?.message,
        stack: (error as Error)?.stack
      })
      throw error
    }
  },

  getFile: async (id: string): Promise<string | null> => {
    const db = await indexedDBStorage.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => {
        const result = request.result
        if (!result) {
          // 🆕 파일을 찾지 못한 경우 상세 로깅
          console.warn('⚠️ [IndexedDB] File not found:', {
            fileId: id,
            note: 'File may have been deleted or ID is incorrect. File name changes do not affect ID-based lookup.'
          })
          resolve(null)
          return
        }
        
        // 🆕 파일 찾기 성공 로깅
        console.log('✅ [IndexedDB] File found:', {
          fileId: id,
          hasArrayBuffer: !!result.arrayBuffer,
          hasDataUrl: !!result.dataUrl,
          isBinary: result.isBinary,
          mimeType: result.mimeType
        })
        
        // 원본 바이너리 데이터가 있으면 blob URL 생성 (동영상 및 이미지 모두)
        if (result.isBinary && result.arrayBuffer) {
          // 저장된 MIME 타입 사용
          const mimeType = result.mimeType || (result.dataUrl?.includes('image/') ? 'image/jpeg' : 'video/mp4')
          const blob = new Blob([result.arrayBuffer], { type: mimeType })
          const blobUrl = URL.createObjectURL(blob)
          resolve(blobUrl)
        } else if (result.dataUrl) {
          // 레거시 Base64 데이터 (하위 호환성)
          resolve(result.dataUrl)
        } else {
          resolve(null)
        }
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  },

  getFileAsBlob: async (id: string): Promise<Blob | null> => {
    const db = await indexedDBStorage.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(id)

      request.onsuccess = () => {
        const result = request.result
        if (!result) {
          resolve(null)
          return
        }
        
        // 원본 바이너리 데이터가 있으면 blob 반환 (동영상 및 이미지 모두)
        if (result.isBinary && result.arrayBuffer) {
          // 저장된 MIME 타입 사용
          const mimeType = result.mimeType || (result.dataUrl?.includes('image/') ? 'image/jpeg' : 'video/mp4')
          const blob = new Blob([result.arrayBuffer], { type: mimeType })
          resolve(blob)
        } else if (result.dataUrl) {
          // 레거시 Base64 데이터를 blob으로 변환 (하위 호환성)
          const byteString = atob(result.dataUrl.split(',')[1])
          const mimeString = result.dataUrl.split(',')[0].split(':')[1].split(';')[0]
          const ab = new ArrayBuffer(byteString.length)
          const ia = new Uint8Array(ab)
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i)
          }
          resolve(new Blob([ab], { type: mimeString }))
        } else {
          resolve(null)
        }
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  },

  deleteFile: async (id: string): Promise<void> => {
    const db = await indexedDBStorage.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(id)

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  },

  getAllFileIds: async (): Promise<string[]> => {
    const db = await indexedDBStorage.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAllKeys()

      request.onsuccess = () => {
        resolve(request.result as string[])
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  },

  clearAll: async (): Promise<void> => {
    const db = await indexedDBStorage.init()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.clear()

      request.onsuccess = () => {
        resolve()
      }

      request.onerror = () => {
        reject(request.error)
      }
    })
  }
}

