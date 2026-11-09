export type Rol = 'ADMINISTRADOR' | 'VENDEDOR' | 'BODEGA';
export type EstadoPedido = 'Pendiente' | 'Confirmado' | 'Despachado' | 'Rechazado' | 'Cancelado';
export type TemaModo = 'system' | 'light' | 'dark';

/** Motivos separados por acción (Sprint 3 - Ajustes pre-congelamiento) */
export const MOTIVOS_RECHAZO = [
  'Existencias insuficientes',
  'Otro',
] as const;

export const MOTIVOS_CANCELACION = [
  'El cliente desiste',
  'Sin existencia física',
  'Otro',
] as const;

export const MOTIVOS = [
  'Existencias insuficientes',
  'El cliente desiste',
  'Sin existencia física',
  'Otro',
] as const;

export interface Usuario {
  id: number;
  nombre: string;
  username: string;
  rol: Rol;
  activo: boolean;
  telefono?: string;
  fechaRetiro?: string | null;
}

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  existencias: number;
  stockMinimo?: number;
  activo: boolean;
}

export interface LineaPedido {
  idProducto: number;
  codigo?: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface HistorialEstado {
  estadoAnterior: EstadoPedido | null;
  estadoNuevo: EstadoPedido;
  motivo: string;
  usuario: string;
  fecha: string;
}

export interface Pedido {
  id: number;
  cliente: string;
  telefonoCliente?: string;
  estado: EstadoPedido;
  fecha: string;
  total: number;
  vendedor: string;
  lineas: LineaPedido[];
  historial: HistorialEstado[];
}

export interface NuevoPedido {
  cliente: string;
  telefonoCliente: string;
  lineas: { idProducto: number; cantidad: number }[];
}

export interface ActualizarPedidoDto {
  lineas: { idProducto: number; cantidad: number }[];
}

export interface ResumenPedidos {
  total: number;
  porEstado: Record<EstadoPedido, number>;
}

export interface GuardarProductoDto {
  codigo: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  existencias: number;
  stockMinimo?: number;
}

export interface GuardarUsuarioDto {
  nombre: string;
  username: string;
  rol: Rol;
  password?: string;
}

export interface LoginResp {
  token: string;
  usuario: Usuario;
}
