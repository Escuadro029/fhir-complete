import { Component, OnInit, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FhirConditionService } from '../../services/fhir-condition.service';
import { FhirCondition } from '../../models/condition.model';
import { AlertComponent } from '../shared/alert.component';
import { ConditionFormComponent } from '../condition-form/condition-form.component';

@Component({
  selector: 'app-condition-list',
  standalone: true,
  imports: [CommonModule, AlertComponent, ConditionFormComponent],
  templateUrl: './condition-list.component.html',
  styleUrls: ['./condition-list.component.css']
})
export class ConditionListComponent implements OnInit {
  private readonly svc = inject(FhirConditionService);

  @Input() patientId: string = '';

  conditions   = signal<FhirCondition[]>([]);
  loading      = signal(false);
  editId       = signal<string | null>(null);
  showForm     = signal(false);
  alert        = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    if (!this.patientId) return;
    this.loading.set(true);
    this.svc.getByPatient(this.patientId).subscribe({
      next: bundle => {
        const list = (bundle.entry ?? []).map((e: any) => e.resource as FhirCondition);
        this.conditions.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.showAlert('error', err.message);
        this.loading.set(false);
      }
    });
  }

  openNew(): void   { this.editId.set(null); this.showForm.set(true); }
  openEdit(id: string): void { this.editId.set(id); this.showForm.set(true); }
  closeForm(): void { this.showForm.set(false); this.editId.set(null); this.load(); }

  delete(c: FhirCondition): void {
    if (!confirm(`Delete condition "${c.code?.text}"?`)) return;
    this.svc.delete(c.id!).subscribe({
      next:  ()  => { this.showAlert('success', 'Condition deleted.'); this.load(); },
      error: err => this.showAlert('error', err.message)
    });
  }

  statusColor(code: string): string {
    const map: Record<string, string> = {
      active: 'pill-active', resolved: 'pill-resolved',
      inactive: 'pill-inactive', remission: 'pill-remission'
    };
    return map[code] ?? 'pill-default';
  }

  private showAlert(type: 'success' | 'error', message: string): void {
    this.alert.set({ type, message });
    setTimeout(() => this.alert.set(null), 5000);
  }
}