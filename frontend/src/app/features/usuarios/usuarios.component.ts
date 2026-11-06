import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Rol, Usuario } from '../../core/models';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1>Usuarios</h1>
      <button type="button" class="btn only-desktop" (click)="iniciarNuevo()">+ Nuevo usuario</button>
    </div>

    @if (error()) {
      <div class="error" style="margin-bottom: 14px;" role="alert">{{ error() }}</div>
    }

    @if (mensajeOk()) {
      <div class="toast-ok" style="margin-bottom: 14px;">{{ mensajeOk() }}</div>
    }

    <!-- Tabla de Usuarios (Escritorio) -->
    <div class="table-wrap only-desktop">
      <table>
        <thead>
          <tr>
            <th>Nombre y usuario</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Retiro</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          @for (u of usuarios(); track u.id) {
            <tr>
              <td>
                <strong>{{ u.nombre }}</strong>
                <div class="username-sub">{{ u.username }}</div>
              </td>
              <td>{{ etiquetaRol(u.rol) }}</td>
              <td>
                <span class="badge" [class]="u.activo ? 'Activo' : 'Inactivo'">
                  {{ u.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="retiro-cell">
                {{ u.fechaRetiro ? formatearFecha(u.fechaRetiro) : '—' }}
              </td>
              <td>
                <div class="actions-cell">
                  @if (u.activo) {
                    <button type="button" class="btn sec sm" (click)="iniciarEdicion(u)">Editar</button>
                    @if (!esUltimoAdmin(u)) {
                      <button type="button" class="btn danger-outline sm" (click)="cambiarEstado(u, false)">Desactivar</button>
                    }
                  } @else {
                    <button type="button" class="btn sec sm" (click)="cambiarEstado(u, true)">Reactivar</button>
                  }
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Tarjetas de Usuarios (Móvil) -->
    <div class="mobile-users only-mobile">
      @for (u of usuarios(); track u.id) {
        <div class="user-item-card">
          <div class="user-item-top">
            <div>
              <strong>{{ u.nombre }}</strong>
              <div class="username-sub">
                {{ etiquetaRol(u.rol) }} · {{ u.username }}
                @if (u.fechaRetiro) {
                  · retiro {{ formatearFecha(u.fechaRetiro) }}
                }
              </div>
            </div>
            <span class="badge" [class]="u.activo ? 'Activo' : 'Inactivo'">
              {{ u.activo ? 'Activo' : 'Inactivo' }}
            </span>
          </div>

          <div class="user-item-actions">
            @if (u.activo) {
              <button type="button" class="btn sec sm" style="flex: 1;" (click)="iniciarEdicion(u)">Editar</button>
              @if (!esUltimoAdmin(u)) {
                <button type="button" class="btn danger-outline sm" style="flex: 1;" (click)="cambiarEstado(u, false)">Desactivar</button>
              }
            } @else {
              <button type="button" class="btn sec sm" style="width: 100%;" (click)="cambiarEstado(u, true)">Reactivar</button>
            }
          </div>
        </div>
      }
    </div>

    <!-- Formulario de Nuevo / Editar Usuario (Mockup 7) -->
    @if (mostrarFormulario()) {
      <section class="card form-panel" id="form-usuario">
        <h2>{{ editandoId() ? 'Editar usuario' : 'Nuevo usuario' }}</h2>

        <form (ngSubmit)="guardar()" class="user-form">
          <div class="form-grid-2">
            <div>
              <label for="usr-nombre">Nombre completo</label>
              <input
                id="usr-nombre"
                name="nombre"
                [(ngModel)]="formNombre"
                placeholder="Nombre y apellido"
                required
              >
            </div>
            <div>
              <label for="usr-login">Nombre de usuario</label>
              <input
                id="usr-login"
                name="username"
                [(ngModel)]="formUsername"
                placeholder="ej. mperez"
                required
              >
            </div>
          </div>

          <div class="form-grid-2">
            <div>
              <label for="usr-rol">Rol</label>
              <select id="usr-rol" name="rol" [(ngModel)]="formRol">
                <option value="VENDEDOR">Vendedor</option>
                <option value="BODEGA">Bodega</option>
                <option value="ADMINISTRADOR">Administrador</option>
              </select>
            </div>
            <div>
              <label for="usr-pass">
                {{ editandoId() ? 'Nueva contraseña (opcional)' : 'Contraseña temporal' }}
              </label>
              <input
                id="usr-pass"
                name="password"
                type="password"
                [(ngModel)]="formPassword"
                placeholder="Mínimo 8 caracteres"
                [required]="!editandoId()"
              >
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn sec" (click)="cancelarFormulario()">Cancelar</button>
            <button type="submit" class="btn">
              {{ editandoId() ? 'Guardar cambios' : 'Crear usuario' }}
            </button>
          </div>
        </form>
      </section>
    }

    <p class="caption-note">
      No se puede desactivar al último Administrador. Un usuario inactivo no puede iniciar sesión, pero sus pedidos y cambios siguen a su nombre.
    </p>

    <button type="button" class="fab-btn only-mobile" (click)="iniciarNuevo()" title="Nuevo usuario">+</button>
  `,
  styles: [`
    .username-sub {
      font-size: 12.5px;
      color: var(--muted);
      margin-top: 2px;
    }

    .retiro-cell {
      color: var(--muted);
    }

    .actions-cell {
      display: flex;
      gap: 8px;
    }

    .form-panel {
      margin-top: 18px;
    }

    .user-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 4px;
    }

    .mobile-users {
      display: none;
      flex-direction: column;
      gap: 10px;
    }

    .user-item-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r-m);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .user-item-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }

    .user-item-actions {
      display: flex;
      gap: 8px;
    }

    .fab-btn {
      position: fixed;
      right: 20px;
      bottom: 76px;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--primary);
      color: var(--on-primary);
      border: none;
      font-size: 28px;
      box-shadow: 0 6px 18px rgba(10, 108, 138, 0.35);
      cursor: pointer;
      z-index: 40;
    }

    @media (max-width: 768px) {
      .mobile-users {
        display: flex;
      }

      .form-grid-2 {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class UsuariosComponent implements OnInit {
  private api = inject(ApiService);

  usuarios = signal<Usuario[]>([]);
  mostrarFormulario = signal(true);
  editandoId = signal<number | null>(null);
  error = signal('');
  mensajeOk = signal('');

  formNombre = '';
  formUsername = '';
  formRol: Rol = 'VENDEDOR';
  formPassword = '';

  readonly totalAdminsActivos = computed(() => {
    return this.usuarios().filter(u => u.rol === 'ADMINISTRADOR' && u.activo).length;
  });

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.listarUsuarios().subscribe(lista => this.usuarios.set(lista));
  }

  esUltimoAdmin(u: Usuario): boolean {
    return u.rol === 'ADMINISTRADOR' && u.activo && this.totalAdminsActivos() <= 1;
  }

  etiquetaRol(rol: Rol): string {
    if (rol === 'ADMINISTRADOR') return 'Administrador';
    if (rol === 'VENDEDOR') return 'Vendedor';
    return 'Bodega';
  }

  iniciarNuevo() {
    this.error.set('');
    this.editandoId.set(null);
    this.formNombre = '';
    this.formUsername = '';
    this.formRol = 'VENDEDOR';
    this.formPassword = '';
    this.mostrarFormulario.set(true);
  }

  iniciarEdicion(u: Usuario) {
    this.error.set('');
    this.editandoId.set(u.id);
    this.formNombre = u.nombre;
    this.formUsername = u.username;
    this.formRol = u.rol;
    this.formPassword = '';
    this.mostrarFormulario.set(true);
  }

  cancelarFormulario() {
    this.error.set('');
    this.editandoId.set(null);
    this.formNombre = '';
    this.formUsername = '';
    this.formRol = 'VENDEDOR';
    this.formPassword = '';
  }

  guardar() {
    this.error.set('');
    const id = this.editandoId();
    const dto = {
      nombre: this.formNombre,
      username: this.formUsername,
      rol: this.formRol,
      password: this.formPassword,
    };
    const obs = id ? this.api.editarUsuario(id, dto) : this.api.crearUsuario(dto);
    obs.subscribe({
      error: e => this.error.set(e?.error?.mensaje ?? 'No fue posible guardar el usuario.'),
      next: u => {
        this.cargar();
        this.cancelarFormulario();
        this.mostrarOk(id ? `Usuario ${u.username} actualizado.` : `Usuario ${u.username} creado.`);
      },
    });
  }

  cambiarEstado(u: Usuario, activo: boolean) {
    this.error.set('');
    this.api.cambiarEstadoUsuario(u.id, activo).subscribe({
      error: e => this.error.set(e?.error?.mensaje ?? 'No fue posible cambiar el estado del usuario.'),
      next: actualizado => {
        this.cargar();
        this.mostrarOk(
          actualizado.activo
            ? `Usuario ${actualizado.nombre} reactivado.`
            : `Usuario ${actualizado.nombre} pasado a Inactivo.`
        );
      },
    });
  }

  formatearFecha(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  private mostrarOk(msg: string) {
    this.mensajeOk.set(msg);
    setTimeout(() => this.mensajeOk.set(''), 3500);
  }
}
