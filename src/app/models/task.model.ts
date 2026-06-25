export interface FhirTask {
  resourceType: 'Task';
  id?: string;
  meta: { profile: string[] };
  status: string;
  intent: string;
  code: { coding: FhirTaskCoding[]; text: string };
  focus: { reference: string };
  for: { reference: string };
  authoredOn: string;
  lastModified: string;
  requester: { reference: string };
  owner: { reference: string };
  note: { text: string }[];
}

export interface FhirTaskCoding {
  system: string; code: string; display: string;
}

export interface TaskFormModel {
  status:           string;
  intent:           string;
  codeCode:         string;
  codeDisplay:      string;
  codeText:         string;
  focusReference:   string;
  forReference:     string;
  authoredOn:       string;
  lastModified:     string;
  requesterReference: string;
  ownerReference:   string;
  noteText:         string;
}

export const EMPTY_TASK_FORM: TaskFormModel = {
  status:             'requested',
  intent:             'order',
  codeCode:           '3457005',
  codeDisplay:        'Patient referral',
  codeText:           '',
  focusReference:     '',
  forReference:       '',
  authoredOn:         '',
  lastModified:       '',
  requesterReference: '',
  ownerReference:     '',
  noteText:           ''
};