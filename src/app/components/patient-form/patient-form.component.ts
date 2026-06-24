import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FhirPatientService } from '../../services/fhir-patient.service';
import { PsgcService, PsgcItem } from '../../services/psgc.service';
import { EMPTY_FORM } from '../../models/patient.model';
import { AlertComponent } from '../shared/alert.component';
import { ConditionFormComponent } from '../condition-form/condition-form.component';
import { ServiceRequestFormComponent } from '../service-request-form/service-request-form.component';

@Component({
  selector: 'app-patient-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, AlertComponent, ConditionFormComponent, ServiceRequestFormComponent, FormsModule],
  templateUrl: './patient-form.component.html',
  styleUrls: ['./patient-form.component.css']
})
export class PatientFormComponent implements OnInit {
  private readonly fb      = inject(FormBuilder);
  private readonly svc     = inject(FhirPatientService);
  private readonly psgcSvc = inject(PsgcService);
  private readonly route   = inject(ActivatedRoute);
  private readonly router  = inject(Router);

  loading          = signal(false);
  alert            = signal<{ type: 'success'|'error'; message: string }|null>(null);
  editId           = signal<string|null>(null);
  savedPatientId   = signal<string|null>(null);
  showJson         = signal(false);
  activeTab        = signal<'condition'|'service-request'>('condition');
  provinces        = signal<PsgcItem[]>([]);
  loadingProvinces = signal(false);

  // PSGC cascading
  regions   = signal<PsgcItem[]>([]);
  provs     = signal<PsgcItem[]>([]);
  cities    = signal<PsgcItem[]>([]);
  barangays = signal<PsgcItem[]>([]);
  loadingR  = signal(false); loadingP = signal(false);
  loadingC  = signal(false); loadingB = signal(false);
  selRegion = ''; selProv = ''; selCity = ''; selBrgy = '';

  isEditMode    = computed(() => !!this.editId());
  patientSaved  = computed(() => !!this.savedPatientId());

  form = this.fb.group({
    philhealthId: ['', Validators.required],
    familyName:   ['', Validators.required],
    givenName:    ['', Validators.required],
    middleName:   [''],
    gender:       ['female', Validators.required],
    birthDate:    ['', Validators.required],
    active:       [true],
    line1: [''], line2: [''], city: [''], district: [''],
    postalCode: [''], country: ['PH']
  });

  get f(): { [k: string]: AbstractControl } { return this.form.controls; }

  get jsonPreview(): string {
    const val = { ...this.form.getRawValue(), ...this.psgcFields() } as any;
    return JSON.stringify(this.svc.toFhir(val, this.editId() ?? undefined), null, 2);
  }

  ngOnInit(): void {
    this.loadingProvinces.set(true);
    this.psgcSvc.getAllProvinces().subscribe(d => { this.provinces.set(d); this.loadingProvinces.set(false); });
    this.loadingR.set(true);
    this.psgcSvc.getRegions().subscribe(d => { this.regions.set(d); this.loadingR.set(false); });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) { this.editId.set(id); this.savedPatientId.set(id); this.loadPatient(id); }
  }

  onRegion(code: string): void {
    this.selRegion = code; this.selProv = ''; this.selCity = ''; this.selBrgy = '';
    this.provs.set([]); this.cities.set([]); this.barangays.set([]);
    this.form.patchValue({ district: '', city: '' });
    if (!code) return;
    this.loadingP.set(true);
    this.psgcSvc.getProvinces(code).subscribe(d => { this.provs.set(d); this.loadingP.set(false); });
  }

  onProv(code: string): void {
    this.selProv = code; this.selCity = ''; this.selBrgy = '';
    this.cities.set([]); this.barangays.set([]);
    const name = this.provs().find(p => p.code === code)?.name ?? '';
    this.form.patchValue({ district: name });
    this._psgcProv = { code, name };
    if (!code) return;
    this.loadingC.set(true);
    this.psgcSvc.getCities(code).subscribe(d => { this.cities.set(d); this.loadingC.set(false); });
  }

  onCity(code: string): void {
    this.selCity = code; this.selBrgy = '';
    this.barangays.set([]);
    const name = this.cities().find(c => c.code === code)?.name ?? '';
    this.form.patchValue({ city: name });
    this._psgcCity = { code, name };
    if (!code) return;
    this.loadingB.set(true);
    this.psgcSvc.getBarangays(code).subscribe(d => { this.barangays.set(d); this.loadingB.set(false); });
  }

  onBarangay(code: string): void {
    this.selBrgy = code;
    const name = this.barangays().find(b => b.code === code)?.name ?? '';
    this._psgcBrgy = { code, name };
  }

  onProvinceDropdown(name: string): void {
    const found = this.provinces().find(p => p.name === name);
    this._psgcProv = found ? { code: found.code, name: found.name } : { code: '', name };
  }

  private _psgcProv: PsgcItem = { code: '', name: '' };
  private _psgcCity: PsgcItem = { code: '', name: '' };
  private _psgcBrgy: PsgcItem = { code: '', name: '' };

  private psgcFields() {
    const prov = this.selProv  ? this._psgcProv : this._psgcProv;
    const city = this.selCity  ? this._psgcCity : this._psgcCity;
    const brgy = this.selBrgy  ? this._psgcBrgy : this._psgcBrgy;
    return {
      provinceCode: prov.code,  provinceDisplay: prov.name,
      cityMunCode:  city.code,  cityMunDisplay:  city.name,
      barangayCode: brgy.code,  barangayDisplay: brgy.name
    };
  }

  private loadPatient(id: string): void {
    this.loading.set(true);
    this.svc.getPatient(id).subscribe({
      next: p => {
        const flat = this.svc.fromFhir(p);
        this.form.patchValue(flat as any);
        this._psgcProv = { code: flat.provinceCode,  name: flat.provinceDisplay  };
        this._psgcCity = { code: flat.cityMunCode,   name: flat.cityMunDisplay   };
        this._psgcBrgy = { code: flat.barangayCode,  name: flat.barangayDisplay  };
        this.loading.set(false);
      },
      error: err => { this.showAlert('error', err.message); this.loading.set(false); }
    });
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.showAlert('error', 'Fill in required fields.'); return; }
    this.loading.set(true);
    const val  = { ...this.form.getRawValue(), ...this.psgcFields() } as any;
    const id   = this.editId();
    const req$ = id ? this.svc.updatePatient(id, val) : this.svc.createPatient(val);
    req$.subscribe({
      next: r => {
        this.savedPatientId.set(r.id ?? null);
        this.showAlert('success', `Patient ${id ? 'updated' : 'registered'} · ID: ${r.id}`);
        this.loading.set(false);
      },
      error: err => { this.showAlert('error', err.message); this.loading.set(false); }
    });
  }

  resetForm(): void {
    this.form.reset(EMPTY_FORM as any);
    this._psgcProv = { code:'', name:'' }; this._psgcCity = { code:'', name:'' }; this._psgcBrgy = { code:'', name:'' };
    this.selRegion = ''; this.selProv = ''; this.selCity = ''; this.selBrgy = '';
    this.provs.set([]); this.cities.set([]); this.barangays.set([]);
    this.savedPatientId.set(null);
    this.showJson.set(false); this.alert.set(null);
  }

  toggleJson(): void { this.showJson.update(v => !v); }

  private showAlert(type: 'success'|'error', message: string): void {
    this.alert.set({ type, message });
    setTimeout(() => this.alert.set(null), 6000);
  }
}
