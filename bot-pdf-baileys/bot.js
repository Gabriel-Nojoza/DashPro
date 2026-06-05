import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import qrcode from 'qrcode-terminal'
import makeWASocket, {
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from '@whiskeysockets/baileys'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const BASE_DIR = 'C:/Users/gabri/Desktop/bot-pdf'
const HTTP_PORT = Number(process.env.PORT || 3210)

const grupos = [
  { nome: 'Grupo 1', id: '120363406411408946@g.us', pasta: 'grupo-1' },
  { nome: 'Grupo 2', id: '120363407240392123@g.us', pasta: 'grupo-2' },
  { nome: 'Grupo 3', id: '120363423749941918@g.us', pasta: 'grupo-3' },
  { nome: 'Grupo 4', id: '120363406391767151@g.us', pasta: 'grupo-4' },
  { nome: 'Grupo 5', id: '120363407737340800@g.us', pasta: 'grupo-5' },
  { nome: 'Grupo 6', id: '120363424874021737@g.us', pasta: 'grupo-6' },
  { nome: 'Grupo 7', id: '120363422804615911@g.us', pasta: 'grupo-7' },
]

const app = express()
app.use(express.json())

let activeSocket = null
const contactDirectory = new Map()

const runtimeStatus = {
  connected: false,
  state: 'starting',
  qrAvailable: false,
  qrCode: null,
  qrAscii: null,
  lastQrAt: null,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
  lastError: null,
  joinedGroups: [],
}

function normalizePhoneFromJid (jid) {
  if (!jid || typeof jid !== 'string') return null
  const [rawUser] = jid.split('@')
  if (!rawUser) return null
  return rawUser.split(':')[0] || null
}

function isGroupJid (jid) {
  return typeof jid === 'string' && jid.endsWith('@g.us')
}

function isDirectChatJid (jid) {
  return typeof jid === 'string' && jid.endsWith('@s.whatsapp.net')
}

function getDisplayName (payload = {}) {
  return payload.name
    || payload.notify
    || payload.verifiedName
    || payload.pushName
    || payload.subject
    || null
}

function upsertContact (payload = {}, source = 'unknown') {
  const jid = payload.id || payload.jid
  if (!isDirectChatJid(jid)) return

  const phone = normalizePhoneFromJid(jid)
  if (!phone) return

  const previous = contactDirectory.get(jid) || {}
  const displayName = getDisplayName(payload)

  contactDirectory.set(jid, {
    id: jid,
    phone,
    name: displayName || previous.name || phone,
    notify: payload.notify || previous.notify || null,
    verifiedName: payload.verifiedName || previous.verifiedName || null,
    pushName: payload.pushName || previous.pushName || null,
    source,
  })
}

function getContactsList () {
  return [...contactDirectory.values()]
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
}

function buildQrAscii (qr) {
  return new Promise((resolve, reject) => {
    try {
      qrcode.generate(qr, { small: true }, (code) => resolve(code))
    } catch (error) {
      reject(error)
    }
  })
}

function configuredGroupsSummary () {
  return grupos.map((group) => ({
    id: group.id,
    name: group.nome,
    folder: group.pasta,
  }))
}

async function refreshJoinedGroups (sock) {
  try {
    const groups = await sock.groupFetchAllParticipating()
    runtimeStatus.joinedGroups = Object.values(groups).map((group) => ({
      id: group.id,
      subject: group.subject || 'Sem nome',
    }))
  } catch (error) {
    console.error('Erro ao atualizar grupos do bot:', error.message)
  }
}

function logJoinedGroups () {
  console.log('\n=== Grupos onde o bot esta ===')
  for (const group of runtimeStatus.joinedGroups) {
    console.log(`- ${group.subject} -> ${group.id}`)
  }
  console.log('=== Fim da lista de grupos ===\n')
}

async function getLatestPdfPath (moment, group) {
  const folder = path.join(BASE_DIR, group.pasta)

  if (!fs.existsSync(folder)) {
    console.log(`Pasta nao encontrada para ${group.nome}: ${folder}`)
    return null
  }

  const files = await fs.promises.readdir(folder)
  const pdfs = files.filter((file) => {
    const lower = file.toLowerCase()
    return lower.endsWith('.pdf') && lower.includes(moment.toLowerCase())
  })

  if (pdfs.length === 0) return null

  let latestFile = pdfs[0]
  let latestTime = (await fs.promises.stat(path.join(folder, latestFile))).mtimeMs

  for (const file of pdfs.slice(1)) {
    const fullPath = path.join(folder, file)
    const stats = await fs.promises.stat(fullPath)
    if (stats.mtimeMs > latestTime) {
      latestTime = stats.mtimeMs
      latestFile = file
    }
  }

  return path.join(folder, latestFile)
}

async function sendPdfsForMoment (sock, moment) {
  console.log(`\n=== Iniciando envio de PDFs (${moment}) ===`)

  for (const group of grupos) {
    const filePath = await getLatestPdfPath(moment, group)

    if (!filePath) {
      console.log(`Nenhum PDF encontrado para ${group.nome} (${moment})`)
      continue
    }

    if (!fs.existsSync(filePath)) {
      console.log(`Arquivo nao encontrado para ${group.nome}: ${filePath}`)
      continue
    }

    const buffer = fs.readFileSync(filePath)
    const fileName = path.basename(filePath)
    const caption = `Relatorio ${moment} - ${group.nome}`

    try {
      console.log(`Enviando ${fileName} para ${group.nome} (${group.id})...`)
      await sock.sendMessage(group.id, {
        document: buffer,
        mimetype: 'application/pdf',
        fileName,
        caption,
      })
      console.log(`Enviado para ${group.nome}`)
    } catch (error) {
      console.error(`Erro ao enviar para ${group.nome}:`, error.message)
    }
  }

  console.log(`=== Fim do envio (${moment}) ===\n`)
}

app.get('/status', (req, res) => {
  res.json({
    connected: runtimeStatus.connected,
    state: runtimeStatus.state,
    message: runtimeStatus.connected
      ? 'Bot PDF conectado'
      : runtimeStatus.lastError || 'Bot PDF desconectado',
    qrAvailable: runtimeStatus.qrAvailable,
    qrCode: runtimeStatus.qrCode,
    qrAscii: runtimeStatus.qrAscii,
    lastQrAt: runtimeStatus.lastQrAt,
    lastConnectedAt: runtimeStatus.lastConnectedAt,
    lastDisconnectedAt: runtimeStatus.lastDisconnectedAt,
    configuredGroups: configuredGroupsSummary(),
    joinedGroups: runtimeStatus.joinedGroups,
    contactCount: contactDirectory.size,
    uptimeSeconds: Math.floor(process.uptime()),
  })
})

app.get('/qr', (req, res) => {
  res.json({
    available: runtimeStatus.qrAvailable,
    connected: runtimeStatus.connected,
    state: runtimeStatus.state,
    qrCode: runtimeStatus.qrCode,
    qrAscii: runtimeStatus.qrAscii,
    lastQrAt: runtimeStatus.lastQrAt,
    message: runtimeStatus.qrAvailable
      ? 'QR disponivel para leitura'
      : runtimeStatus.connected
        ? 'Bot ja conectado'
        : runtimeStatus.lastError || 'QR indisponivel no momento',
  })
})

app.get('/groups', (req, res) => {
  res.json({
    connected: runtimeStatus.connected,
    count: runtimeStatus.joinedGroups.length,
    items: runtimeStatus.joinedGroups,
  })
})

app.get('/contacts', (req, res) => {
  const search = (req.query.search || '').toString().trim().toLowerCase()
  const contacts = getContactsList().filter((contact) => {
    if (!search) return true
    return contact.name.toLowerCase().includes(search)
      || contact.phone.toLowerCase().includes(search)
      || contact.id.toLowerCase().includes(search)
  })

  res.json({
    connected: runtimeStatus.connected,
    count: contacts.length,
    items: contacts,
  })
})

app.post('/send-pdfs', async (req, res) => {
  const moment = req.body.moment

  if (!['manha', 'tarde', 'noite'].includes(moment)) {
    return res.status(400).json({ error: 'moment invalido' })
  }

  if (!activeSocket || !runtimeStatus.connected) {
    return res.status(503).json({ error: 'bot desconectado do WhatsApp' })
  }

  try {
    await sendPdfsForMoment(activeSocket, moment)
    return res.json({ ok: true, moment })
  } catch (error) {
    console.error('Erro no endpoint /send-pdfs:', error)
    return res.status(500).json({ error: 'erro ao enviar PDFs' })
  }
})

app.post('/send-message', async (req, res) => {
  const target = req.body.target
  const message = req.body.message

  if (!target || !message) {
    return res.status(400).json({ error: 'target e message sao obrigatorios' })
  }

  if (!activeSocket || !runtimeStatus.connected) {
    return res.status(503).json({ error: 'bot desconectado do WhatsApp' })
  }

  try {
    await activeSocket.sendMessage(target, { text: message })
    return res.json({ ok: true, target })
  } catch (error) {
    console.error('Erro no endpoint /send-message:', error)
    return res.status(500).json({ error: 'erro ao enviar mensagem' })
  }
})

app.listen(HTTP_PORT, () => {
  console.log(`Servidor HTTP ouvindo em http://localhost:${HTTP_PORT}`)
  console.log('Endpoints: GET /status, /qr, /groups, /contacts e POST /send-pdfs { "moment": "manha|tarde|noite" }, /send-message')
})

async function start () {
  const authFolder = path.join(__dirname, 'auth')
  const { state, saveCreds } = await useMultiFileAuthState(authFolder)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['GabrielBot', 'Chrome', '1.0.0'],
  })

  activeSocket = sock
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, qr, lastDisconnect } = update

    if (qr) {
      runtimeStatus.state = 'qr'
      runtimeStatus.qrAvailable = true
      runtimeStatus.qrCode = qr
      runtimeStatus.lastQrAt = new Date().toISOString()
      runtimeStatus.qrAscii = await buildQrAscii(qr)
      console.log('\nLeia este QR com o WhatsApp (Dispositivos conectados):\n')
      qrcode.generate(qr, { small: false })
    }

    if (connection === 'open') {
      runtimeStatus.connected = true
      runtimeStatus.state = 'open'
      runtimeStatus.qrAvailable = false
      runtimeStatus.qrCode = null
      runtimeStatus.qrAscii = null
      runtimeStatus.lastConnectedAt = new Date().toISOString()
      runtimeStatus.lastError = null

      console.log('\nConectado ao WhatsApp!')
      console.log('Deixe este programa rodando.\n')

      await refreshJoinedGroups(sock)
      logJoinedGroups()
    }

    if (connection === 'close') {
      runtimeStatus.connected = false
      runtimeStatus.state = 'close'
      runtimeStatus.qrAvailable = false
      runtimeStatus.qrCode = null
      runtimeStatus.qrAscii = null
      runtimeStatus.lastDisconnectedAt = new Date().toISOString()
      runtimeStatus.lastError = lastDisconnect?.error?.message || 'Conexao encerrada'
      runtimeStatus.joinedGroups = []
      activeSocket = null

      console.log('Conexao fechada. Tentando reconectar...')
      setTimeout(() => {
        start().catch((error) => {
          runtimeStatus.lastError = error.message
          console.error('Erro ao reiniciar bot:', error)
        })
      }, 2000)
    }
  })

  sock.ev.on('messaging-history.set', ({ chats, contacts }) => {
    for (const contact of contacts || []) upsertContact(contact, 'history')
    for (const chat of chats || []) upsertContact(chat, 'history-chat')
  })

  sock.ev.on('contacts.upsert', (contacts) => {
    for (const contact of contacts || []) upsertContact(contact, 'contacts.upsert')
  })

  sock.ev.on('contacts.update', (contacts) => {
    for (const contact of contacts || []) upsertContact(contact, 'contacts.update')
  })

  sock.ev.on('chats.upsert', (chats) => {
    for (const chat of chats || []) upsertContact(chat, 'chats.upsert')
  })
}

start().catch((error) => {
  runtimeStatus.connected = false
  runtimeStatus.state = 'error'
  runtimeStatus.lastError = error.message
  console.error('Erro ao iniciar bot:', error)
})
