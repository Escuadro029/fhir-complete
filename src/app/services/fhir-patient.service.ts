import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { FhirPatient, FhirBundle, PatientFormModel } from '../models/patient.model';

const H = new HttpHeaders({ 'Content-Type': 'application/fhir+json', 'Accept': 'application/fhir+json' });
const BASE    = 'https://cdr.pheref.fhirlab.net/fhir';
const PROFILE = 'https://fhir.doh.gov.ph/phcore/StructureDefinition/ph-core-patient';
const PH_ID   = 'http://philhealth.gov.ph/fhir/Identifier/philhealth-id';
const PSGC    = 'https://psa.gov.ph/classification/psgc';
const BRGY    = 'https://fhir.doh.gov.ph/phcore/StructureDefinition/barangay';
const CITYMUN = 'https://fhir.doh.gov.ph/phcore/StructureDefinition/city-municipality';
const PROV    = 'https://fhir.doh.gov.ph/phcore/StructureDefinition/province';

@Injectable({ providedIn: 'root' })
export class FhirPatientService {
  private readonly http = inject(HttpClient);

  getPatients(count = 20): Observable<FhirPatient[]> {
    return this.http.get<FhirBundle>(`${BASE}/Patient?_count=${count}&_sort=-_lastUpdated`, { headers: H }).pipe(
      map(b => (b.entry ?? []).map(e => e.resource)),
      catchError(this.err)
    );
  }

  getPatient(id: string): Observable<FhirPatient> {
    return this.http.get<FhirPatient>(`${BASE}/Patient/${id}`, { headers: H }).pipe(catchError(this.err));
  }

  createPatient(form: PatientFormModel): Observable<FhirPatient> {
    return this.http.post<FhirPatient>(`${BASE}/Patient`, this.toFhir(form), { headers: H }).pipe(catchError(this.err));
  }

  updatePatient(id: string, form: PatientFormModel): Observable<FhirPatient> {
    return this.http.put<FhirPatient>(`${BASE}/Patient/${id}`, this.toFhir(form, id), { headers: H }).pipe(catchError(this.err));
  }

  deletePatient(id: string): Observable<void> {
    return this.http.delete<void>(`${BASE}/Patient/${id}`, { headers: H }).pipe(catchError(this.err));
  }

  toFhir(f: PatientFormModel, id?: string): FhirPatient {
    return {
      resourceType: 'Patient',
      ...(id ? { id } : {}),
      meta: { profile: [PROFILE] },
      identifier: [{ system: PH_ID, value: f.philhealthId }],
      active: f.active,
      name: [{ family: f.familyName, given: [f.givenName, f.middleName].filter(Boolean) }],
      gender: f.gender,
      birthDate: f.birthDate,
      address: [{
        extension: [
          { url: BRGY,    valueCoding: { system: PSGC, code: f.barangayCode,  display: f.barangayDisplay  } },
          { url: CITYMUN, valueCoding: { system: PSGC, code: f.cityMunCode,   display: f.cityMunDisplay   } },
          { url: PROV,    valueCoding: { system: PSGC, code: f.provinceCode,  display: f.provinceDisplay  } }
        ],
        line: [f.line1, f.line2].filter(Boolean),
        city: f.city, district: f.district,
        postalCode: f.postalCode, country: f.country
      }]
    };
  }

  fromFhir(p: FhirPatient): PatientFormModel {
    const addr = p.address?.[0];
    const ext  = (url: string) => addr?.extension?.find(e => e.url.endsWith(url))?.valueCoding;
    return {
      philhealthId:    p.identifier?.find(i => i.system.includes('philhealth'))?.value ?? '',
      familyName:      p.name?.[0]?.family ?? '',
      givenName:       p.name?.[0]?.given?.[0] ?? '',
      middleName:      p.name?.[0]?.given?.[1] ?? '',
      gender:          p.gender ?? 'female',
      birthDate:       p.birthDate ?? '',
      active:          p.active !== false,
      line1:           addr?.line?.[0] ?? '',
      line2:           addr?.line?.[1] ?? '',
      city:            addr?.city ?? '',
      district:        addr?.district ?? '',
      postalCode:      addr?.postalCode ?? '',
      country:         addr?.country ?? 'PH',
      barangayCode:    ext('barangay')?.code ?? '',
      barangayDisplay: ext('barangay')?.display ?? '',
      cityMunCode:     ext('city-municipality')?.code ?? '',
      cityMunDisplay:  ext('city-municipality')?.display ?? '',
      provinceCode:    ext('province')?.code ?? '',
      provinceDisplay: ext('province')?.display ?? ''
    };
  }

  getFullName(p: FhirPatient): string {
    const n = p.name?.[0];
    return `${(n?.given ?? []).join(' ')} ${n?.family ?? ''}`.trim();
  }
  getPhilHealthId(p: FhirPatient): string {
    return p.identifier?.find(i => i.system.includes('philhealth'))?.value ?? p.id ?? '—';
  }
  getInitials(p: FhirPatient): string {
    const n = p.name?.[0];
    return ((n?.given?.[0]?.[0] ?? '') + (n?.family?.[0] ?? '')).toUpperCase() || '?';
  }

  private err(e: any): Observable<never> {
    return throwError(() => new Error(e?.error?.issue?.[0]?.diagnostics ?? e?.message ?? 'Unknown error'));
  }
}
