# Prompt #04

**Fecha y hora:** 2026-06-02 15:30

**Propósito en una línea:** Implementar la capa de repositorios in-memory (almacén por entidad con singletons y reset para tests).

**Etapa del taller:** 2

**IA usada:** Claude Code (Opus 4.8)

---

### Prompt enviado (literal)

```
si vamos adelante
```

---

### Resumen de la respuesta de la IA

Creó la capa de persistencia en memoria en `src/repositories/`:

- `in-memory-store.ts`: clase genérica `InMemoryStore<T>` sobre un `Map`, con `save`, `get`, `has`, `all`, `filter` y `clear`. La clave de cada entidad se extrae con una función `keyOf` pasada al constructor (porque unas usan `id`, otras `codigo` o `codigo_inventario`).
- Un repositorio por entidad que extiende el store: `LibroRepository`, `EjemplarRepository` (con `byLibro` y `disponiblesByLibro`), `EstudianteRepository`, `PrestamoRepository` (con `byEstudiante`, `activosByEstudiante`, `activos`) y `MultaRepository` (con `byEstudiante` y `pendientesByEstudiante`).
- `index.ts`: instancias singleton de cada repositorio + `resetRepositories()` que los vacía para aislar tests.

Eliminó el `.gitkeep` de `repositories/`. `npm run typecheck` limpio. Decisión propia: agregar métodos de consulta específicos por repositorio (anticipando lo que pedirán las reglas de negocio: cupo, multas pendientes, vencidos) en vez de dejar solo CRUD genérico.

---

### Mi evaluación

**¿La respuesta cumplió con lo que pedí?**

- [x] Completamente.
- [ ] Parcialmente. Faltó: [...]
- [ ] No, se desvió. Hizo: [...]

**¿La acepté tal cual o la modifiqué?**

- [x] Tal cual.
- [ ] La modifiqué a mano. Cambios: [...]
- [ ] Le pedí corrección con un prompt nuevo (ver prompt #05).
- [ ] La rechacé completamente. Razón: [...]

**¿Qué aprendí de esta interacción?**

> Un store genérico con `keyOf` evita repetir el mismo `Map` cinco veces y deja cada repositorio enfocado solo en sus consultas de negocio. El `resetRepositories()` desde el inicio es clave: sin él, los tests de integración comparten estado y se contaminan entre sí.
