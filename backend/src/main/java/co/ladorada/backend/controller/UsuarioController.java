package co.ladorada.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import co.ladorada.backend.dto.EstadoUsuarioRequest;
import co.ladorada.backend.dto.UsuarioDto;
import co.ladorada.backend.dto.UsuarioRequest;
import co.ladorada.backend.service.UsuarioService;

/** Gestión de usuarios: solo el Administrador (documento técnico, Tabla 3). Los usuarios no se borran. */
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService service;

    public UsuarioController(UsuarioService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public List<UsuarioDto> listar() {
        return service.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public UsuarioDto crear(@RequestBody UsuarioRequest r) {
        return service.crear(r);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public UsuarioDto editar(@PathVariable Integer id, @RequestBody UsuarioRequest r) {
        return service.editar(id, r);
    }

    /** Activa o desactiva. No hay DELETE a propósito: el usuario conserva sus pedidos y su historial. */
    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public UsuarioDto cambiarEstado(@PathVariable Integer id, @RequestBody EstadoUsuarioRequest r) {
        return service.cambiarEstado(id, r);
    }
}
