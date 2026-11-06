import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <!-- Sidebar Escritorio -->
    <aside class="sidebar only-desktop">
      <div class="brand">
        <span class="ld-badge">LD</span>
        <div class="brand-text">
          <strong>Distribuidora La Dorada</strong>
          <span>S.A.S</span>
        </div>
      </div>

      <nav class="side-nav">
        @for (m of auth.menu(); track m.ruta) {
          <a [routerLink]="m.ruta" routerLinkActive="on">
            <span class="nav-icon" [attr.data-icon]="m.icono">
              @switch (m.icono) {
                @case ('pedidos') {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
                }
                @case ('despachos') {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="14" height="12" rx="1"/><polygon points="15 8 19 8 23 12 23 16 15 16 15 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                }
                @case ('productos') {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                }
                @case ('resumen') {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/></svg>
                }
                @case ('usuarios') {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                }
              }
            </span>
            <span>{{ m.texto }}</span>
          </a>
        }
      </nav>

      <div class="sidebar-footer">
        <div class="user-card">
          <span class="avatar">{{ auth.iniciales() }}</span>
          <div class="user-meta">
            <strong>{{ auth.usuario()?.nombre }}</strong>
            <small>{{ auth.etiquetaRol() }}</small>
          </div>
          <button class="logout-icon" type="button" title="Cerrar sesión" (click)="auth.salir()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>

        <div class="theme-switch" role="group" aria-label="Selector de tema">
          <button type="button" [class.active]="auth.tema() === 'system'" (click)="auth.cambiarTema('system')">Sistema</button>
          <button type="button" [class.active]="auth.tema() === 'light'" (click)="auth.cambiarTema('light')">Claro</button>
          <button type="button" [class.active]="auth.tema() === 'dark'" (click)="auth.cambiarTema('dark')">Oscuro</button>
        </div>
      </div>
    </aside>

    <!-- Cabecera Móvil -->
    <header class="mobile-topbar only-mobile">
      <div class="mobile-top-inner">
        <div class="mobile-brand">
          <span class="ld-badge">LD</span>
          <div>
            <small class="mobile-sub">Distribuidora La Dorada S.A.S</small>
            <strong class="mobile-role">{{ auth.etiquetaRol() }} · {{ auth.usuario()?.nombre }}</strong>
          </div>
        </div>
        <button type="button" class="avatar-btn" (click)="menuMovilAbierto.set(!menuMovilAbierto())" title="Opciones de cuenta">
          {{ auth.iniciales() }}
        </button>
      </div>

      @if (menuMovilAbierto()) {
        <div class="mobile-user-drawer">
          <div class="mobile-user-row">
            <div>
              <strong>{{ auth.usuario()?.nombre }}</strong>
              <div class="muted-sm">{{ auth.etiquetaRol() }} ({{ auth.usuario()?.username }})</div>
            </div>
            <button type="button" class="btn sec sm" (click)="auth.salir()">Cerrar sesión</button>
          </div>
          <div class="theme-switch" style="max-width: 100%; margin-top: 8px;">
            <button type="button" [class.active]="auth.tema() === 'system'" (click)="auth.cambiarTema('system')">Sistema</button>
            <button type="button" [class.active]="auth.tema() === 'light'" (click)="auth.cambiarTema('light')">Claro</button>
            <button type="button" [class.active]="auth.tema() === 'dark'" (click)="auth.cambiarTema('dark')">Oscuro</button>
          </div>
        </div>
      }
    </header>

    <!-- Contenido Principal -->
    <main class="main-content">
      <div class="content-container">
        <router-outlet />
      </div>
    </main>

    <!-- Barra de Navegación Inferior Móvil -->
    <nav class="mobile-bottom-nav only-mobile">
      @for (m of auth.menu(); track m.ruta) {
        <a [routerLink]="m.ruta" routerLinkActive="on">
          @switch (m.icono) {
            @case ('pedidos') {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
            }
            @case ('despachos') {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="14" height="12" rx="1"/><polygon points="15 8 19 8 23 12 23 16 15 16 15 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            }
            @case ('productos') {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            }
            @case ('resumen') {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/></svg>
            }
            @case ('usuarios') {
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            }
          }
          <span>{{ m.texto }}</span>
        </a>
      }
    </nav>
  `,
  styles: [`
    :host {
      display: grid;
      grid-template-columns: 240px 1fr;
      min-height: 100vh;
      background: var(--bg);
    }

    .sidebar {
      background: var(--bg);
      border-right: 1px solid var(--line);
      display: flex;
      flex-direction: column;
      padding: 20px 16px;
      gap: 24px;
      position: sticky;
      top: 0;
      height: 100vh;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 4px;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      font-size: 13.5px;
      line-height: 1.25;
      color: var(--ink);
    }

    .brand-text strong {
      font-weight: 700;
    }

    .brand-text span {
      font-weight: 700;
    }

    .side-nav {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }

    .side-nav a {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--ink);
      text-decoration: none;
      padding: 10px 12px;
      border-radius: var(--r-s);
      font-size: 14.5px;
      font-weight: 500;
      transition: background 0.15s, color 0.15s;
    }

    .side-nav a:hover {
      background: var(--surface);
    }

    .side-nav a.on {
      background: var(--primary-soft);
      color: var(--primary);
      font-weight: 700;
    }

    .nav-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: currentColor;
    }

    .sidebar-footer {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .user-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r-m);
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: var(--primary-soft);
      color: var(--primary);
      font-weight: 700;
      font-size: 12.5px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .user-meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }

    .user-meta strong {
      font-size: 13px;
      color: var(--ink);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-meta small {
      font-size: 12px;
      color: var(--muted);
    }

    .logout-icon {
      background: transparent;
      border: none;
      color: var(--muted);
      cursor: pointer;
      padding: 6px;
      border-radius: var(--r-s);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .logout-icon:hover {
      background: var(--bg);
      color: var(--fram);
    }

    .main-content {
      background: var(--surface);
      min-height: 100vh;
      padding: 28px 32px;
    }

    .content-container {
      max-width: 1060px;
      margin: 0 auto;
    }

    @media (max-width: 768px) {
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }

      .mobile-topbar {
        background: var(--surface);
        border-bottom: 1px solid var(--line);
        padding: 10px 16px;
        position: sticky;
        top: 0;
        z-index: 50;
      }

      .mobile-top-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .mobile-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .mobile-sub {
        display: block;
        font-size: 11px;
        color: var(--muted);
      }

      .mobile-role {
        font-size: 14px;
        color: var(--ink);
      }

      .avatar-btn {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 1px solid var(--line);
        background: var(--primary-soft);
        color: var(--primary);
        font-weight: 700;
        font-size: 12px;
        cursor: pointer;
      }

      .mobile-user-drawer {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid var(--line);
      }

      .mobile-user-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .muted-sm {
        font-size: 12px;
        color: var(--muted);
      }

      .main-content {
        background: var(--bg);
        padding: 16px 14px 88px;
        flex: 1;
      }

      .mobile-bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: var(--surface);
        border-top: 1px solid var(--line);
        display: flex;
        justify-content: space-around;
        padding: 8px 6px;
        z-index: 50;
      }

      .mobile-bottom-nav a {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        color: var(--muted);
        font-size: 11.5px;
        font-weight: 600;
        padding: 4px 12px;
        border-radius: var(--r-s);
      }

      .mobile-bottom-nav a.on {
        color: var(--primary);
      }
    }
  `],
})
export class ShellComponent {
  auth = inject(AuthService);
  menuMovilAbierto = signal(false);
}
