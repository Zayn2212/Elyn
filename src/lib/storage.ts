/**
 * Storage utilities for ELYN application.
 * Handles localStorage operations for hospitals, bills, charges, and credentials.
 */

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
  hospitals: 'elyn_hospitals',
  bills: 'elyn_bills',
} as const;

// ===== Helper =====
const safeJSONParse = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

// ===== Hospital Storage =====
export const HospitalStorage = {
  getAll: (): Hospital[] => safeJSONParse(KEYS.hospitals, []),
  
  save: (hospitals: Hospital[]) => {
    localStorage.setItem(KEYS.hospitals, JSON.stringify(hospitals));
  },
  
  add: (hospital: Hospital) => {
    const hospitals = HospitalStorage.getAll();
    const idx = hospitals.findIndex((h) => h.id === hospital.id);
    if (idx >= 0) {
      hospitals[idx] = hospital;
    } else {
      hospitals.push(hospital);
    }
    HospitalStorage.save(hospitals);
  },
  
  remove: (id: string) => {
    HospitalStorage.save(HospitalStorage.getAll().filter((h) => h.id !== id));
  },
};

// ===== Bills Storage =====
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
