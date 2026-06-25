import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FhirPatientService } from '../../services/fhir-patient.service';
import { FhirPatient } from '../../models/patient.model';
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
  selector: 'app-patient-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, AlertComponent],
  templateUrl: './patient-list.component.html',
  styleUrls: ['./patient-list.component.css']
})
export class PatientListComponent implements OnInit {
  private readonly svc    = inject(FhirPatientService);
  private readonly router = inject(Router);
  private readonly http   = inject(HttpClient);

  private readonly BASE = 'https://cdr.pheref.fhirlab.net/fhir';
  private readonly H = new HttpHeaders({
    'Content-Type': 'application/fhir+json',
    'Accept':       'application/fhir+json'
  });

  patients    = signal<FhirPatient[]>([]);
  loading     = signal(false);
  searchQuery = '';
  alert       = signal<{ type: 'success'|'error'; message: string }|null>(null);

  // Service requests per patient id
  serviceRequests = signal<Record<string, FhirServiceRequest>>({});
  loadingSR       = signal<Record<string, boolean>>({});

  // Practitioner & Organization name caches
  practitioners = signal<Record<string, string>>({});
  organizations = signal<Record<string, string>>({});

  // Defer modal
  showDeferModal   = signal(false);
  deferPatientId   = signal<string | null>(null);
  deferReason      = signal('');
  deferReasonError = signal('');
  customReason     = '';

  readonly deferReasons = [
    'No available bed / slot',
    'Incomplete referral documents',
    'Patient condition not stable for transfer',
    'Facility not equipped for this case',
    'Referred to another facility',
    'Other'
  ];

  ngOnInit(): void { this.load(); }

  // ── Load all patients ─────────────────────────────
  load(): void {
    this.loading.set(true);
    this.svc.getPatients().subscribe({
      next: list => {
        this.patients.set(list);
        this.loading.set(false);
        list.forEach(p => { if (p.id) this.fetchServiceRequest(p.id); });
      },
      error: err => { this.showAlert('error', err.message); this.loading.set(false); }
    });
  }

  // ── Fetch latest SR for a patient ─────────────────
  fetchServiceRequest(patientId: string): void {
    this.loadingSR.update(s => ({ ...s, [patientId]: true }));
    this.http.get<any>(
      `${this.BASE}/ServiceRequest?subject=Patient/${patientId}&_sort=-authored&_count=1`,
      { headers: this.H }
    ).subscribe({
      next: bundle => {
        const sr = bundle.entry?.[0]?.resource as FhirServiceRequest;
        if (sr) {
          this.serviceRequests.update(s => ({ ...s, [patientId]: sr }));
          if (sr.requester?.reference)      this.fetchPractitionerName(sr.requester.reference);
          if (sr.performer?.[0]?.reference) this.fetchOrganizationName(sr.performer[0].reference);
        }
        this.loadingSR.update(s => ({ ...s, [patientId]: false }));
      },
      error: () => this.loadingSR.update(s => ({ ...s, [patientId]: false }))
    });
  }

  // ── Fetch practitioner name ───────────────────────
  fetchPractitionerName(reference: string): void {
    const id = reference.replace('Practitioner/', '');
    if (this.practitioners()[id]) return;
    this.http.get<any>(`${this.BASE}/Practitioner/${id}`, { headers: this.H })
      .subscribe({
        next:  p   => this.practitioners.update(s => ({ ...s, [id]: this.extractHumanName(p.name) })),
        error: ()  => this.practitioners.update(s => ({ ...s, [id]: reference }))
      });
  }

  // ── Fetch organization or practitioner name ───────
  fetchOrganizationName(reference: string): void {
    const isOrg = reference.startsWith('Organization/');
    const id    = reference.replace('Organization/', '').replace('Practitioner/', '');
    if (this.organizations()[id]) return;
    const url = isOrg
      ? `${this.BASE}/Organization/${id}`
      : `${this.BASE}/Practitioner/${id}`;
    this.http.get<any>(url, { headers: this.H })
      .subscribe({
        next:  r   => {
          const name = isOrg ? (r.name ?? reference) : this.extractHumanName(r.name);
          this.organizations.update(s => ({ ...s, [id]: name }));
        },
        error: ()  => this.organizations.update(s => ({ ...s, [id]: reference }))
      });
  }

  private extractHumanName(names: any[]): string {
    if (!names?.length) return '—';
    const n      = names[0];
    const given  = (n.given ?? []).join(' ');
    const family = n.family ?? '';
    return `${given} ${family}`.trim() || '—';
  }

  getPractitionerName(reference?: string): string {
    if (!reference) return '—';
    const id = reference.replace('Practitioner/', '');
    return this.practitioners()[id] ?? reference;
  }

  getOrganizationName(reference?: string): string {
    if (!reference) return '—';
    const id = reference.replace('Organization/', '').replace('Practitioner/', '');
    return this.organizations()[id] ?? reference;
  }

