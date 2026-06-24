import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  template: `
    <nav class="topbar">
      <div class="brand">
        <div class="brand-icon">⚕</div>
        <div>
          <div class="brand-title">PH FHIR Registry</div>
          <div class="brand-sub">DOH Philippines · PHEREF CDR</div>
        </div>
      </div>
      <div class="nav-links">
        <a routerLink="/patients" routerLinkActive="active" class="nav-link">Patients</a>
        <a routerLink="/patients/new" class="nav-link nav-cta">+ Register</a>
      </div>
    </nav>
    <main><router-outlet /></main>
  `,
  styles: [`
    .topbar { background:#fff; border-bottom:1px solid #e5e5e5; padding:12px 24px; display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:100; }
    .brand { display:flex; align-items:center; gap:10px; }
    .brand-icon { width:34px; height:34px; background:#185FA5; border-radius:8px; display:flex; align-items:center; justify-content:center; color:white; font-size:18px; }
    .brand-title { font-size:14px; font-weight:600; color:#1a1a1a; }
    .brand-sub { font-size:11px; color:#888; }
    .nav-links { display:flex; align-items:center; gap:6px; }
    .nav-link { font-size:13px; font-weight:500; color:#444; text-decoration:none; padding:7px 14px; border-radius:8px; border:1px solid transparent; transition:all 0.15s; }
    .nav-link:hover { background:#f5f5f5; }
    .nav-link.active { color:#185FA5; background:#EBF3FC; }
    .nav-cta { background:#185FA5; color:white !important; border-color:#185FA5; }
    .nav-cta:hover { background:#0C447C !important; }
    main { background:#f9fafb; min-height:calc(100vh - 60px); }
  `]
})
export class AppComponent {}
