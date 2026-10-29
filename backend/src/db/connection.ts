import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const databasePath = resolve(process.cwd(), process.env['DB_PATH'] ?? './data/app.db');
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma('foreign_keys = ON');

const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));
export const schemaSql = readFileSync(schemaPath, 'utf8');

// Ensure a fresh database has the schema before any service uses it.
db.exec(schemaSql);
