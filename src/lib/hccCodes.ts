// HCC (Hierarchical Condition Category) Code Mapping
// Based on CMS-HCC Risk Adjustment Model V28 (2024)

export interface HCCCategory {
  hcc: number;
  description: string;
  raf: number; // Risk Adjustment Factor
  category: string;
}

export interface ICD10ToHCC {
  icd10: string;
  hcc: number;
  description: string;
}

// Common HCC categories with RAF (Risk Adjustment Factors)
// These are approximate values for illustration - actual values vary by model year
export const HCC_CATEGORIES: Record<number, HCCCategory> = {
  // HIV/AIDS
  1: { hcc: 1, description: 'HIV/AIDS', raf: 0.329, category: 'Infectious Disease' },

  // Cancers
  17: { hcc: 17, description: 'Cancer, Metastatic/Acute Leukemia', raf: 1.127, category: 'Neoplasms' },
  18: { hcc: 18, description: 'Cancer, Lung/Upper Digestive Tract/Other Severe', raf: 0.299, category: 'Neoplasms' },
  19: { hcc: 19, description: 'Cancer, Lymphoma/Other Cancers', raf: 0.143, category: 'Neoplasms' },
  20: { hcc: 20, description: 'Cancer, Breast/Prostate/Colorectal/Other', raf: 0.123, category: 'Neoplasms' },

  // Diabetes
  35: { hcc: 35, description: 'Diabetes with Acute Complications', raf: 0.318, category: 'Endocrine' },
  36: { hcc: 36, description: 'Diabetes with Chronic Complications', raf: 0.318, category: 'Endocrine' },
  37: { hcc: 37, description: 'Diabetes without Complications', raf: 0.105, category: 'Endocrine' },

  // Liver Disease
  48: { hcc: 48, description: 'Morbid Obesity', raf: 0.273, category: 'Endocrine' },
  57: { hcc: 57, description: 'Chronic Liver Disease, Cirrhosis', raf: 0.385, category: 'Digestive' },
  58: { hcc: 58, description: 'Chronic Hepatitis', raf: 0.385, category: 'Digestive' },

  // Cardiovascular
  85: { hcc: 85, description: 'Congestive Heart Failure', raf: 0.368, category: 'Cardiovascular' },
  86: { hcc: 86, description: 'Acute Myocardial Infarction', raf: 0.234, category: 'Cardiovascular' },
  87: { hcc: 87, description: 'Unstable Angina/Acute Ischemic Heart Disease', raf: 0.234, category: 'Cardiovascular' },
  88: { hcc: 88, description: 'Angina Pectoris', raf: 0.140, category: 'Cardiovascular' },
  96: { hcc: 96, description: 'Heart Arrhythmias', raf: 0.280, category: 'Cardiovascular' },

  // Stroke/TIA
  99: { hcc: 99, description: 'Cerebral Hemorrhage', raf: 0.256, category: 'Cerebrovascular' },
  100: { hcc: 100, description: 'Ischemic or Unspecified Stroke', raf: 0.256, category: 'Cerebrovascular' },

  // Vascular
  103: { hcc: 103, description: 'Hemiplegia/Hemiparesis', raf: 0.581, category: 'Neurological' },
  106: { hcc: 106, description: 'Atherosclerosis of Arteries', raf: 0.298, category: 'Vascular' },
  107: { hcc: 107, description: 'Vascular Disease', raf: 0.298, category: 'Vascular' },
  108: { hcc: 108, description: 'Vascular Disease with Complications', raf: 0.298, category: 'Vascular' },

  // COPD/Pulmonary
  111: { hcc: 111, description: 'COPD', raf: 0.335, category: 'Pulmonary' },
  112: { hcc: 112, description: 'Fibrosis of Lung/Other Chronic Lung Disease', raf: 0.211, category: 'Pulmonary' },

  // Renal
  135: { hcc: 135, description: 'Chronic Kidney Disease, Stage 5', raf: 0.289, category: 'Renal' },
  136: { hcc: 136, description: 'Chronic Kidney Disease, Severe (Stage 4)', raf: 0.289, category: 'Renal' },
  137: { hcc: 137, description: 'Chronic Kidney Disease, Moderate (Stage 3)', raf: 0.069, category: 'Renal' },
  138: { hcc: 138, description: 'Chronic Kidney Disease, Mild or Unspecified', raf: 0.069, category: 'Renal' },

  // Mental Health
  59: { hcc: 59, description: 'Major Depressive, Bipolar, Paranoid Disorders', raf: 0.395, category: 'Mental Health' },
  60: { hcc: 60, description: 'Schizophrenia', raf: 0.476, category: 'Mental Health' },

  // Rheumatoid Arthritis
  40: { hcc: 40, description: 'Rheumatoid Arthritis, Inflammatory Connective Tissue Disease', raf: 0.374, category: 'Musculoskeletal' },

  // Dementia
  52: { hcc: 52, description: 'Dementia with Complications', raf: 0.346, category: 'Neurological' },
  53: { hcc: 53, description: 'Dementia without Complications', raf: 0.346, category: 'Neurological' },
};

