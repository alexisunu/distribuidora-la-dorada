import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, catchError, interval, of, startWith, switchMap, takeUntil } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { EstadoPedido, Pedido } from '../../core/models';

const ESTADOS: EstadoPedido[] = ['Pendiente', 'Confirmado', 'Despachado', 'Rechazado', 'Cancelado'];

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-header">
      <h1>Pedidos</h1>
      <a routerLink="/pedidos/nuevo" class="btn only-desktop">+ Nuevo pedido</a>
    </div>

    <!-- Barra de búsqueda por número de pedido o nombre de cliente (Sprint 5) -->
    <div class="search-bar-row">
      <div class="search-box">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          type="text"
          [ngModel]="busqueda()"
          (ngModelChange)="onBusquedaChange($event)"
          placeholder="Buscar por número (#1042) o nombre del cliente"
          aria-label="Buscar pedidos por número o cliente"
        >
      </div>
      @if (busqueda()) {
        <button type="button" class="btn sec sm clear-search-btn" (click)="limpiarBusqueda()">Limpiar</button>
      }
    </div>

    <!-- Chips de filtro por estado (combinable con búsqueda) -->
    <div class="chips-bar" role="tablist" aria-label="Filtrar pedidos por estado">
      <button
        type="button"
        class="chip"
        [class.active]="filtroEstado() === 'Todos'"
        (click)="cambiarFiltro('Todos')"
      >
        Todos <span class="only-desktop">· {{ contarTotal() }}</span>
      </button>

      @for (est of estados; track est) {
        <button
          type="button"
          class="chip"
          [class.active]="filtroEstado() === est"
          (click)="cambiarFiltro(est)"
        >
          {{ est }} <span class="only-desktop">· {{ contarPorEstado(est) }}</span>
        </button>
      }
    </div>

    <!-- Tabla de escritorio -->
    <div class="table-wrap only-desktop">
      <table>
        <thead>
          <tr>
            <th>Nº</th>
            <th>Cliente</th>
            <th>Fecha</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Registrado por</th>
          </tr>
        </thead>
        <tbody>
          @for (p of pedidosPaginados(); track p.id) {
            <tr class="clickable-row" (click)="abrirDetalle(p.id)">
              <td class="num-cell">#{{ p.id }}</td>
              <td><strong>{{ p.cliente }}</strong></td>
              <td class="date-cell">{{ formatearFecha(p.fecha) }}</td>
              <td><strong>$ {{ formatearPrecio(p.total) }}</strong></td>
              <td><span class="badge" [class]="p.estado">{{ p.estado }}</span></td>
              <td>{{ p.vendedor }}</td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6">
                <div class="empty-state">
                  <div class="empty-state-icon">🔍</div>
                  <strong class="empty-state-title">No se encontraron pedidos</strong>
                  <span class="empty-state-desc">
                    {{ busqueda() ? 'Ningún pedido coincide con «' + busqueda() + '»' + (filtroEstado() !== 'Todos' ? ' en estado ' + filtroEstado() : '') + '.' : 'No hay pedidos en estado ' + filtroEstado() + '.' }}
                  </span>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Paginación de escritorio -->
    @if (pedidosFiltrados().length > 0) {
      <div class="pagination-bar only-desktop">
        <span class="caption-note" style="margin: 0;">
          Mostrando {{ rangoInicio() }}–{{ rangoFin() }} de {{ pedidosFiltrados().length }}. Cada fila abre el detalle del pedido.
        </span>
        <div class="page-buttons">
          <button type="button" class="btn sec sm" [disabled]="pagina() <= 1" (click)="pagina.set(pagina() - 1)">Anterior</button>
          <button type="button" class="btn sec sm" [disabled]="rangoFin() >= pedidosFiltrados().length" (click)="pagina.set(pagina() + 1)">Siguiente</button>
        </div>
      </div>
    }

    <!-- Lista de tarjetas en móvil -->
    <div class="mobile-orders only-mobile">
      @for (p of pedidosFiltrados(); track p.id) {
        <div class="order-card" (click)="abrirDetalle(p.id)">
          <div class="order-card-top">
            <strong>#{{ p.id }} · {{ p.cliente }}</strong>
            <span class="badge" [class]="p.estado">{{ p.estado }}</span>
          </div>
          <div class="order-card-bottom">
            <span class="order-meta">{{ formatearFecha(p.fecha) }} · {{ p.vendedor }}</span>
            <strong class="order-total">$ {{ formatearPrecio(p.total) }}</strong>
          </div>
        </div>
      } @empty {
        <div class="card empty-state">
          <div class="empty-state-icon">🔍</div>
          <strong class="empty-state-title">Sin coincidencias</strong>
          <span class="empty-state-desc">
            {{ busqueda() ? 'No hay resultados para «' + busqueda() + '».' : 'No hay pedidos registrados en este estado.' }}
          </span>
        </div>
      }
    </div>

    <!-- FAB Móvil -->
    <a routerLink="/pedidos/nuevo" class="fab-btn only-mobile" title="Nuevo pedido">+</a>
  `,
  styles: [`
    .search-bar-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }

    .search-box {
      position: relative;
      flex: 1;
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

    .clear-search-btn {
      white-space: nowrap;
    }

    .chips-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 18px;
    }

    .chip {
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      padding: 7px 14px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: var(--surface);
      color: var(--ink);
      cursor: pointer;
      transition: background 0.15s, color 0.15s, border-color 0.15s;
    }

    .chip:hover {
      border-color: var(--primary);
    }

    .chip.active {
      background: #073E52;
      color: #FFFFFF;
      border-color: #073E52;
    }

    .clickable-row {
      cursor: pointer;
      transition: background 0.12s;
    }

    .clickable-row:hover td {
      background: var(--bg);
    }

    .num-cell {
      font-weight: 700;
      color: var(--ink);
    }

    .date-cell {
      color: var(--muted);
    }

    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 14px;
      gap: 12px;
    }

    .page-buttons {
      display: flex;
      gap: 8px;
    }

    .mobile-orders {
      display: none;
      flex-direction: column;
      gap: 10px;
    }

    .order-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r-m);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      cursor: pointer;
    }

    .order-card-top,
    .order-card-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .order-meta {
      font-size: 12.5px;
      color: var(--muted);
    }

    .order-total {
      font-size: 15px;
    }

    .fab-btn {
      position: fixed;
      right: 20px;
      bottom: 76px;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--primary);
      color: var(--on-primary);
      display: none;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 600;
      box-shadow: 0 6px 18px rgba(10, 108, 138, 0.35);
      z-index: 40;
    }

    @media (max-width: 768px) {
      .chips-bar {
        flex-wrap: nowrap;
        overflow-x: auto;
        padding-bottom: 4px;
      }

      .chip {
        white-space: nowrap;
      }

      .mobile-orders {
        display: flex;
      }

      .fab-btn {
        display: inline-flex;
      }
    }
  `],
})
export class PedidosComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  readonly estados = ESTADOS;
  readonly porPagina = 8;

  pedidos = signal<Pedido[]>([]);
  filtroEstado = signal<'Todos' | EstadoPedido>('Todos');
  busqueda = signal('');
  pagina = signal(1);

  readonly pedidosFiltrados = computed(() => {
    const f = this.filtroEstado();
    const q = this.busqueda().trim().toLowerCase().replace(/^#/, '');
    return this.pedidos().filter(p => {
      const coincideEstado = f === 'Todos' || p.estado === f;
      if (!coincideEstado) return false;
      if (!q) return true;
      const coincideNum = String(p.id).includes(q);
      const coincideCli = p.cliente.toLowerCase().includes(q);
      return coincideNum || coincideCli;
    });
  });

  readonly pedidosPaginados = computed(() => {
    const inicio = (this.pagina() - 1) * this.porPagina;
    return this.pedidosFiltrados().slice(inicio, inicio + this.porPagina);
  });

  readonly rangoInicio = computed(() => {
    if (this.pedidosFiltrados().length === 0) return 0;
    return (this.pagina() - 1) * this.porPagina + 1;
  });

  readonly rangoFin = computed(() => {
    return Math.min(this.pagina() * this.porPagina, this.pedidosFiltrados().length);
  });

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      const est = params.get('estado') as EstadoPedido | null;
      if (est && ESTADOS.includes(est)) {
        this.filtroEstado.set(est);
      } else {
        this.filtroEstado.set('Todos');
      }
      this.pagina.set(1);
    });

    // Polling opcional cada 5s para mantener sincronizadas las órdenes entre ventanas
    interval(5000)
      .pipe(
        startWith(0),
        switchMap(() => this.api.listarPedidos().pipe(catchError(() => of(null)))),
        takeUntil(this.destroy$)
      )
      .subscribe(lista => {
        if (lista) {
          this.pedidos.set(lista);
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBusquedaChange(val: string) {
    this.busqueda.set(val);
    this.pagina.set(1);
  }

  limpiarBusqueda() {
    this.busqueda.set('');
    this.pagina.set(1);
  }

  cambiarFiltro(estado: 'Todos' | EstadoPedido) {
    this.filtroEstado.set(estado);
    this.pagina.set(1);
  }

  contarTotal(): number {
    return this.pedidos().length;
  }

  contarPorEstado(estado: EstadoPedido): number {
    return this.pedidos().filter(p => p.estado === estado).length;
  }

  abrirDetalle(id: number) {
    this.router.navigate(['/pedidos', id]);
  }

  formatearPrecio(valor: number): string {
    return Math.round(valor).toLocaleString('es-CO');
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
