import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, delay } from 'rxjs';
import { API_URL, USAR_MOCK } from '../config';
import { LoginResp, NuevoPedido, Pedido, Producto, Usuario } from '../models';
import { PEDIDOS, PRODUCTOS, USUARIOS } from '../mock-data';

/**
 * Única puerta de entrada a los datos. Las pantallas SOLO llaman a este servicio.
 * Con USAR_MOCK=true funciona sin backend; con false llama a la API (contrato en el plan de sprints).
 * Los errores llegan como { error: { mensaje } } (mismo formato que ApiError del backend).
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private productos = structuredClone(PRODUCTOS);
  private pedidos = structuredClone(PEDIDOS);

  private err(mensaje: string, status = 409) { return throwError(() => ({ status, error: { status, mensaje } })); }
  private sim<T>(v: T) { return of(v).pipe(delay(250)); }

  login(username: string, password: string): Observable<LoginResp> {
    if (!USAR_MOCK) return this.http.post<LoginResp>(`${API_URL}/auth/login`, { username, password });
    const u = USUARIOS.find(x => x.username === username && x.password === password && x.activo);
    if (!u) return this.err('Usuario o contraseña incorrectos.', 401);
    const { password: _, ...usuario } = u;
    return this.sim({ token: 'mock-token', usuario: usuario as Usuario });
  }

  listarProductos(): Observable<Producto[]> {
    return USAR_MOCK ? this.sim(this.productos) : this.http.get<Producto[]>(`${API_URL}/productos`);
  }

  listarPedidos(): Observable<Pedido[]> {
    return USAR_MOCK ? this.sim(this.pedidos) : this.http.get<Pedido[]>(`${API_URL}/pedidos`);
  }

  obtenerPedido(id: number): Observable<Pedido> {
    if (!USAR_MOCK) return this.http.get<Pedido>(`${API_URL}/pedidos/${id}`);
    const p = this.pedidos.find(x => x.id === id);
    return p ? this.sim(p) : this.err('Pedido no encontrado.', 404);
  }

  crearPedido(n: NuevoPedido): Observable<Pedido> {
    if (!USAR_MOCK) return this.http.post<Pedido>(`${API_URL}/pedidos`, n);
    const lineas = n.lineas.map(l => {
      const pr = this.productos.find(p => p.id === l.idProducto)!;
      return { idProducto: pr.id, nombre: pr.nombre, cantidad: l.cantidad, precioUnitario: pr.precio, subtotal: pr.precio * l.cantidad };
    });
    const ahora = new Date().toISOString();
    const p: Pedido = {
      id: Math.max(...this.pedidos.map(x => x.id)) + 1, cliente: n.cliente, estado: 'Pendiente', fecha: ahora,
      total: lineas.reduce((s, l) => s + l.subtotal, 0), vendedor: 'Usuario actual', lineas,
      historial: [{ estadoAnterior: null, estadoNuevo: 'Pendiente', motivo: 'Registro inicial del pedido', usuario: 'Usuario actual', fecha: ahora }],
    };
    this.pedidos.unshift(p);
    return this.sim(p);
  }

  confirmarPedido(id: number): Observable<Pedido> {
    if (!USAR_MOCK) return this.http.post<Pedido>(`${API_URL}/pedidos/${id}/confirmar`, {});
    const p = this.pedidos.find(x => x.id === id)!;
    for (const l of p.lineas) {
      const pr = this.productos.find(x => x.id === l.idProducto)!;
      if (pr.existencias < l.cantidad)
        return this.err(`No hay existencias suficientes: solicitaste ${l.cantidad}, disponibles ${pr.existencias}.`);
    }
    for (const l of p.lineas) this.productos.find(x => x.id === l.idProducto)!.existencias -= l.cantidad;
    p.estado = 'Confirmado';
    p.historial.push({ estadoAnterior: 'Pendiente', estadoNuevo: 'Confirmado', motivo: 'Confirmación de pedido', usuario: 'Usuario actual', fecha: new Date().toISOString() });
    return this.sim(p);
  }

  // rechazar / cancelar / despachar: mismo patrón. Max los completa en el Sprint 2-3 (ver contrato).
}
