import { Component, OnInit, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import {
  FhirTaskService,
  TASK_STATUS_OPTIONS,
  TASK_INTENT_OPTIONS
} from '../../services/fhir-task.service';
import { FhirTask } from '../../models/task.model';
import { EMPTY_TASK_FORM } from '../../models/task.model';
import { AlertComponent } from '../shared/alert.component';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AlertComponent],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit {
  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(FhirTaskService);

  @Input() patientId: string = '';

  tasks       = signal<FhirTask[]>([]);
  loading     = signal(false);
  saving      = signal(false);
  showForm    = signal(false);
  editId      = signal<string | null>(null);
  savedId     = signal<string | null>(null);
  alert       = signal<{ type: 'success' | 'error'; message: string } | null>(null);
  showJson    = signal(false);

  readonly statusOptions = TASK_STATUS_OPTIONS;
  readonly intentOptions = TASK_INTENT_OPTIONS;

  form = this.fb.group({
    status:             ['requested',    Validators.required],
    intent:             ['order',        Validators.required],
    codeCode:           ['3457005'],
    codeDisplay:        ['Patient referral'],
    codeText:           ['',             Validators.required],
    focusReference:     ['',             Validators.required],
    forReference:       ['',             Validators.required],
    authoredOn:         ['',             Validators.required],
    lastModified:       [''],
    requesterReference: ['',             Validators.required],
    ownerReference:     [''],
    noteText:           ['']
  });

  get f(): { [k: string]: AbstractControl } { return this.form.controls; }

  get jsonPreview(): string {
    return JSON.stringify(
      this.svc.toFhir(this.form.getRawValue() as any, this.editId() ?? undefined),
      null, 2
    );
  }

  ngOnInit(): void {
    this.load();
    if (this.patientId) this.form.patchValue({ forReference: this.patientId });
  }

  load(): void {
    if (!this.patientId) return;
    this.loading.set(true);
    this.svc.getByPatient(this.patientId).subscribe({
      next: bundle => {
        this.tasks.set((bundle.entry ?? []).map((e: any) => e.resource as FhirTask));
        this.loading.set(false);
      },
      error: err => { this.showAlert('error', err.message); this.loading.set(false); }
    });
  }

  openNew(): void {
    this.editId.set(null);
    this.form.reset(EMPTY_TASK_FORM as any);
    this.form.patchValue({ forReference: this.patientId });
    this.savedId.set(null);
    this.showJson.set(false);
    this.showForm.set(true);
  }

  openEdit(t: FhirTask): void {
    this.editId.set(t.id ?? null);
    this.form.patchValue(this.svc.fromFhir(t) as any);
    this.savedId.set(null);
    this.showJson.set(false);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editId.set(null);
    this.load();
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const req$ = this.editId()
      ? this.svc.update(this.editId()!, this.form.getRawValue() as any)
      : this.svc.create(this.form.getRawValue() as any);
    req$.subscribe({
      next:  r   => {
        this.savedId.set(r.id ?? null);
        this.showAlert('success', `Task saved · ID: ${r.id}`);
        this.saving.set(false);
        this.load();
      },
      error: err => { this.showAlert('error', err.message); this.saving.set(false); }
    });
  }

  delete(t: FhirTask): void {
    if (!confirm(`Delete task "${t.code?.text}"?`)) return;
    this.svc.delete(t.id!).subscribe({
      next:  ()  => { this.showAlert('success', 'Task deleted.'); this.load(); },
      error: err => this.showAlert('error', err.message)
    });
  }

  toggleJson(): void { this.showJson.update(v => !v); }

  statusColor(code: string): string {
    const map: Record<string, string> = {
      requested:   'pill-requested',
      accepted:    'pill-accepted',
      completed:   'pill-completed',
      'in-progress':'pill-progress',
      rejected:    'pill-rejected',
      cancelled:   'pill-cancelled',
      draft:       'pill-draft'
    };
    return map[code] ?? 'pill-draft';
  }

  labelFor(field: string, opts: { code: string; display: string }[]): string {
    return opts.find(o => o.code === this.form.get(field)?.value)?.display ?? '';
  }

  private showAlert(type: 'success' | 'error', message: string): void {
    this.alert.set({ type, message });
    setTimeout(() => this.alert.set(null), 5000);
  }
}