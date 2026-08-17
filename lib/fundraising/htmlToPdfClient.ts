/**
 * Browser-only: fundraising HTML → PDF File for email attachments.
 *
 * Clipping pitfalls fixed here:
 * - Do not capture the admin preview box (`max-h-[70vh] overflow-auto`) — that crops the PDF.
 * - Always render the full HTML document in an iframe and capture the full scroll height.
 * - Pass explicit height/width to html2canvas; clear overflow/maxHeight in onclone.
 */

function waitMs(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

function safePdfName(filename: string): string {
  return filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`
}

function ensureFullHtmlDocument(html: string): string {
  const raw = String(html || '').trim()
  if (!raw) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body><p>No document content</p></body></html>`
  }
  if (/<html[\s>]/i.test(raw) || /<!doctype\s+html/i.test(raw)) {
    return raw
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;background:#fff;margin:0;padding:24px;line-height:1.5;}</style>
    </head><body>${raw}</body></html>`
}

function injectOverlayFix(doc: Document, id: string): HTMLStyleElement | null {
  try {
    const existing = doc.getElementById(id)
    existing?.remove()
    const style = doc.createElement('style')
    style.id = id
    style.textContent = `
      .html2pdf__overlay {
        opacity: 1 !important;
        background: transparent !important;
      }
      html, body {
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
      }
    `
    doc.head.appendChild(style)
    return style
  } catch {
    return null
  }
}

function canvasHasVisibleInk(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return false
  const { width, height } = canvas
  if (width < 8 || height < 8) return false
  const step = Math.max(3, Math.floor(Math.min(width, height) / 100))
  const { data } = ctx.getImageData(0, 0, width, height)
  let ink = 0
  let samples = 0
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const a = data[i + 3]
      samples++
      if (a > 16 && (r < 248 || g < 248 || b < 248)) ink++
    }
  }
  return ink >= Math.max(40, Math.floor(samples * 0.004))
}

async function canvasToPdfFile(canvas: HTMLCanvasElement, filename: string): Promise<File> {
  if (!canvasHasVisibleInk(canvas)) {
    throw new Error(
      'PDF capture was blank (white page). Open the document preview on screen and try Send again.'
    )
  }

  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  const pageWidth = 210
  const pageHeight = 297
  const margin = 10
  const usableWidth = pageWidth - margin * 2
  const usableHeight = pageHeight - margin * 2
  const imgWidth = usableWidth
  const imgHeight = (canvas.height * imgWidth) / canvas.width
  const imgData = canvas.toDataURL('image/jpeg', 0.98)

  // Slice the tall canvas across A4 pages (avoids bottom cut-off from a single oversized image).
  let heightLeft = imgHeight
  let position = margin

  pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight)
  heightLeft -= usableHeight

  while (heightLeft > 0.5) {
    position = margin - (imgHeight - heightLeft)
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight)
    heightLeft -= usableHeight
  }

  const blob = pdf.output('blob')
  if (!blob || blob.size < 800) {
    throw new Error('PDF generation produced an empty file')
  }
  return new File([blob], safePdfName(filename), { type: 'application/pdf' })
}

async function captureElementToCanvas(el: HTMLElement): Promise<HTMLCanvasElement> {
  const html2canvas = (await import('html2canvas')).default

  // Prefer full scrollable content, not the clipped client box.
  const totalHeight = Math.max(el.scrollHeight, el.offsetHeight, el.clientHeight, 200)
  const totalWidth = Math.max(el.scrollWidth, el.offsetWidth, el.clientWidth, 794)

  const MAX_CANVAS_EDGE = 8192
  let scale = 2
  if (totalHeight * scale > MAX_CANVAS_EDGE || totalWidth * scale > MAX_CANVAS_EDGE) {
    scale = Math.min(MAX_CANVAS_EDGE / totalHeight, MAX_CANVAS_EDGE / totalWidth, 2)
    scale = Math.max(1, Math.floor(scale * 100) / 100)
  }

  return html2canvas(el, {
    scale,
    useCORS: true,
    logging: false,
    allowTaint: true,
    backgroundColor: '#ffffff',
    // Critical: force full content dimensions (otherwise overflow:auto parents clip).
    height: totalHeight,
    width: totalWidth,
    windowWidth: totalWidth,
    windowHeight: totalHeight,
    scrollX: 0,
    scrollY: -(el.ownerDocument?.defaultView?.scrollY ?? 0),
    onclone: (clonedDoc, clonedEl) => {
      try {
        injectOverlayFix(clonedDoc, 'selpic-fundraising-html2pdf-overlay-fix-clone')
        const unlock = (node: HTMLElement | null) => {
          if (!node?.style) return
          node.style.overflow = 'visible'
          node.style.overflowX = 'visible'
          node.style.overflowY = 'visible'
          node.style.height = 'auto'
          node.style.maxHeight = 'none'
          node.style.opacity = '1'
        }
        unlock(clonedEl as HTMLElement)
        unlock(clonedDoc.body)
        unlock(clonedDoc.documentElement)
        clonedDoc.querySelectorAll('[data-fundraising-preview-root]').forEach((n) => {
          unlock(n as HTMLElement)
        })
        if (clonedDoc.body?.style) {
          clonedDoc.body.style.background = '#ffffff'
          clonedDoc.body.style.color = '#111111'
        }
      } catch {
        // ignore
      }
    },
  })
}

/**
 * Capture an on-page element. Expands overflow/max-height temporarily so content is not cropped.
 * Prefer `fundraisingHtmlToPdfFile` for full document emails (avoids preview panel clipping).
 */
export async function fundraisingElementToPdfFile(
  element: HTMLElement,
  filename: string
): Promise<File> {
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available in the browser')
  }
  const parentFix = injectOverlayFix(document, 'selpic-fundraising-html2pdf-overlay-fix')
  const prev = {
    overflow: element.style.overflow,
    overflowY: element.style.overflowY,
    maxHeight: element.style.maxHeight,
    height: element.style.height,
  }
  try {
    element.style.overflow = 'visible'
    element.style.overflowY = 'visible'
    element.style.maxHeight = 'none'
    element.style.height = 'auto'
    element.scrollTop = 0
    element.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior })
    await waitMs(150)
    const canvas = await captureElementToCanvas(element)
    return canvasToPdfFile(canvas, filename)
  } finally {
    element.style.overflow = prev.overflow
    element.style.overflowY = prev.overflowY
    element.style.maxHeight = prev.maxHeight
    element.style.height = prev.height
    parentFix?.remove()
  }
}

/**
 * Render full fundraising HTML in an iframe (complete document), then PDF — no preview crop.
 */
export async function fundraisingHtmlToPdfFile(
  html: string,
  filename: string
): Promise<File> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('PDF generation is only available in the browser')
  }

  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', 'fundraising-pdf-capture')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    'position:fixed;left:0;top:0;width:820px;height:400px;opacity:1;z-index:-1;border:0;background:#ffffff;pointer-events:none;'
  document.body.appendChild(iframe)

  const parentFix = injectOverlayFix(document, 'selpic-fundraising-html2pdf-overlay-fix')
  let frameFix: HTMLStyleElement | null = null

  try {
    const docHtml = ensureFullHtmlDocument(html)
    await new Promise<void>((resolve, reject) => {
      const t = window.setTimeout(() => reject(new Error('PDF iframe load timed out')), 8000)
      iframe.onload = () => {
        window.clearTimeout(t)
        resolve()
      }
      iframe.onerror = () => {
        window.clearTimeout(t)
        reject(new Error('PDF iframe failed to load'))
      }
      iframe.srcdoc = docHtml
    })

    await waitMs(250)
    const idoc = iframe.contentDocument
    const ibody = idoc?.body
    if (!idoc || !ibody) {
      throw new Error('PDF iframe document is empty')
    }
    if (!ibody.textContent?.trim()) {
      throw new Error('PDF source HTML has no text content')
    }

    frameFix = injectOverlayFix(idoc, 'selpic-fundraising-html2pdf-overlay-fix-frame')
    ibody.style.overflow = 'visible'
    ibody.style.maxHeight = 'none'
    ibody.style.height = 'auto'
    idoc.documentElement.style.overflow = 'visible'
    idoc.documentElement.style.maxHeight = 'none'

    const contentH = Math.max(
      ibody.scrollHeight,
      ibody.offsetHeight,
      idoc.documentElement.scrollHeight,
      400
    )
    iframe.style.height = `${contentH + 64}px`
    await waitMs(200)

    // Capture the documentElement when possible so header+footer of the full HTML are included.
    const captureRoot =
      (idoc.documentElement.scrollHeight >= ibody.scrollHeight
        ? idoc.documentElement
        : ibody) || ibody

    const canvas = await captureElementToCanvas(captureRoot)
    return canvasToPdfFile(canvas, filename)
  } finally {
    try {
      parentFix?.remove()
    } catch {
      // ignore
    }
    try {
      frameFix?.remove()
    } catch {
      // ignore
    }
    iframe.remove()
  }
}

export async function downloadFundraisingPdf(filename: string, html: string): Promise<void> {
  const file = await fundraisingHtmlToPdfFile(html, filename)
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  URL.revokeObjectURL(url)
}

/** Fit the full canvas onto a single A4 page (family flyer / one-sheet print). */
async function canvasToSinglePageA4PdfFile(canvas: HTMLCanvasElement, filename: string): Promise<File> {
  if (!canvasHasVisibleInk(canvas)) {
    throw new Error('PDF capture was blank (white page). Please try Download again.')
  }
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  const pageWidth = 210
  const pageHeight = 297
  const margin = 4
  const maxW = pageWidth - margin * 2
  const maxH = pageHeight - margin * 2
  let imgW = maxW
  let imgH = (canvas.height * imgW) / canvas.width
  if (imgH > maxH) {
    imgH = maxH
    imgW = (canvas.width * imgH) / canvas.height
  }
  const x = (pageWidth - imgW) / 2
  const y = Math.max(margin, (pageHeight - imgH) / 2)
  const imgData = canvas.toDataURL('image/jpeg', 0.98)
  pdf.addImage(imgData, 'JPEG', x, y, imgW, imgH)
  const blob = pdf.output('blob')
  if (!blob || blob.size < 800) {
    throw new Error('PDF generation produced an empty file')
  }
  return new File([blob], safePdfName(filename), { type: 'application/pdf' })
}

/**
 * Render flyer HTML and download as a single A4 PDF page.
 */
export async function downloadFundraisingSinglePageA4Pdf(filename: string, html: string): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('PDF generation is only available in the browser')
  }

  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', 'fundraising-flyer-pdf-capture')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    'position:fixed;left:0;top:0;width:820px;height:400px;opacity:1;z-index:-1;border:0;background:#ffffff;pointer-events:none;'
  document.body.appendChild(iframe)

  const parentFix = injectOverlayFix(document, 'selpic-fundraising-html2pdf-overlay-fix')
  let frameFix: HTMLStyleElement | null = null

  try {
    const docHtml = ensureFullHtmlDocument(html)
    await new Promise<void>((resolve, reject) => {
      const t = window.setTimeout(() => reject(new Error('PDF iframe load timed out')), 8000)
      iframe.onload = () => {
        window.clearTimeout(t)
        resolve()
      }
      iframe.onerror = () => {
        window.clearTimeout(t)
        reject(new Error('PDF iframe failed to load'))
      }
      iframe.srcdoc = docHtml
    })

    await waitMs(300)
    const idoc = iframe.contentDocument
    const ibody = idoc?.body
    if (!idoc || !ibody) {
      throw new Error('PDF iframe document is empty')
    }

    frameFix = injectOverlayFix(idoc, 'selpic-fundraising-html2pdf-overlay-fix-frame')
    ibody.style.overflow = 'visible'
    ibody.style.maxHeight = 'none'
    ibody.style.height = 'auto'
    idoc.documentElement.style.overflow = 'visible'

    const root =
      (idoc.querySelector('[data-family-flyer-root]') as HTMLElement | null) ||
      ibody
    const contentH = Math.max(root.scrollHeight, root.offsetHeight, 800)
    iframe.style.height = `${contentH + 48}px`
    await waitMs(200)

    const canvas = await captureElementToCanvas(root)
    const file = await canvasToSinglePageA4PdfFile(canvas, filename)
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    try {
      parentFix?.remove()
    } catch {
      // ignore
    }
    try {
      frameFix?.remove()
    } catch {
      // ignore
    }
    iframe.remove()
  }
}
