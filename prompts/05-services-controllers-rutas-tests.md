# Prompt #05

**Fecha y hora:** 2026-06-02 15:55

**Propósito en una línea:** Implementar services (RN1–RN12), controllers y rutas de los 14 endpoints, y escribir los tests AAA probándolos hasta verde.

**Etapa del taller:** 2

**IA usada:** Claude Code (Opus 4.8)

---

### Prompt enviado

```
Avanza de forma autónoma con el resto de la implementación: los services con
las 12 reglas de negocio (RN1–RN12), los controllers y las rutas de los 14
endpoints. Acompáñalo con tests en formato AAA —un caso por regla— más
integración HTTP, y déjalos corriendo en verde.
```

---

### Resumen de la respuesta de la IA

Implementó todas las capas restantes y las probó:

- **utils:** `fechas.ts` (`ahora`, `sumarDias`, `diasRetraso` con redondeo hacia arriba, `fechaYaPaso`), `validacion.ts` (exige string/boolean/entero, lanza `400 datos_invalidos`) y `query.ts` (parseo de query params, `400 query_invalida` si un booleano viene mal).
- **services:** `catalogo.service.ts`, `estudiante.service.ts`, `prestamo.service.ts` (el grande, con RN1–RN9, RN11, RN12) y `multa.service.ts`. Cada RN quedó comentada con su número.
- **controllers + routes:** un controller y un router por recurso, conectados en `routes/index.ts`. Los handlers son síncronos y dejan que Express capture los `HttpError` lanzados.
- **tests AAA:** `fechas.test.ts`, `reglas-negocio.test.ts` (un `describe` por RN1–RN12) y `flujo-prestamo.test.ts` (integración HTTP con Supertest: happy path + códigos 400/404/409). Agregó `tests/helpers/seed.ts` para sembrar datos controlando fechas.

Corrió `npm run typecheck` (limpio) y `npm test`: **31/31 verde**. Cobertura global 86% (domain y routes 100%). Tuvo un fallo intermedio (import `seedEjemplar` sin usar, bloqueado por `noUnusedLocals`) que corrigió solo.

Decisiones propias documentadas: orden de validación en `POST /prestamos` (404 → RN5 → RN1 → RN3 → RN4); en la renovación siguió RN6 (sumar el plazo a la fecha esperada actual) aunque RN2 dice "desde hoy" — discrepancia anotada para la bitácora; en `solicitud-espera` agregó códigos `prestamo_no_activo` y `solicitante_es_titular` porque la spec solo decía "409".

---

### Mi evaluación

**¿La respuesta cumplió con lo que pedí?**

- [x] Completamente.
- [ ] Parcialmente. Faltó: [...]
- [ ] No, se desvió. Hizo: [...]

**¿La acepté tal cual o la modifiqué?**

- [x] Tal cual.
- [ ] La modifiqué a mano. Cambios: [...]
- [ ] Le pedí corrección con un prompt nuevo (ver prompt #06).
- [ ] La rechacé completamente. Razón: [...]

**¿Qué aprendí de esta interacción?**

> Dejar que la IA escriba y corra los tests en el mismo paso atrapa de inmediato sus propios errores (el import sin usar, la flakiness de comparar días con `Date.now()` llamado dos veces). También que cuando dos reglas se contradicen (RN2 vs RN6 en la renovación) la IA elige una y lo documenta, pero conviene revisarlo a mano porque es justo el tipo de decisión que el brief no resuelve.
