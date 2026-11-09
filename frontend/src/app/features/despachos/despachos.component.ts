import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, catchError, interval, of, startWith, switchMap, takeUntil } from 'rxjs';
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
      <div class="error" style="margin-bottom: 14px;" role="alert">{{ error() }}</div>
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
            <tr class="clickable-row" (click)="abrirDetalle(p.id)">
              <td class="num-cell">#{{ p.id }}</td>
              <td>
                <strong>{{ p.cliente }}</strong>
                <div class="items-preview">{{ resumenProductos(p) }}</div>
              </td>
              <td class="date-cell">{{ formatearFecha(p.fecha) }}</td>
              <td>{{ p.lineas.length }} {{ p.lineas.length === 1 ? 'producto' : 'productos' }}</td>
              <td (click)="$event.stopPropagation()">
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
              <td colspan="5">
                <div class="empty-state">
                  <div class="empty-state-icon">📦</div>
                  <strong class="empty-state-title">No hay despachos pendientes</strong>
                  <span class="empty-state-desc">Todos los pedidos confirmados han sido despachados de bodega.</span>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Tarjetas en Móvil (Mockup 8) -->
    <div class="mobile-queue only-mobile">
      @for (p of colaConfirmados(); track p.id) {
        <div class="dispatch-card" (click)="abrirDetalle(p.id)">
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
            (click)="$event.stopPropagation(); despachar(p)"
          >
            Despachar
          </button>
        </div>
      } @empty {
        <div class="card empty-state">
          <div class="empty-state-icon">📦</div>
          <strong class="empty-state-title">Cola al día</strong>
          <span class="empty-state-desc">No hay pedidos pendientes por despachar en este momento.</span>
        </div>
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

    .clickable-row {
      cursor: pointer;
      transition: background 0.12s;
    }

    .clickable-row:hover td {
      background: var(--bg);
    }

    .date-cell {
      color: var(--muted);
    }

    .items-preview {
      font-size: 12px;
      color: var(--muted);
      margin-top: 2px;
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
      cursor: pointer;
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
export class DespachosComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  colaConfirmados = signal<Pedido[]>([]);
  despachandoId = signal<number | null>(null);
  mensajeOk = signal('');
  error = signal('');

  ngOnInit() {
    this.iniciarPolling();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Polling en tiempo real cada 5s a GET /api/despachos */
  iniciarPolling() {
    interval(5000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.api.listarDespachos().pipe(
            catchError(e => {
              // Si falla puntualmente (por ejemplo token o red), no rompemos el intervalo ni emitimos alertas masivas
              return of(null);
            })
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(lista => {
        if (lista) {
          this.colaConfirmados.set(lista);
        }
      });
  }

  abrirDetalle(id: number) {
    this.router.navigate(['/pedidos', id]);
  }

  despachar(p: Pedido) {
    this.error.set('');
    this.despachandoId.set(p.id);
    this.api.despacharPedido(p.id).subscribe({
      error: e => {
        this.despachandoId.set(null);
        this.error.set(e?.error?.mensaje ?? 'No fue posible despachar el pedido.');
      },
      next: actualizado => {
        this.despachandoId.set(null);
        this.colaConfirmados.set(this.colaConfirmados().filter(item => item.id !== actualizado.id));
        this.mensajeOk.set(`Pedido #${actualizado.id} (${actualizado.cliente}) marcado como ${actualizado.estado}.`);
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
