import express from 'express'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from './db.mjs'

const app = express()
const port = Number(process.env.API_PORT || 3333)
app.use(express.json({ limit: '100kb' }))
const publicDir = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist')
app.use(express.static(publicDir))

const required = ['vehicleType', 'brand', 'model', 'version', 'insuredName', 'insuredCpf', 'driverName', 'phone', 'email']
const quoteCode = () => `MB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`

app.get('/api/health', (_request, response) => response.json({ ok: true, database: 'sqlite' }))
app.get('/api/quotes/:code', (request, response) => {
  const quote = db.prepare('SELECT * FROM quotations WHERE code = ?').get(request.params.code)
  if (!quote) return response.status(404).json({ message: 'Cotação não encontrada.' })
  return response.json({ ...quote, data: JSON.parse(quote.raw_json) })
})

app.post('/api/quotes', (request, response) => {
  const data = request.body
  const missing = required.filter(field => !data?.[field])
  if (missing.length) return response.status(422).json({ message: 'Dados obrigatórios ausentes.', fields: missing })

  const id = randomUUID()
  const code = quoteCode()
  const timestamp = new Date().toISOString()
  const transaction = db.transaction(() => {
    db.prepare('INSERT INTO quotations (id, code, status, origin, created_at, updated_at, raw_json) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, code, 'Cotação recebida', 'Cotação Web', timestamp, timestamp, JSON.stringify(data))
    db.prepare('INSERT INTO vehicles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, data.vehicleType, data.brand, data.model, data.version, Number(data.manufactureYear), Number(data.modelYear), data.zeroKm, data.financed, data.hasPlate, data.plate || null, data.alarm, data.antiTheft, data.gasKit, data.taxi)
    db.prepare('INSERT INTO insured_people VALUES (?, ?, ?, ?, ?, ?)').run(id, data.insuredName, data.insuredCpf, data.insuredSex, data.contractor, data.residentialZip)
    db.prepare('INSERT INTO drivers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, data.driverName, data.driverBirth, data.driverSex, data.maritalStatus, data.profession, Number(data.licenseAge), data.residenceType, data.otherVehicles, data.otherResidents)
    db.prepare('INSERT INTO owners VALUES (?, ?, ?, ?, ?)').run(id, data.ownerName || data.insuredName, data.ownerCpf || null, data.ownerRelation || null, data.insuredOwner === 'Sim' ? 1 : 0)
    db.prepare('INSERT INTO usage_profiles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, data.workCommute, data.schoolCommute, data.workUse, data.professionalUse || null, Number(data.monthlyKm), data.hasGarage, data.garageType || null, data.overnightZip, data.travelZip)
    if (data.currentInsurance === 'Sim') db.prepare('INSERT INTO previous_insurance VALUES (?, ?, ?, ?, ?, ?)').run(id, data.insurer, data.policyExpiry, data.bonusClass, data.stolenLastTwoYears, data.claimLastYear)
    db.prepare('INSERT INTO contacts VALUES (?, ?, ?, ?, ?)').run(id, data.phone, data.email, data.preferredContact, data.bestTime)
  })
  try { transaction() } catch (error) { return response.status(500).json({ message: 'Não foi possível salvar a cotação.', detail: error.message }) }
  return response.status(201).json({ id, code, status: 'Cotação recebida', createdAt: timestamp })
})

app.get('*splat', (_request, response) => response.sendFile(join(publicDir, 'index.html')))

app.listen(port, () => console.log(`API SQLite running at http://127.0.0.1:${port}`))