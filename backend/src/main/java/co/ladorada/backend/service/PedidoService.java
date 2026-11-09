package co.ladorada.backend.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.ladorada.backend.dto.EdicionPedidoRequest;
import co.ladorada.backend.dto.PedidoDto;
import co.ladorada.backend.dto.PedidoRequest;
import co.ladorada.backend.dto.ResumenDto;
import co.ladorada.backend.exception.NegocioException;
import co.ladorada.backend.exception.NoAutorizadoException;
import co.ladorada.backend.exception.NoEncontradoException;
import co.ladorada.backend.exception.ProhibidoException;
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
    private static final String MOTIVO_EDICION = "Cantidades modificadas a solicitud del cliente";
    private static final String MOTIVO_CONFIRMACION = "Confirmación y descuento de inventario";
    private static final String MOTIVO_DESPACHO = "Despacho del pedido";
    private static final String ROL_BODEGA = "BODEGA";

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

    /**
     * Detalle de un pedido. Bodega solo ve los Confirmados y Despachados (su trabajo); cualquier otro estado
     * responde 403. Se valida aquí, en el servidor, no solo ocultando botones en la pantalla.
     */
    @Transactional(readOnly = true)
    public PedidoDto obtener(Integer id, String rol) {
        Pedido p = pedidos.buscarConDetalle(id).orElseThrow(() -> new NoEncontradoException("Pedido no encontrado."));
        if (ROL_BODEGA.equals(rol) && p.getEstado() != EstadoPedido.CONFIRMADO && p.getEstado() != EstadoPedido.DESPACHADO) {
            throw new ProhibidoException("Bodega solo puede ver pedidos Confirmados o Despachados.");
        }
        return PedidoDto.de(p);
    }

    /** Cola de Bodega (CU-07): solo los Confirmados, del más antiguo al más reciente. */
    @Transactional(readOnly = true)
    public List<PedidoDto> colaDespachos() {
        return pedidos.findByEstadoOrderByFechaCreacionAscIdAsc(EstadoPedido.CONFIRMADO).stream()
                .map(PedidoDto::de).toList();
    }

    /** Conteo por estado (RF-16). Arranca con los cinco estados en 0 para que la pantalla nunca reciba huecos. */
    @Transactional(readOnly = true)
    public ResumenDto resumen() {
        Map<String, Long> porEstado = new LinkedHashMap<>();
        for (EstadoPedido e : EstadoPedido.values()) {
            porEstado.put(e.etiqueta(), 0L);
        }
        long total = 0;
        for (Object[] fila : pedidos.contarPorEstado()) {
            EstadoPedido estado = (EstadoPedido) fila[0];
            long cantidad = ((Number) fila[1]).longValue();
            porEstado.put(estado.etiqueta(), cantidad);
            total += cantidad;
        }
        return new ResumenDto(total, porEstado);
    }

    // --------------------------------------------------------------- editar

    /**
     * Solo desde Pendiente: el vendedor reduce las cantidades (o quita líneas) cuando el cliente acepta menos
     * unidades. Nunca se sube una cantidad: si el cliente quiere más, se crea otro pedido. El pedido sigue Pendiente,
     * NO toca las existencias (se descuentan al confirmar) y deja una fila en el historial. No se agregan productos
     * nuevos ni se cambia el cliente. Cada línea conserva el precio con el que se creó el pedido; el total se
     * recalcula aquí, nunca viene del cliente.
     */
    @Transactional
    public PedidoDto editar(Integer id, EdicionPedidoRequest r, Integer idUsuario) {
        if (r == null || r.lineas() == null || r.lineas().isEmpty()) {
            throw new SolicitudInvalidaException("El pedido debe conservar al menos un producto.");
        }

        // Validación en servidor (RNF-04), con los mismos mensajes que al crear.
        Map<Integer, Integer> nuevas = new LinkedHashMap<>();
        for (PedidoRequest.LineaRequest l : r.lineas()) {
            if (l == null || l.idProducto() == null) {
                throw new SolicitudInvalidaException("Cada línea debe indicar el producto.");
            }
            if (l.cantidad() == null || l.cantidad() <= 0) {
                throw new SolicitudInvalidaException("La cantidad de cada producto debe ser un entero mayor que cero.");
            }
            if (nuevas.put(l.idProducto(), l.cantidad()) != null) {
                throw new SolicitudInvalidaException("No se puede repetir un producto en el mismo pedido.");
            }
        }

        Usuario responsable = usuarioActivo(idUsuario);
        Pedido p = bloquear(id);                                    // FOR UPDATE: no se edita mientras se confirma
        if (p.getEstado() != EstadoPedido.PENDIENTE) {              // el estado se revisa BAJO el bloqueo
            throw new NegocioException("Solo se puede editar un pedido en estado Pendiente. El pedido está en estado "
                    + p.getEstado().etiqueta() + ".");
        }

        Set<Integer> actuales = p.getDetalles().stream().map(DetallePedido::getIdProducto).collect(Collectors.toSet());
        if (!actuales.containsAll(nuevas.keySet())) {
            throw new SolicitudInvalidaException("Solo se pueden reducir cantidades o quitar productos del pedido.");
        }

        List<String> aumentos = new ArrayList<>();                  // reducir sí, subir no: se revisa contra lo guardado
        for (DetallePedido d : p.getDetalles()) {
            Integer cantidad = nuevas.get(d.getIdProducto());
            if (cantidad != null && cantidad > d.getCantidad()) {
                aumentos.add(d.getProducto().getNombre() + " (en el pedido " + d.getCantidad()
                        + ", enviaste " + cantidad + ")");
            }
        }
        if (!aumentos.isEmpty()) {
            throw new SolicitudInvalidaException("Solo se pueden reducir cantidades o quitar productos del pedido: "
                    + String.join("; ", aumentos) + ".");
        }

        boolean hayCambios = nuevas.size() != actuales.size();
        for (DetallePedido d : p.getDetalles()) {
            Integer cantidad = nuevas.get(d.getIdProducto());
            if (cantidad != null && !cantidad.equals(d.getCantidad())) hayCambios = true;
        }
        if (!hayCambios) {                                          // guardar sin cambios no ensucia el historial
            return PedidoDto.de(p);
        }

        p.getDetalles().removeIf(d -> !nuevas.containsKey(d.getIdProducto()));   // orphanRemoval borra la fila
        BigDecimal total = BigDecimal.ZERO;
        for (DetallePedido d : p.getDetalles()) {
            d.setCantidad(nuevas.get(d.getIdProducto()));
            total = total.add(d.getSubtotal());
        }
        p.setTotal(total);
        p.agregarHistorial(EstadoPedido.PENDIENTE, EstadoPedido.PENDIENTE, MOTIVO_EDICION, responsable);
        return PedidoDto.de(p);
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

        List<String> faltantes = new ArrayList<>();                // (c) primero se verifica TODO, sin parar en el primero...
        for (DetallePedido d : p.getDetalles()) {
            Producto producto = stock.get(d.getIdProducto());
            if (producto.getStockActual() < d.getCantidad()) {
                faltantes.add(producto.getNombre() + " (solicitaste " + d.getCantidad()
                        + ", disponibles " + producto.getStockActual() + ")");
            }
        }
        if (!faltantes.isEmpty()) {                                // (d) un solo 409 con todos los productos que no alcanzan
            throw new NegocioException("No hay existencias suficientes: " + String.join("; ", faltantes) + ".");
        }
        for (DetallePedido d : p.getDetalles()) {                  // (e) ...y luego se descuenta
            Producto producto = stock.get(d.getIdProducto());
            producto.setStockActual(producto.getStockActual() - d.getCantidad());
        }
        p.setEstado(EstadoPedido.CONFIRMADO);
        p.agregarHistorial(EstadoPedido.PENDIENTE, EstadoPedido.CONFIRMADO, MOTIVO_CONFIRMACION, responsable);
        return PedidoDto.de(p);
    }

    // ------------------------------------------------------------ despachar

    /**
     * Confirmado → Despachado (CU-07). Usa el mismo bloqueo FOR UPDATE del pedido que confirmar y revisa el estado
     * ya con el bloqueo puesto: si dos despachos llegan a la vez, el segundo espera, ve Despachado y recibe 409.
     * No toca las existencias: se descontaron al confirmar.
     */
    @Transactional
    public PedidoDto despachar(Integer id, Integer idUsuario) {
        Usuario responsable = usuarioActivo(idUsuario);
        Pedido p = bloquear(id);                                    // FOR UPDATE del pedido
        if (p.getEstado() != EstadoPedido.CONFIRMADO) {              // el estado se revisa BAJO el bloqueo
            throw new NegocioException("Solo se puede despachar un pedido en estado Confirmado. El pedido está en estado "
                    + p.getEstado().etiqueta() + ".");
        }
        p.setEstado(EstadoPedido.DESPACHADO);
        p.agregarHistorial(EstadoPedido.CONFIRMADO, EstadoPedido.DESPACHADO, MOTIVO_DESPACHO, responsable);
        return PedidoDto.de(p);
    }

    // ------------------------------------------------- rechazar y cancelar

    /**
     * Solo desde Pendiente. No toca el inventario porque nunca se descontó. Motivos: Existencias insuficientes u Otro.
     */
    @Transactional
    public PedidoDto rechazar(Integer id, String motivo, Integer idUsuario) {
        String motivoValido = motivoValido(motivo, true);
        Usuario responsable = usuarioActivo(idUsuario);
        Pedido p = bloquear(id);
        if (p.getEstado() != EstadoPedido.PENDIENTE) {
            throw new NegocioException("Solo se puede rechazar un pedido en estado Pendiente.");
        }
        p.setEstado(EstadoPedido.RECHAZADO);
        p.agregarHistorial(EstadoPedido.PENDIENTE, EstadoPedido.RECHAZADO, motivoValido, responsable);
        return PedidoDto.de(p);
    }

    /**
     * Solo desde Confirmado: devuelve las existencias una sola vez (RF-09). Un Pendiente no se cancela: se rechaza
     * (nunca descontó inventario) o se edita. El estado se revisa con el pedido ya bloqueado. Motivos: El cliente
     * desiste, Sin existencia física u Otro.
     */
    @Transactional
    public PedidoDto cancelar(Integer id, String motivo, Integer idUsuario) {
        String motivoValido = motivoValido(motivo, false);
        Usuario responsable = usuarioActivo(idUsuario);
        Pedido p = bloquear(id);
        if (p.getEstado() == EstadoPedido.PENDIENTE) {
            throw new NegocioException("No se puede cancelar un pedido en estado Pendiente. "
                    + "Un pedido Pendiente se rechaza o se edita; solo se cancelan los Confirmados.");
        }
        if (p.getEstado() != EstadoPedido.CONFIRMADO) {
            throw new NegocioException("No se puede cancelar un pedido en estado " + p.getEstado().etiqueta());
        }
        Map<Integer, Producto> stock = bloquearProductos(p);
        for (DetallePedido d : p.getDetalles()) {
            Producto producto = stock.get(d.getIdProducto());
            producto.setStockActual(producto.getStockActual() + d.getCantidad());
        }
        p.setEstado(EstadoPedido.CANCELADO);
        p.agregarHistorial(EstadoPedido.CONFIRMADO, EstadoPedido.CANCELADO, motivoValido, responsable);
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

    /**
     * Valida el motivo según la acción: el rechazo y la cancelación tienen listas distintas. Todo es 400 y va antes
     * de mirar el estado del pedido. Devuelve la etiqueta oficial del motivo, que es la que queda en el historial.
     */
    private String motivoValido(String motivo, boolean rechazar) {
        String verbo = rechazar ? "rechazar" : "cancelar";
        if (motivo == null || motivo.isBlank()) {
            throw new SolicitudInvalidaException("Debe seleccionar un motivo para " + verbo + " el pedido");
        }
        MotivoPedido m = MotivoPedido.desde(motivo);
        if (m == null) {
            throw new SolicitudInvalidaException("El motivo no es válido.");
        }
        boolean sirve = rechazar ? m.sirveParaRechazar() : m.sirveParaCancelar();
        if (!sirve) {
            throw new SolicitudInvalidaException("El motivo «" + m.etiqueta() + "» no es válido para " + verbo
                    + " un pedido. Motivos permitidos: " + MotivoPedido.permitidosPara(rechazar) + ".");
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
