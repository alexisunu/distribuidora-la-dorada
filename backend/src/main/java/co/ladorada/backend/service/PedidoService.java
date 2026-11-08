package co.ladorada.backend.service;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.ladorada.backend.dto.PedidoDto;
import co.ladorada.backend.dto.PedidoRequest;
import co.ladorada.backend.exception.NegocioException;
import co.ladorada.backend.exception.NoAutorizadoException;
import co.ladorada.backend.exception.NoEncontradoException;
import co.ladorada.backend.exception.SolicitudInvalidaException;
import co.ladorada.backend.model.DetallePedido;
import co.ladorada.backend.model.EstadoPedido;
import co.ladorada.backend.model.MotivoPedido;
import co.ladorada.backend.model.Pedido;
import co.ladorada.backend.model.Producto;
import co.ladorada.backend.model.Usuario;
import co.ladorada.backend.repository.PedidoRepository;
import co.ladorada.backend.repository.ProductoRepository;
import co.ladorada.backend.repository.UsuarioRepository;

/**
 * Reglas de negocio de pedidos: máquina de estados y descuento de existencias (documento técnico, 5.5 y 5.7).
 * Cada operación es una sola transacción: si algo falla, no queda nada a medias.
 */
@Service
public class PedidoService {

    private static final String MOTIVO_INICIAL = "Registro inicial del pedido";
    private static final String MOTIVO_CONFIRMACION = "Confirmación y descuento de inventario";

    private final PedidoRepository pedidos;
    private final ProductoRepository productos;
    private final UsuarioRepository usuarios;

    public PedidoService(PedidoRepository pedidos, ProductoRepository productos, UsuarioRepository usuarios) {
        this.pedidos = pedidos;
        this.productos = productos;
        this.usuarios = usuarios;
    }

    // ------------------------------------------------------------------ crear

    /** Tiempo 1 del flujo: el pedido nace Pendiente y NO toca las existencias. */
    @Transactional
    public PedidoDto crear(PedidoRequest r, Integer idUsuario) {
        String cliente = r.cliente() == null ? "" : r.cliente().trim();
        String telefono = r.telefonoCliente() == null ? "" : r.telefonoCliente().trim();
        if (cliente.isEmpty() || telefono.isEmpty()) {
            throw new SolicitudInvalidaException("El nombre y contacto del cliente son obligatorios para registrar el pedido");
        }
        if (cliente.length() > 150) {
            throw new SolicitudInvalidaException("El nombre del cliente admite máximo 150 caracteres.");
        }
        if (telefono.length() > 20) {
            throw new SolicitudInvalidaException("El teléfono del cliente admite máximo 20 caracteres.");
        }
        if (r.lineas() == null || r.lineas().isEmpty()) {
            throw new SolicitudInvalidaException("Debe agregar al menos un producto al pedido");
        }

        // Validación en servidor (RNF-04): no se confía en lo que valide el frontend.
        Set<Integer> ids = new HashSet<>();
        for (PedidoRequest.LineaRequest l : r.lineas()) {
            if (l == null || l.idProducto() == null) {
                throw new SolicitudInvalidaException("Cada línea debe indicar el producto.");
            }
            if (l.cantidad() == null || l.cantidad() <= 0) {
                throw new SolicitudInvalidaException("La cantidad de cada producto debe ser un entero mayor que cero.");
            }
            if (!ids.add(l.idProducto())) {
                throw new SolicitudInvalidaException("No se puede repetir un producto en el mismo pedido.");
            }
        }

        Usuario responsable = usuarioActivo(idUsuario);
        Map<Integer, Producto> catalogo = productos.findAllById(ids).stream()
                .collect(Collectors.toMap(Producto::getId, Function.identity()));
        if (catalogo.size() != ids.size()) {
            throw new NoEncontradoException("Producto no encontrado.");
        }

        Pedido p = new Pedido();
        p.setUsuario(responsable);
        p.setNombreCliente(cliente);
        p.setTelefonoCliente(telefono);
        p.setEstado(EstadoPedido.PENDIENTE);

        // El precio sale de la tabla producto, nunca del JSON. El total se calcula aquí.
        BigDecimal total = BigDecimal.ZERO;
        for (PedidoRequest.LineaRequest l : r.lineas()) {
            DetallePedido d = p.agregarDetalle(catalogo.get(l.idProducto()), l.cantidad());
            total = total.add(d.getSubtotal());
        }
        p.setTotal(total);
        p.agregarHistorial(null, EstadoPedido.PENDIENTE, MOTIVO_INICIAL, responsable);

        return PedidoDto.de(pedidos.save(p));
    }

    // ------------------------------------------------------------ consultar

    @Transactional(readOnly = true)
    public List<PedidoDto> listar(String estado) {
        List<Pedido> lista;
        if (estado == null || estado.isBlank()) {
            lista = pedidos.findAllByOrderByIdDesc();
        } else {
            EstadoPedido e = EstadoPedido.desde(estado);
            if (e == null) throw new SolicitudInvalidaException("El estado indicado no es válido.");
            lista = pedidos.findByEstadoOrderByIdDesc(e);
        }
        return lista.stream().map(PedidoDto::de).toList();
    }

    @Transactional(readOnly = true)
    public PedidoDto obtener(Integer id) {
        return PedidoDto.de(pedidos.buscarConDetalle(id)
                .orElseThrow(() -> new NoEncontradoException("Pedido no encontrado.")));
    }

