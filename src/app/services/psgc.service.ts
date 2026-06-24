import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';

export interface PsgcItem { code: string; name: string; }

@Injectable({ providedIn: 'root' })
export class PsgcService {
  private readonly http = inject(HttpClient);
  private readonly base = 'https://tx.fhirlab.net/fhir/psgc';
  private cache = new Map<string, Observable<PsgcItem[]>>();

  private fetch(url: string): Observable<PsgcItem[]> {
    if (this.cache.has(url)) return this.cache.get(url)!;
    const req$ = this.http.get<any[]>(url).pipe(
      map(items => items.map(i => ({ code: String(i.code), name: i.name })).sort((a, b) => a.name.localeCompare(b.name))),
      catchError(() => of([])),
      shareReplay(1)
    );
    this.cache.set(url, req$);
    return req$;
  }

  getRegions(): Observable<PsgcItem[]>                   { return this.fetch(`${this.base}/regions/`); }
  getAllProvinces(): Observable<PsgcItem[]>               { return this.fetch(`${this.base}/provinces/`); }
  getProvinces(regionCode: string): Observable<PsgcItem[]> { return this.fetch(`${this.base}/regions/${regionCode}/provinces/`); }
  getCities(provinceCode: string): Observable<PsgcItem[]>  { return this.fetch(`${this.base}/provinces/${provinceCode}/cities-municipalities/`); }
  getBarangays(cityCode: string): Observable<PsgcItem[]>   { return this.fetch(`${this.base}/cities-municipalities/${cityCode}/barangays/`); }
}
