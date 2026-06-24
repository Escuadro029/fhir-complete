export interface FhirCondition {
  resourceType: 'Condition';
  id?: string;
  meta: { profile: string[] };
  clinicalStatus: { coding: FhirCoding[] };
  verificationStatus: { coding: FhirCoding[] };
  category: { coding: FhirCoding[]; text: string }[];
  code: { coding: FhirCoding[]; text: string };
  subject: { reference: string };
  onsetDateTime: string;
  recordedDate: string;
  recorder: { reference: string };
  note: { text: string }[];
}

export interface FhirCoding {
  system: string; code: string; display: string;
}

export interface ConditionFormModel {
  clinicalStatusCode: string;
  verificationStatusCode: string;
  categoryCode: string;
  categoryText: string;
  conditionCode: string;
  conditionSystem: string;
  conditionDisplay: string;
  conditionText: string;
  patientReference: string;
  onsetDateTime: string;
  recordedDate: string;
  recorderReference: string;
  noteText: string;
}

export const EMPTY_CONDITION_FORM: ConditionFormModel = {
  clinicalStatusCode: 'active', verificationStatusCode: 'confirmed',
  categoryCode: 'encounter-diagnosis', categoryText: 'Acute Diagnosis',
  conditionCode: '', conditionSystem: 'http://snomed.info/sct',
  conditionDisplay: '', conditionText: '', patientReference: '',
  onsetDateTime: '', recordedDate: '', recorderReference: '', noteText: ''
};
