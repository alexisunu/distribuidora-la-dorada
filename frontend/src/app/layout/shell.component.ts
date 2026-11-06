import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <aside>
      <div class="logo">La Dorada</div>
      <nav>
        @for (m of auth.menu(); track m.ruta) {
          <a [routerLink]="m.ruta" routerLinkActive="on">{{ m.texto }}</a>
        }
      </nav>
      <div class="user">
        <strong>{{ auth.usuario()?.nombre }}</strong>
        <small>{{ auth.rol() }}</small>
        <button class="btn sec" (click)="auth.salir()">Salir</button>
      </div>
    </aside>
    <main><router-outlet /></main>
  `,
  styles: [`
    :host { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
    aside { background: #073E52; color: #fff; display: flex; flex-direction: column; padding: 16px; gap: 16px; }
    .logo { font-weight: 700; font-size: 18px; }
    nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    nav a { color: #cfe6ee; text-decoration: none; padding: 9px 12px; border-radius: var(--r-s); }
    nav a.on { background: #0A6C8A; color: #fff; font-weight: 600; }
    .user { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
    .user small { opacity: .7; }
    main { padding: 24px; }
    @media (max-width: 760px) {
      :host { grid-template-columns: 1fr; }
      aside { flex-direction: row; flex-wrap: wrap; align-items: center; padding: 10px 12px; gap: 8px; }
      nav { flex-direction: row; flex-wrap: wrap; }
      .user { flex-direction: row; align-items: center; gap: 8px; }
      main { padding: 14px; }
    }
  `],
})
export class ShellComponent { auth = inject(AuthService); }
