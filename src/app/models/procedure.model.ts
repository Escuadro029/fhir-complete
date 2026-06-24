export interface FhirProcedure {
  resourceType: 'Procedure';
  id?: string;
  meta: { profile: string[] };
  identifier: { use: string; system: string; value: string }[];
  basedOn?: { display: string }[];
  partOf?: { display: string }[];
  status: string;
  statusReason?: { coding: FhirProcCoding[] };
  category?: { coding: FhirProcCoding[] };
  code: { coding: FhirProcCoding[]; text: string };
  subject: { reference: string };
  performedPeriod: { start: string; end: string };
  recorder?: { reference: string };
  performer: FhirProcPerformer[];
  reasonCode?: { coding: FhirProcCoding[]; text: string }[];
  reasonReference?: { reference: string }[];
  bodySite?: { coding: FhirProcCoding[]; text: string }[];
  outcome?: { coding: FhirProcCoding[]; text: string };
  followUp?: { coding: FhirProcCoding[]; text: string }[];
  note?: { time?: string; text: string }[];
  usedCode?: { coding: FhirProcCoding[]; text: string }[];
}

export interface FhirProcCoding {
  system: string; code: string; display: string;
}

export interface FhirProcPerformer {
  function?: { coding: FhirProcCoding[] };
  actor: { reference: string };
  onBehalfOf?: { reference: string };
}

export interface ProcedureFormModel {
  identifier1Value:     string;
  identifier2Value:     string;
  basedOnDisplay:       string;
  partOfDisplay:        string;
  status:               string;
  statusReasonCode:     string;
  statusReasonDisplay:  string;
  categoryCode:         string;
  categoryDisplay:      string;
  procedureCode:        string;
  procedureDisplay:     string;
  procedureText:        string;
  patientReference:     string;
  performedStart:       string;
  performedEnd:         string;
  recorderReference:    string;
  performer1Function:   string;
  performer1Actor:      string;
  performer1Org:        string;
  performer2Function:   string;
  performer2Actor:      string;
  reasonCode:           string;
  reasonDisplay:        string;
  reasonText:           string;
  reasonReference:      string;
  bodySiteCode:         string;
  bodySiteDisplay:      string;
  bodySiteText:         string;
  outcomeCode:          string;
  outcomeDisplay:       string;
  outcomeText:          string;
  followUpCode:         string;
  followUpDisplay:      string;
  followUpText:         string;
  noteText:             string;
  usedCode:             string;
  usedDisplay:          string;
  usedText:             string;
}

export const EMPTY_PROCEDURE_FORM: ProcedureFormModel = {
  identifier1Value: '', identifier2Value: '',
  basedOnDisplay: '', partOfDisplay: '',
  status: 'completed',
  statusReasonCode: '385669000', statusReasonDisplay: 'Successful',
  categoryCode: '387713003', categoryDisplay: 'Surgical procedure',
  procedureCode: '', procedureDisplay: '', procedureText: '',
  patientReference: '', performedStart: '', performedEnd: '',
  recorderReference: '',
  performer1Function: '223366009', performer1Actor: '', performer1Org: '',
  performer2Function: '133932002', performer2Actor: '',
  reasonCode: '', reasonDisplay: '', reasonText: '', reasonReference: '',
  bodySiteCode: '', bodySiteDisplay: '', bodySiteText: '',
  outcomeCode: '385669000', outcomeDisplay: 'Successful', outcomeText: '',
  followUpCode: '', followUpDisplay: '', followUpText: '',
  noteText: '', usedCode: '', usedDisplay: '', usedText: ''
};