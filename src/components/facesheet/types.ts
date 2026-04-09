export interface ParsedData {
  patient: {
    name: string | null;
    dob: string | null;
    mrn: string | null;
    gender: string | null;
    phone: string | null;
    address: string | null;
    emergencyContact: string | null;
  };
  insurance: {
    provider: string | null;
    policyNumber: string | null;
    groupNumber: string | null;
    subscriberName: string | null;
    subscriberDob: string | null;
    relationship: string | null;
    authorizationNumber: string | null;
  };
  medical: {
    allergies: string[];
    medications: string[];
    pastMedicalHistory: string[];
    chiefComplaint: string | null;
    primaryDiagnosis: string | null;
    roomNumber: string | null;
    attendingPhysician: string | null;
    admissionDate: string | null;
  };
  confidence: {
    overall: number;
    patient: number;
    insurance: number;
    medical: number;
  };
}
