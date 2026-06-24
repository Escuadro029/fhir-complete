import { Component, OnInit, inject, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { FhirServiceRequestService, STATUS_OPTIONS, INTENT_OPTIONS, CATEGORY_OPTIONS_SR } from '../../services/fhir-service-request.service';
import { EMPTY_SR_FORM } from '../../models/service-request.model';
import { AlertComponent } from '../shared/alert.component';

@Component({
  selector: 'app-service-request-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertComponent],
  templateUrl: './service-request-form.component.html',
  styleUrls: ['./service-request-form.component.css']
})
export class ServiceRequestFormComponent implements OnInit {
  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(FhirServiceRequestService);

  @Input() patientId:        string = '';
  @Input() serviceRequestId: string = '';

  currentStep = signal(0);
  loading     = signal(false);
  savedId     = signal<string|null>(null);
  alert       = signal<{ type:'success'|'error'; message:string }|null>(null);
  showJson    = signal(false);
  isEditMode  = computed(() => !!this.serviceRequestId);

  readonly steps = [
    { label:'Request',    description:'Status, intent & category'      },
    { label:'References', description:'Patient, requester & performer'  },
    { label:'Reason',     description:'Reason code & clinical note'     },
    { label:'Review',     description:'Confirm & submit'                }
  ];

  readonly statusOptions   = STATUS_OPTIONS;
  readonly intentOptions   = INTENT_OPTIONS;
  readonly categoryOptions = CATEGORY_OPTIONS_SR;

  form = this.fb.group({
    requisitionValue:   [''],
    status:             ['active',   Validators.required],
    intent:             ['order',    Validators.required],
    categoryCode:       ['73770003', Validators.required],
    categoryDisplay:    ['Hospital-based outpatient emergency care center'],
    categoryText:       ['Emergency'],
    patientReference:   ['', Validators.required],
    occurrenceDateTime: ['', Validators.required],
    authoredOn:         [''],
    requesterReference: ['', Validators.required],
    performerReference: [''],
    reasonCode:         ['71388002'],
    reasonDisplay:      ['Procedure'],
    reasonText:         ['', Validators.required],
    noteText:           ['']
  });

  get f(): { [k:string]:AbstractControl } { return this.form.controls; }
  get jsonPreview(): string { return JSON.stringify(this.svc.toFhir(this.form.getRawValue() as any, this.serviceRequestId||undefined), null, 2); }

  private readonly stepFields: string[][] = [
    ['status','intent','categoryCode'],
    ['patientReference','occurrenceDateTime','requesterReference'],
    ['reasonText'],
    []
  ];

  isStepValid(i:number): boolean { return this.stepFields[i].every(f => this.form.get(f)?.valid); }
  isStepDone(i:number):  boolean { return i < this.currentStep() && this.isStepValid(i); }

  ngOnInit(): void {
    if (this.patientId) this.form.patchValue({ patientReference: this.patientId });
    if (this.serviceRequestId) {
      this.loading.set(true);
      this.svc.getById(this.serviceRequestId).subscribe({
        next:  sr  => { this.form.patchValue(this.svc.fromFhir(sr) as any); this.loading.set(false); },
        error: err => { this.alert.set({ type:'error', message: err.message }); this.loading.set(false); }
      });
    }
  }

  onCategoryChange(code:string): void {
    const f = this.categoryOptions.find(c => c.code===code);
    if (f) this.form.patchValue({ categoryCode:f.code, categoryDisplay:f.display, categoryText:f.text });
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
    const req$ = this.serviceRequestId
      ? this.svc.update(this.serviceRequestId, this.form.getRawValue() as any)
      : this.svc.create(this.form.getRawValue() as any);
    req$.subscribe({
      next:  r   => { this.savedId.set(r.id??null); this.alert.set({ type:'success', message:`Service request saved · ID: ${r.id}` }); this.loading.set(false); },
      error: err => { this.alert.set({ type:'error', message: err.message }); this.loading.set(false); }
    });
  }

  resetForm(): void {
    this.form.reset(EMPTY_SR_FORM as any);
    if (this.patientId) this.form.patchValue({ patientReference: this.patientId });
    this.currentStep.set(0); this.savedId.set(null); this.alert.set(null); this.showJson.set(false);
  }

  toggleJson(): void { this.showJson.update(v => !v); }
  labelFor(field:string, opts:{code:string;display:string}[]): string {
    return opts.find(o => o.code===this.form.get(field)?.value)?.display ?? '';
  }
}
