import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="wrap">
      <form class="card" (ngSubmit)="entrar()">
        <h1>La Dorada</h1>
        <label for="u">Usuario</label>
        <input id="u" name="u" [(ngModel)]="username" autocomplete="username" required>
        <label for="p">Contraseña</label>
        <input id="p" name="p" type="password" [(ngModel)]="password" autocomplete="current-password" required>
        @if (error()) { <div class="error">{{ error() }}</div> }
        <button class="btn" type="submit" [disabled]="!username || !password">Ingresar</button>
        <small>Demo: mrojas / lgomez / msalazar — clave 1234</small>
      </form>
    </div>
  `,
  styles: [`
    .wrap { min-height: 100vh; display: grid; place-items: center; padding: 16px; }
    form { width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 10px; }
    small { color: var(--muted); }
  `],
})
export class LoginComponent {
  private auth = inject(AuthService);
  username = ''; password = ''; error = signal('');
  entrar() {
    this.error.set('');
    this.auth.entrarCon(this.username, this.password, m => this.error.set(m));
  }
}
