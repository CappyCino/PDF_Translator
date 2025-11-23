import React, { useState } from 'react'
import './PdfUploader.css'
// pdf.js kütüphanesini statik import ile alıyoruz (legacy build)
// bazı ortamlarda dynamic import parse hatası verdiği için statik import daha güvenilirdir
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'
// Vite: worker dosyasını URL olarak alıyoruz (bu şekilde tarayıcıdan doğru yoldan yüklenir)
// @ts-ignore
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

const PdfUploader: React.FC = () => {
  const [text, setText] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [targetLang, setTargetLang] = useState<string>('en')
  const [translated, setTranslated] = useState<string>('')
  const [translating, setTranslating] = useState<boolean>(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setText('')
    try {
      const arrayBuffer = await file.arrayBuffer()

      // WorkerSrc ayarla (Vite tarafından sunulan URL)
      ;(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl
      // Normal worker kullanımıyla aç (daha iyi performans için)
      const loadingTask = (pdfjsLib as any).getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise
      const numPages = pdf.numPages
      const pages: string[] = []
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const strings = content.items.map((item: any) => item.str).join(' ')
        pages.push(`-- Sayfa ${i} --\n${strings}`)
      }
      setText(pages.join('\n\n'))
    } catch (err: any) {
      setText('Hata: ' + (err?.message || String(err)))
    } finally {
      setLoading(false)
    }
  }

  // Geçici mock çeviri (test amaçlı). Sunucu + OpenAI entegrasyonu eklendiğinde burayı çağırmayacağız.
  const mockTranslate = async (source: string, lang: string) => {
    const labelMap: Record<string, string> = {
      en: 'English',
      tr: 'Türkçe',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch'
    }
    const label = labelMap[lang] || lang
    // Küçük bir gecikme simule edelim
    await new Promise((r) => setTimeout(r, 700))
    return `=== Mock çeviri: ${label} ===\n\n${source}`
  }

  const handleTranslate = async () => {
    if (!text) return
    setTranslating(true)
    setTranslated('')
    try {
      // Try calling backend first; fallback to mock if server not available
      try {
        const resp = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, targetLang })
        })
        if (resp.ok) {
          const body = await resp.json()
          setTranslated(body.translation || body.translation_text || '')
        } else {
          // fallback to mock
          const txt = await resp.text()
          console.warn('Server translate failed:', resp.status, txt)
          const result = await mockTranslate(text, targetLang)
          setTranslated(result)
        }
      } catch (err) {
        // network or server unreachable -> fallback to mock
        console.warn('Translate server unreachable, using mock.', err)
        const result = await mockTranslate(text, targetLang)
        setTranslated(result)
      }
    } catch (err: any) {
      setTranslated('Çeviri hatası: ' + (err?.message || String(err)))
    } finally {
      setTranslating(false)
    }
  }

  return (
    <div className="pdf-uploader">
      <div className="controls">
        <label className="file-label">
          PDF seç
          <input type="file" accept="application/pdf" onChange={handleFile} />
        </label>
        <div style={{ marginTop: 8 }}>
          <label style={{ marginRight: 8 }}>Hedef dil:</label>
          <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
            <option value="en">English</option>
            <option value="tr">Türkçe</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
          </select>
          <button style={{ marginLeft: 8 }} onClick={handleTranslate} disabled={!text || translating}>
            {translating ? 'Çeviriliyor...' : 'Çevir'}
          </button>
          <small style={{ marginLeft: 12, color: '#666' }}>Geçici mock çeviri kullanılıyor</small>
        </div>
      </div>
      {loading && <p className="status">PDF işleniyor...</p>}
      <textarea className="extracted" value={text} readOnly rows={12} />

      <div style={{ marginTop: 12 }}>
        <label style={{ display: 'block', marginBottom: 6 }}>Çeviri (mock):</label>
        <textarea className="extracted" value={translated} readOnly rows={10} />
      </div>
    </div>
  )
}

export default PdfUploader
