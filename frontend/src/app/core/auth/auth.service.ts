import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { Rol, Usuario } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  readonly usuario = signal<Usuario | null>(this.leer());
  readonly rol = computed(() => this.usuario()?.rol ?? null);

  /** Menú por rol (RF-18): Vendedor = Pedidos/Productos/Resumen; Admin = + Usuarios; Bodega = Despachos/Productos */
  readonly menu = computed(() => {
    const todos = [
      { ruta: '/pedidos', texto: 'Pedidos', roles: ['ADMINISTRADOR', 'VENDEDOR'] },
      { ruta: '/despachos', texto: 'Despachos', roles: ['BODEGA'] },
      { ruta: '/productos', texto: 'Productos', roles: ['ADMINISTRADOR', 'VENDEDOR', 'BODEGA'] },
      { ruta: '/resumen', texto: 'Resumen', roles: ['ADMINISTRADOR', 'VENDEDOR'] },
      { ruta: '/usuarios', texto: 'Usuarios', roles: ['ADMINISTRADOR'] },
    ];
    const r = this.rol();
    return todos.filter(m => r && m.roles.includes(r));
  });

  entrarCon(username: string, password: string, alError: (m: string) => void) {
    this.api.login(username, password).subscribe({
      error: e => alError(e?.error?.mensaje ?? 'No se pudo iniciar sesión.'),
      next: r => { this.usuario.set(r.usuario); sessionStorage.setItem('usuario', JSON.stringify(r.usuario)); sessionStorage.setItem('token', r.token); this.router.navigate([this.inicio(r.usuario.rol)]); },
    });
  }
  inicio(rol: Rol) { return rol === 'BODEGA' ? '/despachos' : '/pedidos'; }
  salir() { this.usuario.set(null); sessionStorage.clear(); this.router.navigate(['/login']); }
  private leer(): Usuario | null { try { return JSON.parse(sessionStorage.getItem('usuario') ?? 'null'); } catch { return null; } }
}
