'use client'

import React from 'react'
import { createRoot } from 'react-dom/client'

export async function renderReactPreviewToPdfFile(params: {
  reactElement: React.ReactElement
  filename: string
}): Promise<File | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null

  const waitMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

  const waitForFonts = async () => {
    try {
      // Some browsers expose the FontFaceSet API; wait for fonts to be ready so text renders correctly.
      const anyDoc = document as any
      if (anyDoc?.fonts?.ready) {
        await Promise.race([anyDoc.fonts.ready, waitMs(1500)])
      }
    } catch {
      // ignore
    }
  }

  const waitForImagesIn = async (container: HTMLElement) => {
    try {
      const imgs = Array.from(container.querySelectorAll('img')) as HTMLImageElement[]
      const pending = imgs.filter((img) => !img.complete)
      if (pending.length === 0) return

      await Promise.race([
        Promise.all(
          pending.map(
            (img) =>
              new Promise<void>((resolve) => {
                const done = () => resolve()
                img.addEventListener('load', done, { once: true })
                img.addEventListener('error', done, { once: true })
              })
          )
        ),
        waitMs(2000),
      ])
    } catch {
      // ignore
    }
  }

  const host = document.createElement('div')
  // Must stay visible (opacity > 0): html2canvas captures blank when the root is fully transparent.
  // Behind the app UI so the user does not see a flash; still in viewport for reliable layout.
  host.style.position = 'fixed'
  host.style.left = '0'
  host.style.top = '0'
  host.style.width = '1024px'
  host.style.background = 'white'
  host.style.opacity = '1'
  host.style.pointerEvents = 'none'
  host.style.zIndex = '-1'
  host.style.overflow = 'visible'
  host.style.height = 'auto'
  host.style.maxHeight = 'none'
  host.setAttribute('data-preview-pdf-host', 'true')
  document.body.appendChild(host)

  const root = createRoot(host)
  let overlayFixEl: HTMLStyleElement | null = null
  try {
    // Ensure React commits before we measure/capture.
    try {
      const { flushSync } = await import('react-dom')
      flushSync(() => {
        root.render(params.reactElement)
      })
    } catch {
      root.render(params.reactElement)
    }

    // Give React/layout a moment to paint.
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    // Ensure CSS/font/image resources have time to resolve before capturing to canvas/PDF.
    await waitForFonts()
    await waitForImagesIn(host)
    await waitMs(120)
    await new Promise<void>((r) => requestAnimationFrame(() => r()))

    // Wait until some real content is laid out (prevents occasional blank/zero-height capture).
    const start = Date.now()
    while (host.scrollHeight <= 10 && Date.now() - start < 1500) {
      await waitMs(50)
    }

    const html2pdf = (await import('html2pdf.js')).default

    const totalHeight = Math.max(host.scrollHeight, host.offsetHeight)
    const totalWidth = Math.max(host.scrollWidth, host.offsetWidth, 1024)

    // Browser canvas max dimension is often 8192–16384px; scaling a tall receipt can clip the bottom.
    const MAX_CANVAS_EDGE = 8192
    let scale = 2
    const hScaled = totalHeight * scale
    const wScaled = totalWidth * scale
    if (hScaled > MAX_CANVAS_EDGE || wScaled > MAX_CANVAS_EDGE) {
      scale = Math.min(MAX_CANVAS_EDGE / totalHeight, MAX_CANVAS_EDGE / totalWidth, 2)
      scale = Math.max(1, Math.floor(scale * 100) / 100)
    }

    // html2pdf.js sets `.html2pdf__overlay { opacity: 0 }` on its full-screen wrapper before html2canvas runs.
    // html2canvas often rasterizes that subtree as a fully blank image, producing empty PDFs for email attachments.
    // Override with !important so capture sees real pixels; keep background transparent so the user does not get a dim flash.
    const overlayFixId = 'selpic-html2pdf-overlay-fix'
    try {
      overlayFixEl = document.createElement('style')
      overlayFixEl.id = overlayFixId
      overlayFixEl.textContent = `
        .html2pdf__overlay {
          opacity: 1 !important;
          background: transparent !important;
        }
      `
      document.head.appendChild(overlayFixEl)
    } catch {
      overlayFixEl = null
    }

    const opt = {
      margin: [10, 10, 10, 10] as [number, number, number, number],
      filename: params.filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: {
        scale,
        useCORS: true,
        logging: false,
        letterRendering: true,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: totalWidth,
        windowHeight: totalHeight,
        onclone: (clonedDoc: any) => {
          try {
            const rootEl = clonedDoc?.querySelector?.(
              '[data-preview-pdf-host="true"]'
            ) as HTMLElement | null
            if (rootEl?.style) {
              rootEl.style.overflow = 'visible'
              rootEl.style.height = 'auto'
              rootEl.style.maxHeight = 'none'
            }
            if (clonedDoc?.body?.style) {
              clonedDoc.body.style.overflow = 'visible'
              clonedDoc.body.style.height = 'auto'
              clonedDoc.body.style.maxHeight = 'none'
            }
            if (clonedDoc?.documentElement?.style) {
              clonedDoc.documentElement.style.overflow = 'visible'
              clonedDoc.documentElement.style.height = 'auto'
              clonedDoc.documentElement.style.maxHeight = 'none'
            }
          } catch {
            // ignore
          }
        }
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait' as const,
        compress: true
      },
      // Do NOT use 'avoid-all': it tries to keep blocks on one page and often truncates tall receipts.
      pagebreak: { mode: ['css', 'legacy'] as const }
    }

    const pdfBlob = await html2pdf().set(opt).from(host).outputPdf('blob')
    return new File([pdfBlob], params.filename, { type: 'application/pdf' })
  } catch (error) {
    console.error('renderReactPreviewToPdfFile error:', error)
    return null
  } finally {
    try {
      overlayFixEl?.remove()
    } catch {
      // ignore
    }
    try {
      document.getElementById('selpic-html2pdf-overlay-fix')?.remove()
    } catch {
      // ignore
    }
    try {
      root.unmount()
    } catch {
      // ignore
    }
    try {
      host.remove()
    } catch {
      // ignore
    }
  }
}

