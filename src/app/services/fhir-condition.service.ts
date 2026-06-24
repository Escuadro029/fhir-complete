import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FhirCondition, ConditionFormModel } from '../models/condition.model';

const H       = new HttpHeaders({ 'Content-Type': 'application/fhir+json', 'Accept': 'application/fhir+json' });
const BASE    = 'https://cdr.pheref.fhirlab.net/fhir';
const PROFILE = 'https://fhir.doh.gov.ph/phcore/StructureDefinition/ph-core-condition';
const CLI_SYS = 'http://terminology.hl7.org/CodeSystem/condition-clinical';
const VER_SYS = 'http://terminology.hl7.org/CodeSystem/condition-ver-status';
const CAT_SYS = 'http://terminology.hl7.org/CodeSystem/condition-category';

@Injectable({ providedIn: 'root' })
export class FhirConditionService {
  private readonly http = inject(HttpClient);

  create(form: ConditionFormModel): Observable<FhirCondition> {
    return this.http.post<FhirCondition>(`${BASE}/Condition`, this.toFhir(form), { headers: H }).pipe(catchError(this.err));
  }
  update(id: string, form: ConditionFormModel): Observable<FhirCondition> {
    return this.http.put<FhirCondition>(`${BASE}/Condition/${id}`, this.toFhir(form, id), { headers: H }).pipe(catchError(this.err));
  }
  getById(id: string): Observable<FhirCondition> {
    return this.http.get<FhirCondition>(`${BASE}/Condition/${id}`, { headers: H }).pipe(catchError(this.err));
  }
  getByPatient(patientId: string): Observable<any> {
    return this.http.get(`${BASE}/Condition?subject=Patient/${patientId}&_sort=-recorded-date`, { headers: H }).pipe(catchError(this.err));
  }
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/Condition/${id}`, { headers: H }).pipe(catchError(this.err));
  }

  toFhir(f: ConditionFormModel, id?: string): FhirCondition {
    return {
      resourceType: 'Condition',
      ...(id ? { id } : {}),
      meta: { profile: [PROFILE] },
      clinicalStatus:     { coding: [{ system: CLI_SYS, code: f.clinicalStatusCode,     display: CLINICAL_STATUS_OPTIONS.find(o => o.code === f.clinicalStatusCode)?.display ?? ''     }] },
      verificationStatus: { coding: [{ system: VER_SYS, code: f.verificationStatusCode, display: VERIFICATION_STATUS_OPTIONS.find(o => o.code === f.verificationStatusCode)?.display ?? '' }] },
      category: [{ coding: [{ system: CAT_SYS, code: f.categoryCode, display: CATEGORY_OPTIONS.find(o => o.code === f.categoryCode)?.display ?? '' }], text: f.categoryText }],
      code:     { coding: [{ system: f.conditionSystem, code: f.conditionCode, display: f.conditionDisplay }], text: f.conditionText },
      subject:      { reference: `Patient/${f.patientReference}` },
      // onsetDateTime: f.onsetDateTime,
      // recordedDate:  f.recordedDate,
      onsetDateTime: f.onsetDateTime ? f.onsetDateTime + ':00+08:00' : '',
recordedDate:  f.recordedDate  ? f.recordedDate  + ':00+08:00' : '',
      recorder:     { reference: `Practitioner/${f.recorderReference}` },
      note: f.noteText ? [{ text: f.noteText }] : []
    };
  }

  fromFhir(c: FhirCondition): ConditionFormModel {
    return {
      clinicalStatusCode:     c.clinicalStatus?.coding?.[0]?.code ?? 'active',
      verificationStatusCode: c.verificationStatus?.coding?.[0]?.code ?? 'confirmed',
      categoryCode:           c.category?.[0]?.coding?.[0]?.code ?? 'encounter-diagnosis',
      categoryText:           c.category?.[0]?.text ?? '',
      conditionCode:          c.code?.coding?.[0]?.code ?? '',
      conditionSystem:        c.code?.coding?.[0]?.system ?? 'http://snomed.info/sct',
      conditionDisplay:       c.code?.coding?.[0]?.display ?? '',
      conditionText:          c.code?.text ?? '',
      patientReference:       c.subject?.reference?.replace('Patient/', '') ?? '',
      onsetDateTime:          c.onsetDateTime?.slice(0, 16) ?? '',
      recordedDate:           c.recordedDate?.slice(0, 16) ?? '',
      recorderReference:      c.recorder?.reference?.replace('Practitioner/', '') ?? '',
      noteText:               c.note?.[0]?.text ?? ''
    };
  }

  private err(e: any): Observable<never> {
    return throwError(() => new Error(e?.error?.issue?.[0]?.diagnostics ?? e?.message ?? 'Unknown error'));
  }
}

export const CLINICAL_STATUS_OPTIONS = [
  { code: 'active',      display: 'Active'      },
  { code: 'recurrence',  display: 'Recurrence'  },
  { code: 'relapse',     display: 'Relapse'     },
  { code: 'inactive',    display: 'Inactive'    },
  { code: 'remission',   display: 'Remission'   },
  { code: 'resolved',    display: 'Resolved'    }
];
export const VERIFICATION_STATUS_OPTIONS = [
  { code: 'unconfirmed',      display: 'Unconfirmed'      },
  { code: 'provisional',      display: 'Provisional'      },
  { code: 'differential',     display: 'Differential'     },
  { code: 'confirmed',        display: 'Confirmed'        },
  { code: 'refuted',          display: 'Refuted'          },
  { code: 'entered-in-error', display: 'Entered in Error' }
];
export const CATEGORY_OPTIONS = [
  { code: 'problem-list-item',   display: 'Problem List Item'   },
  { code: 'encounter-diagnosis', display: 'Encounter Diagnosis' }
];