// Common ICD-10 to HCC mappings (partial list - real implementation would have thousands)
export const ICD10_TO_HCC_MAP: ICD10ToHCC[] = [
  // Diabetes
  { icd10: 'E10.10', hcc: 36, description: 'Type 1 diabetes with ketoacidosis without coma' },
  { icd10: 'E10.11', hcc: 35, description: 'Type 1 diabetes with ketoacidosis with coma' },
  { icd10: 'E10.21', hcc: 36, description: 'Type 1 diabetes with diabetic nephropathy' },
  { icd10: 'E10.22', hcc: 36, description: 'Type 1 diabetes with diabetic CKD' },
  { icd10: 'E10.29', hcc: 36, description: 'Type 1 diabetes with other diabetic kidney complication' },
  { icd10: 'E10.31', hcc: 36, description: 'Type 1 diabetes with unspecified diabetic retinopathy' },
  { icd10: 'E10.36', hcc: 36, description: 'Type 1 diabetes with diabetic cataract' },
  { icd10: 'E10.40', hcc: 36, description: 'Type 1 diabetes with diabetic neuropathy' },
  { icd10: 'E10.51', hcc: 36, description: 'Type 1 diabetes with diabetic peripheral angiopathy' },
  { icd10: 'E10.52', hcc: 36, description: 'Type 1 diabetes with diabetic peripheral angiopathy with gangrene' },
  { icd10: 'E10.65', hcc: 36, description: 'Type 1 diabetes with hyperglycemia' },
  { icd10: 'E10.9', hcc: 37, description: 'Type 1 diabetes without complications' },
  { icd10: 'E11.21', hcc: 36, description: 'Type 2 diabetes with diabetic nephropathy' },
  { icd10: 'E11.22', hcc: 36, description: 'Type 2 diabetes with diabetic CKD' },
  { icd10: 'E11.40', hcc: 36, description: 'Type 2 diabetes with diabetic neuropathy' },
  { icd10: 'E11.65', hcc: 36, description: 'Type 2 diabetes with hyperglycemia' },
  { icd10: 'E11.9', hcc: 37, description: 'Type 2 diabetes without complications' },

  // CHF
  { icd10: 'I50.1', hcc: 85, description: 'Left ventricular failure, unspecified' },
  { icd10: 'I50.20', hcc: 85, description: 'Unspecified systolic heart failure' },
  { icd10: 'I50.21', hcc: 85, description: 'Acute systolic heart failure' },
  { icd10: 'I50.22', hcc: 85, description: 'Chronic systolic heart failure' },
  { icd10: 'I50.23', hcc: 85, description: 'Acute on chronic systolic heart failure' },
  { icd10: 'I50.30', hcc: 85, description: 'Unspecified diastolic heart failure' },
  { icd10: 'I50.31', hcc: 85, description: 'Acute diastolic heart failure' },
  { icd10: 'I50.32', hcc: 85, description: 'Chronic diastolic heart failure' },
  { icd10: 'I50.33', hcc: 85, description: 'Acute on chronic diastolic heart failure' },
  { icd10: 'I50.40', hcc: 85, description: 'Unspecified combined systolic and diastolic heart failure' },
  { icd10: 'I50.41', hcc: 85, description: 'Acute combined systolic and diastolic heart failure' },
  { icd10: 'I50.42', hcc: 85, description: 'Chronic combined systolic and diastolic heart failure' },
  { icd10: 'I50.43', hcc: 85, description: 'Acute on chronic combined systolic and diastolic heart failure' },
  { icd10: 'I50.9', hcc: 85, description: 'Heart failure, unspecified' },

  // COPD
  { icd10: 'J44.0', hcc: 111, description: 'COPD with acute lower respiratory infection' },
  { icd10: 'J44.1', hcc: 111, description: 'COPD with acute exacerbation' },
  { icd10: 'J44.9', hcc: 111, description: 'COPD, unspecified' },

  // CKD
  { icd10: 'N18.1', hcc: 138, description: 'CKD, stage 1' },
  { icd10: 'N18.2', hcc: 138, description: 'CKD, stage 2' },
  { icd10: 'N18.3', hcc: 137, description: 'CKD, stage 3' },
  { icd10: 'N18.4', hcc: 136, description: 'CKD, stage 4' },
  { icd10: 'N18.5', hcc: 135, description: 'CKD, stage 5' },
  { icd10: 'N18.6', hcc: 135, description: 'End stage renal disease' },

  // AFib
  { icd10: 'I48.0', hcc: 96, description: 'Paroxysmal atrial fibrillation' },
  { icd10: 'I48.1', hcc: 96, description: 'Persistent atrial fibrillation' },
  { icd10: 'I48.2', hcc: 96, description: 'Chronic atrial fibrillation' },
  { icd10: 'I48.91', hcc: 96, description: 'Unspecified atrial fibrillation' },

  // Stroke
  { icd10: 'I63.0', hcc: 100, description: 'Cerebral infarction due to thrombosis of precerebral arteries' },
  { icd10: 'I63.1', hcc: 100, description: 'Cerebral infarction due to embolism of precerebral arteries' },
  { icd10: 'I63.2', hcc: 100, description: 'Cerebral infarction due to unspecified occlusion of precerebral arteries' },
  { icd10: 'I63.3', hcc: 100, description: 'Cerebral infarction due to thrombosis of cerebral arteries' },
  { icd10: 'I63.4', hcc: 100, description: 'Cerebral infarction due to embolism of cerebral arteries' },
  { icd10: 'I63.5', hcc: 100, description: 'Cerebral infarction due to unspecified occlusion of cerebral arteries' },
  { icd10: 'I63.9', hcc: 100, description: 'Cerebral infarction, unspecified' },

  // Mental Health
  { icd10: 'F31.0', hcc: 59, description: 'Bipolar disorder, current episode hypomanic' },
  { icd10: 'F31.1', hcc: 59, description: 'Bipolar disorder, current episode manic without psychotic features' },
  { icd10: 'F31.2', hcc: 59, description: 'Bipolar disorder, current episode manic with psychotic features' },
  { icd10: 'F31.3', hcc: 59, description: 'Bipolar disorder, current episode depressed, mild or moderate' },
  { icd10: 'F31.4', hcc: 59, description: 'Bipolar disorder, current episode depressed, severe, without psychotic features' },
  { icd10: 'F31.5', hcc: 59, description: 'Bipolar disorder, current episode depressed, severe, with psychotic features' },
  { icd10: 'F32.0', hcc: 59, description: 'Major depressive disorder, single episode, mild' },
  { icd10: 'F32.1', hcc: 59, description: 'Major depressive disorder, single episode, moderate' },
  { icd10: 'F32.2', hcc: 59, description: 'Major depressive disorder, single episode, severe without psychotic features' },
  { icd10: 'F32.3', hcc: 59, description: 'Major depressive disorder, single episode, severe with psychotic features' },
  { icd10: 'F33.0', hcc: 59, description: 'Major depressive disorder, recurrent, mild' },
  { icd10: 'F33.1', hcc: 59, description: 'Major depressive disorder, recurrent, moderate' },
  { icd10: 'F33.2', hcc: 59, description: 'Major depressive disorder, recurrent severe without psychotic features' },
  { icd10: 'F33.3', hcc: 59, description: 'Major depressive disorder, recurrent severe with psychotic features' },
  { icd10: 'F20.0', hcc: 60, description: 'Paranoid schizophrenia' },
  { icd10: 'F20.1', hcc: 60, description: 'Disorganized schizophrenia' },
  { icd10: 'F20.2', hcc: 60, description: 'Catatonic schizophrenia' },
  { icd10: 'F20.3', hcc: 60, description: 'Undifferentiated schizophrenia' },
  { icd10: 'F20.5', hcc: 60, description: 'Residual schizophrenia' },
  { icd10: 'F20.9', hcc: 60, description: 'Schizophrenia, unspecified' },

  // Dementia
  { icd10: 'F01.50', hcc: 52, description: 'Vascular dementia without behavioral disturbance' },
  { icd10: 'F01.51', hcc: 52, description: 'Vascular dementia with behavioral disturbance' },
  { icd10: 'F02.80', hcc: 52, description: 'Dementia in other diseases without behavioral disturbance' },
  { icd10: 'F02.81', hcc: 52, description: 'Dementia in other diseases with behavioral disturbance' },
  { icd10: 'F03.90', hcc: 53, description: 'Unspecified dementia without behavioral disturbance' },
  { icd10: 'F03.91', hcc: 53, description: 'Unspecified dementia with behavioral disturbance' },
  { icd10: 'G30.0', hcc: 52, description: 'Alzheimer disease with early onset' },
  { icd10: 'G30.1', hcc: 52, description: 'Alzheimer disease with late onset' },
  { icd10: 'G30.8', hcc: 52, description: 'Other Alzheimer disease' },
  { icd10: 'G30.9', hcc: 52, description: 'Alzheimer disease, unspecified' },

  // Cancer
  { icd10: 'C34.10', hcc: 18, description: 'Malignant neoplasm of upper lobe, bronchus or lung' },
  { icd10: 'C34.11', hcc: 18, description: 'Malignant neoplasm of upper lobe, right bronchus or lung' },
  { icd10: 'C34.12', hcc: 18, description: 'Malignant neoplasm of upper lobe, left bronchus or lung' },
  { icd10: 'C34.90', hcc: 18, description: 'Malignant neoplasm of unspecified part of bronchus or lung' },
  { icd10: 'C50.011', hcc: 20, description: 'Malignant neoplasm of nipple and areola, right female breast' },
  { icd10: 'C50.012', hcc: 20, description: 'Malignant neoplasm of nipple and areola, left female breast' },
  { icd10: 'C61', hcc: 20, description: 'Malignant neoplasm of prostate' },
  { icd10: 'C18.0', hcc: 20, description: 'Malignant neoplasm of cecum' },
  { icd10: 'C18.9', hcc: 20, description: 'Malignant neoplasm of colon, unspecified' },
  { icd10: 'C78.00', hcc: 17, description: 'Secondary malignant neoplasm of unspecified lung' },
  { icd10: 'C78.7', hcc: 17, description: 'Secondary malignant neoplasm of liver and intrahepatic bile duct' },
  { icd10: 'C79.51', hcc: 17, description: 'Secondary malignant neoplasm of bone' },

  // Morbid obesity
  { icd10: 'E66.01', hcc: 48, description: 'Morbid obesity due to excess calories' },
  { icd10: 'E66.2', hcc: 48, description: 'Morbid obesity with alveolar hypoventilation' },

  // Liver disease
  { icd10: 'K74.0', hcc: 57, description: 'Hepatic fibrosis' },
  { icd10: 'K74.3', hcc: 57, description: 'Primary biliary cirrhosis' },
  { icd10: 'K74.4', hcc: 57, description: 'Secondary biliary cirrhosis' },
  { icd10: 'K74.5', hcc: 57, description: 'Biliary cirrhosis, unspecified' },
  { icd10: 'K74.60', hcc: 57, description: 'Unspecified cirrhosis of liver' },
  { icd10: 'K74.69', hcc: 57, description: 'Other cirrhosis of liver' },
  { icd10: 'B18.1', hcc: 58, description: 'Chronic viral hepatitis B without delta-agent' },
  { icd10: 'B18.2', hcc: 58, description: 'Chronic viral hepatitis C' },

  // Rheumatoid Arthritis
  { icd10: 'M05.00', hcc: 40, description: 'Felty syndrome, unspecified site' },
  { icd10: 'M05.10', hcc: 40, description: 'Rheumatoid lung disease with rheumatoid arthritis' },
  { icd10: 'M05.79', hcc: 40, description: 'Rheumatoid arthritis with rheumatoid factor, multiple sites' },
  { icd10: 'M06.00', hcc: 40, description: 'Rheumatoid arthritis without rheumatoid factor, unspecified site' },
  { icd10: 'M06.09', hcc: 40, description: 'Rheumatoid arthritis without rheumatoid factor, multiple sites' },
];

