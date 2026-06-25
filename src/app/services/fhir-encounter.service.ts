import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FhirEncounter, EncounterFormModel } from '../models/encounter.model';

const H       = new HttpHeaders({ 'Content-Type': 'application/fhir+json', 'Accept': 'application/fhir+json' });
const BASE    = 'https://cdr.pheref.fhirlab.net/fhir';
const PROFILE = 'https://fhir.doh.gov.ph/pheref/StructureDefinition/ereferral-encounter';
const ACT_SYS = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';

@Injectable({ providedIn: 'root' })
export class FhirEncounterService {
  private readonly http = inject(HttpClient);

  create(form: EncounterFormModel): Observable<FhirEncounter> {
    return this.http.post<FhirEncounter>(`${BASE}/Encounter`, this.toFhir(form), { headers: H })
      .pipe(catchError(this.err));
  }

  update(id: string, form: EncounterFormModel): Observable<FhirEncounter> {
    return this.http.put<FhirEncounter>(`${BASE}/Encounter/${id}`, this.toFhir(form, id), { headers: H })
      .pipe(catchError(this.err));
  }

  getById(id: string): Observable<FhirEncounter> {
    return this.http.get<FhirEncounter>(`${BASE}/Encounter/${id}`, { headers: H })
      .pipe(catchError(this.err));
  }

  getByPatient(patientId: string): Observable<any> {
    return this.http.get(`${BASE}/Encounter?subject=Patient/${patientId}&_sort=-date&_count=50`, { headers: H })
      .pipe(catchError(this.err));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/Encounter/${id}`, { headers: H })
      .pipe(catchError(this.err));
  }

  toFhir(f: EncounterFormModel, id?: string): FhirEncounter {
    return {
      resourceType: 'Encounter',
      ...(id ? { id } : {}),
      meta:    { profile: [PROFILE] },
      status:  f.status,
      class:   { system: ACT_SYS, code: f.classCode, display: f.classDisplay },
      subject: { reference: `Patient/${f.patientReference}` }
    };
  }

  fromFhir(e: FhirEncounter): EncounterFormModel {
    return {
      status:           e.status ?? 'finished',
      classCode:        e.class?.code ?? 'AMB',
      classDisplay:     e.class?.display ?? 'ambulatory',
      patientReference: e.subject?.reference?.replace('Patient/', '') ?? ''
    };
  }

  private err(e: any): Observable<never> {
    return throwError(() => new Error(e?.error?.issue?.[0]?.diagnostics ?? e?.message ?? 'Unknown error'));
  }
}

export const ENCOUNTER_STATUS_OPTIONS = [
  { code: 'planned',        display: 'Planned'         },
  { code: 'arrived',        display: 'Arrived'         },
  { code: 'triaged',        display: 'Triaged'         },
  { code: 'in-progress',    display: 'In Progress'     },
  { code: 'onleave',        display: 'On Leave'        },
  { code: 'finished',       display: 'Finished'        },
  { code: 'cancelled',      display: 'Cancelled'       },
  { code: 'entered-in-error',display: 'Entered in Error'},
  { code: 'unknown',        display: 'Unknown'         }
];

export const ENCOUNTER_CLASS_OPTIONS = [
  { code: 'AMB',   display: 'ambulatory'          },
  { code: 'EMER',  display: 'emergency'            },
  { code: 'FLD',   display: 'field'                },
  { code: 'HH',    display: 'home health'          },
  { code: 'IMP',   display: 'inpatient encounter'  },
  { code: 'ACUTE', display: 'inpatient acute'      },
  { code: 'NONAC', display: 'inpatient non-acute'  },
  { code: 'OBSENC',display: 'observation encounter'},
  { code: 'PRENC', display: 'pre-admission'        },
  { code: 'SS',    display: 'short stay'           },
  { code: 'VR',    display: 'virtual'              }
];