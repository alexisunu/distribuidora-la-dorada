import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Subject, catchError, interval, of, startWith, switchMap, takeUntil } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { EstadoPedido, Pedido, ResumenPedidos } from '../../core/models';

const ESTADOS: EstadoPedido[] = ['Pendiente', 'Confirmado', 'Despachado', 'Rechazado', 'Cancelado'];

@Component({
  selector: 'app-resumen',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="resumen-header">
      <h1>Resumen por estado</h1>
      <p class="subtitle">{{ resumen().total }} pedidos registrados</p>
    </div>

    @if (error()) {
      <div class="error" style="margin-bottom: 16px;" role="alert">{{ error() }}</div>
    }

    <!-- Tarjetas de conteo por estado -->
    <div class="kpi-grid">
      @for (est of estados; track est) {
        <button type="button" class="kpi-card" (click)="irAEstado(est)">
          <span class="badge" [class]="est">{{ est }}</span>
          <strong class="kpi-num">{{ contar(est) }}</strong>
          <span class="kpi-sub only-desktop">pedidos</span>
        </button>
      }
    </div>

    <!-- Barra de distribución porcentual -->
    <section class="card dist-card">
      <h2>Distribución</h2>
      <div class="dist-bar">
        @for (est of estados; track est) {
          @if (porcentaje(est) > 0) {
            <div
              class="dist-seg"
              [class]="est"
              [style.width.%]="porcentaje(est)"
              [title]="est + ': ' + porcentaje(est) + ' %'"
            ></div>
          }
        }
      </div>
      <div class="dist-legend">
        @for (est of estados; track est) {
          <span>{{ est }} {{ porcentaje(est) }} %</span>
        }
      </div>
    </section>

    <!-- Lista de pendientes por atender -->
    <section class="table-wrap pending-card">
      <div class="pending-header">
        <strong>Pendientes por atender</strong>
        <a [routerLink]="['/pedidos']" [queryParams]="{ estado: 'Pendiente' }" class="ver-todos">Ver todos →</a>
      </div>
      <div class="pending-list">
        @for (p of pendientes(); track p.id) {
          <a [routerLink]="['/pedidos', p.id]" class="pending-row">
            <span><strong>#{{ p.id }}</strong> · {{ p.cliente }}</span>
            <span class="pending-date">{{ formatearFecha(p.fecha) }}</span>
          </a>
        } @empty {
          <div class="empty-state" style="padding: 24px;">
            <div class="empty-state-icon">✓</div>
            <strong class="empty-state-title">Todo al día</strong>
            <span class="empty-state-desc">No hay pedidos pendientes por atender en este momento.</span>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .resumen-header {
      margin-bottom: 18px;
    }

    .subtitle {
      margin: 4px 0 0;
      font-size: 13.5px;
      color: var(--muted);
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }

    .kpi-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r-m);
      padding: 18px 20px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 10px;
      cursor: pointer;
      font: inherit;
      text-align: left;
      transition: border-color 0.15s, transform 0.12s;
    }

    .kpi-card:hover {
      border-color: var(--primary);
      transform: translateY(-1px);
    }

    .kpi-num {
      font-size: 32px;
      font-weight: 700;
      line-height: 1;
      color: var(--ink);
    }

    .kpi-sub {
      font-size: 13px;
      color: var(--muted);
    }

    .dist-card {
      margin-bottom: 20px;
    }

    .dist-bar {
      height: 18px;
      border-radius: 6px;
      background: var(--bg);
      overflow: hidden;
      display: flex;
      gap: 2px;
      margin-bottom: 10px;
    }

    .dist-seg {
      height: 100%;
    }

    .dist-seg.Pendiente { background: var(--citrico-fill); }
    .dist-seg.Confirmado { background: var(--menta-fill); }
    .dist-seg.Despachado { background: var(--primary); }
    .dist-seg.Rechazado { background: var(--fram-fill); }
    .dist-seg.Cancelado { background: var(--neu); }

    .dist-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      font-size: 12.5px;
      color: var(--muted);
    }

    .pending-card {
      margin-top: 10px;
    }

    .pending-header {
      background: var(--bg);
      padding: 12px 18px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13.5px;
    }

    .ver-todos {
      font-weight: 700;
      font-size: 13px;
      color: var(--primary);
    }

    .pending-list {
      display: flex;
      flex-direction: column;
    }

    .pending-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 13px 18px;
      border-bottom: 1px solid var(--line);
      color: var(--ink);
      font-size: 14px;
      transition: background 0.12s;
    }

    .pending-row:last-child {
      border-bottom: none;
    }

    .pending-row:hover {
      background: var(--bg);
    }

    .pending-date {
      color: var(--muted);
      font-size: 13px;
    }

    @media (max-width: 768px) {
      .kpi-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .kpi-num {
        font-size: 26px;
      }
    }
  `],
})
export class ResumenComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  readonly estados = ESTADOS;

  resumen = signal<ResumenPedidos>({
    total: 0,
    porEstado: {
      Pendiente: 0,
      Confirmado: 0,
      Despachado: 0,
      Rechazado: 0,
      Cancelado: 0,
    },
  });

  pendientes = signal<Pedido[]>([]);
  error = signal('');

  ngOnInit() {
    interval(5000)
      .pipe(
        startWith(0),
        switchMap(() => this.api.obtenerResumen().pipe(catchError(() => of(null)))),
        takeUntil(this.destroy$)
      )
      .subscribe(r => {
        if (r) this.resumen.set(r);
      });

    interval(5000)
      .pipe(
        startWith(0),
        switchMap(() => this.api.listarPedidos('Pendiente').pipe(catchError(() => of(null)))),
        takeUntil(this.destroy$)
      )
      .subscribe(lista => {
        if (lista) this.pendientes.set(lista.slice(0, 5));
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  contar(est: EstadoPedido): number {
    return this.resumen().porEstado[est] ?? 0;
  }

  porcentaje(est: EstadoPedido): number {
    const total = this.resumen().total;
    if (total === 0) return 0;
    return Math.round((this.contar(est) / total) * 100);
  }

  irAEstado(est: EstadoPedido) {
    this.router.navigate(['/pedidos'], { queryParams: { estado: est } });
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
