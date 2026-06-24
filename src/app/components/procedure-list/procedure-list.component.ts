import { Component, OnInit, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FhirProcedureService, PROCEDURE_STATUS_OPTIONS } from '../../services/fhir-procedure.service';
import { FhirProcedure } from '../../models/procedure.model';
import { AlertComponent } from '../shared/alert.component';
import { ProcedureFormComponent } from '../procedure-form/procedure-form.component';

@Component({
  selector: 'app-procedure-list',
  standalone: true,
  imports: [CommonModule, AlertComponent, ProcedureFormComponent],
  templateUrl: './procedure-list.component.html',
  styleUrls: ['./procedure-list.component.css']
})
export class ProcedureListComponent implements OnInit {
  private readonly svc = inject(FhirProcedureService);

  @Input() patientId: string = '';

  procedures = signal<FhirProcedure[]>([]);
  loading    = signal(false);
  showForm   = signal(false);
  editId     = signal<string | null>(null);
  alert      = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  readonly statusOptions = PROCEDURE_STATUS_OPTIONS;

  ngOnInit(): void { this.load(); }

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
    this.showForm.set(true);
  }

  openEdit(p: FhirProcedure): void {
    this.editId.set(p.id ?? null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editId.set(null);
    this.load();
  }

  delete(p: FhirProcedure): void {
    if (!confirm(`Delete procedure "${p.code?.text}"?`)) return;
    this.svc.delete(p.id!).subscribe({
      next:  ()  => { this.showAlert('success', 'Procedure deleted.'); this.load(); },
      error: err => this.showAlert('error', err.message)
    });
  }

  statusColor(code: string): string {
    const map: Record<string, string> = {
      completed:      'pill-completed',
      'in-progress':  'pill-progress',
      'not-done':     'pill-notdone',
      stopped:        'pill-notdone',
      preparation:    'pill-draft',
      unknown:        'pill-draft'
    };
    return map[code] ?? 'pill-draft';
  }

  private showAlert(type: 'success' | 'error', message: string): void {
    this.alert.set({ type, message });
    setTimeout(() => this.alert.set(null), 5000);
  }
}