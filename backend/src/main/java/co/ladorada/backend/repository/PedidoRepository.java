package co.ladorada.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import co.ladorada.backend.model.EstadoPedido;
import co.ladorada.backend.model.Pedido;
import jakarta.persistence.LockModeType;

public interface PedidoRepository extends JpaRepository<Pedido, Integer> {

    /** SELECT ... FOR UPDATE sobre la fila del pedido: quien llegue segundo espera a que la primera transacción termine. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Pedido p where p.id = :id")
    Optional<Pedido> buscarParaActualizar(@Param("id") Integer id);

    /** Detalle: trae el pedido con vendedor, líneas y productos en una sola consulta (el historial se carga por lotes). */
    @EntityGraph(attributePaths = {"usuario", "detalles", "detalles.producto"})
    @Query("select p from Pedido p where p.id = :id")
    Optional<Pedido> buscarConDetalle(@Param("id") Integer id);

    @EntityGraph(attributePaths = {"usuario", "detalles", "detalles.producto"})
    List<Pedido> findAllByOrderByIdDesc();

    @EntityGraph(attributePaths = {"usuario", "detalles", "detalles.producto"})
    List<Pedido> findByEstadoOrderByIdDesc(EstadoPedido estado);

    /** Cola de despachos: los de un estado, del más antiguo al más reciente (el id desempata fechas iguales). */
    @EntityGraph(attributePaths = {"usuario", "detalles", "detalles.producto"})
    List<Pedido> findByEstadoOrderByFechaCreacionAscIdAsc(EstadoPedido estado);

    /** Resumen: una sola consulta con GROUP BY. Cada fila es {estado, cantidad}; los estados sin pedidos no aparecen. */
    @Query("select p.estado, count(p) from Pedido p group by p.estado")
    List<Object[]> contarPorEstado();
}
