import { Component, OnInit, inject, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { FhirConditionService, CLINICAL_STATUS_OPTIONS, VERIFICATION_STATUS_OPTIONS, CATEGORY_OPTIONS } from '../../services/fhir-condition.service';
import { EMPTY_CONDITION_FORM } from '../../models/condition.model';
import { AlertComponent } from '../shared/alert.component';

@Component({
  selector: 'app-condition-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertComponent],
  templateUrl: './condition-form.component.html',
  styleUrls: ['./condition-form.component.css']
})
export class ConditionFormComponent implements OnInit {
  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(FhirConditionService);

  @Input() patientId:   string = '';
  @Input() conditionId: string = '';

  currentStep = signal(0);
  loading     = signal(false);
  savedId     = signal<string|null>(null);
  alert       = signal<{ type:'success'|'error'; message:string }|null>(null);
  showJson    = signal(false);
  isEditMode  = computed(() => !!this.conditionId);

  readonly steps = [
    { label:'Status',    description:'Clinical & verification status' },
    { label:'Condition', description:'Diagnosis code & display'       },
    { label:'References',description:'Patient, practitioner & dates'  },
    { label:'Note',      description:'Clinical observations'          },
    { label:'Review',    description:'Confirm & submit'               }
  ];

  readonly clinicalStatusOptions     = CLINICAL_STATUS_OPTIONS;
  readonly verificationStatusOptions = VERIFICATION_STATUS_OPTIONS;
  readonly categoryOptions           = CATEGORY_OPTIONS;

  form = this.fb.group({
    clinicalStatusCode:     ['active',              Validators.required],
    verificationStatusCode: ['confirmed',           Validators.required],
    categoryCode:           ['encounter-diagnosis', Validators.required],
    categoryText:           ['Acute Diagnosis'],
    conditionCode:          ['', Validators.required],
    conditionSystem:        ['http://snomed.info/sct'],
    conditionDisplay:       ['', Validators.required],
    conditionText:          ['', Validators.required],
    patientReference:       ['', Validators.required],
    onsetDateTime:          ['', Validators.required],
    recordedDate:           [''],
    recorderReference:      [''],
    noteText:               ['']
  });

  get f(): { [k:string]:AbstractControl } { return this.form.controls; }
  get jsonPreview(): string { return JSON.stringify(this.svc.toFhir(this.form.getRawValue() as any, this.conditionId||undefined), null, 2); }

  private readonly stepFields: string[][] = [
    ['clinicalStatusCode','verificationStatusCode','categoryCode'],
    ['conditionCode','conditionDisplay','conditionText'],
    ['patientReference','onsetDateTime'],
    [], []
  ];

  isStepValid(i:number): boolean { return this.stepFields[i].every(f => this.form.get(f)?.valid); }
  isStepDone(i:number):  boolean { return i < this.currentStep() && this.isStepValid(i); }

  ngOnInit(): void {
    if (this.patientId) this.form.patchValue({ patientReference: this.patientId });
    if (this.conditionId) {
      this.loading.set(true);
      this.svc.getById(this.conditionId).subscribe({
        next:  c   => { this.form.patchValue(this.svc.fromFhir(c) as any); this.loading.set(false); },
        error: err => { this.alert.set({ type:'error', message: err.message }); this.loading.set(false); }
      });
    }
  }

  next(): void {
    this.stepFields[this.currentStep()].forEach(f => this.form.get(f)?.markAsTouched());
    if (!this.isStepValid(this.currentStep())) return;
    this.currentStep.update(s => s+1);
  }
  back():          void { this.currentStep.update(s => s-1); }
  goToStep(i:number): void { if (i<=this.currentStep()) this.currentStep.set(i); }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    const req$ = this.conditionId
      ? this.svc.update(this.conditionId, this.form.getRawValue() as any)
      : this.svc.create(this.form.getRawValue() as any);
    req$.subscribe({
      next:  r   => { this.savedId.set(r.id??null); this.alert.set({ type:'success', message:`Condition saved · ID: ${r.id}` }); this.loading.set(false); },
      error: err => { this.alert.set({ type:'error', message: err.message }); this.loading.set(false); }
    });
  }

  resetForm(): void {
    this.form.reset(EMPTY_CONDITION_FORM as any);
    if (this.patientId) this.form.patchValue({ patientReference: this.patientId });
    this.currentStep.set(0); this.savedId.set(null); this.alert.set(null); this.showJson.set(false);
  }

  toggleJson(): void { this.showJson.update(v => !v); }
  labelFor(field:string, opts:{code:string;display:string}[]): string {
    return opts.find(o => o.code===this.form.get(field)?.value)?.display ?? '';
  }
}
