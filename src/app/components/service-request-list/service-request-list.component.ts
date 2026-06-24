import { Component, OnInit, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FhirServiceRequestService } from '../../services/fhir-service-request.service';
import { FhirServiceRequest } from '../../models/service-request.model';
import { AlertComponent } from '../shared/alert.component';
import { ServiceRequestFormComponent } from '../service-request-form/service-request-form.component';

@Component({
  selector: 'app-service-request-list',
  standalone: true,
  imports: [CommonModule, AlertComponent, ServiceRequestFormComponent],
  templateUrl: './service-request-list.component.html',
  styleUrls: ['./service-request-list.component.css']
})
export class ServiceRequestListComponent implements OnInit {
  private readonly svc = inject(FhirServiceRequestService);

  @Input() patientId: string = '';

  requests  = signal<FhirServiceRequest[]>([]);
  loading   = signal(false);
  editId    = signal<string | null>(null);
  showForm  = signal(false);
  alert     = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    if (!this.patientId) return;
    this.loading.set(true);
    this.svc.getByPatient(this.patientId).subscribe({
      next: bundle => {
        const list = (bundle.entry ?? []).map((e: any) => e.resource as FhirServiceRequest);
        this.requests.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.showAlert('error', err.message);
        this.loading.set(false);
      }
    });
  }

  openNew():             void { this.editId.set(null);  this.showForm.set(true);  }
  openEdit(id: string):  void { this.editId.set(id);    this.showForm.set(true);  }
  closeForm():           void { this.showForm.set(false); this.editId.set(null); this.load(); }

  delete(sr: FhirServiceRequest): void {
    if (!confirm(`Delete service request "${sr.requisition?.value}"?`)) return;
    this.svc.delete(sr.id!).subscribe({
      next:  ()  => { this.showAlert('success', 'Service request deleted.'); this.load(); },
      error: err => this.showAlert('error', err.message)
    });
  }

  statusColor(code: string): string {
    const map: Record<string, string> = {
      active:    'pill-active',
      completed: 'pill-resolved',
      revoked:   'pill-inactive',
      'on-hold': 'pill-hold',
      draft:     'pill-draft'
    };
    return map[code] ?? 'pill-default';
  }

  private showAlert(type: 'success' | 'error', message: string): void {
    this.alert.set({ type, message });
    setTimeout(() => this.alert.set(null), 5000);
  }
}