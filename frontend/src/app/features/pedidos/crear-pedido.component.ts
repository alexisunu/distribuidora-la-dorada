import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { Producto } from '../../core/models';

interface LineaBorrador {
  producto: Producto;
  cantidad: number;
}

@Component({
  selector: 'app-crear-pedido',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="breadcrumb-header">
      <a routerLink="/pedidos" class="back-link">‹ Pedidos</a>
      <h1>Nuevo pedido</h1>
    </div>

    @if (error()) {
      <div class="error" style="margin-bottom: 16px;" role="alert">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>{{ error() }}</span>
      </div>
    }

    <!-- Aviso no bloqueante cuando alguna cantidad supera las existencias -->
    @if (hayLineasSobreStock()) {
      <div class="warn-banner" style="margin-bottom: 16px;" role="status">
        <span>⚠</span>
        <span>
          Uno o más productos superan las existencias disponibles en bodega. Puedes guardar el pedido como Pendiente, pero antes de confirmarlo requerirá ajuste de existencias o reducción de cantidades.
        </span>
      </div>
    }

    <div class="create-layout">
      <!-- Columna izquierda: Cliente y Productos -->
      <div class="main-col">
        <section class="card">
          <h2>Cliente</h2>
          <div class="client-grid">
            <div>
              <label for="cli-nombre">Nombre del cliente (obligatorio)</label>
              <input
                id="cli-nombre"
                name="clienteNombre"
                [(ngModel)]="nombreCliente"
                [class.input-error]="intentoGuardar() && !nombreCliente.trim()"
                placeholder="ej. Ferretería El Sol"
                required
              >
            </div>
            <div>
              <label for="cli-tel">Teléfono (obligatorio)</label>
              <input
                id="cli-tel"
                name="clienteTelefono"
                [(ngModel)]="telefonoCliente"
                [class.input-error]="intentoGuardar() && !telefonoCliente.trim()"
                placeholder="ej. 300 000 0000"
                required
              >
            </div>
          </div>
        </section>

        <section class="card" style="margin-top: 16px;">
          <h2>Productos</h2>

          <!-- Buscador para agregar producto del catálogo -->
          <div class="catalog-picker">
            <div class="search-box">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                type="text"
                [ngModel]="busquedaProducto()"
                (ngModelChange)="busquedaProducto.set($event)"
                (focus)="mostrarSugerencias.set(true)"
                placeholder="Buscar producto por nombre o código"
                aria-label="Buscar producto para agregar al pedido"
              >
            </div>

            @if (sugerencias().length > 0 && (busquedaProducto().trim() || mostrarSugerencias())) {
              <div class="suggestions-list">
                @for (pr of sugerencias(); track pr.id) {
                  <button type="button" class="suggestion-item" (click)="agregarProducto(pr)">
                    <div>
                      <strong>{{ pr.nombre }}</strong>
                      <small>{{ pr.codigo }} · Existencias: {{ pr.existencias }}</small>
                    </div>
                    <span class="suggestion-price">$ {{ formatearPrecio(pr.precio) }} +</span>
                  </button>
                }
              </div>
            }
          </div>

          <!-- Tabla de ítems agregados (Escritorio) -->
          <div class="items-table-wrap only-desktop">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Cantidad</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                @for (item of lineas(); track item.producto.id) {
                  <tr [class.row-amber]="item.cantidad > item.producto.existencias">
                    <td>
                      <strong>{{ item.producto.nombre }}</strong>
                      <div class="stock-sub">
                        Existencias: {{ item.producto.existencias }}
                        @if (item.cantidad > item.producto.existencias) {
                          <span class="badge Bajas" style="margin-left: 6px;">Supera existencias</span>
                        }
                      </div>
                    </td>
                    <td>$ {{ formatearPrecio(item.producto.precio) }}</td>
                    <td>
                      <div class="qty-stepper">
                        <button type="button" class="step-btn" (click)="cambiarCantidad(item.producto.id, item.cantidad - 1)">−</button>
                        <input
                          type="number"
                          min="1"
                          class="qty-input"
                          [ngModel]="item.cantidad"
                          (ngModelChange)="fijarCantidad(item.producto.id, $event)"
                          aria-label="Cantidad"
                        >
                        <button type="button" class="step-btn plus" (click)="cambiarCantidad(item.producto.id, item.cantidad + 1)">+</button>
                      </div>
                    </td>
                    <td style="text-align: right;">
                      <strong>$ {{ formatearPrecio(item.producto.precio * item.cantidad) }}</strong>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="empty-items">
                      Busca y selecciona productos del catálogo para agregarlos al pedido.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Tarjetas de ítems agregados (Móvil) -->
          <div class="mobile-items only-mobile">
            @for (item of lineas(); track item.producto.id) {
              <div class="mobile-item-card" [class.row-amber]="item.cantidad > item.producto.existencias">
                <div class="mobile-item-top">
                  <strong>{{ item.producto.nombre }}</strong>
                  <strong>$ {{ formatearPrecio(item.producto.precio * item.cantidad) }}</strong>
                </div>
                <div class="mobile-item-bottom">
                  <span class="stock-sub">
                    $ {{ formatearPrecio(item.producto.precio) }} · Existencias: {{ item.producto.existencias }}
                    @if (item.cantidad > item.producto.existencias) {
                      <span class="badge Bajas">Supera stock</span>
                    }
                  </span>
                  <div class="qty-stepper">
                    <button type="button" class="step-btn" (click)="cambiarCantidad(item.producto.id, item.cantidad - 1)">−</button>
                    <span class="qty-val">{{ item.cantidad }}</span>
                    <button type="button" class="step-btn plus" (click)="cambiarCantidad(item.producto.id, item.cantidad + 1)">+</button>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="empty-items">Selecciona productos del buscador superior para armar el pedido.</div>
            }
          </div>

          <p class="caption-note">
            Las existencias se validan al confirmar el pedido, no al guardarlo. Si alguna cantidad no alcanza, el sistema informa los productos que superan existencias.
          </p>
        </section>
      </div>

      <!-- Columna derecha: Resumen (Escritorio) -->
      <aside class="summary-col only-desktop">
        <div class="card summary-card">
          <h2>Resumen</h2>
          <div class="summary-row">
            <span>Productos</span>
            <strong>{{ lineas().length }}</strong>
          </div>
          <div class="summary-row">
            <span>Unidades</span>
            <strong>{{ totalUnidades() }}</strong>
          </div>
          <hr class="summary-divider">
          <div class="summary-row total-row">
            <span>Total</span>
            <strong class="total-amount">$ {{ formatearPrecio(totalPedido()) }}</strong>
          </div>

          <button type="button" class="btn full-btn" [disabled]="guardando()" (click)="guardarPedido()">
            Guardar pedido
          </button>
          <a routerLink="/pedidos" class="btn sec full-btn">Cancelar</a>

          <p class="caption-note" style="margin-top: 8px;">
            Se guarda como Pendiente y queda a nombre de quien lo registra.
          </p>
        </div>
      </aside>
    </div>

    <!-- Barra Inferior Fija en Móvil -->
    <div class="mobile-checkout-bar only-mobile">
      <div>
        <small class="mobile-total-label">Total · {{ lineas().length }} productos</small>
        <strong class="mobile-total-val">$ {{ formatearPrecio(totalPedido()) }}</strong>
      </div>
      <button type="button" class="btn" [disabled]="guardando()" (click)="guardarPedido()">
        Guardar pedido
      </button>
    </div>
  `,
  styles: [`
    .breadcrumb-header {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 18px;
    }

    .back-link {
      font-size: 14px;
      font-weight: 600;
      color: var(--primary);
    }

    .warn-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--citrico-bg);
      color: var(--citrico);
      border: 1px solid var(--citrico-fill);
      padding: 10px 14px;
      border-radius: var(--r-s);
      font-size: 13.5px;
      font-weight: 600;
    }

    tr.row-amber td {
      background: var(--citrico-bg);
    }

    .mobile-item-card.row-amber {
      background: var(--citrico-bg);
      border-color: var(--citrico-fill);
    }

    .create-layout {
      display: grid;
      grid-template-columns: 1fr 290px;
      gap: 20px;
      align-items: start;
    }

    .client-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .catalog-picker {
      position: relative;
      margin-bottom: 14px;
    }

    .search-box {
      position: relative;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted);
      pointer-events: none;
    }

    .search-box input {
      padding-left: 36px;
    }

    .suggestions-list {
      margin-top: 6px;
      border: 1px solid var(--line);
      border-radius: var(--r-s);
      background: var(--surface);
      max-height: 210px;
      overflow-y: auto;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
    }

    .suggestion-item {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 9px 14px;
      border: none;
      border-bottom: 1px solid var(--line);
      background: transparent;
      color: var(--ink);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }

    .suggestion-item:last-child {
      border-bottom: none;
    }

    .suggestion-item:hover {
      background: var(--bg);
    }

    .suggestion-item small {
      display: block;
      font-size: 12px;
      color: var(--muted);
    }

    .suggestion-price {
      font-weight: 700;
      color: var(--primary);
      font-size: 13.5px;
    }

    .items-table-wrap {
      border: 1px solid var(--line);
      border-radius: var(--r-s);
      overflow: hidden;
    }

    .stock-sub {
      font-size: 12px;
      color: var(--muted);
      margin-top: 2px;
    }

    .qty-stepper {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--line);
      border-radius: var(--r-s);
      background: var(--surface);
      overflow: hidden;
    }

    .step-btn {
      border: none;
      background: transparent;
      color: var(--ink);
      font-weight: 700;
      font-size: 15px;
      width: 32px;
      height: 32px;
      cursor: pointer;
    }

    .step-btn.plus {
      color: var(--primary);
    }

    .step-btn:hover {
      background: var(--bg);
    }

    .qty-input {
      width: 48px;
      text-align: center;
      border: none;
      border-left: 1px solid var(--line);
      border-right: 1px solid var(--line);
      border-radius: 0;
      padding: 4px;
      font-weight: 700;
      -moz-appearance: textfield;
    }

    .qty-val {
      padding: 0 12px;
      font-weight: 700;
      font-size: 14px;
    }

    .empty-items {
      text-align: center;
      color: var(--muted);
      padding: 24px 12px;
      font-size: 13.5px;
    }

    .summary-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .summary-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
      color: var(--muted);
    }

    .summary-row strong {
      color: var(--ink);
    }

    .summary-divider {
      border: none;
      border-top: 1px solid var(--line);
      margin: 4px 0;
    }

    .total-row span {
      font-weight: 600;
      color: var(--ink);
    }

    .total-amount {
      font-size: 22px;
      font-weight: 700;
    }

    .full-btn {
      width: 100%;
    }

    .mobile-items {
      display: none;
      flex-direction: column;
      gap: 10px;
    }

    .mobile-item-card {
      border: 1px solid var(--line);
      border-radius: var(--r-s);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .mobile-item-top,
    .mobile-item-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .mobile-checkout-bar {
      display: none;
      position: fixed;
      left: 0;
      right: 0;
      bottom: 58px;
      background: var(--surface);
      border-top: 1px solid var(--line);
      padding: 10px 16px;
      align-items: center;
      justify-content: space-between;
      z-index: 45;
    }

    .mobile-total-label {
      display: block;
      font-size: 11.5px;
      color: var(--muted);
    }

    .mobile-total-val {
      font-size: 18px;
      color: var(--ink);
    }

    @media (max-width: 768px) {
      .create-layout {
        grid-template-columns: 1fr;
        padding-bottom: 64px;
      }

      .client-grid {
        grid-template-columns: 1fr;
      }

      .mobile-items {
        display: flex;
      }

      .mobile-checkout-bar {
        display: flex;
      }
    }
  `],
})
export class CrearPedidoComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);

  catalogo = signal<Producto[]>([]);
  lineas = signal<LineaBorrador[]>([]);
  busquedaProducto = signal('');
  mostrarSugerencias = signal(false);

  nombreCliente = '';
  telefonoCliente = '';
  error = signal('');
  intentoGuardar = signal(false);
  guardando = signal(false);

  readonly sugerencias = computed(() => {
    const q = this.busquedaProducto().trim().toLowerCase();
    return this.catalogo().filter(p => {
      if (!q) return true;
      return p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q);
    });
  });

  readonly totalUnidades = computed(() => {
    return this.lineas().reduce((acc, l) => acc + l.cantidad, 0);
  });

  readonly totalPedido = computed(() => {
    return this.lineas().reduce((acc, l) => acc + l.producto.precio * l.cantidad, 0);
  });

  readonly hayLineasSobreStock = computed(() => {
    return this.lineas().some(l => l.cantidad > l.producto.existencias);
  });

  ngOnInit() {
    this.api.listarProductos().subscribe(prods => {
      this.catalogo.set(prods);
    });
  }

  agregarProducto(pr: Producto) {
    this.error.set('');
    const actual = [...this.lineas()];
    const idx = actual.findIndex(x => x.producto.id === pr.id);
    if (idx >= 0) {
      actual[idx] = { ...actual[idx], cantidad: actual[idx].cantidad + 1 };
    } else {
      actual.push({ producto: pr, cantidad: 1 });
    }
    this.lineas.set(actual);
    this.busquedaProducto.set('');
    this.mostrarSugerencias.set(false);
  }

  cambiarCantidad(idProducto: number, nuevaCant: number) {
    this.error.set('');
    if (nuevaCant <= 0) {
      this.lineas.set(this.lineas().filter(l => l.producto.id !== idProducto));
      return;
    }
    this.lineas.set(
      this.lineas().map(l => (l.producto.id === idProducto ? { ...l, cantidad: Math.floor(nuevaCant) } : l))
    );
  }

  fijarCantidad(idProducto: number, valor: number) {
    const num = Number(valor);
    if (isNaN(num) || num <= 0) {
      this.error.set('La cantidad debe ser numérica y mayor que cero.');
      return;
    }
    this.error.set('');
    this.lineas.set(
      this.lineas().map(l => (l.producto.id === idProducto ? { ...l, cantidad: Math.floor(num) } : l))
    );
  }

  guardarPedido() {
    this.intentoGuardar.set(true);
    this.error.set('');

    if (!this.nombreCliente.trim() || !this.telefonoCliente.trim()) {
      this.error.set('El nombre y contacto del cliente son obligatorios para registrar el pedido.');
      return;
    }

    if (this.lineas().length === 0) {
      this.error.set('Debe agregar al menos un producto al pedido.');
      return;
    }

    for (const l of this.lineas()) {
      if (!l.cantidad || l.cantidad <= 0) {
        this.error.set('La cantidad solicitada debe ser mayor que cero.');
        return;
      }
    }

    this.guardando.set(true);
    this.api
      .crearPedido({
        cliente: this.nombreCliente.trim(),
        telefonoCliente: this.telefonoCliente.trim(),
        lineas: this.lineas().map(l => ({ idProducto: l.producto.id, cantidad: l.cantidad })),
      })
      .subscribe({
        error: e => {
          this.guardando.set(false);
          this.error.set(e?.error?.mensaje ?? 'No se pudo registrar el pedido.');
        },
        next: creado => {
          this.guardando.set(false);
          this.router.navigate(['/pedidos', creado.id]);
        },
      });
  }

  formatearPrecio(valor: number): string {
    return Math.round(valor).toLocaleString('es-CO');
  }
}
