import { Pedido, Producto, Usuario } from './models';

export const USUARIOS: (Usuario & { password: string })[] = [
  { id: 1, nombre: 'María Rojas', username: 'mrojas', rol: 'ADMINISTRADOR', activo: true, password: '1234' },
  { id: 2, nombre: 'Laura Gómez', username: 'lgomez', rol: 'VENDEDOR', activo: true, password: '1234' },
  { id: 3, nombre: 'Camilo Ruiz', username: 'cruiz', rol: 'VENDEDOR', activo: true, password: '1234' },
  { id: 4, nombre: 'Marta Salazar', username: 'msalazar', rol: 'BODEGA', activo: true, password: '1234' },
];

// Mismos datos del escenario de prueba TC-01: Detergente 20 y Jabón 8
export const PRODUCTOS: Producto[] = [
  { id: 1, codigo: 'DET-001', nombre: 'Detergente en polvo 1kg', precio: 8500, existencias: 20, activo: true },
  { id: 2, codigo: 'JAB-001', nombre: 'Jabón de barra x3', precio: 6200, existencias: 8, activo: true },
  { id: 3, codigo: 'SUA-001', nombre: 'Suavizante 2L', precio: 14900, existencias: 35, activo: true },
  { id: 4, codigo: 'ARR-001', nombre: 'Arroz 5kg', precio: 21500, existencias: 60, activo: true },
];

export const PEDIDOS: Pedido[] = [
  {
    id: 1041, cliente: 'Tienda El Ahorro', estado: 'Confirmado', fecha: '2026-11-04T09:15:00', total: 85000, vendedor: 'Laura Gómez',
    lineas: [{ idProducto: 1, nombre: 'Detergente en polvo 1kg', cantidad: 10, precioUnitario: 8500, subtotal: 85000 }],
    historial: [
      { estadoAnterior: null, estadoNuevo: 'Pendiente', motivo: 'Registro inicial del pedido', usuario: 'Laura Gómez', fecha: '2026-11-04T09:15:00' },
      { estadoAnterior: 'Pendiente', estadoNuevo: 'Confirmado', motivo: 'Confirmación de pedido', usuario: 'María Rojas', fecha: '2026-11-04T09:40:00' },
    ],
  },
  {
    id: 1042, cliente: 'Minimercado La 20', estado: 'Pendiente', fecha: '2026-11-05T10:05:00', total: 184000, vendedor: 'Camilo Ruiz',
    lineas: [{ idProducto: 3, nombre: 'Suavizante 2L', cantidad: 4, precioUnitario: 14900, subtotal: 59600 }],
    historial: [{ estadoAnterior: null, estadoNuevo: 'Pendiente', motivo: 'Registro inicial del pedido', usuario: 'Camilo Ruiz', fecha: '2026-11-05T10:05:00' }],
  },
];
