import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FhirServiceRequest, ServiceRequestFormModel } from '../models/service-request.model';

const H       = new HttpHeaders({ 'Content-Type': 'application/fhir+json', 'Accept': 'application/fhir+json' });
const BASE    = 'https://cdr.pheref.fhirlab.net/fhir';
const PROFILE = 'https://fhir.doh.gov.ph/pheref/StructureDefinition/ereferral-service-request';
const SNOMED  = 'http://snomed.info/sct';
const REQ_SYS = 'urn:oid:1.2.840.113619.21.1.2';

@Injectable({ providedIn: 'root' })
export class FhirServiceRequestService {
  private readonly http = inject(HttpClient);

  create(form: ServiceRequestFormModel): Observable<FhirServiceRequest> {
    return this.http.post<FhirServiceRequest>(`${BASE}/ServiceRequest`, this.toFhir(form), { headers: H }).pipe(catchError(this.err));
  }
  update(id: string, form: ServiceRequestFormModel): Observable<FhirServiceRequest> {
    return this.http.put<FhirServiceRequest>(`${BASE}/ServiceRequest/${id}`, this.toFhir(form, id), { headers: H }).pipe(catchError(this.err));
  }
  getById(id: string): Observable<FhirServiceRequest> {
    return this.http.get<FhirServiceRequest>(`${BASE}/ServiceRequest/${id}`, { headers: H }).pipe(catchError(this.err));
  }
  getByPatient(patientId: string): Observable<any> {
    return this.http.get(`${BASE}/ServiceRequest?subject=Patient/${patientId}&_sort=-authored`, { headers: H }).pipe(catchError(this.err));
  }
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/ServiceRequest/${id}`, { headers: H }).pipe(catchError(this.err));
  }

  toFhir(f: ServiceRequestFormModel, id?: string): FhirServiceRequest {
    return {
      resourceType: 'ServiceRequest',
      ...(id ? { id } : {}),
      meta: { profile: [PROFILE] },
      requisition: { system: REQ_SYS, value: f.requisitionValue },
      status: f.status, intent: f.intent,
      category: [{ coding: [{ system: SNOMED, code: f.categoryCode, display: f.categoryDisplay }], text: f.categoryText }],
      subject:            { reference: `Patient/${f.patientReference}` },
occurrenceDateTime: f.occurrenceDateTime ? f.occurrenceDateTime + ':00+08:00' : '',
authoredOn:         f.authoredOn         ? f.authoredOn         + ':00+08:00' : '',
      requester:          { reference: `Practitioner/${f.requesterReference}` },
      performer:          f.performerReference ? [{ reference: `Practitioner/${f.performerReference}` }] : [],
      reasonCode: [{ coding: [{ system: SNOMED, code: f.reasonCode, display: f.reasonDisplay }], text: f.reasonText }],
      note: f.noteText ? [{ text: f.noteText }] : []
    };
  }

  fromFhir(sr: FhirServiceRequest): ServiceRequestFormModel {
    return {
      requisitionValue:   sr.requisition?.value ?? '',
      status:             sr.status ?? 'active',
      intent:             sr.intent ?? 'order',
      categoryCode:       sr.category?.[0]?.coding?.[0]?.code ?? '',
      categoryDisplay:    sr.category?.[0]?.coding?.[0]?.display ?? '',
      categoryText:       sr.category?.[0]?.text ?? '',
      patientReference:   sr.subject?.reference?.replace('Patient/', '') ?? '',
      occurrenceDateTime: sr.occurrenceDateTime?.slice(0, 16) ?? '',
      authoredOn:         sr.authoredOn?.slice(0, 16) ?? '',
      requesterReference: sr.requester?.reference?.replace('Practitioner/', '') ?? '',
      performerReference: sr.performer?.[0]?.reference?.replace('Practitioner/', '') ?? '',
      reasonCode:         sr.reasonCode?.[0]?.coding?.[0]?.code ?? '',
      reasonDisplay:      sr.reasonCode?.[0]?.coding?.[0]?.display ?? '',
      reasonText:         sr.reasonCode?.[0]?.text ?? '',
      noteText:           sr.note?.[0]?.text ?? ''
    };
  }

  private err(e: any): Observable<never> {
    return throwError(() => new Error(e?.error?.issue?.[0]?.diagnostics ?? e?.message ?? 'Unknown error'));
  }
}

export const STATUS_OPTIONS = [
  { code: 'draft',            display: 'Draft'            },
  { code: 'active',           display: 'Active'           },
  { code: 'on-hold',          display: 'On Hold'          },
  { code: 'revoked',          display: 'Revoked'          },
  { code: 'completed',        display: 'Completed'        },
  { code: 'entered-in-error', display: 'Entered in Error' },
  { code: 'unknown',          display: 'Unknown'          }
];
export const INTENT_OPTIONS = [
  { code: 'proposal',       display: 'Proposal'       },
  { code: 'plan',           display: 'Plan'           },
  { code: 'order',          display: 'Order'          },
  { code: 'original-order', display: 'Original Order' },
  { code: 'reflex-order',   display: 'Reflex Order'   },
  { code: 'filler-order',   display: 'Filler Order'   },
  { code: 'option',         display: 'Option'         }
];
export const CATEGORY_OPTIONS_SR = [
  { code: '73770003',  display: 'Hospital-based outpatient emergency care center', text: 'Emergency'    },
  { code: '11429006',  display: 'Consultation',                                   text: 'Consultation' },
  { code: '3457005',   display: 'Patient referral',                               text: 'Referral'     },
  { code: '386053000', display: 'Evaluation procedure',                           text: 'Evaluation'   }
];
