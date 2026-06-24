export interface FhirServiceRequest {
  resourceType: 'ServiceRequest';
  id?: string;
  meta: { profile: string[] };
  requisition: { system: string; value: string };
  status: string;
  intent: string;
  category: { coding: FhirSRCoding[]; text: string }[];
  subject: { reference: string };
  occurrenceDateTime: string;
  authoredOn: string;
  requester: { reference: string };
  performer: { reference: string }[];
  reasonCode: { coding: FhirSRCoding[]; text: string }[];
  note: { text: string }[];
}

export interface FhirSRCoding {
  system: string; code: string; display: string;
}

export interface ServiceRequestFormModel {
  requisitionValue: string;
  status: string;
  intent: string;
  categoryCode: string;
  categoryDisplay: string;
  categoryText: string;
  patientReference: string;
  occurrenceDateTime: string;
  authoredOn: string;
  requesterReference: string;
  performerReference: string;
  reasonCode: string;
  reasonDisplay: string;
  reasonText: string;
  noteText: string;
}

export const EMPTY_SR_FORM: ServiceRequestFormModel = {
  requisitionValue: '', status: 'active', intent: 'order',
  categoryCode: '73770003',
  categoryDisplay: 'Hospital-based outpatient emergency care center',
  categoryText: 'Emergency', patientReference: '',
  occurrenceDateTime: '', authoredOn: '', requesterReference: '',
  performerReference: '', reasonCode: '71388002',
  reasonDisplay: 'Procedure', reasonText: '', noteText: ''
};
