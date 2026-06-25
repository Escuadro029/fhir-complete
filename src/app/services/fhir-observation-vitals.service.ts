import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  FhirObservationVitals, VitalsFormModel, VITAL_CONFIGS
} from '../models/observation-vitals.model';

const H       = new HttpHeaders({ 'Content-Type': 'application/fhir+json', 'Accept': 'application/fhir+json' });
const BASE    = 'https://cdr.pheref.fhirlab.net/fhir';
const PROFILE = 'https://fhir.doh.gov.ph/pheref/StructureDefinition/ereferral-observation';
const OBS_CAT = 'http://terminology.hl7.org/CodeSystem/observation-category';
const LOINC   = 'http://loinc.org';
const SNOMED  = 'http://snomed.info/sct';
const UCUM    = 'http://unitsofmeasure.org';

@Injectable({ providedIn: 'root' })
export class FhirObservationVitalsService {
  private readonly http = inject(HttpClient);

  // ── Save all vitals that have values ─────────────
  saveAllVitals(form: VitalsFormModel): Observable<FhirObservationVitals[]> {
    const calls: Observable<FhirObservationVitals>[] = [];

    if (form.systolic && form.diastolic) calls.push(this.post(this.buildBP(form)));
    if (form.heartRate)                  calls.push(this.post(this.buildSingle(form, 'hr')));
    if (form.respRate)                   calls.push(this.post(this.buildSingle(form, 'rr')));
    if (form.spo2)                       calls.push(this.post(this.buildSingle(form, 'spo2')));
    if (form.temp)                       calls.push(this.post(this.buildSingle(form, 'temp')));
    if (form.weight)                     calls.push(this.post(this.buildSingle(form, 'weight')));

    return calls.length === 0 ? of([]) : forkJoin(calls);
  }

  // ── Save single vital ─────────────────────────────
  saveBP(form: VitalsFormModel):     Observable<FhirObservationVitals> { return this.post(this.buildBP(form)); }
  saveHR(form: VitalsFormModel):     Observable<FhirObservationVitals> { return this.post(this.buildSingle(form, 'hr')); }
  saveRR(form: VitalsFormModel):     Observable<FhirObservationVitals> { return this.post(this.buildSingle(form, 'rr')); }
  saveSpO2(form: VitalsFormModel):   Observable<FhirObservationVitals> { return this.post(this.buildSingle(form, 'spo2')); }
  saveTemp(form: VitalsFormModel):   Observable<FhirObservationVitals> { return this.post(this.buildSingle(form, 'temp')); }
  saveWeight(form: VitalsFormModel): Observable<FhirObservationVitals> { return this.post(this.buildSingle(form, 'weight')); }

  // ── GET by patient ────────────────────────────────
  getByPatient(patientId: string): Observable<FhirObservationVitals[]> {
    return this.http.get<any>(
      `${BASE}/Observation?subject=Patient/${patientId}&_sort=-date&_count=100`,
      { headers: H }
    ).pipe(
      map(b => (b.entry ?? []).map((e: any) => e.resource as FhirObservationVitals)),
      catchError(this.err)
    );
  }

  // ── GET by encounter ──────────────────────────────
  getByEncounter(encounterId: string): Observable<FhirObservationVitals[]> {
    return this.http.get<any>(
      `${BASE}/Observation?encounter=Encounter/${encounterId}&_sort=-date&_count=100`,
      { headers: H }
    ).pipe(
      map(b => (b.entry ?? []).map((e: any) => e.resource as FhirObservationVitals)),
      catchError(this.err)
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/Observation/${id}`, { headers: H }).pipe(catchError(this.err));
  }

  // ── Builders ──────────────────────────────────────
  buildBP(f: VitalsFormModel): FhirObservationVitals {
    const cfg = VITAL_CONFIGS.find(c => c.type === 'bp')!;
    return {
      resourceType: 'Observation',
      meta: { profile: [PROFILE] },
      status: f.status,
      category: [{ coding: [{ system: OBS_CAT, code: cfg.type === 'bp' ? 'vital-signs' : cfg.type, display: 'Vital Signs' }] }],
      code: { coding: [
        { system: LOINC,  code: cfg.loincCode,  display: cfg.loincDisplay  },
        { system: SNOMED, code: cfg.snomedCode, display: cfg.snomedDisplay }
      ]},
      subject:           { reference: `Patient/${f.patientReference}` },
      ...(f.encounterReference ? { encounter: { reference: `Encounter/${f.encounterReference}` } } : {}),
      effectiveDateTime: f.effectiveDateTime ? f.effectiveDateTime + ':00+08:00' : '',
      component: [
        {
          code: { coding: [{ system: LOINC, code: '8480-6', display: 'Systolic blood pressure' }] },
          valueQuantity: { value: f.systolic!, unit: 'mmHg', system: UCUM, code: 'mm[Hg]' }
        },
        {
          code: { coding: [{ system: LOINC, code: '8462-4', display: 'Diastolic blood pressure' }] },
          valueQuantity: { value: f.diastolic!, unit: 'mmHg', system: UCUM, code: 'mm[Hg]' }
        }
      ]
    };
  }

  buildSingle(f: VitalsFormModel, type: 'hr'|'rr'|'spo2'|'temp'|'weight'): FhirObservationVitals {
    const cfg = VITAL_CONFIGS.find(c => c.type === type)!;
    const valueMap: Record<string, number|null> = {
      hr: f.heartRate, rr: f.respRate, spo2: f.spo2, temp: f.temp, weight: f.weight
    };
    return {
      resourceType: 'Observation',
      meta: { profile: [PROFILE] },
      status: f.status,
      category: [{ coding: [{ system: OBS_CAT, code: 'vital-signs', display: 'Vital Signs' }] }],
      code: { coding: [
        { system: LOINC,  code: cfg.loincCode,  display: cfg.loincDisplay  },
        { system: SNOMED, code: cfg.snomedCode, display: cfg.snomedDisplay }
      ]},
      subject:           { reference: `Patient/${f.patientReference}` },
      ...(f.encounterReference ? { encounter: { reference: `Encounter/${f.encounterReference}` } } : {}),
      effectiveDateTime: f.effectiveDateTime ? f.effectiveDateTime + ':00+08:00' : '',
      valueQuantity: { value: valueMap[type]!, unit: cfg.unit, system: UCUM, code: cfg.ucumCode }
    };
  }

  private post(body: FhirObservationVitals): Observable<FhirObservationVitals> {
    return this.http.post<FhirObservationVitals>(`${BASE}/Observation`, body, { headers: H })
      .pipe(catchError(this.err));
  }

  getVitalType(obs: FhirObservationVitals): string {
    const loinc = obs.code?.coding?.find(c => c.system === LOINC)?.code ?? '';
    const map: Record<string, string> = {
      '85354-9': 'bp', '8867-4': 'hr', '9279-1': 'rr',
      '2708-6': 'spo2', '8310-5': 'temp', '29463-7': 'weight'
    };
    return map[loinc] ?? 'unknown';
  }

  private err(e: any): Observable<never> {
    return throwError(() => new Error(e?.error?.issue?.[0]?.diagnostics ?? e?.message ?? 'Unknown error'));
  }
}