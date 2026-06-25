export interface FhirObservationVitals {
  resourceType: 'Observation';
  id?: string;
  meta: { profile: string[] };
  status: string;
  category: { coding: FhirVitalsCoding[] }[];
  code: { coding: FhirVitalsCoding[] };
  subject: { reference: string };
  encounter?: { reference: string };
  effectiveDateTime: string;
  valueQuantity?: { value: number; unit: string; system: string; code: string };
  component?: {
    code: { coding: FhirVitalsCoding[] };
    valueQuantity: { value: number; unit: string; system: string; code: string };
  }[];
}

export interface FhirVitalsCoding {
  system: string; code: string; display: string;
}

// ── Vital types config ────────────────────────────
export type VitalType = 'bp' | 'hr' | 'rr' | 'spo2' | 'temp' | 'weight';

export interface VitalConfig {
  type:         VitalType;
  label:        string;
  icon:         string;
  loincCode:    string;
  loincDisplay: string;
  snomedCode:   string;
  snomedDisplay:string;
  unit:         string;
  ucumCode:     string;
  min:          number;
  max:          number;
  normal:       string;
  isBP?:        boolean;
}

export const VITAL_CONFIGS: VitalConfig[] = [
  {
    type: 'bp', label: 'Blood Pressure', icon: '🩺',
    loincCode: '85354-9', loincDisplay: 'Blood pressure panel with all children optional',
    snomedCode: '75367002', snomedDisplay: 'Blood pressure',
    unit: 'mmHg', ucumCode: 'mm[Hg]', min: 50, max: 250, normal: '120/80', isBP: true
  },
  {
    type: 'hr', label: 'Heart Rate', icon: '❤️',
    loincCode: '8867-4', loincDisplay: 'Heart rate',
    snomedCode: '78564009', snomedDisplay: 'Pulse rate',
    unit: 'beats/minute', ucumCode: '/min', min: 20, max: 300, normal: '60–100'
  },
  {
    type: 'rr', label: 'Respiratory Rate', icon: '🫁',
    loincCode: '9279-1', loincDisplay: 'Respiratory rate',
    snomedCode: '86290005', snomedDisplay: 'Respiratory rate',
    unit: 'breaths/minute', ucumCode: '/min', min: 4, max: 60, normal: '12–20'
  },
  {
    type: 'spo2', label: 'Oxygen Saturation', icon: '💧',
    loincCode: '2708-6', loincDisplay: 'Oxygen saturation in Arterial blood',
    snomedCode: '103228002', snomedDisplay: 'Hemoglobin saturation with oxygen',
    unit: '%', ucumCode: '%', min: 50, max: 100, normal: '95–100%'
  },
  {
    type: 'temp', label: 'Temperature', icon: '🌡️',
    loincCode: '8310-5', loincDisplay: 'Body temperature',
    snomedCode: '386725007', snomedDisplay: 'Body temperature',
    unit: 'Celsius', ucumCode: 'Cel', min: 30, max: 45, normal: '36.1–37.2°C'
  },
  {
    type: 'weight', label: 'Body Weight', icon: '⚖️',
    loincCode: '29463-7', loincDisplay: 'Body weight',
    snomedCode: '27113001', snomedDisplay: 'Body weight',
    unit: 'kg', ucumCode: 'kg', min: 0.5, max: 500, normal: '—'
  }
];

export interface VitalsFormModel {
  patientReference:   string;
  encounterReference: string;
  effectiveDateTime:  string;
  status:             string;
  // BP
  systolic:   number | null;
  diastolic:  number | null;
  // HR
  heartRate:  number | null;
  // RR
  respRate:   number | null;
  // SpO2
  spo2:       number | null;
  // Temp
  temp:       number | null;
  // Weight
  weight:     number | null;
}

export const EMPTY_VITALS_FORM: VitalsFormModel = {
  patientReference: '', encounterReference: '', effectiveDateTime: '',
  status: 'final',
  systolic: null, diastolic: null,
  heartRate: null, respRate: null,
  spo2: null, temp: null, weight: null
};