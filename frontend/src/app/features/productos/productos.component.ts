import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/auth/auth.service';
import { Producto } from '../../core/models';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1>Productos</h1>
      @if (esAdmin()) {
        <button type="button" class="btn only-desktop" (click)="abrirNuevo()">+ Nuevo producto</button>
      }
    </div>

    @if (mensajeOk()) {
      <div class="toast-ok" style="margin-bottom: 14px;">{{ mensajeOk() }}</div>
    }

    <!-- Barra de búsqueda y filtro de existencias -->
    <div class="filters-row">
      <div class="search-box">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          type="text"
          [ngModel]="busqueda()"
          (ngModelChange)="busqueda.set($event)"
          placeholder="Buscar por nombre o código"
          aria-label="Buscar producto por nombre o código"
        >
      </div>

      <select
        class="stock-filter only-desktop"
        [ngModel]="filtroStock()"
        (ngModelChange)="filtroStock.set($event)"
        aria-label="Filtrar por estado de existencias"
      >
        <option value="todas">Existencias: todas</option>
        <option value="disponibles">Existencias: disponibles</option>
        <option value="bajas">Existencias: bajas</option>
        <option value="agotado">Existencias: agotadas</option>
      </select>
    </div>

    <!-- Vista de Escritorio: Tabla -->
    <div class="table-wrap only-desktop">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th>Precio (COP)</th>
            <th>Existencias</th>
            @if (puedeAcciones()) {
              <th>Acciones</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (p of productosFiltrados(); track p.id) {
            <tr [class.row-low]="esBajo(p)" [class.row-out]="p.existencias === 0">
              <td class="code-cell">{{ p.codigo }}</td>
              <td>
                <strong>{{ p.nombre }}</strong>
              </td>
              <td>$ {{ formatearPrecio(p.precio) }}</td>
              <td>
                <div class="stock-cell">
                  <strong>{{ p.existencias }}</strong>
                  @if (p.existencias === 0) {
                    <span class="badge Agotado">Agotado</span>
                  } @else if (esBajo(p)) {
                    <span class="badge Bajas">Bajas</span>
                  }
                </div>
              </td>
              @if (puedeAcciones()) {
                <td>
                  <div class="actions-cell">
                    @if (esAdmin()) {
                      <button type="button" class="btn sec sm" (click)="abrirEditar(p)">Editar</button>
                    }
                    @if (puedeAjustar()) {
                      <button type="button" class="btn sec sm" (click)="abrirAjustar(p)">Ajustar</button>
                    }
                  </div>
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td [attr.colspan]="puedeAcciones() ? 5 : 4">
                <div class="empty-state">
                  <div class="empty-state-icon">🔍</div>
                  <strong class="empty-state-title">Sin resultados</strong>
                  <span class="empty-state-desc">No se encontraron productos que coincidan con los criterios de búsqueda.</span>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Vista Móvil: Tarjetas -->
    <div class="mobile-list only-mobile">
      @for (p of productosFiltrados(); track p.id) {
        <div class="prod-card" [class.row-low]="esBajo(p)" [class.row-out]="p.existencias === 0">
          <div class="prod-card-main">
            <div>
              <strong class="prod-name">{{ p.nombre }}</strong>
              <div class="prod-meta">
                <span>{{ p.codigo }} · Existencias: {{ p.existencias }}</span>
                @if (p.existencias === 0) {
                  <span class="badge Agotado">Agotado</span>
                } @else if (esBajo(p)) {
                  <span class="badge Bajas">Bajas</span>
                }
              </div>
            </div>
            <strong class="prod-price">$ {{ formatearPrecio(p.precio) }}</strong>
          </div>

          @if (puedeAcciones()) {
            <div class="prod-card-actions">
              @if (esAdmin()) {
                <button type="button" class="btn sec sm" (click)="abrirEditar(p)">Editar</button>
              }
              @if (puedeAjustar()) {
                <button type="button" class="btn sec sm" (click)="abrirAjustar(p)">Ajustar existencias</button>
              }
            </div>
          }
        </div>
      } @empty {
        <div class="card empty-state">
          <div class="empty-state-icon">🔍</div>
          <strong class="empty-state-title">Sin coincidencias</strong>
          <span class="empty-state-desc">No hay productos que coincidan con la búsqueda.</span>
        </div>
      }
    </div>

    <p class="caption-note">
      Editar: solo Administrador. Ajustar existencias: Bodega y Administrador. Los botones que el rol no puede usar no se muestran.
    </p>

    <!-- FAB Móvil para Administrador -->
    @if (esAdmin()) {
      <button type="button" class="fab-btn only-mobile" (click)="abrirNuevo()" title="Nuevo producto">+</button>
    }

    <!-- Modal Crear / Editar Producto (Exclusivo Administrador) -->
    @if (modalProductoAbierto()) {
      <div class="modal-backdrop" (click)="cerrarModales()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h2>{{ editandoId() ? 'Editar producto' : 'Nuevo producto' }}</h2>

          @if (errorModal()) {
            <div class="error" style="margin-bottom: 12px;">{{ errorModal() }}</div>
          }

          <form (ngSubmit)="guardarProducto()" class="modal-form">
            <div class="form-grid-2">
              <div>
                <label for="prod-codigo">Código / Referencia</label>
                <input id="prod-codigo" name="codigo" [(ngModel)]="formCodigo" placeholder="ej. P-009" required>
              </div>
              <div>
                <label for="prod-precio">Precio unitario (COP)</label>
                <input id="prod-precio" name="precio" type="number" min="1" [(ngModel)]="formPrecio" required>
              </div>
            </div>

            <div>
              <label for="prod-nombre">Nombre del producto</label>
              <input id="prod-nombre" name="nombre" [(ngModel)]="formNombre" placeholder="ej. Jabón multiusos 1 L" required>
            </div>

            <div class="form-grid-2">
              <div>
                <label for="prod-stock">Existencias iniciales / actuales</label>
                <input id="prod-stock" name="existencias" type="number" min="0" [(ngModel)]="formExistencias" required>
              </div>
              <div>
                <label for="prod-min">Umbral de existencias bajas</label>
                <input id="prod-min" name="stockMinimo" type="number" min="0" [(ngModel)]="formStockMinimo">
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn sec" (click)="cerrarModales()">Cancelar</button>
              <button type="submit" class="btn">Guardar producto</button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Modal Ajustar Existencias (Bodega y Administrador) -->
    @if (productoAjustando()) {
      <div class="modal-backdrop" (click)="cerrarModales()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h2>Ajustar existencias</h2>
          <p class="muted-text">
            <strong>{{ productoAjustando()!.codigo }} · {{ productoAjustando()!.nombre }}</strong><br>
            Ingresa la cantidad resultante del conteo físico en bodega (entero ≥ 0).
          </p>

          @if (errorModal()) {
            <div class="error" style="margin-bottom: 12px;">{{ errorModal() }}</div>
          }

          <form (ngSubmit)="confirmarAjuste()" class="modal-form">
            <div>
              <label for="ajuste-cant">Existencias físicas actuales</label>
              <input
                id="ajuste-cant"
                name="ajusteExistencias"
                type="number"
                step="1"
                [(ngModel)]="formAjusteCantidad"
                required
              >
            </div>

            <div class="modal-actions">
              <button type="button" class="btn sec" (click)="cerrarModales()">Cancelar</button>
              <button type="submit" class="btn">Confirmar ajuste</button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    .filters-row {
      display: grid;
      grid-template-columns: 1fr 220px;
      gap: 12px;
      margin-bottom: 16px;
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

    .code-cell {
      color: var(--muted);
      font-weight: 600;
      font-size: 13px;
    }

    .stock-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .actions-cell {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    tr.row-low td {
      background: rgba(244, 183, 31, 0.08);
    }

    tr.row-out td {
      background: rgba(224, 83, 111, 0.08);
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .muted-text {
      color: var(--muted);
      font-size: 13.5px;
      margin: 0 0 14px;
    }

    .mobile-list {
      display: none;
      flex-direction: column;
      gap: 10px;
    }

    .prod-card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--r-m);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .prod-card.row-low {
      background: rgba(244, 183, 31, 0.08);
      border-color: rgba(244, 183, 31, 0.45);
    }

    .prod-card.row-out {
      background: rgba(224, 83, 111, 0.08);
      border-color: rgba(224, 83, 111, 0.45);
    }

    .prod-card-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .prod-name {
      font-size: 15px;
      display: block;
      margin-bottom: 4px;
    }

    .prod-meta {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 12.5px;
      color: var(--muted);
    }

    .prod-price {
      font-size: 15px;
      white-space: nowrap;
    }

    .prod-card-actions {
      display: flex;
      gap: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--line);
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
      border: none;
      font-size: 28px;
      line-height: 1;
      box-shadow: 0 6px 18px rgba(10, 108, 138, 0.35);
      cursor: pointer;
      z-index: 40;
    }

    @media (max-width: 768px) {
      .filters-row {
        grid-template-columns: 1fr;
      }

      .mobile-list {
        display: flex;
      }

      .form-grid-2 {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class ProductosComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  productos = signal<Producto[]>([]);
  busqueda = signal('');
  filtroStock = signal<'todas' | 'disponibles' | 'bajas' | 'agotado'>('todas');
  mensajeOk = signal('');

  modalProductoAbierto = signal(false);
  editandoId = signal<number | null>(null);
  productoAjustando = signal<Producto | null>(null);
  errorModal = signal('');

  formCodigo = '';
  formNombre = '';
  formPrecio = 0;
  formExistencias = 0;
  formStockMinimo = 10;
  formAjusteCantidad = 0;

  readonly esAdmin = computed(() => this.auth.rol() === 'ADMINISTRADOR');
  readonly puedeAjustar = computed(() => this.auth.rol() === 'ADMINISTRADOR' || this.auth.rol() === 'BODEGA');
  readonly puedeAcciones = computed(() => this.esAdmin() || this.puedeAjustar());

  readonly productosFiltrados = computed(() => {
    const q = this.busqueda().trim().toLowerCase();
    const f = this.filtroStock();
    return this.productos().filter(p => {
      const coincideTexto = !q || p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q);
      if (!coincideTexto) return false;
      if (f === 'agotado') return p.existencias === 0;
      if (f === 'bajas') return this.esBajo(p);
      if (f === 'disponibles') return p.existencias > 0;
      return true;
    });
  });

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.api.listarProductos().subscribe(lista => this.productos.set(lista));
  }

  esBajo(p: Producto): boolean {
    const umbral = p.stockMinimo ?? 10;
    return p.existencias > 0 && p.existencias <= umbral;
  }

  formatearPrecio(valor: number): string {
    return Math.round(valor).toLocaleString('es-CO');
  }

  abrirNuevo() {
    this.errorModal.set('');
    this.editandoId.set(null);
    const sigNum = this.productos().length + 1;
    this.formCodigo = `P-${String(sigNum).padStart(3, '0')}`;
    this.formNombre = '';
    this.formPrecio = 10000;
    this.formExistencias = 20;
    this.formStockMinimo = 10;
    this.modalProductoAbierto.set(true);
  }

  abrirEditar(p: Producto) {
    this.errorModal.set('');
    this.editandoId.set(p.id);
    this.formCodigo = p.codigo;
    this.formNombre = p.nombre;
    this.formPrecio = p.precio;
    this.formExistencias = p.existencias;
    this.formStockMinimo = p.stockMinimo ?? 10;
    this.modalProductoAbierto.set(true);
  }

  abrirAjustar(p: Producto) {
    this.errorModal.set('');
    this.productoAjustando.set(p);
    this.formAjusteCantidad = p.existencias;
  }

  cerrarModales() {
    this.modalProductoAbierto.set(false);
    this.productoAjustando.set(null);
    this.errorModal.set('');
  }

  guardarProducto() {
    this.errorModal.set('');
    const dto = {
      codigo: this.formCodigo,
      nombre: this.formNombre,
      precio: Number(this.formPrecio),
      existencias: Number(this.formExistencias),
      stockMinimo: Number(this.formStockMinimo),
    };
    const id = this.editandoId();
    const obs = id ? this.api.editarProducto(id, dto) : this.api.crearProducto(dto);
    obs.subscribe({
      error: e => this.errorModal.set(e?.error?.mensaje ?? 'Error al guardar el producto.'),
      next: prod => {
        this.cerrarModales();
        this.cargar();
        this.mostrarToast(id ? `Producto ${prod.codigo} actualizado.` : `Producto ${prod.codigo} registrado.`);
      },
    });
  }

  confirmarAjuste() {
    const p = this.productoAjustando();
    if (!p) return;
    this.errorModal.set('');
    this.api.ajustarExistencias(p.id, Number(this.formAjusteCantidad)).subscribe({
      error: e => this.errorModal.set(e?.error?.mensaje ?? 'Las existencias no pueden ser negativas'),
      next: actualizado => {
        this.cerrarModales();
        this.cargar();
        this.mostrarToast(`Existencias de ${actualizado.nombre} ajustadas a ${actualizado.existencias} unidades.`);
      },
    });
  }

  private mostrarToast(msg: string) {
    this.mensajeOk.set(msg);
    setTimeout(() => this.mensajeOk.set(''), 3500);
  }
}
