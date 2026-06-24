import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FhirPatientService } from '../../services/fhir-patient.service';
import { FhirPatient } from '../../models/patient.model';
import { AlertComponent } from '../shared/alert.component';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, AlertComponent],
  templateUrl: './patient-detail.component.html',
  styleUrls: ['./patient-detail.component.css']
})
export class PatientDetailComponent implements OnInit {
  private readonly svc    = inject(FhirPatientService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  patient = signal<FhirPatient|null>(null);
  loading = signal(false);
  alert   = signal<{ type:'success'|'error'; message:string }|null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) { this.loading.set(true); this.svc.getPatient(id).subscribe({ next: p => { this.patient.set(p); this.loading.set(false); }, error: err => { this.alert.set({ type:'error', message: err.message }); this.loading.set(false); } }); }
  }

  edit():   void { this.router.navigate(['/patients', this.patient()?.id, 'edit']); }
  delete(): void {
    const p = this.patient(); if (!p?.id) return;
    if (!confirm(`Delete "${this.svc.getFullName(p)}"?`)) return;
    this.svc.deletePatient(p.id).subscribe({ next: () => this.router.navigate(['/patients']), error: err => this.alert.set({ type:'error', message: err.message }) });
  }

  ext(url: string): string {
    return this.patient()?.address?.[0]?.extension?.find(e => e.url.endsWith(url))?.valueCoding?.display ?? '—';
  }
  name()    { return this.svc.getFullName(this.patient()!); }
  phi()     { return this.svc.getPhilHealthId(this.patient()!); }
  initials(){ return this.svc.getInitials(this.patient()!); }
}
