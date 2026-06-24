import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alert" [class]="'alert-' + type">
      <span class="alert-icon">{{ type === 'success' ? '✓' : '✕' }}</span>
      {{ message }}
    </div>
  `,
  styles: [`
    .alert { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:8px; font-size:13px; margin-bottom:16px; }
    .alert-success { background:#dcfce7; border:1px solid #86efac; color:#16a34a; }
    .alert-error   { background:#fef2f2; border:1px solid #fca5a5; color:#dc2626; }
    .alert-icon { font-weight:700; }
  `]
})
export class AlertComponent {
  @Input() type: 'success' | 'error' = 'success';
  @Input() message = '';
}
