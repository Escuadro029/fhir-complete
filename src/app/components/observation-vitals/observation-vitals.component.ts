import { Component, OnInit, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { FhirObservationVitalsService } from '../../services/fhir-observation-vitals.service';
import { FhirObservationVitals, VITAL_CONFIGS, EMPTY_VITALS_FORM } from '../../models/observation-vitals.model';
import { AlertComponent } from '../shared/alert.component';

@Component({
  selector: 'app-observation-vitals',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertComponent],
  templateUrl: './observation-vitals.component.html',
  styleUrls: ['./observation-vitals.component.css']
})
export class ObservationVitalsComponent implements OnInit {
  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(FhirObservationVitalsService);

  @Input() patientId:   string = '';
  @Input() encounterId: string = '';

  observations = signal<FhirObservationVitals[]>([]);
  loading      = signal(false);
  saving       = signal(false);
  showForm     = signal(false);
  savedCount   = signal(0);
  alert        = signal<{ type: 'success'|'error'; message: string }|null>(null);
  showJson     = signal(false);

  readonly vitalConfigs = VITAL_CONFIGS;

  form = this.fb.group({
    patientReference:   ['', Validators.required],
    encounterReference: [''],
    effectiveDateTime:  ['', Validators.required],
    status:             ['final'],
    // BP
    systolic:   [null as number|null],
    diastolic:  [null as number|null],
    // others
    heartRate:  [null as number|null],
    respRate:   [null as number|null],
    spo2:       [null as number|null],
    temp:       [null as number|null],
    weight:     [null as number|null]
  });

  get f(): { [k: string]: AbstractControl } { return this.form.controls; }

  ngOnInit(): void {
    if (this.patientId)   this.form.patchValue({ patientReference: this.patientId });
    if (this.encounterId) this.form.patchValue({ encounterReference: this.encounterId });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const obs$ = this.encounterId
      ? this.svc.getByEncounter(this.encounterId)
      : this.svc.getByPatient(this.patientId);
    obs$.subscribe({
      next:  list => { this.observations.set(list); this.loading.set(false); },
      error: err  => { this.showAlert('error', err.message); this.loading.set(false); }
    });
  }

  openForm(): void  { this.showForm.set(true);  this.savedCount.set(0); this.showJson.set(false); }
  closeForm(): void { this.showForm.set(false); this.load(); }

  submit(): void {
    if (!this.form.get('patientReference')?.value || !this.form.get('effectiveDateTime')?.value) {
      this.form.markAllAsTouched();
      this.showAlert('error', 'Patient ID and effective date are required.');
      return;
    }
    this.saving.set(true);
    const val = this.form.getRawValue() as any;
    this.svc.saveAllVitals(val).subscribe({
      next: results => {
        this.savedCount.set(results.length);
        this.showAlert('success', `${results.length} vital sign${results.length !== 1 ? 's' : ''} saved.`);
        this.saving.set(false);
        this.load();
        this.form.patchValue({
          systolic: null, diastolic: null, heartRate: null,
          respRate: null, spo2: null, temp: null, weight: null
        });
      },
      error: err => { this.showAlert('error', err.message); this.saving.set(false); }
    });
  }

  delete(obs: FhirObservationVitals): void {
    if (!confirm('Delete this observation?')) return;
    this.svc.delete(obs.id!).subscribe({
      next:  ()  => { this.showAlert('success', 'Deleted.'); this.load(); },
      error: err => this.showAlert('error', err.message)
    });
  }

  getVitalType(obs: FhirObservationVitals): string { return this.svc.getVitalType(obs); }
  getConfig(type: string) { return VITAL_CONFIGS.find(c => c.type === type); }

  getSystolic(obs: FhirObservationVitals):  number|null { return obs.component?.[0]?.valueQuantity?.value ?? null; }
  getDiastolic(obs: FhirObservationVitals): number|null { return obs.component?.[1]?.valueQuantity?.value ?? null; }
  getValue(obs: FhirObservationVitals):     number|null { return obs.valueQuantity?.value ?? null; }
  getUnit(obs: FhirObservationVitals):      string      { return obs.valueQuantity?.unit ?? obs.component?.[0]?.valueQuantity?.unit ?? ''; }

  bpClass(s: number|null, d: number|null): string {
    if (!s || !d) return '';
    if (s >= 180 || d >= 120) return 'bp-crisis';
    if (s >= 140 || d >= 90)  return 'bp-high';
    if (s >= 130 || d >= 80)  return 'bp-elevated';
    if (s < 90  || d < 60)    return 'bp-low';
    return 'bp-normal';
  }

  bpLabel(s: number|null, d: number|null): string {
    const map: Record<string,string> = {
      'bp-crisis': 'Crisis', 'bp-high': 'Stage 2 HTN',
      'bp-elevated': 'Elevated', 'bp-normal': 'Normal', 'bp-low': 'Low'
    };
    return map[this.bpClass(s, d)] ?? '';
  }

  hrClass(v: number|null): string {
    if (!v) return '';
    if (v > 100) return 'vital-high';
    if (v < 60)  return 'vital-low';
    return 'vital-normal';
  }

  spo2Class(v: number|null): string {
    if (!v) return '';
    if (v < 90)  return 'vital-crisis';
    if (v < 95)  return 'vital-low';
    return 'vital-normal';
  }

  tempClass(v: number|null): string {
    if (!v) return '';
    if (v >= 38.5 || v < 35) return 'vital-high';
    if (v >= 37.5) return 'vital-elevated';
    return 'vital-normal';
  }

  toggleJson(): void { this.showJson.update(v => !v); }

  private showAlert(type: 'success'|'error', message: string): void {
    this.alert.set({ type, message });
    setTimeout(() => this.alert.set(null), 6000);
  }
}