  // ── SR helpers ────────────────────────────────────
  getSR(patientId: string): FhirServiceRequest | null {
    return this.serviceRequests()[patientId] ?? null;
  }

  getSRStatus(patientId: string): string {
    return this.getSR(patientId)?.status ?? 'none';
  }

  isSRLoading(patientId: string): boolean {
    return this.loadingSR()[patientId] ?? false;
  }

  // ── Accept referral ───────────────────────────────
  acceptReferral(patientId: string, e: Event): void {
    e.stopPropagation();
    const sr = this.getSR(patientId);
    if (!sr?.id) { this.showAlert('error', 'No service request found.'); return; }
    this.updateSRStatus(sr, 'active', patientId);
  }

  // ── Open defer modal ──────────────────────────────
  openDeferModal(patientId: string, e: Event): void {
    e.stopPropagation();
    const sr = this.getSR(patientId);
    if (!sr?.id) { this.showAlert('error', 'No service request found.'); return; }
    this.deferPatientId.set(patientId);
    this.deferReason.set('');
    this.deferReasonError.set('');
    this.customReason = '';
    this.showDeferModal.set(true);
  }

  // ── Confirm defer ─────────────────────────────────
  confirmDefer(): void {
    const reason = this.deferReason() === 'Other'
      ? this.customReason.trim()
      : this.deferReason();

    if (!reason) {
      this.deferReasonError.set('Please select or enter a reason.');
      return;
    }

    const patientId = this.deferPatientId();
    const sr        = patientId ? this.getSR(patientId) : null;
    if (!sr) return;

    const updated: FhirServiceRequest = {
      ...sr,
      status: 'on-hold',
      note: [...(sr.note ?? []), { text: `Deferred: ${reason}` }]
    };

    this.http.put<FhirServiceRequest>(
      `${this.BASE}/ServiceRequest/${sr.id}`,
      updated,
      { headers: this.H }
    ).subscribe({
      next: result => {
        if (patientId) this.serviceRequests.update(s => ({ ...s, [patientId]: result }));
        this.showAlert('success', `Referral deferred · ${reason}`);
        this.closeDeferModal();
      },
      error: err => {
        this.showAlert('error', 'Failed to defer: ' + err.message);
        this.closeDeferModal();
      }
    });
  }

  closeDeferModal(): void {
    this.showDeferModal.set(false);
    this.deferPatientId.set(null);
    this.deferReason.set('');
    this.deferReasonError.set('');
    this.customReason = '';
  }

  // ── PUT SR status ─────────────────────────────────
  private updateSRStatus(sr: FhirServiceRequest, status: string, patientId: string): void {
    this.http.put<FhirServiceRequest>(
      `${this.BASE}/ServiceRequest/${sr.id}`,
      { ...sr, status },
      { headers: this.H }
    ).subscribe({
      next:  result => {
        this.serviceRequests.update(s => ({ ...s, [patientId]: result }));
        this.showAlert('success', `Referral ${status === 'active' ? 'accepted' : 'updated'}.`);
      },
      error: err => this.showAlert('error', 'Update failed: ' + err.message)
    });
  }

  // ── Search ────────────────────────────────────────
  search(): void {
    if (!this.searchQuery.trim()) { this.load(); return; }
    this.loading.set(true);
    this.svc.getPatients(100000).subscribe({
      next: list => {
        const q = this.searchQuery.toLowerCase();
        this.patients.set(list.filter(p =>
          this.svc.getFullName(p).toLowerCase().includes(q) ||
          this.svc.getPhilHealthId(p).toLowerCase().includes(q)
        ));
        this.loading.set(false);
      },
      error: err => { this.showAlert('error', err.message); this.loading.set(false); }
    });
  }

  // ── Delete ────────────────────────────────────────
  delete(p: FhirPatient, e: Event): void {
    e.stopPropagation();
    if (!confirm(`Delete "${this.svc.getFullName(p)}"?`)) return;
    this.svc.deletePatient(p.id!).subscribe({
      next:  ()  => { this.showAlert('success', 'Patient deleted.'); this.patients.update(l => l.filter(x => x.id !== p.id)); },
      error: err => this.showAlert('error', err.message)
    });
  }

  view(id: string): void { this.router.navigate(['/patients', id]); }
  edit(id: string): void { this.router.navigate(['/patients', id, 'edit']); }
  name(p: FhirPatient):  string { return this.svc.getFullName(p); }
  phi(p: FhirPatient):   string { return this.svc.getPhilHealthId(p); }
  init(p: FhirPatient):  string { return this.svc.getInitials(p); }

  private showAlert(type: 'success'|'error', message: string): void {
    this.alert.set({ type, message });
    setTimeout(() => this.alert.set(null), 5000);
  }
}