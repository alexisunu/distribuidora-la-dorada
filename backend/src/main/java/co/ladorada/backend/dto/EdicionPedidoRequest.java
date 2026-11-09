package co.ladorada.backend.dto;

import java.util.List;

/**
 * Entrada de PUT /api/pedidos/{id}: las líneas que quedan en el pedido Pendiente, con su nueva cantidad.
 * Una línea que no venga aquí se quita. No trae cliente, precio ni total: el cliente no se edita y el total lo
 * recalcula el servidor. Reutiliza LineaRequest de PedidoRequest (misma forma que NuevoPedido.lineas de models.ts).
 */
public record EdicionPedidoRequest(List<PedidoRequest.LineaRequest> lineas) {
}
