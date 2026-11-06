export type Rol = 'ADMINISTRADOR' | 'VENDEDOR' | 'BODEGA';
export type EstadoPedido = 'Pendiente' | 'Confirmado' | 'Despachado' | 'Rechazado' | 'Cancelado';
export type TemaModo = 'system' | 'light' | 'dark';

export const MOTIVOS = [
  'Existencias insuficientes',
  'Error de captura',
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
