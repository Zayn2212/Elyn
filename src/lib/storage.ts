/**
 * Storage utilities for ELYN application.
 *
 * Credential fields (username, password) are stored in platform-native secure storage:
 *   - Mobile (Capacitor): OS Keychain / Keystore via capacitor-secure-storage-plugin
 *   - Web: NOT persisted — credentials are in-memory only for the session
 *
 * Non-sensitive hospital metadata and bills remain in localStorage.
 */

import { Capacitor } from '@capacitor/core';

// ===== Types =====

export interface Hospital {
  id: string;
  name: string;
  nickname: string;
  emrType: string | null;
  emrUrl: string;
  vpnType: string;
  vpnServer: string;
  vpnGroup: string;
  mfaType: string;
  username: string;
  password: string;
  favorite: boolean;
  notes: string;
  lastUsed?: number;
  updatedAt?: number;
}

export interface Bill {
  id: string;
  patientName: string;
  patientMRN: string;
  patientDOB: string;
  dos: string;
  facility: string;
  cptCode: string;
  modifiers: string[];
  diagnosis: string;
  rvu: number;
  status: 'pending' | 'submitted';
  createdAt: number;
  submittedAt?: number;
}

// ===== Storage Keys =====
const KEYS = {
  hospitalsMeta: 'elyn_hospitals_meta',
  bills: 'elyn_bills',
  // Legacy key — used only for one-time migration
  _legacyHospitals: 'elyn_hospitals',
} as const;

const credKey = (id: string) => `elyn_cred_${id}`;

// ===== Platform detection =====
const isNative = Capacitor.isNativePlatform();

// ===== Secure Storage (native only) =====
// Credentials are stored via OS Keychain (iOS) / Keystore (Android).
// On web, get/set are no-ops so credentials are never written to disk.
const SecureStore = {
  async set(key: string, value: string): Promise<void> {
    if (!isNative) return;
    const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
    await SecureStoragePlugin.set({ key, value });
  },

  async get(key: string): Promise<string | null> {
    if (!isNative) return null;
    try {
      const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
      const result = await SecureStoragePlugin.get({ key });
      return result.value ?? null;
    } catch {
      return null;
    }
  },

  async remove(key: string): Promise<void> {
    if (!isNative) return;
    try {
      const { SecureStoragePlugin } = await import('capacitor-secure-storage-plugin');
      await SecureStoragePlugin.remove({ key });
    } catch {
      // Key may not exist — ignore
    }
  },
};

// ===== Helper =====
const safeJSONParse = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

// Non-sensitive fields stored in localStorage
type HospitalMeta = Omit<Hospital, 'username' | 'password'>;

interface StoredCredentials {
  username: string;
  password: string;
}

// ===== One-time migration from plaintext localStorage =====
// Reads the old `elyn_hospitals` key (if present), moves metadata to the new key,
// moves credentials to SecureStorage (mobile) or drops them (web), then deletes the old key.
async function migrateFromLegacyStorage(): Promise<void> {
  const raw = localStorage.getItem(KEYS._legacyHospitals);
  if (!raw) return;

  let legacy: Hospital[] = [];
  try {
    legacy = JSON.parse(raw);
  } catch {
    localStorage.removeItem(KEYS._legacyHospitals);
    return;
  }

  // Only migrate if the new key doesn't exist yet
  const alreadyMigrated = localStorage.getItem(KEYS.hospitalsMeta);
  if (!alreadyMigrated) {
    const metas: HospitalMeta[] = legacy.map(({ username: _u, password: _p, ...meta }) => meta);
    localStorage.setItem(KEYS.hospitalsMeta, JSON.stringify(metas));

    // Move credentials to secure storage (no-op on web)
    await Promise.all(
      legacy.map((h) =>
        SecureStore.set(credKey(h.id), JSON.stringify({ username: h.username, password: h.password }))
      )
    );
  }

  // Delete the old plaintext entry regardless
  localStorage.removeItem(KEYS._legacyHospitals);
}

// Run migration once at module load — callers await getAll() which awaits this
let _migrationDone = false;
async function ensureMigrated(): Promise<void> {
  if (_migrationDone) return;
  _migrationDone = true;
  await migrateFromLegacyStorage();
}

// ===== Hospital Storage =====
export const HospitalStorage = {
  async getAll(): Promise<Hospital[]> {
    await ensureMigrated();
    const metas: HospitalMeta[] = safeJSONParse(KEYS.hospitalsMeta, []);
    return Promise.all(
      metas.map(async (meta) => {
        const raw = await SecureStore.get(credKey(meta.id));
        const creds: StoredCredentials = raw
          ? JSON.parse(raw)
          : { username: '', password: '' };
        return { ...meta, ...creds };
      })
    );
  },

  async add(hospital: Hospital): Promise<void> {
    await ensureMigrated();
    const { username, password, ...meta } = hospital;
    const metas: HospitalMeta[] = safeJSONParse(KEYS.hospitalsMeta, []);
    const idx = metas.findIndex((h) => h.id === meta.id);
    if (idx >= 0) {
      metas[idx] = meta;
    } else {
      metas.push(meta);
    }
    localStorage.setItem(KEYS.hospitalsMeta, JSON.stringify(metas));
    await SecureStore.set(credKey(hospital.id), JSON.stringify({ username, password }));
  },

  async remove(id: string): Promise<void> {
    await ensureMigrated();
    const metas: HospitalMeta[] = safeJSONParse(KEYS.hospitalsMeta, []);
    localStorage.setItem(
      KEYS.hospitalsMeta,
      JSON.stringify(metas.filter((h) => h.id !== id))
    );
    await SecureStore.remove(credKey(id));
  },
};

// ===== Bills Storage (no credentials — unchanged) =====
export const BillsStorage = {
  getAll: (): Bill[] => safeJSONParse(KEYS.bills, []),

  save: (bills: Bill[]) => {
    localStorage.setItem(KEYS.bills, JSON.stringify(bills));
  },

  add: (bill: Omit<Bill, 'id' | 'createdAt' | 'status'>) => {
    const all = BillsStorage.getAll();
    all.push({
      ...bill,
      id: `b_${Date.now()}`,
      createdAt: Date.now(),
      status: 'pending',
    });
    BillsStorage.save(all);
  },

  update: (id: string, updates: Partial<Bill>) => {
    const all = BillsStorage.getAll();
    const idx = all.findIndex((b) => b.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...updates };
    }
    BillsStorage.save(all);
  },

  remove: (id: string) => {
    BillsStorage.save(BillsStorage.getAll().filter((b) => b.id !== id));
  },
};
