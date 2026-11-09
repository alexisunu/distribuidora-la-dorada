import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="login-shell">
        <!-- Panel Izquierdo de Marca (Escritorio y Banner Móvil) -->
        <section class="hero-panel">
          <div class="hero-brand">
            <img src="assets/logo/logo.png" alt="Distribuidora La Dorada S.A.S" class="ld-logo">
            <div class="hero-brand-text">
              <strong>Distribuidora</strong>
              <span>La Dorada S.A.S</span>
            </div>
          </div>

          <div class="hero-copy">
            <h2>Pedidos e inventario de productos de limpieza.</h2>
            <p class="only-desktop">Un solo registro para ventas, bodega y administración.</p>
          </div>

          <div class="hero-circles" aria-hidden="true"></div>
        </section>

        <!-- Panel Derecho de Formulario -->
        <section class="form-panel">
          <form class="login-form" (ngSubmit)="entrar()" novalidate>
            <h1>Iniciar sesión</h1>
            <p class="subtitle">Ingresa con tu usuario del sistema.</p>

            @if (error()) {
              <div class="error" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{{ error() }}</span>
              </div>
            }

            <div class="field">
              <label for="u">Usuario</label>
              <input
                id="u"
                name="u"
                [(ngModel)]="username"
                [class.input-error]="!!error()"
                autocomplete="username"
                placeholder="vendedor1, bodega1 o admin"
                required
              >
            </div>

            <div class="field">
              <label for="p">Contraseña</label>
              <input
                id="p"
                name="p"
                type="password"
                [(ngModel)]="password"
                [class.input-error]="!!error()"
                autocomplete="current-password"
                placeholder="••••••••"
                required
              >
            </div>

            <button class="btn submit-btn" type="submit">Ingresar</button>

            <div class="theme-row">
              <div class="theme-switch" role="group" aria-label="Selector de tema">
                <button type="button" [class.active]="auth.tema() === 'system'" (click)="auth.cambiarTema('system')">Sistema</button>
                <button type="button" [class.active]="auth.tema() === 'light'" (click)="auth.cambiarTema('light')">Claro</button>
                <button type="button" [class.active]="auth.tema() === 'dark'" (click)="auth.cambiarTema('dark')">Oscuro</button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      background: var(--bg);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .login-shell {
      width: 100%;
      max-width: 960px;
      min-height: 600px;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r-l);
      overflow: hidden;
      display: grid;
      grid-template-columns: 380px 1fr;
      box-shadow: 0 12px 32px rgba(7, 62, 82, 0.08);
    }

    .hero-panel {
      background: #073E52;
      color: #FFFFFF;
      padding: 36px 32px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }

    .hero-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      position: relative;
      z-index: 2;
    }

    .hero-brand-text {
      display: flex;
      flex-direction: column;
      font-size: 14px;
      line-height: 1.25;
    }

    .hero-brand-text strong,
    .hero-brand-text span {
      font-weight: 700;
    }

    .hero-copy {
      position: relative;
      z-index: 2;
    }

    .hero-copy h2 {
      color: #FFFFFF;
      font-size: 28px;
      line-height: 1.18;
      margin: 0 0 12px;
      font-weight: 700;
    }

    .hero-copy p {
      color: #B9DAE6;
      font-size: 14px;
      margin: 0;
      line-height: 1.45;
    }

    .hero-circles {
      position: absolute;
      width: 340px;
      height: 340px;
      border-radius: 50%;
      border: 42px solid rgba(10, 108, 138, 0.28);
      bottom: -110px;
      right: -110px;
      pointer-events: none;
    }

    .hero-circles::after {
      content: '';
      position: absolute;
      inset: 34px;
      border-radius: 50%;
      border: 28px solid rgba(10, 108, 138, 0.22);
    }

    .form-panel {
      padding: 48px 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface);
    }

    .login-form {
      width: 100%;
      max-width: 360px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .subtitle {
      margin: -10px 0 4px;
      color: var(--muted);
      font-size: 14px;
    }

    .field {
      display: flex;
      flex-direction: column;
    }

    .submit-btn {
      width: 100%;
      padding: 11px 16px;
      font-size: 15px;
      margin-top: 4px;
    }

    .theme-row {
      margin-top: 8px;
    }

    @media (max-width: 768px) {
      .login-page {
        padding: 0;
        align-items: stretch;
      }

      .login-shell {
        grid-template-columns: 1fr;
        border-radius: 0;
        border: none;
        min-height: 100vh;
      }

      .hero-panel {
        padding: 28px 24px;
        min-height: 180px;
      }

      .hero-copy h2 {
        font-size: 20px;
        margin: 18px 0 0;
      }

      .form-panel {
        padding: 28px 22px;
        align-items: flex-start;
      }
    }
  `],
})
export class LoginComponent {
  auth = inject(AuthService);
  username = '';
  password = '';
  error = signal('');

  entrar() {
    this.error.set('');
    if (!this.username.trim() || !this.password) {
      this.error.set('Usuario o contraseña incorrectos.');
      return;
    }
    this.auth.entrarCon(this.username, this.password, m => this.error.set(m));
  }
}
