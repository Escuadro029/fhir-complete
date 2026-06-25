import { Component, OnInit, inject, signal, computed } from '@angular/core';
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

interface OrgOption {
  id: string;
  name: string;
  reference: string;
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

  allPatients  = signal<FhirPatient[]>([]);
  patients     = signal<FhirPatient[]>([]);
  loading      = signal(false);
  totalCount   = signal(0);
  searchQuery  = '';
  selectedOrg  = '';   // selected org filter value (reference string)
  alert        = signal<{ type: 'success'|'error'; message: string }|null>(null);

  // SR per patient
  serviceRequests = signal<Record<string, FhirServiceRequest>>({});
  loadingSR       = signal<Record<string, boolean>>({});

  // Name caches
  practitioners = signal<Record<string, string>>({});
  organizations = signal<Record<string, string>>({});

  // Org dropdown options (built from loaded SRs)
  orgOptions = signal<OrgOption[]>([]);

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

  // ── Load ALL patients ─────────────────────────────
  load(): void {
    this.loading.set(true);
    this.searchQuery = '';
    this.selectedOrg = '';
    this.svc.getPatients(1000000).subscribe({
      next: list => {
        this.allPatients.set(list);
        this.patients.set(list);
        this.totalCount.set(list.length);
        this.loading.set(false);
        list.forEach(p => { if (p.id) this.fetchServiceRequest(p.id); });
      },
      error: err => { this.showAlert('error', err.message); this.loading.set(false); }
    });
  }

  // ── Filter (search + org) ─────────────────────────
  applyFilters(): void {
    const q   = this.searchQuery.trim().toLowerCase();
    const org = this.selectedOrg;

    let result = this.allPatients();

    // Name / PhilHealth search
    if (q) {
      result = result.filter(p =>
        this.svc.getFullName(p).toLowerCase().includes(q) ||
        this.svc.getPhilHealthId(p).toLowerCase().includes(q)
      );
    }

    // Org filter — match by performer reference
    if (org) {
      result = result.filter(p => {
        const sr = this.getSR(p.id!);
        return sr?.performer?.some(perf => perf.reference === org);
      });
    }

    this.patients.set(result);
  }

  onSearchChange(): void  { this.applyFilters(); }
  onOrgChange(): void     { this.applyFilters(); }
  clearFilters(): void    { this.searchQuery = ''; this.selectedOrg = ''; this.applyFilters(); }

  get isFiltered(): boolean {
    return !!this.searchQuery.trim() || !!this.selectedOrg;
  }

  // ── Fetch SR ──────────────────────────────────────
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

  // ── Practitioner name ─────────────────────────────
  fetchPractitionerName(reference: string): void {
    const id = reference.replace('Practitioner/', '');
    if (this.practitioners()[id]) return;
    this.http.get<any>(`${this.BASE}/Practitioner/${id}`, { headers: this.H }).subscribe({
      next:  p  => this.practitioners.update(s => ({ ...s, [id]: this.extractHumanName(p.name) })),
      error: () => this.practitioners.update(s => ({ ...s, [id]: reference }))
    });
  }

  // ── Organization / performer name ─────────────────
  fetchOrganizationName(reference: string): void {
    const isOrg = reference.startsWith('Organization/');
    const id    = reference.replace('Organization/', '').replace('Practitioner/', '');
    if (this.organizations()[id]) return;
    const url = isOrg
      ? `${this.BASE}/Organization/${id}`
      : `${this.BASE}/Practitioner/${id}`;
    this.http.get<any>(url, { headers: this.H }).subscribe({
      next: r => {
        const name = isOrg ? (r.name ?? reference) : this.extractHumanName(r.name);
        this.organizations.update(s => ({ ...s, [id]: name }));
        // Add to org dropdown options if not already there
        this.addOrgOption(reference, name);
      },
      error: () => {
        this.organizations.update(s => ({ ...s, [id]: reference }));
        this.addOrgOption(reference, reference);
      }
    });
  }

  private addOrgOption(reference: string, name: string): void {
    const id = reference.replace('Organization/', '').replace('Practitioner/', '');
    const current = this.orgOptions();
    if (!current.find(o => o.reference === reference)) {
      this.orgOptions.update(opts =>
        [...opts, { id, name, reference }].sort((a, b) => a.name.localeCompare(b.name))
      );
    }
  }

  private extractHumanName(names: any[]): string {
    if (!names?.length) return '—';
    const n = names[0];
    return `${(n.given ?? []).join(' ')} ${n.family ?? ''}`.trim() || '—';
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

  // ── Accept ────────────────────────────────────────
  acceptReferral(patientId: string, e: Event): void {
    e.stopPropagation();
    const sr = this.getSR(patientId);
    if (!sr?.id) { this.showAlert('error', 'No service request found.'); return; }
    this.updateSRStatus(sr, 'active', patientId);
  }

  // ── Defer modal ───────────────────────────────────
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

  confirmDefer(): void {
    const reason = this.deferReason() === 'Other'
      ? this.customReason.trim()
      : this.deferReason();
    if (!reason) { this.deferReasonError.set('Please select or enter a reason.'); return; }

    const patientId = this.deferPatientId();
    const sr        = patientId ? this.getSR(patientId) : null;
    if (!sr) return;

    const updated: FhirServiceRequest = {
      ...sr, status: 'on-hold',
      note: [...(sr.note ?? []), { text: `Deferred: ${reason}` }]
    };

    this.http.put<FhirServiceRequest>(
      `${this.BASE}/ServiceRequest/${sr.id}`, updated, { headers: this.H }
    ).subscribe({
      next: result => {
        if (patientId) this.serviceRequests.update(s => ({ ...s, [patientId]: result }));
        this.showAlert('success', `Referral deferred · ${reason}`);
        this.closeDeferModal();
      },
      error: err => { this.showAlert('error', 'Failed: ' + err.message); this.closeDeferModal(); }
    });
  }

  closeDeferModal(): void {
    this.showDeferModal.set(false);
    this.deferPatientId.set(null);
    this.deferReason.set('');
    this.deferReasonError.set('');
    this.customReason = '';
  }

  private updateSRStatus(sr: FhirServiceRequest, status: string, patientId: string): void {
    this.http.put<FhirServiceRequest>(
      `${this.BASE}/ServiceRequest/${sr.id}`, { ...sr, status }, { headers: this.H }
    ).subscribe({
      next:  result => {
        this.serviceRequests.update(s => ({ ...s, [patientId]: result }));
        this.showAlert('success', `Referral ${status === 'active' ? 'accepted' : 'updated'}.`);
      },
      error: err => this.showAlert('error', 'Update failed: ' + err.message)
    });
  }

  // ── Delete ────────────────────────────────────────
  delete(p: FhirPatient, e: Event): void {
    e.stopPropagation();
    if (!confirm(`Delete "${this.svc.getFullName(p)}"?`)) return;
    this.svc.deletePatient(p.id!).subscribe({
      next: () => {
        this.showAlert('success', 'Patient deleted.');
        this.allPatients.update(l => l.filter(x => x.id !== p.id));
        this.patients.update(l => l.filter(x => x.id !== p.id));
        this.totalCount.update(n => n - 1);
      },
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