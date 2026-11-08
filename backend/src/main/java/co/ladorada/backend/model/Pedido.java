package co.ladorada.backend.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.BatchSize;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Cabecera del pedido. Tabla pedido (V1). Sin @Data/@ToString: las relaciones de ida y vuelta causarían recursión. */
@Entity
@Table(name = "pedido")
@Getter
@Setter
@NoArgsConstructor
public class Pedido {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pedido")
    private Integer id;

    /** Quien registró el pedido (RF-17). */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "nombre_cliente", nullable = false, length = 150)
    private String nombreCliente;

    @Column(name = "telefono_cliente", nullable = false, length = 20)
    private String telefonoCliente;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 15)
    private EstadoPedido estado = EstadoPedido.PENDIENTE;

    /** Redundancia controlada: la calcula solo el backend, al crear y al editar un pedido Pendiente. */
    @Column(name = "total", nullable = false)
    private BigDecimal total;

    /** orphanRemoval: al editar un pedido Pendiente, quitar una línea de la lista borra su fila de detalle_pedido. */
    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL, orphanRemoval = true)
    @BatchSize(size = 50)
    private List<DetallePedido> detalles = new ArrayList<>();

    @OneToMany(mappedBy = "pedido", cascade = CascadeType.ALL)
    @OrderBy("id ASC")
    @BatchSize(size = 50)
    private List<HistorialEstado> historial = new ArrayList<>();

    /** Hibernate inserta todas las columnas mapeadas, así que el DEFAULT now() de la base no se aplicaría: se asigna aquí. */
    @PrePersist
    void antesDeGuardar() {
        if (fechaCreacion == null) fechaCreacion = LocalDateTime.now();
    }

    /** Agrega una línea congelando el precio vigente del producto en este momento. */
    public DetallePedido agregarDetalle(Producto producto, int cantidad) {
        DetallePedido d = new DetallePedido();
        d.setPedido(this);
        d.setProducto(producto);
        d.setCantidad(cantidad);
        d.setPrecioUnitarioVenta(producto.getPrecioUnitario());
        detalles.add(d);
        return d;
    }

    /** Agrega una fila de auditoría. Asigna los dos lados de la relación (si no, id_pedido iría nulo). */
    public HistorialEstado agregarHistorial(EstadoPedido anterior, EstadoPedido nuevo, String motivo, Usuario responsable) {
        HistorialEstado h = new HistorialEstado();
        h.setPedido(this);
        h.setEstadoAnterior(anterior);
        h.setEstadoNuevo(nuevo);
        h.setMotivo(motivo);
        h.setUsuario(responsable);
        // La fila se inserta recién al hacer commit, pero la respuesta se arma antes: la fecha se asigna aquí.
        h.setFechaHora(LocalDateTime.now());
        historial.add(h);
        return h;
    }
}
