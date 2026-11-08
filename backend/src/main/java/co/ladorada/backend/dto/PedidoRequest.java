package co.ladorada.backend.dto;

import java.util.List;

/**
 * Entrada de POST /api/pedidos. Misma forma que NuevoPedido de models.ts.
 * No trae precio ni total a propósito: los calcula el servidor (riesgo 2 del documento técnico).
 * Las validaciones se hacen en PedidoService para devolver los mensajes exactos del documento.
 */
public record PedidoRequest(String cliente, String telefonoCliente, List<LineaRequest> lineas) {

    public record LineaRequest(Integer idProducto, Integer cantidad) {
    }
}
