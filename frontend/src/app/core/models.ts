export type Rol = 'ADMINISTRADOR' | 'VENDEDOR' | 'BODEGA';
export type EstadoPedido = 'Pendiente' | 'Confirmado' | 'Despachado' | 'Rechazado' | 'Cancelado';
export const MOTIVOS = ['Existencias insuficientes', 'Error de captura', 'El cliente desiste', 'Sin existencia física', 'Otro'] as const;

export interface Usuario { id: number; nombre: string; username: string; rol: Rol; activo: boolean; telefono?: string; }
export interface Producto { id: number; codigo: string; nombre: string; precio: number; existencias: number; activo: boolean; }
export interface LineaPedido { idProducto: number; nombre: string; cantidad: number; precioUnitario: number; subtotal: number; }
export interface HistorialEstado { estadoAnterior: EstadoPedido | null; estadoNuevo: EstadoPedido; motivo: string; usuario: string; fecha: string; }
export interface Pedido {
  id: number; cliente: string; estado: EstadoPedido; fecha: string; total: number; vendedor: string;
  lineas: LineaPedido[]; historial: HistorialEstado[];
}
export interface NuevoPedido { cliente: string; lineas: { idProducto: number; cantidad: number }[]; }
export interface LoginResp { token: string; usuario: Usuario; }
