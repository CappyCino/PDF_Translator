import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fetch from 'node-fetch'

// Load .env from /server/.env
dotenv.config({ path: path.resolve('./server/.env') })

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

// Simple logger
app.use((req, res, next) => {
  console.log(`[server] ${req.method} ${req.url}`)
  next()
})

// Health check (check if API key exists)
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    openaiKeyPresent: !!process.env.OPENAI_API_KEY
  })
})

app.post('/api/translate', async (req, res) => {
  const { text, targetLang } = req.body || {}
  if (!text) return res.status(400).json({ error: 'No text provided' })
  if (!process.env.OPENAI_API_KEY)
    return res.status(500).json({ error: 'OPENAI_API_KEY missing in .env' })

  console.log(`[server] translate request length=${text.length}, lang=${targetLang}`)

  const prompt = `Translate the following text into ${targetLang}. Preserve formatting.`
  const body = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: text }
    ],
    temperature: 0.2
  }

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(body)
    })

    if (!resp.ok) {
      const errorText = await resp.text()
      console.error(`[server] OpenAI error:`, errorText)
      return res.status(502).json({ error: 'OpenAI API error', details: errorText })
    }

    const data = await resp.json()
    const translated = data?.choices?.[0]?.message?.content || ''

    console.log(`[server] translation length=${translated.length}`)
    return res.json({ translation: translated })

  } catch (err) {
    console.error('[server] internal error:', err)
    return res.status(500).json({ error: err.message })
  }
})

const port = process.env.PORT || 3001
console.log(`[server] Starting server on port ${port}. OPENAI_API_KEY loaded: ${!!process.env.OPENAI_API_KEY}`)

app.listen(port, () => {
  console.log(`[server] translate server running on port ${port}`)
})
