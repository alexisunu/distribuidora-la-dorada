package co.ladorada.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import co.ladorada.backend.model.DetallePedido;
import co.ladorada.backend.model.HistorialEstado;
import co.ladorada.backend.model.Pedido;

/**
 * Misma forma que la interfaz Pedido del frontend. Es la respuesta de TODOS los endpoints de pedidos.
 * Debe construirse dentro de la transacción del servicio (open-in-view está desactivado).
 */
public record PedidoDto(Integer id, String cliente, String telefonoCliente, String estado, LocalDateTime fecha,
                        BigDecimal total, String vendedor, List<LineaDto> lineas, List<HistorialDto> historial) {

    public record LineaDto(Integer idProducto, String codigo, String nombre, Integer cantidad,
                           BigDecimal precioUnitario, BigDecimal subtotal) {
        static LineaDto de(DetallePedido d) {
            return new LineaDto(d.getProducto().getId(), d.getProducto().getReferencia(), d.getProducto().getNombre(),
                    d.getCantidad(), d.getPrecioUnitarioVenta(), d.getSubtotal());
        }
    }

    public record HistorialDto(String estadoAnterior, String estadoNuevo, String motivo, String usuario,
                               LocalDateTime fecha) {
        static HistorialDto de(HistorialEstado h) {
            return new HistorialDto(
                    h.getEstadoAnterior() == null ? null : h.getEstadoAnterior().etiqueta(),
                    h.getEstadoNuevo().etiqueta(), h.getMotivo(), h.getUsuario().getNombreCompleto(), h.getFechaHora());
        }
    }

    public static PedidoDto de(Pedido p) {
        return new PedidoDto(p.getId(), p.getNombreCliente(), p.getTelefonoCliente(), p.getEstado().etiqueta(),
                p.getFechaCreacion(), p.getTotal(), p.getUsuario().getNombreCompleto(),
                p.getDetalles().stream().map(LineaDto::de).toList(),
                p.getHistorial().stream().map(HistorialDto::de).toList());
    }
}
