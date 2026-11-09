import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, delay } from 'rxjs';
import { API_URL, USAR_MOCK } from '../config';
import {
  ActualizarPedidoDto,
  EstadoPedido,
  GuardarProductoDto,
  GuardarUsuarioDto,
  LoginResp,
  NuevoPedido,
  Pedido,
  Producto,
  ResumenPedidos,
  Rol,
  Usuario,
} from '../models';
import { PEDIDOS, PRODUCTOS, USUARIOS } from '../mock-data';

const STORAGE_KEYS = {
  productos: 'ld_productos_v3',
  pedidos: 'ld_pedidos_v3',
  usuarios: 'ld_usuarios_v3',
};

/**
 * Única puerta de entrada a los datos. Las pantallas SOLO llaman a este servicio.
 * Con USAR_MOCK=true funciona sin backend y persiste en localStorage;
 * con USAR_MOCK=false llama a la API REST de Spring Boot.
 * Los errores llegan como { error: { mensaje } } (mismo formato que ApiError del backend).
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private productos: Producto[] = this.cargarStorage(STORAGE_KEYS.productos, PRODUCTOS);
  private pedidos: Pedido[] = this.cargarStorage(STORAGE_KEYS.pedidos, PEDIDOS);
  private usuarios: (Usuario & { password: string })[] = this.cargarStorage(STORAGE_KEYS.usuarios, USUARIOS);

  private cargarStorage<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore storage errors
    }
    return structuredClone(fallback);
  }

  private guardarStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.productos, JSON.stringify(this.productos));
      localStorage.setItem(STORAGE_KEYS.pedidos, JSON.stringify(this.pedidos));
      localStorage.setItem(STORAGE_KEYS.usuarios, JSON.stringify(this.usuarios));
    } catch {
      // ignore storage errors
    }
  }

  private usuarioActual(): Usuario | null {
    try {
      const raw = sessionStorage.getItem('usuario');
      if (raw) return JSON.parse(raw) as Usuario;
    } catch {
      // ignore
    }
    return null;
  }

  private usuarioActualNombre(): string {
    return this.usuarioActual()?.nombre || 'Usuario actual';
  }

  private rolActual(): Rol | null {
    return this.usuarioActual()?.rol ?? null;
  }

  private err(mensaje: string, status = 409) {
    return throwError(() => ({ status, error: { status, mensaje } }));
  }

  private sim<T>(v: T) {
    return of(structuredClone(v)).pipe(delay(120));
  }

  // ==================== AUTENTICACIÓN (RF-20 / CU-12) ====================

  login(username: string, password: string): Observable<LoginResp> {
    if (!USAR_MOCK) {
      return this.http.post<LoginResp>(`${API_URL}/auth/login`, { username, password });
    }
    const cleanUser = username.trim().toLowerCase();
    const u = this.usuarios.find(x => x.username.toLowerCase() === cleanUser);
    if (!u || u.password !== password) {
      return this.err('Usuario o contraseña incorrectos.', 401);
    }
    if (!u.activo) {
      return this.err('Tu usuario está inactivo. Habla con el administrador.', 403);
    }
    const { password: _, ...usuario } = u;
    return this.sim({ token: 'mock-jwt-token-' + u.id, usuario: usuario as Usuario });
  }

  // ==================== PRODUCTOS (RF-01, RF-02, RF-14) ====================

  listarProductos(): Observable<Producto[]> {
    if (!USAR_MOCK) {
      return this.http.get<Producto[]>(`${API_URL}/productos`);
    }
    return this.sim(this.productos);
  }

  crearProducto(dto: GuardarProductoDto): Observable<Producto> {
    if (!USAR_MOCK) {
      return this.http.post<Producto>(`${API_URL}/productos`, dto);
    }
    const codigo = dto.codigo.trim().toUpperCase();
    const nombre = dto.nombre.trim();
    if (!codigo || !nombre) {
      return this.err('El código y el nombre del producto son obligatorios.', 400);
    }
    if (dto.precio <= 0) {
      return this.err('El precio unitario debe ser mayor que cero.', 400);
    }
    if (dto.existencias < 0 || !Number.isInteger(Number(dto.existencias))) {
      return this.err('Las existencias no pueden ser negativas.', 400);
    }
    if (this.productos.some(p => p.codigo.toUpperCase() === codigo)) {
      return this.err(`Ya existe un producto con el código ${codigo}.`, 409);
    }
    const nuevo: Producto = {
      id: Math.max(0, ...this.productos.map(p => p.id)) + 1,
      codigo,
      nombre,
      descripcion: dto.descripcion?.trim() || '',
      precio: Math.round(Number(dto.precio)),
      existencias: Number(dto.existencias),
      stockMinimo: dto.stockMinimo !== undefined ? Math.max(0, Number(dto.stockMinimo)) : 10,
      activo: true,
    };
    this.productos.push(nuevo);
    this.guardarStorage();
    return this.sim(nuevo);
  }

  editarProducto(id: number, dto: GuardarProductoDto): Observable<Producto> {
    if (!USAR_MOCK) {
      return this.http.put<Producto>(`${API_URL}/productos/${id}`, dto);
    }
    const prod = this.productos.find(p => p.id === id);
    if (!prod) return this.err('Producto no encontrado.', 404);
    const codigo = dto.codigo.trim().toUpperCase();
    const nombre = dto.nombre.trim();
    if (!codigo || !nombre) {
      return this.err('El código y el nombre del producto son obligatorios.', 400);
    }
    if (dto.precio <= 0) {
      return this.err('El precio unitario debe ser mayor que cero.', 400);
    }
    if (dto.existencias < 0 || !Number.isInteger(Number(dto.existencias))) {
      return this.err('Las existencias no pueden ser negativas.', 400);
    }
    if (this.productos.some(p => p.id !== id && p.codigo.toUpperCase() === codigo)) {
      return this.err(`Ya existe otro producto con el código ${codigo}.`, 409);
    }
    prod.codigo = codigo;
    prod.nombre = nombre;
    prod.descripcion = dto.descripcion?.trim() ?? prod.descripcion;
    prod.precio = Math.round(Number(dto.precio));
    prod.existencias = Number(dto.existencias);
    if (dto.stockMinimo !== undefined) {
      prod.stockMinimo = Math.max(0, Number(dto.stockMinimo));
    }
    this.guardarStorage();
    return this.sim(prod);
  }

  ajustarExistencias(id: number, existencias: number): Observable<Producto> {
    if (!USAR_MOCK) {
      return this.http.patch<Producto>(`${API_URL}/productos/${id}/existencias`, { existencias });
    }
    const prod = this.productos.find(p => p.id === id);
    if (!prod) return this.err('Producto no encontrado.', 404);
    if (existencias === null || existencias === undefined || isNaN(Number(existencias)) || Number(existencias) < 0 || !Number.isInteger(Number(existencias))) {
      return this.err('Las existencias no pueden ser negativas', 400);
    }
    prod.existencias = Number(existencias);
    this.guardarStorage();
    return this.sim(prod);
  }

  // ==================== PEDIDOS, RESUMEN Y DESPACHOS ====================

  listarPedidos(estado?: EstadoPedido): Observable<Pedido[]> {
    if (!USAR_MOCK) {
      return estado
        ? this.http.get<Pedido[]>(`${API_URL}/pedidos`, { params: { estado } })
        : this.http.get<Pedido[]>(`${API_URL}/pedidos`);
    }
    if (this.rolActual() === 'BODEGA') {
      return this.err('No tienes permisos para consultar el listado global de pedidos.', 403);
    }
    let lista = [...this.pedidos].sort((a, b) => b.id - a.id);
    if (estado) {
      lista = lista.filter(p => p.estado === estado);
    }
    return this.sim(lista);
  }

  listarDespachos(): Observable<Pedido[]> {
    if (!USAR_MOCK) {
      return this.http.get<Pedido[]>(`${API_URL}/despachos`);
    }
    const confirmados = this.pedidos
      .filter(p => p.estado === 'Confirmado')
      .sort((a, b) => a.id - b.id);
    return this.sim(confirmados);
  }

  obtenerResumen(): Observable<ResumenPedidos> {
    if (!USAR_MOCK) {
      return this.http.get<ResumenPedidos>(`${API_URL}/pedidos/resumen`);
    }
    const porEstado: Record<EstadoPedido, number> = {
      Pendiente: 0,
      Confirmado: 0,
      Despachado: 0,
      Rechazado: 0,
      Cancelado: 0,
    };
    for (const p of this.pedidos) {
      porEstado[p.estado] = (porEstado[p.estado] ?? 0) + 1;
    }
    return this.sim({
      total: this.pedidos.length,
      porEstado,
    });
  }

  obtenerPedido(id: number): Observable<Pedido> {
    if (!USAR_MOCK) {
      return this.http.get<Pedido>(`${API_URL}/pedidos/${id}`);
    }
    const p = this.pedidos.find(x => x.id === id);
    if (!p) return this.err('Pedido no encontrado.', 404);
    if (this.rolActual() === 'BODEGA' && p.estado !== 'Confirmado' && p.estado !== 'Despachado') {
      return this.err('Bodega solo puede consultar el detalle de pedidos en estado Confirmado o Despachado.', 403);
    }
    return this.sim(p);
  }

  crearPedido(n: NuevoPedido): Observable<Pedido> {
    if (!USAR_MOCK) {
      return this.http.post<Pedido>(`${API_URL}/pedidos`, n);
    }
    const cliente = (n.cliente ?? '').trim();
    const telefonoCliente = (n.telefonoCliente ?? '').trim();
    if (!cliente || !telefonoCliente) {
      return this.err('El nombre y contacto del cliente son obligatorios para registrar el pedido.', 400);
    }
    if (!n.lineas || n.lineas.length === 0) {
      return this.err('Debe agregar al menos un producto al pedido.', 400);
    }
    for (const l of n.lineas) {
      if (!l.cantidad || l.cantidad <= 0 || !Number.isInteger(Number(l.cantidad))) {
        return this.err('La cantidad de cada producto debe ser un entero mayor que cero.', 400);
      }
    }

    const lineas = n.lineas.map(l => {
      const pr = this.productos.find(p => p.id === l.idProducto)!;
      return {
        idProducto: pr.id,
        codigo: pr.codigo,
        nombre: pr.nombre,
        cantidad: Number(l.cantidad),
        precioUnitario: pr.precio,
        subtotal: pr.precio * Number(l.cantidad),
      };
    });
    const ahora = new Date().toISOString();
    const usuario = this.usuarioActualNombre();
    const p: Pedido = {
      id: Math.max(1000, ...this.pedidos.map(x => x.id)) + 1,
      cliente,
      telefonoCliente,
      estado: 'Pendiente',
      fecha: ahora,
      total: lineas.reduce((s, l) => s + l.subtotal, 0),
      vendedor: usuario,
      lineas,
      historial: [
        {
          estadoAnterior: null,
          estadoNuevo: 'Pendiente',
          motivo: 'Registro inicial del pedido',
          usuario,
          fecha: ahora,
        },
      ],
    };
    this.pedidos.unshift(p);
    this.guardarStorage();
    return this.sim(p);
  }

  actualizarPedido(id: number, dto: ActualizarPedidoDto): Observable<Pedido> {
    if (!USAR_MOCK) {
      return this.http.put<Pedido>(`${API_URL}/pedidos/${id}`, dto);
    }
    const p = this.pedidos.find(x => x.id === id);
    if (!p) return this.err('Pedido no encontrado.', 404);
    if (p.estado !== 'Pendiente') {
      return this.err('Solo se pueden editar los productos de un pedido en estado Pendiente.', 409);
    }
    if (!dto.lineas || dto.lineas.length === 0) {
      return this.err('El pedido debe conservar al menos un producto.', 400);
    }

    // Regla 4: solo se puede quitar productos o reducir cantidades respecto a las cantidades originales del pedido
    for (const l of dto.lineas) {
      if (!l.cantidad || l.cantidad <= 0 || !Number.isInteger(Number(l.cantidad))) {
        return this.err('La cantidad de cada línea debe ser un entero mayor que cero.', 400);
      }
      const lineaOriginal = p.lineas.find(orig => orig.idProducto === l.idProducto);
      if (!lineaOriginal) {
        return this.err('No se pueden agregar productos nuevos al editar un pedido pendiente.', 400);
      }
      if (l.cantidad > lineaOriginal.cantidad) {
        return this.err(`No puedes aumentar la cantidad de ${lineaOriginal.nombre}. Cantidad original: ${lineaOriginal.cantidad}, solicitaste: ${l.cantidad}. Solo se permite reducir o quitar productos.`, 409);
      }
    }

    const nuevasLineas = dto.lineas.map(l => {
      const previa = p.lineas.find(pl => pl.idProducto === l.idProducto)!;
      const cantidad = Number(l.cantidad);
      return {
        idProducto: l.idProducto,
        codigo: previa.codigo,
        nombre: previa.nombre,
        cantidad,
        precioUnitario: previa.precioUnitario,
        subtotal: previa.precioUnitario * cantidad,
      };
    });

    p.lineas = nuevasLineas;
    p.total = nuevasLineas.reduce((acc, item) => acc + item.subtotal, 0);
    p.historial.push({
      estadoAnterior: 'Pendiente',
      estadoNuevo: 'Pendiente',
      motivo: 'Ajuste de cantidades en pedido pendiente',
      usuario: this.usuarioActualNombre(),
      fecha: new Date().toISOString(),
    });
    this.guardarStorage();
    return this.sim(p);
  }

  confirmarPedido(id: number): Observable<Pedido> {
    if (!USAR_MOCK) {
      return this.http.post<Pedido>(`${API_URL}/pedidos/${id}/confirmar`, {});
    }
    const p = this.pedidos.find(x => x.id === id);
    if (!p) return this.err('Pedido no encontrado.', 404);
    if (p.estado !== 'Pendiente') {
      return this.err(`El pedido ya se encuentra en estado ${p.estado}.`, 409);
    }

    // Mensaje de existencias consolidado con el nombre de los productos que no alcanzan (Regla 2)
    const faltantes: string[] = [];
    for (const l of p.lineas) {
      const pr = this.productos.find(x => x.id === l.idProducto);
      const disp = pr ? pr.existencias : 0;
      if (disp < l.cantidad) {
        faltantes.push(`${l.nombre} (solicitaste ${l.cantidad}, disponibles ${disp})`);
      }
    }
    if (faltantes.length > 0) {
      return this.err(`No hay existencias suficientes para: ${faltantes.join('; ')}.`, 409);
    }

    for (const l of p.lineas) {
      const pr = this.productos.find(x => x.id === l.idProducto)!;
      pr.existencias -= l.cantidad;
    }
    const usuario = this.usuarioActualNombre();
    p.estado = 'Confirmado';
    p.historial.push({
      estadoAnterior: 'Pendiente',
      estadoNuevo: 'Confirmado',
      motivo: 'Confirmación y descuento de inventario',
      usuario,
      fecha: new Date().toISOString(),
    });
    this.guardarStorage();
    return this.sim(p);
  }

  rechazarPedido(id: number, motivo: string): Observable<Pedido> {
    if (!USAR_MOCK) {
      return this.http.post<Pedido>(`${API_URL}/pedidos/${id}/rechazar`, { motivo });
    }
    const p = this.pedidos.find(x => x.id === id);
    if (!p) return this.err('Pedido no encontrado.', 404);
    if (p.estado !== 'Pendiente') {
      return this.err('Solo se puede rechazar un pedido en estado Pendiente.', 409);
    }
    if (!motivo || !motivo.trim()) {
      return this.err('Debe seleccionar un motivo para rechazar el pedido.', 400);
    }
    const usuario = this.usuarioActualNombre();
    p.estado = 'Rechazado';
    p.historial.push({
      estadoAnterior: 'Pendiente',
      estadoNuevo: 'Rechazado',
      motivo: motivo.trim(),
      usuario,
      fecha: new Date().toISOString(),
    });
    this.guardarStorage();
    return this.sim(p);
  }

  /**
   * Regla 3: Cancelar ya NO sale de Pendiente.
   * Solo es posible desde Confirmado (devuelve existencias una sola vez).
   */
  cancelarPedido(id: number, motivo: string): Observable<Pedido> {
    if (!USAR_MOCK) {
      return this.http.post<Pedido>(`${API_URL}/pedidos/${id}/cancelar`, { motivo });
    }
    const p = this.pedidos.find(x => x.id === id);
    if (!p) return this.err('Pedido no encontrado.', 404);
    if (p.estado !== 'Confirmado') {
      return this.err(`No se puede cancelar un pedido en estado ${p.estado}. La cancelación solo está permitida para pedidos Confirmados.`, 409);
    }
    if (!motivo || !motivo.trim()) {
      return this.err('Debe seleccionar un motivo para cancelar el pedido.', 400);
    }

    for (const l of p.lineas) {
      const pr = this.productos.find(x => x.id === l.idProducto);
      if (pr) pr.existencias += l.cantidad;
    }
    const usuario = this.usuarioActualNombre();
    p.estado = 'Cancelado';
    p.historial.push({
      estadoAnterior: 'Confirmado',
      estadoNuevo: 'Cancelado',
      motivo: motivo.trim(),
      usuario,
      fecha: new Date().toISOString(),
    });
    this.guardarStorage();
    return this.sim(p);
  }

  despacharPedido(id: number): Observable<Pedido> {
    if (!USAR_MOCK) {
      return this.http.post<Pedido>(`${API_URL}/pedidos/${id}/despachar`, null);
    }
    const p = this.pedidos.find(x => x.id === id);
    if (!p) return this.err('Pedido no encontrado.', 404);
    if (p.estado !== 'Confirmado') {
      return this.err(`No se puede despachar un pedido en estado ${p.estado}.`, 409);
    }
    const usuario = this.usuarioActualNombre();
    p.estado = 'Despachado';
    p.historial.push({
      estadoAnterior: 'Confirmado',
      estadoNuevo: 'Despachado',
      motivo: 'Despacho completado en bodega',
      usuario,
      fecha: new Date().toISOString(),
    });
    this.guardarStorage();
    return this.sim(p);
  }

  // ==================== USUARIOS ====================

  listarUsuarios(): Observable<Usuario[]> {
    if (!USAR_MOCK) {
      return this.http.get<Usuario[]>(`${API_URL}/usuarios`);
    }
    const vistos = new Set<string>();
    const lista: Usuario[] = [];
    for (const { password: _, ...u } of this.usuarios) {
      if (!vistos.has(u.username)) {
        vistos.add(u.username);
        lista.push(u as Usuario);
      }
    }
    return this.sim(lista);
  }

  crearUsuario(dto: GuardarUsuarioDto): Observable<Usuario> {
    if (!USAR_MOCK) {
      return this.http.post<Usuario>(`${API_URL}/usuarios`, dto);
    }
    const nombre = dto.nombre.trim();
    const username = dto.username.trim().toLowerCase();
    const password = (dto.password ?? '').trim();
    if (!nombre || !username) {
      return this.err('El nombre completo y el nombre de usuario son obligatorios.', 400);
    }
    if (password.length < 4) {
      return this.err('La contraseña temporal debe tener al menos 4 caracteres.', 400);
    }
    if (this.usuarios.some(u => u.username.toLowerCase() === username)) {
      return this.err(`El nombre de usuario "${username}" ya está registrado.`, 409);
    }
    const nuevo: Usuario & { password: string } = {
      id: Math.max(0, ...this.usuarios.map(u => u.id)) + 1,
      nombre,
      username,
      rol: dto.rol,
      activo: true,
      fechaRetiro: null,
      password,
    };
    this.usuarios.push(nuevo);
    this.guardarStorage();
    const { password: _, ...sinPass } = nuevo;
    return this.sim(sinPass);
  }

  editarUsuario(id: number, dto: GuardarUsuarioDto): Observable<Usuario> {
    if (!USAR_MOCK) {
      return this.http.put<Usuario>(`${API_URL}/usuarios/${id}`, dto);
    }
    const u = this.usuarios.find(x => x.id === id);
    if (!u) return this.err('Usuario no encontrado.', 404);
    const nombre = dto.nombre.trim();
    const username = dto.username.trim().toLowerCase();
    if (!nombre || !username) {
      return this.err('El nombre completo y el nombre de usuario son obligatorios.', 400);
    }
    if (this.usuarios.some(x => x.id !== id && x.username.toLowerCase() === username)) {
      return this.err(`El nombre de usuario "${username}" ya está en uso.`, 409);
    }
    if (u.rol === 'ADMINISTRADOR' && dto.rol !== 'ADMINISTRADOR' && u.activo) {
      const adminsActivos = this.usuarios.filter(x => x.rol === 'ADMINISTRADOR' && x.activo).length;
      if (adminsActivos <= 1) {
        return this.err('No se puede cambiar el rol al último Administrador activo.', 409);
      }
    }
    u.nombre = nombre;
    u.username = username;
    u.rol = dto.rol;
    if (dto.password && dto.password.trim().length >= 4) {
      u.password = dto.password.trim();
    }
    this.guardarStorage();
    const { password: _, ...sinPass } = u;
    return this.sim(sinPass);
  }

  cambiarEstadoUsuario(id: number, activo: boolean): Observable<Usuario> {
    if (!USAR_MOCK) {
      return this.http.patch<Usuario>(`${API_URL}/usuarios/${id}/estado`, { activo });
    }
    const u = this.usuarios.find(x => x.id === id);
    if (!u) return this.err('Usuario no encontrado.', 404);
    if (!activo && u.rol === 'ADMINISTRADOR' && u.activo) {
      const adminsActivos = this.usuarios.filter(x => x.rol === 'ADMINISTRADOR' && x.activo).length;
      if (adminsActivos <= 1) {
        return this.err('No se puede desactivar al último Administrador activo.', 409);
      }
    }
    u.activo = activo;
    u.fechaRetiro = activo ? null : new Date().toISOString();
    this.guardarStorage();
    const { password: _, ...sinPass } = u;
    return this.sim(sinPass);
  }
}
