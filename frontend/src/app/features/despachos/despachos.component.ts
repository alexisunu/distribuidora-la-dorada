import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { Pedido } from '../../core/models';

@Component({
  selector: 'app-despachos',
  standalone: true,
  template: `
    <div class="page-header">
      <h1>Cola de despachos</h1>
      <span class="badge Confirmado only-desktop">
        Confirmado · {{ colaConfirmados().length }} por despachar
      </span>
    </div>

    <p class="mobile-count only-mobile">{{ colaConfirmados().length }} pedidos por despachar</p>

    @if (mensajeOk()) {
      <div class="toast-ok" style="margin-bottom: 14px;">{{ mensajeOk() }}</div>
    }

    @if (error()) {
      <div class="error" style="margin-bottom: 14px;">{{ error() }}</div>
    }

    <!-- Tabla de Escritorio (Mockup 8) -->
    <div class="table-wrap only-desktop">
      <table>
        <thead>
          <tr>
            <th>Nº</th>
            <th>Cliente</th>
            <th>Confirmado</th>
            <th>Productos</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          @for (p of colaConfirmados(); track p.id) {
            <tr>
              <td class="num-cell">#{{ p.id }}</td>
              <td>
                <strong>{{ p.cliente }}</strong>
                <div class="items-preview">{{ resumenProductos(p) }}</div>
              </td>
              <td class="date-cell">{{ formatearFecha(p.fecha) }}</td>
              <td>{{ p.lineas.length }} {{ p.lineas.length === 1 ? 'producto' : 'productos' }}</td>
              <td>
                <button
                  type="button"
                  class="btn sm"
                  [disabled]="despachandoId() === p.id"
                  (click)="despachar(p)"
                >
                  Despachar
                </button>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="empty-cell">No hay pedidos confirmados pendientes por despachar.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Tarjetas en Móvil (Mockup 8) -->
    <div class="mobile-queue only-mobile">
      @for (p of colaConfirmados(); track p.id) {
        <div class="dispatch-card">
          <div class="dispatch-top">
            <strong>#{{ p.id }} · {{ p.cliente }}</strong>
            <span class="badge Confirmado">Confirmado</span>
          </div>
          <div class="dispatch-meta">
            {{ p.lineas.length }} {{ p.lineas.length === 1 ? 'producto' : 'productos' }} · {{ formatearFecha(p.fecha) }}
          </div>
          <div class="items-preview">{{ resumenProductos(p) }}</div>
          <button
            type="button"
            class="btn full-dispatch-btn"
            [disabled]="despachandoId() === p.id"
            (click)="despachar(p)"
          >
            Despachar
          </button>
        </div>
      } @empty {
        <div class="card empty-cell">No hay pedidos confirmados pendientes por despachar.</div>
      }
    </div>

    <p class="caption-note">
      Mostrando {{ colaConfirmados().length }} de {{ colaConfirmados().length }}, del más antiguo al más reciente. Al despachar, el pedido pasa a Despachado y queda registrado quién lo hizo y cuándo. Si hay un problema con un pedido, Bodega avisa a Ventas para que lo cancele con el motivo «Sin existencia física».
    </p>
  `,
  styles: [`
    .num-cell {
      font-weight: 700;
    }

    .date-cell {
      color: var(--muted);
    }

    .items-preview {
      font-size: 12px;
      color: var(--muted);
      margin-top: 2px;
    }

    .empty-cell {
      text-align: center;
      color: var(--muted);
      padding: 28px 16px;
    }

    .mobile-count {
      font-size: 13px;
      color: var(--muted);
      margin: -10px 0 12px;
    }

    .mobile-queue {
      display: none;
      flex-direction: column;
      gap: 12px;
    }

    .dispatch-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r-m);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .dispatch-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .dispatch-meta {
      font-size: 13px;
      color: var(--muted);
    }

    .full-dispatch-btn {
      width: 100%;
      margin-top: 4px;
    }

    @media (max-width: 768px) {
      .mobile-queue {
        display: flex;
      }
    }
  `],
})
export class DespachosComponent implements OnInit {
  private api = inject(ApiService);

  pedidos = signal<Pedido[]>([]);
  despachandoId = signal<number | null>(null);
  mensajeOk = signal('');
  error = signal('');

  /** Pedidos en estado Confirmado ordenados del más antiguo al más reciente (Mockup 8 / CU-07) */
  readonly colaConfirmados = computed(() => {
    return this.pedidos()
      .filter(p => p.estado === 'Confirmado')
      .sort((a, b) => a.id - b.id);
  });

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.listarPedidos().subscribe(lista => this.pedidos.set(lista));
  }

  despachar(p: Pedido) {
    this.error.set('');
    this.despachandoId.set(p.id);
    this.api.despacharPedido(p.id).subscribe({
      error: e => {
        this.despachandoId.set(null);
        this.error.set(e?.error?.mensaje ?? 'No fue posible despachar el pedido.');
      },
      next: () => {
        this.despachandoId.set(null);
        this.cargar();
        this.mensajeOk.set(`Pedido #${p.id} (${p.cliente}) marcado como Despachado.`);
        setTimeout(() => this.mensajeOk.set(''), 3500);
      },
    });
  }

  resumenProductos(p: Pedido): string {
    return p.lineas.map(l => `${l.cantidad}× ${l.nombre}`).join(' · ');
  }

  formatearFecha(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }
}
