import * as SQLite from 'expo-sqlite';
import type { MeasurementRecord } from '../types';

const DB_NAME = 'meter.db';
const TABLE_NAME = 'measurements';

const db = SQLite.openDatabase(DB_NAME);

type Tx = SQLite.SQLTransaction;
type ResultSet = SQLite.SQLResultSet;

function executeSql<T = ResultSet>(
  query: string,
  params: (string | number | null)[] = []
): Promise<T> {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          query,
          params,
          (_, result) => resolve(result as unknown as T),
          (_: Tx, error) => {
            reject(error);
            return false;
          }
        );
      },
      (error) => reject(error)
    );
  });
}

export async function initDatabase(): Promise<void> {
  await executeSql(
    `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      meter_constant REAL NOT NULL,
      pulses INTEGER NOT NULL,
      duration_seconds REAL NOT NULL,
      power_watts REAL
    );`
  );
}

export async function insertMeasurement(
  record: Omit<MeasurementRecord, 'id'>
): Promise<number> {
  const result = await executeSql<ResultSet>(
    `INSERT INTO ${TABLE_NAME} (timestamp, meter_constant, pulses, duration_seconds, power_watts)
     VALUES (?, ?, ?, ?, ?);`,
    [
      record.timestamp,
      record.meterConstant,
      record.pulses,
      record.durationSeconds,
      record.powerWatts ?? null
    ]
  );
  return result.insertId ?? -1;
}

export async function listMeasurements(): Promise<MeasurementRecord[]> {
  const result = await executeSql<ResultSet>(
    `SELECT id, timestamp, meter_constant as meterConstant, pulses, duration_seconds as durationSeconds, power_watts as powerWatts
     FROM ${TABLE_NAME}
     ORDER BY timestamp DESC;`
  );
  const rows = result.rows;
  const records: MeasurementRecord[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    records.push(rows.item(i) as MeasurementRecord);
  }
  return records;
}

export async function clearMeasurements(): Promise<void> {
  await executeSql(`DELETE FROM ${TABLE_NAME};`);
}
