import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { EstadoPedido, Pedido } from '../../core/models';

const ESTADOS: EstadoPedido[] = ['Pendiente', 'Confirmado', 'Despachado', 'Rechazado', 'Cancelado'];

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-header">
      <h1>Pedidos</h1>
      <a routerLink="/pedidos/nuevo" class="btn only-desktop">+ Nuevo pedido</a>
    </div>

    <!-- Chips de filtro por estado -->
    <div class="chips-bar" role="tablist" aria-label="Filtrar pedidos por estado">
      <button
        type="button"
        class="chip"
        [class.active]="filtroEstado() === 'Todos'"
        (click)="cambiarFiltro('Todos')"
      >
        Todos <span class="only-desktop">· {{ pedidos().length }}</span>
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
                  <div class="empty-state-icon">📋</div>
                  <strong class="empty-state-title">No hay pedidos registrados</strong>
                  <span class="empty-state-desc">
                    {{ filtroEstado() === 'Todos' ? 'Aún no se han registrado órdenes en el sistema.' : 'No existen pedidos en estado ' + filtroEstado() + '.' }}
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
          <div class="empty-state-icon">📋</div>
          <strong class="empty-state-title">Sin pedidos</strong>
          <span class="empty-state-desc">
            {{ filtroEstado() === 'Todos' ? 'No hay pedidos en la lista.' : 'No hay pedidos en estado ' + filtroEstado() + '.' }}
          </span>
        </div>
      }
    </div>

    <!-- FAB Móvil -->
    <a routerLink="/pedidos/nuevo" class="fab-btn only-mobile" title="Nuevo pedido">+</a>
  `,
  styles: [`
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
export class PedidosComponent implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly estados = ESTADOS;
  readonly porPagina = 8;

  pedidos = signal<Pedido[]>([]);
  filtroEstado = signal<'Todos' | EstadoPedido>('Todos');
  pagina = signal(1);

  readonly pedidosFiltrados = computed(() => {
    const f = this.filtroEstado();
    const lista = this.pedidos();
    if (f === 'Todos') return lista;
    return lista.filter(p => p.estado === f);
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
    this.api.listarPedidos().subscribe(lista => this.pedidos.set(lista));
  }

  cambiarFiltro(estado: 'Todos' | EstadoPedido) {
    this.filtroEstado.set(estado);
    this.pagina.set(1);
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
