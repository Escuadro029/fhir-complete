import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FhirProcedure, ProcedureFormModel } from '../models/procedure.model';

const H       = new HttpHeaders({ 'Content-Type': 'application/fhir+json', 'Accept': 'application/fhir+json' });
const BASE    = 'https://cdr.pheref.fhirlab.net/fhir';
const PROFILE = 'https://fhir.doh.gov.ph/phcore/StructureDefinition/ph-core-procedure';
const SNOMED  = 'http://snomed.info/sct';
const PROC_ID = 'https://fhir.doh.gov.ph/phcore/NamingSystem/procedure-id';
const PH_PROC = 'http://philhealth.gov.ph/procedure';

@Injectable({ providedIn: 'root' })
export class FhirProcedureService {
  private readonly http = inject(HttpClient);

  create(form: ProcedureFormModel): Observable<FhirProcedure> {
    return this.http.post<FhirProcedure>(`${BASE}/Procedure`, this.toFhir(form), { headers: H })
      .pipe(catchError(this.err));
  }

  update(id: string, form: ProcedureFormModel): Observable<FhirProcedure> {
    return this.http.put<FhirProcedure>(`${BASE}/Procedure/${id}`, this.toFhir(form, id), { headers: H })
      .pipe(catchError(this.err));
  }

  getById(id: string): Observable<FhirProcedure> {
    return this.http.get<FhirProcedure>(`${BASE}/Procedure/${id}`, { headers: H })
      .pipe(catchError(this.err));
  }