    // ------------------------------------------------------------ confirmar

    /**
     * Tiempo 2 del flujo: (a) bloquea pedido y productos, (b) verifica Pendiente, (c) comprueba existencias,
     * (d) si no alcanzan lanza 409 y la transacción se revierte, (e) descuenta una sola vez y deja el historial.
     */
    @Transactional
    public PedidoDto confirmar(Integer id, Integer idUsuario) {
        Usuario responsable = usuarioActivo(idUsuario);
        Pedido p = bloquear(id);                                   // (a) FOR UPDATE del pedido
        if (p.getEstado() != EstadoPedido.PENDIENTE) {              // (b) la segunda petición cae aquí
            throw new NegocioException("El pedido ya se encuentra en estado " + p.getEstado().etiqueta() + ".");
        }
        Map<Integer, Producto> stock = bloquearProductos(p);       // (a) FOR UPDATE de los productos

        for (DetallePedido d : p.getDetalles()) {                  // (c) primero se verifica todo...
            int disponibles = stock.get(d.getIdProducto()).getStockActual();
            if (disponibles < d.getCantidad()) {                   // (d)
                throw new NegocioException("No hay existencias suficientes: solicitaste " + d.getCantidad()
                        + ", disponibles " + disponibles + ".");
            }
        }
        for (DetallePedido d : p.getDetalles()) {                  // (e) ...y luego se descuenta
            Producto producto = stock.get(d.getIdProducto());
            producto.setStockActual(producto.getStockActual() - d.getCantidad());
        }
        p.setEstado(EstadoPedido.CONFIRMADO);
        p.agregarHistorial(EstadoPedido.PENDIENTE, EstadoPedido.CONFIRMADO, MOTIVO_CONFIRMACION, responsable);
        return PedidoDto.de(p);
    }

    // ------------------------------------------------- rechazar y cancelar

    /** Solo desde Pendiente. No toca el inventario porque nunca se descontó. */
    @Transactional
    public PedidoDto rechazar(Integer id, String motivo, Integer idUsuario) {
        String motivoValido = motivoValido(motivo, "rechazar");
        Usuario responsable = usuarioActivo(idUsuario);
        Pedido p = bloquear(id);
        if (p.getEstado() != EstadoPedido.PENDIENTE) {
            throw new NegocioException("Solo se puede rechazar un pedido en estado Pendiente.");
        }
        p.setEstado(EstadoPedido.RECHAZADO);
        p.agregarHistorial(EstadoPedido.PENDIENTE, EstadoPedido.RECHAZADO, motivoValido, responsable);
        return PedidoDto.de(p);
    }

    /** Desde Pendiente o Confirmado. Si estaba Confirmado, devuelve las existencias una sola vez (RF-09). */
    @Transactional
    public PedidoDto cancelar(Integer id, String motivo, Integer idUsuario) {
        String motivoValido = motivoValido(motivo, "cancelar");
        Usuario responsable = usuarioActivo(idUsuario);
        Pedido p = bloquear(id);
        EstadoPedido anterior = p.getEstado();
        if (anterior != EstadoPedido.PENDIENTE && anterior != EstadoPedido.CONFIRMADO) {
            throw new NegocioException("No se puede cancelar un pedido en estado " + anterior.etiqueta());
        }
        if (anterior == EstadoPedido.CONFIRMADO) {
            Map<Integer, Producto> stock = bloquearProductos(p);
            for (DetallePedido d : p.getDetalles()) {
                Producto producto = stock.get(d.getIdProducto());
                producto.setStockActual(producto.getStockActual() + d.getCantidad());
            }
        }
        p.setEstado(EstadoPedido.CANCELADO);
        p.agregarHistorial(anterior, EstadoPedido.CANCELADO, motivoValido, responsable);
        return PedidoDto.de(p);
    }

    // ---------------------------------------------------------------- apoyo

    /** SELECT ... FOR UPDATE del pedido. Debe ser lo PRIMERO que se lee del pedido en la transacción. */
    private Pedido bloquear(Integer id) {
        return pedidos.buscarParaActualizar(id).orElseThrow(() -> new NoEncontradoException("Pedido no encontrado."));
    }

    /** Bloquea los productos del pedido, ordenados por id, y los devuelve indexados por id. */
    private Map<Integer, Producto> bloquearProductos(Pedido p) {
        List<Integer> ids = p.getDetalles().stream().map(DetallePedido::getIdProducto).toList();
        return productos.bloquearPorIds(ids).stream().collect(Collectors.toMap(Producto::getId, Function.identity()));
    }

    private String motivoValido(String motivo, String verbo) {
        if (motivo == null || motivo.isBlank()) {
            throw new SolicitudInvalidaException("Debe seleccionar un motivo para " + verbo + " el pedido");
        }
        MotivoPedido m = MotivoPedido.desde(motivo);
        if (m == null) {
            throw new SolicitudInvalidaException("El motivo no es válido.");
        }
        return m.etiqueta();
    }

    /** El token puede seguir vigente aunque el usuario ya se haya desactivado: se vuelve a comprobar en la base. */
    private Usuario usuarioActivo(Integer idUsuario) {
        Usuario u = usuarios.findById(idUsuario).orElseThrow(() -> new NoAutorizadoException("Usuario no válido."));
        if (!"ACTIVO".equals(u.getEstado())) {
            throw new NoAutorizadoException("Tu usuario está inactivo. Habla con el administrador.");
        }
        return u;
    }
}
