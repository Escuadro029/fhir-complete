export interface FhirEncounter {
  resourceType: 'Encounter';
  id?: string;
  meta: { profile: string[] };
  status: string;
  class: { system: string; code: string; display: string };
  subject: { reference: string };
}

export interface EncounterFormModel {
  status:           string;
  classCode:        string;
  classDisplay:     string;
  patientReference: string;
}

export const EMPTY_ENCOUNTER_FORM: EncounterFormModel = {
  status:           'finished',
  classCode:        'AMB',
  classDisplay:     'ambulatory',
  patientReference: ''
};