  getByPatient(patientId: string): Observable<any> {
    return this.http.get(`${BASE}/Procedure?subject=Patient/${patientId}&_sort=-date`, { headers: H })
      .pipe(catchError(this.err));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/Procedure/${id}`, { headers: H })
      .pipe(catchError(this.err));
  }

  private dt(val: string): string {
    return val ? val + ':00+08:00' : '';
  }

  toFhir(f: ProcedureFormModel, id?: string): FhirProcedure {
    return {
      resourceType: 'Procedure',
      ...(id ? { id } : {}),
      meta: { profile: [PROFILE] },
      identifier: [
        { use: 'usual',     system: PROC_ID,  value: f.identifier1Value },
        { use: 'secondary', system: PH_PROC,  value: f.identifier2Value }
      ].filter(i => i.value),
      ...(f.basedOnDisplay ? { basedOn: [{ display: f.basedOnDisplay }] } : {}),
      ...(f.partOfDisplay  ? { partOf:  [{ display: f.partOfDisplay  }] } : {}),
      status: f.status,
      ...(f.statusReasonCode ? { statusReason: { coding: [{ system: SNOMED, code: f.statusReasonCode, display: f.statusReasonDisplay }] } } : {}),
      ...(f.categoryCode ? { category: { coding: [{ system: SNOMED, code: f.categoryCode, display: f.categoryDisplay }] } } : {}),
      code: { coding: [{ system: SNOMED, code: f.procedureCode, display: f.procedureDisplay }], text: f.procedureText },
      subject: { reference: `Patient/${f.patientReference}` },
      performedPeriod: { start: this.dt(f.performedStart), end: this.dt(f.performedEnd) },
      ...(f.recorderReference ? { recorder: { reference: `Practitioner/${f.recorderReference}` } } : {}),
      performer: [
        ...(f.performer1Actor ? [{
          function: { coding: [{ system: SNOMED, code: f.performer1Function, display: PERFORMER_FUNCTIONS.find(p => p.code === f.performer1Function)?.display ?? '' }] },
          actor: { reference: `Practitioner/${f.performer1Actor}` },
          ...(f.performer1Org ? { onBehalfOf: { reference: `Organization/${f.performer1Org}` } } : {})
        }] : []),
        ...(f.performer2Actor ? [{
          function: { coding: [{ system: SNOMED, code: f.performer2Function, display: PERFORMER_FUNCTIONS.find(p => p.code === f.performer2Function)?.display ?? '' }] },
          actor: { reference: `RelatedPerson/${f.performer2Actor}` }
        }] : [])
      ],
      ...(f.reasonCode ? { reasonCode: [{ coding: [{ system: SNOMED, code: f.reasonCode, display: f.reasonDisplay }], text: f.reasonText }] } : {}),
      ...(f.reasonReference ? { reasonReference: [{ reference: `Condition/${f.reasonReference}` }] } : {}),
      ...(f.bodySiteCode ? { bodySite: [{ coding: [{ system: SNOMED, code: f.bodySiteCode, display: f.bodySiteDisplay }], text: f.bodySiteText }] } : {}),
      ...(f.outcomeText ? { outcome: { coding: [{ system: SNOMED, code: f.outcomeCode, display: f.outcomeDisplay }], text: f.outcomeText } } : {}),
      ...(f.followUpCode ? { followUp: [{ coding: [{ system: SNOMED, code: f.followUpCode, display: f.followUpDisplay }], text: f.followUpText }] } : {}),
      ...(f.noteText ? { note: [{ time: this.dt(new Date().toISOString().slice(0,16)), text: f.noteText }] } : {}),
      ...(f.usedCode ? { usedCode: [{ coding: [{ system: SNOMED, code: f.usedCode, display: f.usedDisplay }], text: f.usedText }] } : {})
    };
  }

  fromFhir(p: FhirProcedure): ProcedureFormModel {
    const id1 = p.identifier?.find(i => i.use === 'usual');
    const id2 = p.identifier?.find(i => i.use === 'secondary');
    return {
      identifier1Value:    id1?.value ?? '',
      identifier2Value:    id2?.value ?? '',
      basedOnDisplay:      p.basedOn?.[0]?.display ?? '',
      partOfDisplay:       p.partOf?.[0]?.display ?? '',
      status:              p.status ?? 'completed',
      statusReasonCode:    p.statusReason?.coding?.[0]?.code ?? '',
      statusReasonDisplay: p.statusReason?.coding?.[0]?.display ?? '',
      categoryCode:        p.category?.coding?.[0]?.code ?? '',
      categoryDisplay:     p.category?.coding?.[0]?.display ?? '',
      procedureCode:       p.code?.coding?.[0]?.code ?? '',
      procedureDisplay:    p.code?.coding?.[0]?.display ?? '',
      procedureText:       p.code?.text ?? '',
      patientReference:    p.subject?.reference?.replace('Patient/', '') ?? '',
      performedStart:      p.performedPeriod?.start?.slice(0, 16) ?? '',
      performedEnd:        p.performedPeriod?.end?.slice(0, 16) ?? '',
      recorderReference:   p.recorder?.reference?.replace('Practitioner/', '') ?? '',
      performer1Function:  p.performer?.[0]?.function?.coding?.[0]?.code ?? '223366009',
      performer1Actor:     p.performer?.[0]?.actor?.reference?.replace('Practitioner/', '') ?? '',
      performer1Org:       p.performer?.[0]?.onBehalfOf?.reference?.replace('Organization/', '') ?? '',
      performer2Function:  p.performer?.[1]?.function?.coding?.[0]?.code ?? '133932002',
      performer2Actor:     p.performer?.[1]?.actor?.reference?.replace('RelatedPerson/', '') ?? '',
      reasonCode:          p.reasonCode?.[0]?.coding?.[0]?.code ?? '',
      reasonDisplay:       p.reasonCode?.[0]?.coding?.[0]?.display ?? '',
      reasonText:          p.reasonCode?.[0]?.text ?? '',
      reasonReference:     p.reasonReference?.[0]?.reference?.replace('Condition/', '') ?? '',
      bodySiteCode:        p.bodySite?.[0]?.coding?.[0]?.code ?? '',
      bodySiteDisplay:     p.bodySite?.[0]?.coding?.[0]?.display ?? '',
      bodySiteText:        p.bodySite?.[0]?.text ?? '',
      outcomeCode:         p.outcome?.coding?.[0]?.code ?? '385669000',
      outcomeDisplay:      p.outcome?.coding?.[0]?.display ?? 'Successful',
      outcomeText:         p.outcome?.text ?? '',
      followUpCode:        p.followUp?.[0]?.coding?.[0]?.code ?? '',
      followUpDisplay:     p.followUp?.[0]?.coding?.[0]?.display ?? '',
      followUpText:        p.followUp?.[0]?.text ?? '',
      noteText:            p.note?.[0]?.text ?? '',
      usedCode:            p.usedCode?.[0]?.coding?.[0]?.code ?? '',
      usedDisplay:         p.usedCode?.[0]?.coding?.[0]?.display ?? '',
      usedText:            p.usedCode?.[0]?.text ?? ''
    };
  }

  private err(e: any): Observable<never> {
    return throwError(() => new Error(e?.error?.issue?.[0]?.diagnostics ?? e?.message ?? 'Unknown error'));
  }
}

export const PROCEDURE_STATUS_OPTIONS = [
  { code: 'preparation',    display: 'Preparation'     },
  { code: 'in-progress',    display: 'In Progress'     },
  { code: 'not-done',       display: 'Not Done'        },
  { code: 'on-hold',        display: 'On Hold'         },
  { code: 'stopped',        display: 'Stopped'         },
  { code: 'completed',      display: 'Completed'       },
  { code: 'entered-in-error',display: 'Entered in Error'},
  { code: 'unknown',        display: 'Unknown'         }
];

export const PERFORMER_FUNCTIONS = [
  { code: '223366009', display: 'Healthcare professional' },
  { code: '133932002', display: 'Caregiver'               },
  { code: '304292004', display: 'Surgeon'                 },
  { code: '309343006', display: 'Physician'               },
  { code: '224535009', display: 'Registered nurse'        }
];