/**
 * One-shot: recompress live homepage CMS images (category BG + hero image/fallback + header logo)
 * and replace static public logos with smaller WebP/PNG from the CMS header mark.
 *
 * Usage: node scripts/optimize-homepage-cms-media.mjs
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

const BUCKET = 'selpic-contents'
const CONFIG_KEY = 'storefront_cms'

function get(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    mod
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location).then(resolve, reject)
          return
        }
        const chunks = []
        res.on('data', (d) => chunks.push(d))
        res.on('end', () =>
          resolve({ status: res.statusCode || 0, buf: Buffer.concat(chunks), ct: res.headers['content-type'] })
        )
      })
      .on('error', reject)
  })
}

async function encodeWebp(input, { maxEdge, targetBytes }) {
  const qualities = [78, 70, 62, 54, 48]
  let edge = maxEdge
  let best = null
  for (let pass = 0; pass < 2; pass++) {
    for (const quality of qualities) {
      const out = await sharp(input, { failOn: 'none' })
        .rotate()
        .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toBuffer()
      if (!best || out.length < best.length) best = out
      if (out.length <= targetBytes) return out
    }
    edge = Math.max(640, Math.round(edge * 0.75))
  }
  return best || input
}

function isHttpImage(url) {
  return /^https?:\/\//i.test(url || '') && !/\.mp4(\?|$)/i.test(url)
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

  const sb = createClient(url, key)
  const { data, error } = await sb.from('site_configs').select('value').eq('config_key', CONFIG_KEY).maybeSingle()
  if (error) throw error
  if (!data?.value) throw new Error('No storefront_cms row')

  let raw = data.value
  if (typeof raw === 'string') raw = JSON.parse(raw)
  const state = raw?.state && typeof raw.state === 'object' ? raw.state : raw
  if (!state || typeof state !== 'object') throw new Error('Unexpected CMS shape')

  const stamp = Date.now()
  let changed = 0

  async function replaceImageField(label, currentUrl, folder, opts) {
    if (!isHttpImage(currentUrl)) return currentUrl
    if (!currentUrl.includes('supabase.co') && !currentUrl.includes('selpic-contents')) {
      console.log(`skip non-supabase ${label}`)
      return currentUrl
    }
    const dl = await get(currentUrl)
    if (dl.status !== 200 || !dl.buf.length) {
      console.warn(`download fail ${label}`, dl.status)
      return currentUrl
    }
    const before = dl.buf.length
    const encoded = await encodeWebp(dl.buf, opts)
    if (encoded.length >= before * 0.95 && encoded.length > opts.targetBytes) {
      // still try upload if we resized edge meaningfully
    }
    const fileId = `${stamp}-${Math.random().toString(36).slice(2, 9)}`
    const objectPath = `${folder}/${fileId}-opt.webp`
    const { error: upErr } = await sb.storage.from(BUCKET).upload(objectPath, encoded, {
      contentType: 'image/webp',
      upsert: true,
    })
    if (upErr) {
      console.warn(`upload fail ${label}`, upErr.message)
      return currentUrl
    }
    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(objectPath)
    console.log(
      `${label}: ${(before / 1024).toFixed(1)} KiB → ${(encoded.length / 1024).toFixed(1)} KiB`
    )
    changed++
    return pub.publicUrl
  }

  // Categories
  if (Array.isArray(state.categoryItems)) {
    for (const cat of state.categoryItems) {
      if (!cat?.backgroundImage) continue
      cat.backgroundImage = await replaceImageField(
        `category:${cat.title || cat.id}`,
        cat.backgroundImage,
        'cms/category-bg',
        { maxEdge: 800, targetBytes: 120 * 1024 }
      )
      cat.updatedAt = new Date().toISOString()
    }
  }

  // Hero slides (image src + video fallback only)
  if (Array.isArray(state.heroSlides)) {
    for (const slide of state.heroSlides) {
      if (!slide) continue
      if (slide.type === 'image' && slide.src) {
        slide.src = await replaceImageField(`hero-src:${slide.id}`, slide.src, 'cms/hero-banner', {
          maxEdge: 1280,
          targetBytes: 160 * 1024,
        })
      }
      if (slide.fallbackImage) {
        slide.fallbackImage = await replaceImageField(
          `hero-fallback:${slide.id}`,
          slide.fallbackImage,
          'cms/hero-banner',
          { maxEdge: 1280, targetBytes: 160 * 1024 }
        )
      }
      slide.updatedAt = new Date().toISOString()
    }
  }

  // Header logo
  if (Array.isArray(state.contentItems)) {
    for (const item of state.contentItems) {
      if (item?.section === 'header' && item?.title === 'Logo Image' && item.mediaUrl) {
        item.mediaUrl = await replaceImageField('header-logo', item.mediaUrl, 'cms/header-logo', {
          maxEdge: 360,
          targetBytes: 24 * 1024,
        })
        item.updatedAt = new Date().toISOString()
      }
    }
  }

  const payload = raw?.state ? { ...raw, state } : state
  const { error: upErr } = await sb.from('site_configs').upsert(
    {
      config_key: CONFIG_KEY,
      value: typeof data.value === 'string' ? JSON.stringify(payload) : payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'config_key' }
  )
  if (upErr) throw upErr
  console.log(`CMS updated (${changed} images replaced)`)

  // Static public logos from current header logo URL (after replace)
  const logoItem = (state.contentItems || []).find(
    (i) => i.section === 'header' && i.title === 'Logo Image' && i.mediaUrl
  )
  const logoUrl = logoItem?.mediaUrl
  if (logoUrl) {
    const dl = await get(logoUrl)
    const publicDir = path.join(process.cwd(), 'public')
    const imagesDir = path.join(publicDir, 'images')
    fs.mkdirSync(imagesDir, { recursive: true })

    const webp = await sharp(dl.buf, { failOn: 'none' })
      .resize({ width: 360, height: 120, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer()
    fs.writeFileSync(path.join(imagesDir, 'logo.webp'), webp)
    fs.writeFileSync(path.join(publicDir, 'logo.webp'), webp)

    const png = await sharp(dl.buf, { failOn: 'none' })
      .resize({ width: 360, height: 120, fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer()
    fs.writeFileSync(path.join(imagesDir, 'logo.png'), png)
    fs.writeFileSync(path.join(publicDir, 'logo.png'), png)

    // Apple touch: 180×180, logo centered on transparent
    const logoMeta = await sharp(dl.buf, { failOn: 'none' }).metadata()
    const fitW = 160
    const fitted = await sharp(dl.buf, { failOn: 'none' })
      .resize({ width: fitW, height: fitW, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer()
    const fittedMeta = await sharp(fitted).metadata()
    const left = Math.floor((180 - (fittedMeta.width || fitW)) / 2)
    const top = Math.floor((180 - (fittedMeta.height || 40)) / 2)
    const apple = await sharp({
      create: { width: 180, height: 180, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
      .composite([{ input: fitted, left, top }])
      .png({ compressionLevel: 9 })
      .toBuffer()
    fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), apple)

    console.log(
      `static logos: logo.webp=${(webp.length / 1024).toFixed(1)}KiB logo.png=${(png.length / 1024).toFixed(1)}KiB apple=${(apple.length / 1024).toFixed(1)}KiB (was ~89KiB png)`
    )
  }

  console.log('done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
