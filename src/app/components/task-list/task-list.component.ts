import { Component, OnInit, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AlertComponent } from '../shared/alert.component';

interface FhirServiceRequest {
  id?: string;
  resourceType: string;
  status: string;
  intent: string;
  subject: { reference: string };
  requester?: { reference: string };
  performer?: { reference: string }[];
  encounter?: { reference: string };
  category?: { coding: any[]; text: string }[];
  reasonCode?: { coding: any[]; text: string }[];
  note?: { text: string }[];
  authoredOn?: string;
  occurrenceDateTime?: string;
  requisition?: { system: string; value: string };
}

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertComponent],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.css']
})
export class TaskListComponent implements OnInit {
  private readonly http = inject(HttpClient);

  private readonly BASE = 'https://cdr.pheref.fhirlab.net/fhir';
  private readonly H = new HttpHeaders({
    'Content-Type': 'application/fhir+json',
    'Accept': 'application/fhir+json'
  });

  @Input() patientId: string = '';

  requests = signal<FhirServiceRequest[]>([]);
  loading = signal(false);
  updating = signal<Record<string, boolean>>({});
  alert = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  // Defer modal
  showDeferModal = signal(false);
  deferSR = signal<FhirServiceRequest | null>(null);
  deferReason = signal('');
  deferReasonError = signal('');
  customReason = '';

  readonly deferReasons = [
    'No available bed / slot',
    'Incomplete referral documents',
    'Patient condition not stable for transfer',
    'Facility not equipped for this case',
    'Referred to another facility',
    'Other'
  ];

  readonly statusOptions = [
    { code: 'draft', display: 'Draft', color: 'pill-draft' },
    { code: 'active', display: 'Active', color: 'pill-active' },
    { code: 'on-hold', display: 'On Hold', color: 'pill-hold' },
    { code: 'revoked', display: 'Revoked', color: 'pill-revoked' },
    { code: 'completed', display: 'Completed', color: 'pill-completed' },
    { code: 'entered-in-error', display: 'Entered in Error', color: 'pill-error' },
    { code: 'unknown', display: 'Unknown', color: 'pill-draft' }
  ];

  ngOnInit(): void { this.load(); }

  load(): void {
    if (!this.patientId) return;
    this.loading.set(true);
    this.http.get<any>(
      `${this.BASE}/ServiceRequest?subject=Patient/${this.patientId}&_sort=-authored&_count=20`,
      { headers: this.H }
    ).subscribe({
      next: bundle => {
        const list = (bundle.entry ?? []).map((e: any) => e.resource as FhirServiceRequest);
        this.requests.set(list);
        this.loading.set(false);
      },
      error: err => {
        this.showAlert('error', 'Failed to load: ' + err.message);
        this.loading.set(false);
      }
    });
  }

  // ── Quick status change from dropdown ────────────
  onStatusChange(sr: FhirServiceRequest, newStatus: string): void {
    if (newStatus === sr.status) return;

    if (newStatus === 'on-hold') {
      this.deferSR.set(sr);
      this.deferReason.set('');
      this.deferReasonError.set('');
      this.customReason = '';
      this.showDeferModal.set(true);
      return;
    }

    this.updateStatus(sr, newStatus);
  }

  // ── Accept shortcut ───────────────────────────────
  accept(sr: FhirServiceRequest): void {
    this.updateStatus(sr, 'active');
  }

  // ── Defer via modal ───────────────────────────────
  openDeferModal(sr: FhirServiceRequest): void {
    this.deferSR.set(sr);
    this.deferReason.set('');
    this.deferReasonError.set('');
    this.customReason = '';
    this.showDeferModal.set(true);
  }

  confirmDefer(): void {
    const reason = this.deferReason() === 'Other'
      ? this.customReason.trim()
      : this.deferReason();

    if (!reason) {
      this.deferReasonError.set('Please select or enter a reason.');
      return;
    }

    const sr = this.deferSR();
    if (!sr) return;

    const updated: FhirServiceRequest = {
      ...sr,
      status: 'on-hold',
      note: [...(sr.note ?? []), { text: `Deferred: ${reason}` }]
    };

    this.putSR(updated, `Referral deferred · ${reason}`);
    this.closeDeferModal();
  }

  closeDeferModal(): void {
    this.showDeferModal.set(false);
    this.deferSR.set(null);
    this.deferReason.set('');
    this.deferReasonError.set('');
    this.customReason = '';
  }

  // ── Core PUT ──────────────────────────────────────
  private updateStatus(sr: FhirServiceRequest, status: string): void {
    this.putSR({ ...sr, status }, `Status updated to "${status}"`);
  }

  private putSR(sr: FhirServiceRequest, successMsg: string): void {
    if (!sr.id) return;
    this.updating.update(u => ({ ...u, [sr.id!]: true }));
    this.http.put<FhirServiceRequest>(
      `${this.BASE}/ServiceRequest/${sr.id}`,
      sr,
      { headers: this.H }
    ).subscribe({
      next: result => {
        this.requests.update(list =>
          list.map(r => r.id === result.id ? result : r)
        );
        this.showAlert('success', successMsg);
        this.updating.update(u => ({ ...u, [sr.id!]: false }));
      },
      error: err => {
        this.showAlert('error', 'Update failed: ' + err.message);
        this.updating.update(u => ({ ...u, [sr.id!]: false }));
      }
    });
  }

  isUpdating(id?: string): boolean {
    return id ? (this.updating()[id] ?? false) : false;
  }

  statusColor(code: string): string {
    return this.statusOptions.find(o => o.code === code)?.color ?? 'pill-draft';
  }

  statusDisplay(code: string): string {
    return this.statusOptions.find(o => o.code === code)?.display ?? code;
  }

  private showAlert(type: 'success' | 'error', message: string): void {
    this.alert.set({ type, message });
    setTimeout(() => this.alert.set(null), 5000);
  }
}