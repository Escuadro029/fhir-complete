import { Component, OnInit, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import {
  FhirProcedureService,
  PROCEDURE_STATUS_OPTIONS,
  PERFORMER_FUNCTIONS
} from '../../services/fhir-procedure.service';
import { FhirProcedure } from '../../models/procedure.model';
import { EMPTY_PROCEDURE_FORM } from '../../models/procedure.model';
import { AlertComponent } from '../shared/alert.component';

@Component({
  selector: 'app-procedure-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertComponent],
  templateUrl: './procedure-list.component.html',
  styleUrls: ['./procedure-list.component.css']
})
export class ProcedureListComponent implements OnInit {
  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(FhirProcedureService);

  @Input() patientId: string = '';

  procedures  = signal<FhirProcedure[]>([]);
  loading     = signal(false);
  saving      = signal(false);
  showForm    = signal(false);
  editId      = signal<string | null>(null);
  currentStep = signal(0);
  savedId     = signal<string | null>(null);
  alert       = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  showJson    = signal(false);

  readonly statusOptions     = PROCEDURE_STATUS_OPTIONS;
  readonly performerFunctions = PERFORMER_FUNCTIONS;

  readonly steps = [
    { label: 'Identifiers', description: 'IDs & references'           },
    { label: 'Procedure',   description: 'Code, category & status'    },
    { label: 'Performers',  description: 'Who performed & when'       },
    { label: 'Details',     description: 'Reason, outcome & body site'},
    { label: 'Notes',       description: 'Follow-up & clinical note'  },
    { label: 'Review',      description: 'Confirm & submit'           }
  ];

  form = this.fb.group({
    identifier1Value:    [''],
    identifier2Value:    [''],
    basedOnDisplay:      [''],
    partOfDisplay:       [''],
    status:              ['completed', Validators.required],
    statusReasonCode:    ['385669000'],
    statusReasonDisplay: ['Successful'],
    categoryCode:        ['387713003'],
    categoryDisplay:     ['Surgical procedure'],
    procedureCode:       ['', Validators.required],
    procedureDisplay:    ['', Validators.required],
    procedureText:       ['', Validators.required],
    patientReference:    ['', Validators.required],
    performedStart:      ['', Validators.required],
    performedEnd:        ['', Validators.required],
    recorderReference:   [''],
    performer1Function:  ['223366009'],
    performer1Actor:     ['', Validators.required],
    performer1Org:       [''],
    performer2Function:  ['133932002'],
    performer2Actor:     [''],
    reasonCode:          [''],
    reasonDisplay:       [''],
    reasonText:          [''],
    reasonReference:     [''],
    bodySiteCode:        [''],
    bodySiteDisplay:     [''],
    bodySiteText:        [''],
    outcomeCode:         ['385669000'],
    outcomeDisplay:      ['Successful'],
    outcomeText:         [''],
    followUpCode:        [''],
    followUpDisplay:     [''],
    followUpText:        [''],
    noteText:            [''],
    usedCode:            [''],
    usedDisplay:         [''],
    usedText:            ['']
  });

  get f(): { [k: string]: AbstractControl } { return this.form.controls; }

  get jsonPreview(): string {
    return JSON.stringify(
      this.svc.toFhir(this.form.getRawValue() as any, this.editId() ?? undefined),
      null, 2
    );
  }

  private readonly stepFields: string[][] = [
    [],
    ['status', 'procedureCode', 'procedureDisplay', 'procedureText'],
    ['patientReference', 'performedStart', 'performedEnd', 'performer1Actor'],
    [],
    [],
    []
  ];

  isStepValid(i: number): boolean {
    return this.stepFields[i].every(f => this.form.get(f)?.valid);
  }
  isStepDone(i: number): boolean {
    return i < this.currentStep() && this.isStepValid(i);
  }

  ngOnInit(): void {
    this.load();
    if (this.patientId) this.form.patchValue({ patientReference: this.patientId });
  }

  load(): void {
    if (!this.patientId) return;
    this.loading.set(true);
    this.svc.getByPatient(this.patientId).subscribe({
      next: bundle => {
        this.procedures.set((bundle.entry ?? []).map((e: any) => e.resource as FhirProcedure));
        this.loading.set(false);
      },
      error: err => { this.showAlert('error', err.message); this.loading.set(false); }
    });
  }

  openNew(): void {
    this.editId.set(null);
    this.form.reset(EMPTY_PROCEDURE_FORM as any);
    this.form.patchValue({ patientReference: this.patientId });
    this.currentStep.set(0);
    this.savedId.set(null);
    this.showJson.set(false);
    this.showForm.set(true);
  }

  openEdit(p: FhirProcedure): void {
    this.editId.set(p.id ?? null);
    this.form.patchValue(this.svc.fromFhir(p) as any);
    this.currentStep.set(0);
    this.savedId.set(null);
    this.showJson.set(false);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editId.set(null);
    this.load();
  }

  next(): void {
    this.stepFields[this.currentStep()].forEach(f => this.form.get(f)?.markAsTouched());
    if (!this.isStepValid(this.currentStep())) return;
    this.currentStep.update(s => s + 1);
  }
  back():           void { this.currentStep.update(s => s - 1); }
  goToStep(i: number): void { if (i <= this.currentStep()) this.currentStep.set(i); }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const id   = this.editId();
    const req$ = id
      ? this.svc.update(id, this.form.getRawValue() as any)
      : this.svc.create(this.form.getRawValue() as any);
    req$.subscribe({
      next:  r   => { this.savedId.set(r.id ?? null); this.showAlert('success', `Procedure saved · ID: ${r.id}`); this.saving.set(false); this.load(); },
      error: err => { this.showAlert('error', err.message); this.saving.set(false); }
    });
  }

  delete(p: FhirProcedure): void {
    if (!confirm(`Delete procedure "${p.code?.text}"?`)) return;
    this.svc.delete(p.id!).subscribe({
      next:  ()  => { this.showAlert('success', 'Procedure deleted.'); this.load(); },
      error: err => this.showAlert('error', err.message)
    });
  }

  toggleJson(): void { this.showJson.update(v => !v); }

  statusColor(code: string): string {
    const map: Record<string, string> = {
      completed:     'pill-active',
      'in-progress': 'pill-progress',
      'not-done':    'pill-inactive',
      stopped:       'pill-inactive',
      preparation:   'pill-draft'
    };
    return map[code] ?? 'pill-default';
  }

  labelFor(field: string, opts: { code: string; display: string }[]): string {
    return opts.find(o => o.code === this.form.get(field)?.value)?.display ?? '';
  }

  private showAlert(type: 'success' | 'error', message: string): void {
    this.alert.set({ type, message });
    setTimeout(() => this.alert.set(null), 5000);
  }
}