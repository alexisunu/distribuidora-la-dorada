import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { MOTIVOS, Pedido } from '../../core/models';

@Component({
  selector: 'app-detalle-pedido',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    @if (pedido(); as p) {
      <div class="detail-header">
        <a routerLink="/pedidos" class="back-link">‹ Pedidos</a>
        <h1>Pedido #{{ p.id }}</h1>
        <span class="badge" [class]="p.estado">{{ p.estado }}</span>
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
              <strong class="meta-total">$ {{ formatearPrecio(p.total) }}</strong>
            </div>
          </section>

          <!-- Ítems del pedido (Escritorio) -->
          <div class="table-wrap only-desktop" style="margin-top: 16px;">
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

          <!-- Ítems del pedido (Móvil) -->
          <div class="mobile-lines only-mobile" style="margin-top: 16px;">
            <h2 style="font-size: 14px; margin-bottom: 8px;">Productos</h2>
            @for (l of p.lineas; track l.idProducto) {
              <div class="mobile-line-card">
                <span>{{ l.cantidad }} × {{ l.nombre }}</span>
                <strong>$ {{ formatearPrecio(l.subtotal) }}</strong>
              </div>
            }
          </div>

          <!-- Panel de acciones según estado y rol (RF-07, RF-09, RF-18) -->
          @if (p.estado === 'Pendiente' && puedeGestionarVentas()) {
            <section class="actions-box">
              <div class="motivo-field">
                <label for="sel-motivo">Motivo (obligatorio al rechazar o cancelar)</label>
                <select
                  id="sel-motivo"
                  name="motivo"
                  [(ngModel)]="motivoSeleccionado"
                  [class.input-error]="faltaMotivo()"
                >
                  <option value="">Elegir motivo</option>
                  @for (m of motivos; track m) {
                    <option [value]="m">{{ m }}</option>
                  }
                </select>
              </div>

              <div class="action-buttons-row">
                <button type="button" class="btn" [disabled]="procesando()" (click)="abrirModalConfirmar()">
                  Confirmar pedido
                </button>
                <button type="button" class="btn danger-outline" [disabled]="procesando()" (click)="rechazar()">
                  Rechazar
                </button>
                <button type="button" class="btn sec" [disabled]="procesando()" (click)="cancelar()">
                  Cancelar pedido
                </button>
              </div>

              <p class="caption-note">
                «Despachar» aparece cuando el pedido está Confirmado (Bodega y Administrador).
              </p>
            </section>
          }

          @if (p.estado === 'Confirmado') {
            <section class="actions-box">
              @if (puedeGestionarVentas()) {
                <div class="motivo-field">
                  <label for="sel-motivo-canc">Motivo (obligatorio al cancelar)</label>
                  <select
                    id="sel-motivo-canc"
                    name="motivoCancelacion"
                    [(ngModel)]="motivoSeleccionado"
                    [class.input-error]="faltaMotivo()"
                  >
                    <option value="">Elegir motivo</option>
                    @for (m of motivos; track m) {
                      <option [value]="m">{{ m }}</option>
                    }
                  </select>
                </div>
              }

              <div class="action-buttons-row">
                @if (puedeDespachar()) {
                  <button type="button" class="btn" [disabled]="procesando()" (click)="despachar()">
                    Despachar pedido
                  </button>
                }
                @if (puedeGestionarVentas()) {
                  <button type="button" class="btn sec" [disabled]="procesando()" (click)="cancelar()">
                    Cancelar pedido (devolver existencias)
                  </button>
                }
              </div>
            </section>
          }

          @if (p.estado === 'Despachado' || p.estado === 'Rechazado' || p.estado === 'Cancelado') {
            <p class="caption-note" style="margin-top: 16px;">
              Este pedido se encuentra en estado terminal (<strong>{{ p.estado }}</strong>) y es de solo lectura.
            </p>
          }
        </div>

        <!-- Columna derecha: Historial de estados (RF-08, RNF-05) -->
        <aside class="card history-card">
          <h2>Historial</h2>
          <div class="timeline">
            @for (h of p.historial; track h.fecha) {
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

    .actions-box {
      margin-top: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .motivo-field {
      max-width: 340px;
    }

    .action-buttons-row {
      display: flex;
      flex-wrap: wrap;
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

    .mobile-line-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r-s);
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
    }

    @media (max-width: 768px) {
      .detail-grid {
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

  readonly motivos = MOTIVOS;

  pedido = signal<Pedido | null>(null);
  motivoSeleccionado = '';
  faltaMotivo = signal(false);
  error = signal('');
  mensajeOk = signal('');
  procesando = signal(false);
  modalConfirmarAbierto = signal(false);

  readonly puedeGestionarVentas = computed(() => {
    const r = this.auth.rol();
    return r === 'ADMINISTRADOR' || r === 'VENDEDOR';
  });

  readonly puedeDespachar = computed(() => {
    const r = this.auth.rol();
    return r === 'ADMINISTRADOR' || r === 'BODEGA';
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

  abrirModalConfirmar() {
    this.error.set('');
    this.faltaMotivo.set(false);
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
    if (!this.motivoSeleccionado) {
      this.faltaMotivo.set(true);
      this.error.set('Debe seleccionar un motivo para rechazar el pedido');
      return;
    }
    this.faltaMotivo.set(false);
    this.procesando.set(true);
    this.api.rechazarPedido(p.id, this.motivoSeleccionado).subscribe({
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
    if (!this.motivoSeleccionado) {
      this.faltaMotivo.set(true);
      this.error.set('Debe seleccionar un motivo para cancelar el pedido');
      return;
    }
    this.faltaMotivo.set(false);
    this.procesando.set(true);
    this.api.cancelarPedido(p.id, this.motivoSeleccionado).subscribe({
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
