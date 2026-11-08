import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { Rol, TemaModo, Usuario } from '../models';

export interface ItemMenu {
  ruta: string;
  texto: string;
  icono: 'pedidos' | 'despachos' | 'productos' | 'resumen' | 'usuarios';
  roles: Rol[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  readonly usuario = signal<Usuario | null>(this.leerUsuario());
  readonly rol = computed(() => this.usuario()?.rol ?? null);
  readonly tema = signal<TemaModo>(this.leerTema());

  /** Menú por rol (RF-18): Vendedor = Pedidos/Productos/Resumen; Admin = + Usuarios; Bodega = Despachos/Productos */
  readonly menu = computed<ItemMenu[]>(() => {
    const todos: ItemMenu[] = [
      { ruta: '/pedidos', texto: 'Pedidos', icono: 'pedidos', roles: ['ADMINISTRADOR', 'VENDEDOR'] },
      { ruta: '/despachos', texto: 'Despachos', icono: 'despachos', roles: ['BODEGA'] },
      { ruta: '/productos', texto: 'Productos', icono: 'productos', roles: ['ADMINISTRADOR', 'VENDEDOR', 'BODEGA'] },
      { ruta: '/resumen', texto: 'Resumen', icono: 'resumen', roles: ['ADMINISTRADOR', 'VENDEDOR'] },
      { ruta: '/usuarios', texto: 'Usuarios', icono: 'usuarios', roles: ['ADMINISTRADOR'] },
    ];
    const r = this.rol();
    return todos.filter(m => r && m.roles.includes(r));
  });

  readonly iniciales = computed(() => {
    const nombre = this.usuario()?.nombre ?? '';
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return 'LD';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
  });

  readonly etiquetaRol = computed(() => {
    const r = this.rol();
    if (r === 'ADMINISTRADOR') return 'Administrador';
    if (r === 'VENDEDOR') return 'Vendedor';
    if (r === 'BODEGA') return 'Bodega';
    return '';
  });

  constructor() {
    this.aplicarTema(this.tema());
  }

  cambiarTema(modo: TemaModo) {
    this.tema.set(modo);
    try {
      localStorage.setItem('ld_tema', modo);
    } catch {
      // ignore
    }
    this.aplicarTema(modo);
  }

  private aplicarTema(modo: TemaModo) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (modo === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', modo);
    }
  }

  entrarCon(username: string, password: string, alError: (m: string) => void) {
    this.api.login(username, password).subscribe({
      error: e => alError(e?.error?.mensaje ?? 'No se pudo iniciar sesión.'),
      next: r => {
        this.usuario.set(r.usuario);
        try {
          sessionStorage.setItem('usuario', JSON.stringify(r.usuario));
          sessionStorage.setItem('token', r.token);
        } catch {
          // ignore
        }
        this.router.navigate([this.inicio(r.usuario.rol)]);
      },
    });
  }

  inicio(rol: Rol) {
    return rol === 'BODEGA' ? '/despachos' : '/pedidos';
  }

  salir() {
    this.usuario.set(null);
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
    this.router.navigate(['/login']);
  }

  private leerUsuario(): Usuario | null {
    try {
      return JSON.parse(sessionStorage.getItem('usuario') ?? 'null');
    } catch {
      return null;
    }
  }

  private leerTema(): TemaModo {
    try {
      const t = localStorage.getItem('ld_tema');
      if (t === 'light' || t === 'dark' || t === 'system') return t;
    } catch {
      // ignore
    }
    return 'system';
  }
}
