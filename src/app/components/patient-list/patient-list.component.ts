import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FhirPatientService } from '../../services/fhir-patient.service';
import { FhirPatient } from '../../models/patient.model';
import { AlertComponent } from '../shared/alert.component';

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

  patients     = signal<FhirPatient[]>([]);
  loading      = signal(false);
  searchQuery  = '';
  alert        = signal<{ type: 'success'|'error'; message: string }|null>(null);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.svc.getPatients().subscribe({
      next: list => { this.patients.set(list); this.loading.set(false); },
      error: err  => { this.showAlert('error', err.message); this.loading.set(false); }
    });
  }

  search(): void {
    if (!this.searchQuery.trim()) { this.load(); return; }
    this.loading.set(true);
    this.svc.getPatients(50).subscribe({
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

  delete(p: FhirPatient, e: Event): void {
    e.stopPropagation();
    if (!confirm(`Delete "${this.svc.getFullName(p)}"?`)) return;
    this.svc.deletePatient(p.id!).subscribe({
      next: ()  => { this.showAlert('success', 'Patient deleted.'); this.patients.update(l => l.filter(x => x.id !== p.id)); },
      error: err => this.showAlert('error', err.message)
    });
  }

  view(id: string):  void { this.router.navigate(['/patients', id]); }
  edit(id: string):  void { this.router.navigate(['/patients', id, 'edit']); }
  name(p: FhirPatient):  string { return this.svc.getFullName(p); }
  phi(p: FhirPatient):   string { return this.svc.getPhilHealthId(p); }
  init(p: FhirPatient):  string { return this.svc.getInitials(p); }

  private showAlert(type: 'success'|'error', message: string): void {
    this.alert.set({ type, message });
    setTimeout(() => this.alert.set(null), 5000);
  }
}
