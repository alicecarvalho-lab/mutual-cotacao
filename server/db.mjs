import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const databasePath = resolve(process.env.DATABASE_PATH || 'data/mutual-cotacao.sqlite')
mkdirSync(dirname(databasePath), { recursive: true })
export const db = new Database(databasePath)
db.pragma('foreign_keys = ON')
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    origin TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    raw_json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS vehicles (
    quotation_id TEXT PRIMARY KEY REFERENCES quotations(id) ON DELETE CASCADE,
    type TEXT NOT NULL, brand TEXT NOT NULL, model TEXT NOT NULL, version TEXT NOT NULL,
    manufacture_year INTEGER NOT NULL, model_year INTEGER NOT NULL, zero_km TEXT NOT NULL,
    financed TEXT NOT NULL, has_plate TEXT NOT NULL, plate TEXT,
    alarm TEXT NOT NULL, anti_theft TEXT NOT NULL, gas_kit TEXT NOT NULL, taxi TEXT NOT NULL,
    tax_exemption TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS insured_people (
    quotation_id TEXT PRIMARY KEY REFERENCES quotations(id) ON DELETE CASCADE,
    name TEXT NOT NULL, cpf TEXT NOT NULL, sex TEXT NOT NULL, contractor TEXT NOT NULL,
    residential_zip TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS drivers (
    quotation_id TEXT PRIMARY KEY REFERENCES quotations(id) ON DELETE CASCADE,
    name TEXT NOT NULL, birth_date TEXT NOT NULL, sex TEXT NOT NULL, marital_status TEXT NOT NULL,
    profession TEXT NOT NULL, license_age INTEGER NOT NULL, residence_type TEXT NOT NULL,
    other_vehicles TEXT NOT NULL, other_residents TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS owners (
    quotation_id TEXT PRIMARY KEY REFERENCES quotations(id) ON DELETE CASCADE,
    name TEXT NOT NULL, cpf TEXT, relation TEXT, same_as_insured INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS usage_profiles (
    quotation_id TEXT PRIMARY KEY REFERENCES quotations(id) ON DELETE CASCADE,
    work_commute TEXT NOT NULL, school_commute TEXT NOT NULL, work_use TEXT NOT NULL,
    professional_use TEXT, monthly_km INTEGER NOT NULL, has_garage TEXT NOT NULL,
    garage_type TEXT, overnight_zip TEXT NOT NULL, travel_zip TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS previous_insurance (
    quotation_id TEXT PRIMARY KEY REFERENCES quotations(id) ON DELETE CASCADE,
    insurer TEXT NOT NULL, policy_expiry TEXT NOT NULL, bonus_class TEXT NOT NULL,
    stolen_last_two_years TEXT NOT NULL, claim_last_year TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS contacts (
    quotation_id TEXT PRIMARY KEY REFERENCES quotations(id) ON DELETE CASCADE,
    phone TEXT NOT NULL, email TEXT NOT NULL, preferred_contact TEXT NOT NULL, best_time TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS quotation_sessions (
    id TEXT PRIMARY KEY,
    cpf TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'Rascunho',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    raw_json TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_quotation_sessions_cpf ON quotation_sessions(cpf);
  CREATE INDEX IF NOT EXISTS idx_quotation_sessions_email ON quotation_sessions(email);
`)

try { db.exec("ALTER TABLE vehicles ADD COLUMN tax_exemption TEXT NOT NULL DEFAULT ''") } catch (error) { if (!String(error.message).includes('duplicate column name')) throw error }

if (import.meta.url === `file://${process.argv[1]}`) console.log(`SQLite initialized at ${databasePath}`)