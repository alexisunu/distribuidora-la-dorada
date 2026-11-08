import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  LineaPedido,
  MOTIVOS_CANCELACION,
  MOTIVOS_RECHAZO,
  Pedido,
} from '../../core/models';

@Component({
  selector: 'app-detalle-pedido',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="detail-header">
      <a [routerLink]="rutaVolver()" class="back-link">‹ {{ textoVolver() }}</a>
      @if (pedido(); as p) {
        <h1>Pedido #{{ p.id }}</h1>
        <span class="badge" [class]="p.estado">{{ p.estado }}</span>
      } @else {
        <h1>Detalle del pedido</h1>
      }
    </div>

    @if (error()) {
      <div class="error" style="margin-bottom: 16px;" role="alert">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>{{ error() }}</span>
      </div>
    }

    @if (mensajeOk()) {
      <div class="toast-ok" style="margin-bottom: 16px;">{{ mensajeOk() }}</div>
    }

    @if (pedido(); as p) {
      <div class="detail-grid">
        <!-- Columna principal -->
        <div class="detail-main">
          <!-- Metadatos del pedido -->
          <section class="card meta-grid">
            <div>
              <small class="meta-label">Cliente</small>
              <strong class="meta-val">{{ p.cliente }}</strong>
              @if (p.telefonoCliente) {
                <span class="meta-sub">Tel. {{ p.telefonoCliente }}</span>
              }
            </div>
            <div>
              <small class="meta-label">Fecha y hora</small>
              <strong class="meta-val">{{ formatearFechaHora(p.fecha) }}</strong>
            </div>
            <div>
              <small class="meta-label">Registrado por</small>
              <strong class="meta-val">{{ p.vendedor }}</strong>
            </div>
            <div>
              <small class="meta-label">Total</small>
              <strong class="meta-total">$ {{ formatearPrecio(editandoLineas() ? totalEditando() : p.total) }}</strong>
            </div>
          </section>

          <!-- Cabecera de sección de productos con botón "Editar productos" (Ajuste 1) -->
          <div class="products-header">
            <h2 style="margin: 0; font-size: 16px;">Productos del pedido</h2>
            @if (p.estado === 'Pendiente' && puedeGestionarVentas() && !editandoLineas()) {
              <button type="button" class="btn sec sm" (click)="iniciarEdicionProductos()">
                Editar productos
              </button>
            }
          </div>

          @if (!editandoLineas()) {
            <!-- MODO LECTURA: Ítems del pedido (Escritorio) -->
            <div class="table-wrap only-desktop">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Cant.</th>
                    <th style="text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  @for (l of p.lineas; track l.idProducto) {
                    <tr>
                      <td><strong>{{ l.nombre }}</strong></td>
                      <td>$ {{ formatearPrecio(l.precioUnitario) }}</td>
                      <td>{{ l.cantidad }}</td>
                      <td style="text-align: right;"><strong>$ {{ formatearPrecio(l.subtotal) }}</strong></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- MODO LECTURA: Ítems del pedido (Móvil) -->
            <div class="mobile-lines only-mobile">
              @for (l of p.lineas; track l.idProducto) {
                <div class="mobile-line-card">
                  <span>{{ l.cantidad }} × {{ l.nombre }}</span>
                  <strong>$ {{ formatearPrecio(l.subtotal) }}</strong>
                </div>
              }
            </div>
          } @else {
            <!-- MODO EDICIÓN DE PRODUCTOS EN PEDIDO PENDIENTE (Ajuste 1) -->
            <div class="table-wrap only-desktop">
              <table>
                <thead>
                  <tr>
                    <th>Producto y existencias</th>
                    <th>Precio</th>
                    <th>Cantidad</th>
                    <th style="text-align: right;">Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (l of lineasEditables(); track l.idProducto) {
                    <tr [class.row-amber]="superaExistencias(l.idProducto, l.cantidad)">
                      <td>
                        <strong>{{ l.nombre }}</strong>
                        <div class="stock-info">
                          Existencias: <strong>{{ stockDe(l.idProducto) }}</strong>
                          @if (superaExistencias(l.idProducto, l.cantidad)) {
                            <span class="badge Bajas">Supera stock</span>
                          }
                        </div>
                      </td>
                      <td>$ {{ formatearPrecio(l.precioUnitario) }}</td>
                      <td>
                        <div class="qty-stepper">
                          <button type="button" class="step-btn" (click)="cambiarCantidad(l.idProducto, l.cantidad - 1)">−</button>
                          <input
                            type="number"
                            min="1"
                            class="qty-input"
                            [ngModel]="l.cantidad"
                            (ngModelChange)="fijarCantidad(l.idProducto, $event)"
                            aria-label="Cantidad"
                          >
                          <button type="button" class="step-btn plus" (click)="cambiarCantidad(l.idProducto, l.cantidad + 1)">+</button>
                        </div>
                      </td>
                      <td style="text-align: right;">
                        <strong>$ {{ formatearPrecio(l.precioUnitario * l.cantidad) }}</strong>
                      </td>
                      <td style="text-align: right;">
                        <button
                          type="button"
                          class="btn danger-outline sm"
                          [disabled]="lineasEditables().length <= 1"
                          (click)="quitarLinea(l.idProducto)"
                          title="Quitar línea del pedido"
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- MODO EDICIÓN (Móvil) -->
            <div class="mobile-lines only-mobile">
              @for (l of lineasEditables(); track l.idProducto) {
                <div class="mobile-edit-card" [class.row-amber]="superaExistencias(l.idProducto, l.cantidad)">
                  <div class="mobile-edit-top">
                    <div>
                      <strong>{{ l.nombre }}</strong>
                      <div class="stock-info">
                        $ {{ formatearPrecio(l.precioUnitario) }} · Existencias: {{ stockDe(l.idProducto) }}
                        @if (superaExistencias(l.idProducto, l.cantidad)) {
                          <span class="badge Bajas">Supera stock</span>
                        }
                      </div>
                    </div>
                    <strong>$ {{ formatearPrecio(l.precioUnitario * l.cantidad) }}</strong>
                  </div>
                  <div class="mobile-edit-bottom">
                    <div class="qty-stepper">
                      <button type="button" class="step-btn" (click)="cambiarCantidad(l.idProducto, l.cantidad - 1)">−</button>
                      <input
                        type="number"
                        min="1"
                        class="qty-input"
                        [ngModel]="l.cantidad"
                        (ngModelChange)="fijarCantidad(l.idProducto, $event)"
                      >
                      <button type="button" class="step-btn plus" (click)="cambiarCantidad(l.idProducto, l.cantidad + 1)">+</button>
                    </div>
                    <button
                      type="button"
                      class="btn danger-outline sm"
                      [disabled]="lineasEditables().length <= 1"
                      (click)="quitarLinea(l.idProducto)"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              }
            </div>

            <div class="edit-actions-bar">
              <button type="button" class="btn" [disabled]="procesando()" (click)="guardarEdicionProductos()">
                Guardar cambios
              </button>
              <button type="button" class="btn sec" [disabled]="procesando()" (click)="cancelarEdicionProductos()">
                Cancelar edición
              </button>
            </div>
          }

          <!-- Panel de acciones según estado y rol con motivos separados (Ajuste 3) -->
          @if (p.estado === 'Pendiente' && puedeGestionarVentas() && !editandoLineas()) {
            <section class="actions-box">
              <div class="confirm-primary-row">
                <button type="button" class="btn" [disabled]="procesando()" (click)="abrirModalConfirmar()">
                  Confirmar pedido
                </button>
              </div>

              <div class="motivos-split-grid">
                <!-- Grupo Rechazar: Existencias insuficientes y Otro -->
                <div class="motivo-group-card">
                  <label for="sel-motivo-rechazo">Motivo para rechazar</label>
                  <select
                    id="sel-motivo-rechazo"
                    name="motivoRechazo"
                    [(ngModel)]="motivoRechazo"
                    [class.input-error]="faltaMotivoRechazo()"
                  >
                    <option value="">Elegir motivo de rechazo</option>
                    @for (m of motivosRechazo; track m) {
                      <option [value]="m">{{ m }}</option>
                    }
                  </select>
                  <button type="button" class="btn danger-outline" [disabled]="procesando()" (click)="rechazar()">
                    Rechazar
                  </button>
                </div>

                <!-- Grupo Cancelar: El cliente desiste, Sin existencia física y Otro -->
                <div class="motivo-group-card">
                  <label for="sel-motivo-cancelar">Motivo para cancelar</label>
                  <select
                    id="sel-motivo-cancelar"
                    name="motivoCancelacion"
                    [(ngModel)]="motivoCancelacion"
                    [class.input-error]="faltaMotivoCancelacion()"
                  >
                    <option value="">Elegir motivo de cancelación</option>
                    @for (m of motivosCancelacion; track m) {
                      <option [value]="m">{{ m }}</option>
                    }
                  </select>
                  <button type="button" class="btn sec" [disabled]="procesando()" (click)="cancelar()">
                    Cancelar pedido
                  </button>
                </div>
              </div>

              <p class="caption-note">
                «Despachar» aparece cuando el pedido está Confirmado (Bodega y Administrador). Si el cliente acepta menos unidades, usa «Editar productos».
              </p>
            </section>
          }

          @if (p.estado === 'Confirmado') {
            <section class="actions-box">
              @if (puedeDespachar()) {
                <div class="confirm-primary-row">
                  <button type="button" class="btn" [disabled]="procesando()" (click)="despachar()">
                    Despachar pedido
                  </button>
                </div>
              }

              @if (puedeGestionarVentas()) {
                <div class="motivo-group-card" style="max-width: 380px;">
                  <label for="sel-motivo-canc-conf">Motivo para cancelar (devuelve existencias)</label>
                  <select
                    id="sel-motivo-canc-conf"
                    name="motivoCancelacionConf"
                    [(ngModel)]="motivoCancelacion"
                    [class.input-error]="faltaMotivoCancelacion()"
                  >
                    <option value="">Elegir motivo de cancelación</option>
                    @for (m of motivosCancelacion; track m) {
                      <option [value]="m">{{ m }}</option>
                    }
                  </select>
                  <button type="button" class="btn sec" [disabled]="procesando()" (click)="cancelar()">
                    Cancelar pedido
                  </button>
                </div>
              }
            </section>
          }

          @if (p.estado === 'Despachado' || p.estado === 'Rechazado' || p.estado === 'Cancelado') {
            <p class="caption-note" style="margin-top: 16px;">
              Este pedido se encuentra en estado terminal (<strong>{{ p.estado }}</strong>) y es de solo lectura.
            </p>
          }
        </div>

        <!-- Columna derecha: Historial de estados con track $index (Ajuste 4) -->
        <aside class="card history-card">
          <h2>Historial</h2>
          <div class="timeline">
            @for (h of p.historial; track $index) {
              <div class="timeline-item">
                <span class="timeline-dot" [class]="h.estadoNuevo"></span>
                <div class="timeline-content">
                  <strong>{{ h.estadoNuevo }}</strong>
                  <span class="timeline-meta">{{ formatearFechaHora(h.fecha) }}</span>
                  <span class="timeline-user">{{ h.usuario }}</span>
                  <span class="timeline-motivo">
                    @if (h.estadoAnterior) {
                      De {{ h.estadoAnterior }} → {{ h.estadoNuevo }} ·
                    }
                    {{ h.motivo }}
                  </span>
                </div>
              </div>
            }

            @if (p.estado === 'Pendiente' || p.estado === 'Confirmado') {
              <div class="timeline-item next-step">
                <span class="timeline-dot hollow"></span>
                <div class="timeline-content">
                  <strong style="color: var(--muted);">Siguiente estado</strong>
                  <span class="timeline-motivo">Se registra con fecha, usuario y motivo.</span>
                </div>
              </div>
            }
          </div>
        </aside>
      </div>

      <!-- Modal de Confirmación de Pedido (Mockup 5) -->
      @if (modalConfirmarAbierto()) {
        <div class="modal-backdrop" (click)="modalConfirmarAbierto.set(false)">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h2>¿Confirmar el pedido #{{ p.id }}?</h2>
            <p class="modal-desc">
              Se descontarán las existencias de {{ p.lineas.length }} productos. Esta acción queda registrada con tu usuario.
            </p>
            <div class="modal-actions">
              <button type="button" class="btn sec" [disabled]="procesando()" (click)="modalConfirmarAbierto.set(false)">
                Volver
              </button>
              <button type="button" class="btn" [disabled]="procesando()" (click)="confirmar()">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .detail-header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 18px;
    }

    .back-link {
      font-size: 14px;
      font-weight: 600;
      color: var(--primary);
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 310px;
      gap: 20px;
      align-items: start;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .meta-label {
      display: block;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 3px;
    }

    .meta-val {
      display: block;
      font-size: 15px;
      color: var(--ink);
    }

    .meta-sub {
      display: block;
      font-size: 13px;
      color: var(--muted);
      margin-top: 2px;
    }

    .meta-total {
      display: block;
      font-size: 22px;
      color: var(--ink);
    }

    .products-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 18px 0 10px;
      gap: 12px;
    }

    .stock-info {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--muted);
      margin-top: 3px;
    }

    tr.row-amber td {
      background: var(--citrico-bg);
    }

    .mobile-edit-card.row-amber {
      background: var(--citrico-bg);
      border-color: var(--citrico-fill);
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

    .edit-actions-bar {
      display: flex;
      gap: 10px;
      margin-top: 12px;
    }

    .actions-box {
      margin-top: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .confirm-primary-row {
      display: flex;
    }

    .motivos-split-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .motivo-group-card {
      background: var(--bg);
      border: 1px solid var(--line);
      border-radius: var(--r-m);
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .history-card {
      background: var(--bg);
    }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: 18px;
      position: relative;
      padding-left: 4px;
    }

    .timeline-item {
      display: flex;
      gap: 12px;
      position: relative;
    }

    .timeline-item:not(:last-child)::after {
      content: '';
      position: absolute;
      left: 5px;
      top: 16px;
      bottom: -18px;
      width: 2px;
      background: var(--line);
    }

    .timeline-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-top: 4px;
      flex-shrink: 0;
      background: var(--primary);
    }

    .timeline-dot.Pendiente { background: var(--citrico-fill); }
    .timeline-dot.Confirmado { background: var(--menta-fill); }
    .timeline-dot.Despachado { background: var(--primary); }
    .timeline-dot.Rechazado { background: var(--fram-fill); }
    .timeline-dot.Cancelado { background: var(--neu); }

    .timeline-dot.hollow {
      background: var(--surface);
      border: 2px solid var(--muted);
    }

    .timeline-content {
      display: flex;
      flex-direction: column;
      font-size: 13px;
      gap: 2px;
    }

    .timeline-meta,
    .timeline-user,
    .timeline-motivo {
      color: var(--muted);
    }

    .modal-desc {
      color: var(--muted);
      font-size: 14px;
      margin: 0;
      line-height: 1.5;
    }

    .mobile-lines {
      display: none;
      flex-direction: column;
      gap: 8px;
    }

    .mobile-line-card,
    .mobile-edit-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r-s);
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
    }

    .mobile-edit-card {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }

    .mobile-edit-top,
    .mobile-edit-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    @media (max-width: 768px) {
      .detail-grid,
      .motivos-split-grid {
        grid-template-columns: 1fr;
      }

      .mobile-lines {
        display: flex;
      }
    }
  `],
})
export class DetallePedidoComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  readonly motivosRechazo = MOTIVOS_RECHAZO;
  readonly motivosCancelacion = MOTIVOS_CANCELACION;

  pedido = signal<Pedido | null>(null);
  motivoRechazo = '';
  motivoCancelacion = '';
  faltaMotivoRechazo = signal(false);
  faltaMotivoCancelacion = signal(false);
  error = signal('');
  mensajeOk = signal('');
  procesando = signal(false);
  modalConfirmarAbierto = signal(false);

  // Modo edición de líneas (Ajuste 1)
  editandoLineas = signal(false);
  lineasEditables = signal<LineaPedido[]>([]);
  stockMapa = signal<Record<number, number>>({});

  readonly puedeGestionarVentas = computed(() => {
    const r = this.auth.rol();
    return r === 'ADMINISTRADOR' || r === 'VENDEDOR';
  });

  readonly puedeDespachar = computed(() => {
    const r = this.auth.rol();
    return r === 'ADMINISTRADOR' || r === 'BODEGA';
  });

  readonly rutaVolver = computed(() => {
    return this.auth.rol() === 'BODEGA' ? '/despachos' : '/pedidos';
  });

  readonly textoVolver = computed(() => {
    return this.auth.rol() === 'BODEGA' ? 'Despachos' : 'Pedidos';
  });

  readonly totalEditando = computed(() => {
    return this.lineasEditables().reduce((acc, l) => acc + l.precioUnitario * l.cantidad, 0);
  });

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.api.obtenerPedido(id).subscribe({
        error: e => this.error.set(e?.error?.mensaje ?? 'Pedido no encontrado.'),
        next: p => this.pedido.set(p),
      });
    }
  }

  // ==================== EDICIÓN DE PRODUCTOS EN PENDIENTE (PUT /api/pedidos/{id}) ====================

  iniciarEdicionProductos() {
    const p = this.pedido();
    if (!p || p.estado !== 'Pendiente') return;
    this.error.set('');
    this.lineasEditables.set(structuredClone(p.lineas));
    this.editandoLineas.set(true);

    this.api.listarProductos().subscribe({
      next: prods => {
        const mapa: Record<number, number> = {};
        for (const pr of prods) {
          mapa[pr.id] = pr.existencias;
        }
        this.stockMapa.set(mapa);
      },
    });
  }

  cancelarEdicionProductos() {
    this.editandoLineas.set(false);
    this.error.set('');
  }

  stockDe(idProducto: number): number {
    return this.stockMapa()[idProducto] ?? 0;
  }

  superaExistencias(idProducto: number, cantidad: number): boolean {
    const disp = this.stockMapa()[idProducto];
    if (disp === undefined) return false;
    return cantidad > disp;
  }

  cambiarCantidad(idProducto: number, nuevaCant: number) {
    if (nuevaCant <= 0) {
      if (this.lineasEditables().length <= 1) {
        this.error.set('El pedido debe conservar al menos un producto.');
        return;
      }
      this.quitarLinea(idProducto);
      return;
    }
    this.error.set('');
    this.lineasEditables.set(
      this.lineasEditables().map(l =>
        l.idProducto === idProducto
          ? { ...l, cantidad: Math.floor(nuevaCant), subtotal: l.precioUnitario * Math.floor(nuevaCant) }
          : l
      )
    );
  }

  fijarCantidad(idProducto: number, valor: number) {
    const num = Number(valor);
    if (isNaN(num) || num <= 0) {
      this.error.set('La cantidad debe ser un entero mayor que cero.');
      return;
    }
    this.error.set('');
    const entero = Math.floor(num);
    this.lineasEditables.set(
      this.lineasEditables().map(l =>
        l.idProducto === idProducto ? { ...l, cantidad: entero, subtotal: l.precioUnitario * entero } : l
      )
    );
  }

  quitarLinea(idProducto: number) {
    if (this.lineasEditables().length <= 1) {
      this.error.set('El pedido debe conservar al menos un producto.');
      return;
    }
    this.error.set('');
    this.lineasEditables.set(this.lineasEditables().filter(l => l.idProducto !== idProducto));
  }

  guardarEdicionProductos() {
    const p = this.pedido();
    if (!p || this.procesando()) return;
    if (this.lineasEditables().length === 0) {
      this.error.set('El pedido debe conservar al menos un producto.');
      return;
    }
    for (const l of this.lineasEditables()) {
      if (!l.cantidad || l.cantidad <= 0) {
        this.error.set('La cantidad de cada producto debe ser mayor que cero.');
        return;
      }
    }

    this.procesando.set(true);
    this.error.set('');
    const payload = {
      lineas: this.lineasEditables().map(l => ({
        idProducto: l.idProducto,
        cantidad: Number(l.cantidad),
      })),
    };

    this.api.actualizarPedido(p.id, payload).subscribe({
      error: e => {
        this.procesando.set(false);
        this.error.set(e?.error?.mensaje ?? 'No fue posible actualizar los productos del pedido.');
      },
      next: actualizado => {
        this.procesando.set(false);
        this.editandoLineas.set(false);
        this.pedido.set(actualizado);
        this.mostrarOk('Productos del pedido actualizados correctamente.');
      },
    });
  }

  // ==================== TRANSICIONES DE ESTADO ====================

  abrirModalConfirmar() {
    this.error.set('');
    this.faltaMotivoRechazo.set(false);
    this.faltaMotivoCancelacion.set(false);
    this.modalConfirmarAbierto.set(true);
  }

  confirmar() {
    const p = this.pedido();
    if (!p || this.procesando()) return;
    this.procesando.set(true);
    this.error.set('');
    this.api.confirmarPedido(p.id).subscribe({
      error: e => {
        this.procesando.set(false);
        this.modalConfirmarAbierto.set(false);
        this.error.set(e?.error?.mensaje ?? 'No fue posible confirmar el pedido.');
      },
      next: actualizado => {
        this.procesando.set(false);
        this.modalConfirmarAbierto.set(false);
        this.pedido.set(actualizado);
        this.mostrarOk('Pedido confirmado y existencias descontadas.');
      },
    });
  }

  rechazar() {
    const p = this.pedido();
    if (!p || this.procesando()) return;
    this.error.set('');
    this.faltaMotivoCancelacion.set(false);
    if (!this.motivoRechazo) {
      this.faltaMotivoRechazo.set(true);
      this.error.set('Debe seleccionar un motivo para rechazar el pedido');
      return;
    }
    this.faltaMotivoRechazo.set(false);
    this.procesando.set(true);
    this.api.rechazarPedido(p.id, this.motivoRechazo).subscribe({
      error: e => {
        this.procesando.set(false);
        this.error.set(e?.error?.mensaje ?? 'No fue posible rechazar el pedido.');
      },
      next: actualizado => {
        this.procesando.set(false);
        this.pedido.set(actualizado);
        this.mostrarOk('Pedido marcado como Rechazado.');
      },
    });
  }

  cancelar() {
    const p = this.pedido();
    if (!p || this.procesando()) return;
    this.error.set('');
    this.faltaMotivoRechazo.set(false);
    if (!this.motivoCancelacion) {
      this.faltaMotivoCancelacion.set(true);
      this.error.set('Debe seleccionar un motivo para cancelar el pedido');
      return;
    }
    this.faltaMotivoCancelacion.set(false);
    this.procesando.set(true);
    this.api.cancelarPedido(p.id, this.motivoCancelacion).subscribe({
      error: e => {
        this.procesando.set(false);
        this.error.set(e?.error?.mensaje ?? 'No fue posible cancelar el pedido.');
      },
      next: actualizado => {
        this.procesando.set(false);
        this.pedido.set(actualizado);
        this.mostrarOk('Pedido cancelado correctamente.');
      },
    });
  }

  despachar() {
    const p = this.pedido();
    if (!p || this.procesando()) return;
    this.error.set('');
    this.procesando.set(true);
    this.api.despacharPedido(p.id).subscribe({
      error: e => {
        this.procesando.set(false);
        this.error.set(e?.error?.mensaje ?? 'No fue posible despachar el pedido.');
      },
      next: actualizado => {
        this.procesando.set(false);
        this.pedido.set(actualizado);
        this.mostrarOk('Pedido marcado como Despachado.');
      },
    });
  }

  formatearPrecio(valor: number): string {
    return Math.round(valor).toLocaleString('es-CO');
  }

  formatearFechaHora(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} · ${h}:${m}`;
  }

  private mostrarOk(msg: string) {
    this.mensajeOk.set(msg);
    setTimeout(() => this.mensajeOk.set(''), 3500);
  }
}
