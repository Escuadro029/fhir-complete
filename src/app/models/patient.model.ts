export interface FhirPatient {
  resourceType: 'Patient';
  id?: string;
  meta: { profile: string[]; versionId?: string; lastUpdated?: string };
  identifier: { system: string; value: string }[];
  active: boolean;
  name: { family: string; given: string[] }[];
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string;
  address: FhirAddress[];
}

export interface FhirAddress {
  extension: { url: string; valueCoding: { system: string; code: string; display: string } }[];
  line: string[];
  city: string;
  district: string;
  postalCode: string;
  country: string;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  total?: number;
  entry?: { resource: FhirPatient }[];
}

export interface PatientFormModel {
  philhealthId: string;
  familyName: string;
  givenName: string;
  middleName: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string;
  active: boolean;
  line1: string;
  line2: string;
  city: string;
  district: string;
  postalCode: string;
  country: string;
  barangayCode: string;
  barangayDisplay: string;
  cityMunCode: string;
  cityMunDisplay: string;
  provinceCode: string;
  provinceDisplay: string;
}

export const EMPTY_FORM: PatientFormModel = {
  philhealthId: '', familyName: '', givenName: '', middleName: '',
  gender: 'female', birthDate: '', active: true,
  line1: '', line2: '', city: '', district: '', postalCode: '', country: 'PH',
  barangayCode: '', barangayDisplay: '', cityMunCode: '', cityMunDisplay: '',
  provinceCode: '', provinceDisplay: ''
};

// In patient.model.ts — update FhirBundle
export interface FhirBundle {
  resourceType: 'Bundle';
  total?: number;
  link?: { relation: string; url: string }[];
  entry?: { resource: FhirPatient }[];
}