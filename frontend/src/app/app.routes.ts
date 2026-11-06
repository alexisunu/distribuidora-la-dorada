import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell.component';
import { autenticado, rolPermitido } from './core/guards/guards';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent) },
  {
    path: '', component: ShellComponent, canActivate: [autenticado],
    children: [
      { path: 'productos', loadComponent: () => import('./features/productos/productos.component').then(m => m.ProductosComponent) },
      { path: 'pedidos', canActivate: [rolPermitido('ADMINISTRADOR', 'VENDEDOR')], loadComponent: () => import('./features/pedidos/pedidos.component').then(m => m.PedidosComponent) },
      { path: 'pedidos/nuevo', canActivate: [rolPermitido('ADMINISTRADOR', 'VENDEDOR')], loadComponent: () => import('./features/pedidos/crear-pedido.component').then(m => m.CrearPedidoComponent) },
      { path: 'pedidos/:id', canActivate: [rolPermitido('ADMINISTRADOR', 'VENDEDOR')], loadComponent: () => import('./features/pedidos/detalle-pedido.component').then(m => m.DetallePedidoComponent) },
      { path: 'despachos', canActivate: [rolPermitido('ADMINISTRADOR', 'BODEGA')], loadComponent: () => import('./features/despachos/despachos.component').then(m => m.DespachosComponent) },
      { path: 'resumen', canActivate: [rolPermitido('ADMINISTRADOR', 'VENDEDOR')], loadComponent: () => import('./features/resumen/resumen.component').then(m => m.ResumenComponent) },
      { path: 'usuarios', canActivate: [rolPermitido('ADMINISTRADOR')], loadComponent: () => import('./features/usuarios/usuarios.component').then(m => m.UsuariosComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'pedidos' },
    ],
  },
  { path: '**', redirectTo: '' },
];
