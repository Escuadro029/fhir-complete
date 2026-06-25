import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

export interface PsgcItem { code: string; name: string; }

@Injectable({ providedIn: 'root' })
export class PsgcService {
  private readonly http = inject(HttpClient);
  private readonly base = 'https://tx.fhirlab.net/fhir/ValueSet/$expand?url=';
  private readonly vsBase = 'https://fhir.doh.gov.ph/phcore/ValueSet';
  private cache = new Map<string, Observable<PsgcItem[]>>();

  private fetchValueSet(vsName: string): Observable<PsgcItem[]> {
    const url = `${this.base}${encodeURIComponent(`${this.vsBase}/${vsName}`)}`;
    if (this.cache.has(url)) return this.cache.get(url)!;
    const req$ = this.http.get<any>(url).pipe(
        map(res =>
            (res?.expansion?.contains ?? [])
                .map((i: any) => ({ code: String(i.code), name: i.display }))
                .sort((a: PsgcItem, b: PsgcItem) => a.name.localeCompare(b.name))
        ),
        catchError(() => of([])),
        shareReplay(1)
    );
    this.cache.set(url, req$);
    return req$;
  }

  // PSGC prefix logic: region "0100000000" → prefix "01"
  // province "0102000000" → prefix "0102" for city lookup, etc.
  private prefix(code: string, digits: number) {
    return code.substring(0, digits);
  }

  getRegions(): Observable<PsgcItem[]> {
    return this.fetchValueSet('regions');
  }

  getProvinces(regionCode: string): Observable<PsgcItem[]> {
    return this.fetchValueSet('provinces').pipe(
        map(items => items.filter(i => i.code.startsWith(this.prefix(regionCode, 2))))
    );
  }

  getCities(provinceCode: string): Observable<PsgcItem[]> {
    return this.fetchValueSet('cities').pipe(
        map(items => items.filter(i => i.code.startsWith(this.prefix(provinceCode, 4))))
    );
  }

  getBarangays(cityCode: string): Observable<PsgcItem[]> {
    return this.fetchValueSet('barangays').pipe(
        map(items => items.filter(i => i.code.startsWith(this.prefix(cityCode, 6))))
    );
  }
}