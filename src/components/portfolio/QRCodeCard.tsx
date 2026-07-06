import { QRCodeSVG } from 'qrcode.react'
import { Download } from 'lucide-react'
import { useRef } from 'react'

interface Props {
  url: string
  size?: number
}

export function QRCodeCard({ url, size = 160 }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null)

  const downloadPng = () => {
    const svg = wrapperRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const scale = 3
    canvas.width = size * scale
    canvas.height = size * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = 'portfolio-qr.png'
      link.href = dataUrl
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={wrapperRef}
        className="rounded-lg border border-ink-100 bg-cream-50 p-3"
      >
        <QRCodeSVG value={url} size={size} bgColor="#FFFFFF" fgColor="#181D27" />
      </div>
      <button
        type="button"
        onClick={downloadPng}
        className="flex items-center gap-2 text-xs font-medium text-accent-600 hover:underline"
      >
        <Download size={13} />
        Télécharger en PNG
      </button>
    </div>
  )
}
