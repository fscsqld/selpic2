'use client'

import { Download, ExternalLink, Image as ImageIcon } from 'lucide-react'

export type BespokeLogoMeta = {
  fileUrl: string
  mimeType: string
  originalName: string
  size: number
}

type BespokeLogoAssetProps = {
  logo?: BespokeLogoMeta | null
  requestId: string
  compact?: boolean
}

export function bespokeLogoDownloadHref(requestId: string): string {
  return `/api/bespoke-requests/stickers/custom/${encodeURIComponent(requestId)}/logo`
}

export default function BespokeLogoAsset({ logo, requestId, compact = false }: BespokeLogoAssetProps) {
  if (!logo?.fileUrl) {
    return <div className="text-sm text-gray-500">No logo image uploaded.</div>
  }

  const sizeKb = Math.max(1, Math.round(logo.size / 1024))
  const downloadHref = bespokeLogoDownloadHref(requestId)

  return (
    <div>
      <div className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-900">Logo preview</span>
      </div>
      <img
        src={logo.fileUrl}
        alt="Customer logo"
        className={
          compact
            ? 'mt-3 max-h-36 w-full object-contain rounded-xl border border-gray-200 bg-white'
            : 'mt-3 max-h-52 w-full object-contain rounded-xl border border-gray-200 bg-white'
        }
      />
      <div className="mt-2 text-xs text-gray-500">
        {logo.originalName || 'logo'} ({sizeKb} KB)
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={downloadHref}
          download={logo.originalName || undefined}
          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800 hover:bg-indigo-100"
        >
          <Download className="h-3.5 w-3.5" />
          Download logo
        </a>
        <a
          href={logo.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in new tab
        </a>
      </div>
    </div>
  )
}