// Function to get HCC codes from ICD-10 codes
export function getHCCCodesFromICD10(icd10Codes: string[]): {
  hccCodes: { hcc: number; category: HCCCategory; icd10Source: string }[];
  totalRAF: number;
  hasHierarchySuppression: boolean;
} {
  const hccMap = new Map<number, { category: HCCCategory; icd10Source: string }>();

  for (const code of icd10Codes) {
    // Normalize code (remove dots, uppercase)
    const normalizedCode = code.toUpperCase().replace(/\./g, '');

    // Try exact match first
    let mapping = ICD10_TO_HCC_MAP.find(
      m => m.icd10.replace(/\./g, '').toUpperCase() === normalizedCode
    );

    // If no exact match, try prefix matching (e.g., E11 matches E11.*)
    if (!mapping) {
      mapping = ICD10_TO_HCC_MAP.find(
        m => normalizedCode.startsWith(m.icd10.replace(/\./g, '').toUpperCase().slice(0, 3))
      );
    }

    if (mapping) {
      const category = HCC_CATEGORIES[mapping.hcc];
      if (category && !hccMap.has(mapping.hcc)) {
        hccMap.set(mapping.hcc, { category, icd10Source: code });
      }
    }
  }

  const hccCodes = Array.from(hccMap.entries()).map(([hcc, data]) => ({
    hcc,
    category: data.category,
    icd10Source: data.icd10Source,
  }));

  // Calculate total RAF (simplified - real calculation is more complex)
  const totalRAF = hccCodes.reduce((sum, code) => sum + code.category.raf, 0);

  // Check for hierarchy suppression (simplified)
  // In reality, certain HCCs suppress others in the hierarchy
  const hasHierarchySuppression = false; // Would implement full hierarchy rules

  return {
    hccCodes,
    totalRAF,
    hasHierarchySuppression,
  };
}

// Get color for RAF score display
export function getRAFColor(raf: number): string {
  if (raf >= 0.5) return 'text-red-600 dark:text-red-400';
  if (raf >= 0.3) return 'text-amber-600 dark:text-amber-400';
  if (raf >= 0.1) return 'text-green-600 dark:text-green-400';
  return 'text-muted-foreground';
}

// Get category icon (for display)
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Cardiovascular': '❤️',
    'Endocrine': '🔬',
    'Pulmonary': '🫁',
    'Renal': '🫘',
    'Neurological': '🧠',
    'Mental Health': '🧠',
    'Neoplasms': '🔴',
    'Digestive': '🫃',
    'Vascular': '🩸',
    'Cerebrovascular': '🧠',
    'Musculoskeletal': '🦴',
    'Infectious Disease': '🦠',
  };
  return icons[category] || '📋';
}
