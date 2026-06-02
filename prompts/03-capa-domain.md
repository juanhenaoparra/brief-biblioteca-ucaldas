# Prompt #03

**Fecha y hora:** 2026-06-02 15:20

**Propósito en una línea:** Crear una rama para la etapa 2 y empezar la implementación por la capa de domain (tipos/modelos de las 5 entidades).

**Etapa del taller:** 2

**IA usada:** Claude Code (Opus 4.8)

---

### Prompt enviado

```
Crea una rama `feat/` para la etapa 2 y empieza por la capa de dominio: define
las interfaces de las cinco entidades (Libro, Ejemplar, Estudiante, Préstamo y
Multa) calcadas de la especificación, y centraliza las constantes de negocio
(plazos, cupos y tarifa de multa) para no dejar números mágicos.
```

---

### Resumen de la respuesta de la IA

Creó la rama `feat/etapa2-implementacion-api` desde `main` siguiendo Conventional Commits. Luego exploró la estructura existente (`app.ts`, `error-handler.ts` con `HttpError`, rutas, `tsconfig` estricto, `jest.config.js`) para respetar el estilo. Implementó dos archivos en `src/domain/`:

- `models.ts`: interfaces `Libro`, `Ejemplar`, `Estudiante`, `Prestamo`, `Multa` y los tipos unión `EstadoEjemplar`, `TipoEstudiante`, `EstadoPrestamo`, calcados de la sección 3 de la especificación. Cada campo lleva comentario que enlaza con la RN o decisión correspondiente.
- `constants.ts`: constantes de negocio (`PLAZO_NORMAL_DIAS=15`, `PLAZO_ALTA_DEMANDA_DIAS=3`, `LIMITE_PRESTAMOS` por tipo, `TARIFA_MULTA_DIA_COP=2000`, `TIPOS_ESTUDIANTE`) para evitar números mágicos.

Eliminó el `.gitkeep` de `domain/`. Corrió `npm run typecheck` (limpio). Decisión propia: separar las constantes de negocio en su propio archivo en vez de mezclarlas con los modelos, y planear usar `crypto.randomUUID` nativo (sin agregar la dependencia `uuid`).

---

### Mi evaluación

**¿La respuesta cumplió con lo que pedí?**

- [x] Completamente.
- [ ] Parcialmente. Faltó: [...]
- [ ] No, se desvió. Hizo: [...]

**¿La acepté tal cual o la modifiqué?**

- [x] Tal cual.
- [ ] La modifiqué a mano. Cambios: [...]
- [ ] Le pedí corrección con un prompt nuevo (ver prompt #04).
- [ ] La rechacé completamente. Razón: [...]

**¿Qué aprendí de esta interacción?**

> Empezar por la capa de domain con los tipos calcados de la spec y comentarios que enlazan a cada RN da una base donde el resto del código casi se escribe solo. Centralizar las constantes de negocio desde el inicio evita que los "números mágicos" (15, 3, 2000) queden regados por los servicios.
