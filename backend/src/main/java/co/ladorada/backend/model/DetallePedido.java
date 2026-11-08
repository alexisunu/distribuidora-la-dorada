package co.ladorada.backend.model;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Línea del pedido. Tabla detalle_pedido (V1). */
@Entity
@Table(name = "detalle_pedido")
@Getter
@Setter
@NoArgsConstructor
public class DetallePedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_detalle")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_pedido", nullable = false)
    private Pedido pedido;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_producto", nullable = false)
    private Producto producto;

    /**
     * Lectura de solo la llave foránea. Sirve para saber qué productos bloquear SIN cargar la entidad Producto:
     * si se cargara antes del SELECT ... FOR UPDATE, Hibernate conservaría el stock viejo en memoria y se perdería
     * el valor que otra transacción acaba de escribir.
     */
    @Column(name = "id_producto", insertable = false, updatable = false)
    private Integer idProducto;

    @Column(name = "cantidad", nullable = false)
    private Integer cantidad;

    /** Precio vigente al crear el pedido; no cambia si el producto sube de precio después. */
    @Column(name = "precio_unitario_venta", nullable = false)
    private BigDecimal precioUnitarioVenta;

    /**
     * La columna subtotal de la base es GENERATED ALWAYS (cantidad * precio_unitario_venta): no se mapea
     * porque Postgres rechazaría cualquier INSERT que la incluya. Se calcula con la misma fórmula.
     */
    public BigDecimal getSubtotal() {
        return precioUnitarioVenta.multiply(BigDecimal.valueOf(cantidad));
    }
}
