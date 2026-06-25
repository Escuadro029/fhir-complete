import { Component, OnInit, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { FhirEncounterService, ENCOUNTER_STATUS_OPTIONS, ENCOUNTER_CLASS_OPTIONS } from '../../services/fhir-encounter.service';
import { FhirEncounter, EMPTY_ENCOUNTER_FORM } from '../../models/encounter.model';
import { AlertComponent } from '../shared/alert.component';
import { ConditionListComponent } from '../condition-list/condition-list.component';
import { ServiceRequestListComponent } from '../service-request-list/service-request-list.component';
import { ProcedureListComponent } from '../procedure-list/procedure-list.component';
import { TaskListComponent } from '../task-list/task-list.component';
import { ObservationVitalsComponent } from '../observation-vitals/observation-vitals.component';

@Component({
  selector: 'app-encounter-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, AlertComponent,
    ConditionListComponent, ServiceRequestListComponent,
    ProcedureListComponent, TaskListComponent, ObservationVitalsComponent
  ],
  templateUrl: './encounter-list.component.html',
  styleUrls: ['./encounter-list.component.css']
})
export class EncounterListComponent implements OnInit {
  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(FhirEncounterService);

  @Input() patientId: string = '';

  encounters      = signal<FhirEncounter[]>([]);
  loading         = signal(false);
  saving          = signal(false);
  showForm        = signal(false);
  editId          = signal<string|null>(null);
  savedId         = signal<string|null>(null);
  alert           = signal<{ type:'success'|'error'; message:string }|null>(null);
  showJson        = signal(false);
  activeEncounter = signal<FhirEncounter|null>(null);
  innerTab        = signal<'service-request'|'condition'|'procedure'|'observation'|'task'>('observation');

  readonly statusOptions = ENCOUNTER_STATUS_OPTIONS;
  readonly classOptions  = ENCOUNTER_CLASS_OPTIONS;

  form = this.fb.group({
    status:           ['finished',  Validators.required],
    classCode:        ['AMB',       Validators.required],
    classDisplay:     ['ambulatory'],
    patientReference: ['',          Validators.required]
  });

  get f(): { [k:string]:AbstractControl } { return this.form.controls; }
  get jsonPreview(): string { return JSON.stringify(this.svc.toFhir(this.form.getRawValue() as any, this.editId()??undefined), null, 2); }

  ngOnInit(): void { this.load(); }

  load(): void {
    if (!this.patientId) return;
    this.loading.set(true);
    this.svc.getByPatient(this.patientId).subscribe({
      next: bundle => {
        this.encounters.set((bundle.entry ?? []).map((e: any) => e.resource as FhirEncounter));
        this.loading.set(false);
      },
      error: err => { this.showAlert('error', err.message); this.loading.set(false); }
    });
  }

  openNew(): void {
    this.editId.set(null);
    this.form.reset(EMPTY_ENCOUNTER_FORM as any);
    this.form.patchValue({ patientReference: this.patientId });
    this.savedId.set(null); this.showJson.set(false);
    this.showForm.set(true); this.activeEncounter.set(null);
  }

  openEdit(e: FhirEncounter): void {
    this.editId.set(e.id??null);
    this.form.patchValue(this.svc.fromFhir(e) as any);
    this.savedId.set(null); this.showJson.set(false);
    this.showForm.set(true); this.activeEncounter.set(null);
  }

  closeForm(): void { this.showForm.set(false); this.editId.set(null); this.load(); }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const req$ = this.editId()
      ? this.svc.update(this.editId()!, this.form.getRawValue() as any)
      : this.svc.create(this.form.getRawValue() as any);
    req$.subscribe({
      next: r => {
        this.savedId.set(r.id??null);
        this.showAlert('success', `Encounter saved · ID: ${r.id}`);
        this.saving.set(false); this.showForm.set(false);
        this.load(); this.activeEncounter.set(r);
        this.innerTab.set('observation');
      },
      error: err => { this.showAlert('error', err.message); this.saving.set(false); }
    });
  }

  openEncounterTabs(e: FhirEncounter): void {
    if (this.activeEncounter()?.id === e.id) { this.activeEncounter.set(null); return; }
    this.activeEncounter.set(e);
    this.showForm.set(false);
    this.innerTab.set('observation');
  }

  closeEncounterTabs(): void { this.activeEncounter.set(null); }

  delete(e: FhirEncounter): void {
    if (!confirm(`Delete encounter ${e.id}?`)) return;
    this.svc.delete(e.id!).subscribe({
      next:  ()  => { this.showAlert('success', 'Deleted.'); this.load(); this.activeEncounter.set(null); },
      error: err => this.showAlert('error', err.message)
    });
  }

  onClassChange(code: string): void {
    const found = this.classOptions.find(c => c.code === code);
    if (found) this.form.patchValue({ classCode: found.code, classDisplay: found.display });
  }

  statusColor(code: string): string {
    const map: Record<string,string> = {
      finished:'pill-finished', 'in-progress':'pill-progress',
      planned:'pill-planned', cancelled:'pill-cancelled', arrived:'pill-arrived'
    };
    return map[code] ?? 'pill-default';
  }

  toggleJson(): void { this.showJson.update(v => !v); }

  private showAlert(type: 'success'|'error', message: string): void {
    this.alert.set({ type, message });
    setTimeout(() => this.alert.set(null), 5000);
  }
}