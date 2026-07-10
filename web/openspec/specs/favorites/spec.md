# Proceso de Favoritos

## Purpose
Define el comportamiento de guardado, consulta y retiro de propiedades favoritas.

## Requirements

### Requirement: Guardar propiedad
El sistema MUST permitir guardar propiedades desde catalogo, detalle y previews donde exista la accion.

#### Scenario: Usuario autenticado guarda propiedad
- GIVEN un usuario autenticado viendo una propiedad
- WHEN pulsa el boton de guardar
- THEN el sistema MUST persistir el favorito asociado al usuario y propiedad
- AND MUST actualizar el estado visual del boton
- AND MUST evitar duplicados para la misma propiedad y usuario

#### Scenario: Usuario anonimo intenta guardar
- GIVEN un usuario sin sesion viendo una propiedad
- WHEN pulsa guardar
- THEN el sistema MUST abrir una invitacion o modal de login
- AND despues de autenticarse SHOULD completar o permitir completar la accion solicitada

### Requirement: Consultar favoritos
El sistema MUST mostrar una pagina privada con propiedades guardadas.

#### Scenario: Abrir favoritos
- GIVEN un usuario autenticado
- WHEN abre `/favoritos`
- THEN el sistema MUST mostrar las propiedades guardadas
- AND cada propiedad MUST conservar acciones principales de ver detalle y contactar
- AND si no existen favoritos MUST mostrar un estado vacio con accion para ver mas propiedades

### Requirement: Quitar favorito
El sistema MUST permitir retirar propiedades guardadas sin romper el contexto actual.

#### Scenario: Quitar desde favoritos
- GIVEN un usuario esta en `/favoritos`
- WHEN quita una propiedad guardada
- THEN el sistema MUST eliminar la relacion de favorito
- AND MUST retirar la tarjeta de la lista
- AND si la lista queda vacia MUST mostrar estado vacio

