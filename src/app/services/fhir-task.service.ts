import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FhirTask, TaskFormModel } from '../models/task.model';

const H       = new HttpHeaders({ 'Content-Type': 'application/fhir+json', 'Accept': 'application/fhir+json' });
const BASE    = 'https://cdr.pheref.fhirlab.net/fhir';
const PROFILE = 'https://fhir.doh.gov.ph/pheref/StructureDefinition/ereferral-task';
const SNOMED  = 'http://snomed.info/sct';

@Injectable({ providedIn: 'root' })
export class FhirTaskService {
  private readonly http = inject(HttpClient);

  create(form: TaskFormModel): Observable<FhirTask> {
    return this.http.post<FhirTask>(`${BASE}/Task`, this.toFhir(form), { headers: H })
      .pipe(catchError(this.err));
  }

  update(id: string, form: TaskFormModel): Observable<FhirTask> {
    return this.http.put<FhirTask>(`${BASE}/Task/${id}`, this.toFhir(form, id), { headers: H })
      .pipe(catchError(this.err));
  }

  getById(id: string): Observable<FhirTask> {
    return this.http.get<FhirTask>(`${BASE}/Task/${id}`, { headers: H })
      .pipe(catchError(this.err));
  }

  getByPatient(patientId: string): Observable<any> {
    return this.http.get(`${BASE}/Task?for=Patient/${patientId}&_sort=-authored-on`, { headers: H })
      .pipe(catchError(this.err));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/Task/${id}`, { headers: H })
      .pipe(catchError(this.err));
  }

  toFhir(f: TaskFormModel, id?: string): FhirTask {
    return {
      resourceType: 'Task',
      ...(id ? { id } : {}),
      meta:         { profile: [PROFILE] },
      status:       f.status,
      intent:       f.intent,
      code:         { coding: [{ system: SNOMED, code: f.codeCode, display: f.codeDisplay }], text: f.codeText },
      focus:        { reference: `ServiceRequest/${f.focusReference}` },
      for:          { reference: `Patient/${f.forReference}` },
      authoredOn:   f.authoredOn   ? f.authoredOn   + ':00+08:00' : '',
      lastModified: f.lastModified ? f.lastModified + ':00+08:00' : '',
      requester:    { reference: `Practitioner/${f.requesterReference}` },
      owner:        { reference: `Practitioner/${f.ownerReference}` },
      note:         f.noteText ? [{ text: f.noteText }] : []
    };
  }

  fromFhir(t: FhirTask): TaskFormModel {
    return {
      status:             t.status ?? 'requested',
      intent:             t.intent ?? 'order',
      codeCode:           t.code?.coding?.[0]?.code ?? '',
      codeDisplay:        t.code?.coding?.[0]?.display ?? '',
      codeText:           t.code?.text ?? '',
      focusReference:     t.focus?.reference?.replace('ServiceRequest/', '') ?? '',
      forReference:       t.for?.reference?.replace('Patient/', '') ?? '',
      authoredOn:         t.authoredOn?.slice(0, 16) ?? '',
      lastModified:       t.lastModified?.slice(0, 16) ?? '',
      requesterReference: t.requester?.reference?.replace('Practitioner/', '') ?? '',
      ownerReference:     t.owner?.reference?.replace('Practitioner/', '') ?? '',
      noteText:           t.note?.[0]?.text ?? ''
    };
  }

  private err(e: any): Observable<never> {
    return throwError(() => new Error(e?.error?.issue?.[0]?.diagnostics ?? e?.message ?? 'Unknown error'));
  }
}

export const TASK_STATUS_OPTIONS = [
  { code: 'draft',            display: 'Draft'            },
  { code: 'requested',        display: 'Requested'        },
  { code: 'received',         display: 'Received'         },
  { code: 'accepted',         display: 'Accepted'         },
  { code: 'rejected',         display: 'Rejected'         },
  { code: 'ready',            display: 'Ready'            },
  { code: 'cancelled',        display: 'Cancelled'        },
  { code: 'in-progress',      display: 'In Progress'      },
  { code: 'on-hold',          display: 'On Hold'          },
  { code: 'failed',           display: 'Failed'           },
  { code: 'completed',        display: 'Completed'        },
  { code: 'entered-in-error', display: 'Entered in Error' }
];

export const TASK_INTENT_OPTIONS = [
  { code: 'unknown',        display: 'Unknown'        },
  { code: 'proposal',       display: 'Proposal'       },
  { code: 'plan',           display: 'Plan'           },
  { code: 'order',          display: 'Order'          },
  { code: 'original-order', display: 'Original Order' },
  { code: 'reflex-order',   display: 'Reflex Order'   },
  { code: 'filler-order',   display: 'Filler Order'   },
  { code: 'instance-order', display: 'Instance Order' },
  { code: 'option',         display: 'Option'         }
];