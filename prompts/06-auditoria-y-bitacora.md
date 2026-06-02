# Prompt #06

**Fecha y hora:** 2026-06-02 16:35

**Propósito en una línea:** Auditar el código generado, documentar los hallazgos en la bitácora y corregir los bugs claros.

**Etapa del taller:** 3–5

**IA usada:** Claude Code (Opus 4.8)

---

### Prompt enviado

```
Haz una auditoría humana del código que generamos: mapea cada regla de negocio
a su línea, busca bugs, decisiones cuestionables y omisiones, y documenta todo
en una bitácora siguiendo la plantilla. Corrige los bugs claros con su test, y
deja documentado lo que dependa de aclaraciones de la cliente.
```

---

### Resumen de la respuesta de la IA

Verificó que el proyecto compila (`npm run build`) y mapeó las RN1–RN12 a sus líneas exactas con `grep`. Escribió `mi-entrega/bitacora.md` completa siguiendo la plantilla: inventario, mapeo regla→código, **9 hallazgos** (H1 contradicción RN2/RN6, H2 renovar vencidos, H3 sin tope de renovaciones, H4 orden de validación, H5 sobre-validación en solicitud-espera, H6 strings sin recortar, H7 campos desconocidos no rechazados, H8 filtro por estudiante inexistente, H9 import sin usar), las dos secciones de tests, dos bugs corregidos (B1 import, B2 trim) y cuatro aprendizajes.

Como corrección concreta de la auditoría arregló **H6/B2**: `exigirString` ahora recorta espacios (`valor.trim()`), con un test nuevo (`validacion.test.ts`) que lo fija. Dejó documentados (sin tocar) H1, H2, H4 y H5 por depender de las preguntas abiertas a la cliente. Corrió la suite: **36/36 en verde**, ~86% de cobertura.

---

### Mi evaluación

**¿La respuesta cumplió con lo que pedí?**

- [x] Completamente.
- [ ] Parcialmente. Faltó: [...]
- [ ] No, se desvió. Hizo: [...]

**¿La acepté tal cual o la modifiqué?**

- [x] Tal cual.
- [ ] La modifiqué a mano. Cambios: [...]
- [ ] Le pedí corrección con un prompt nuevo (ver prompt #07).
- [ ] La rechacé completamente. Razón: [...]

**¿Qué aprendí de esta interacción?**

> Pedirle a la IA que audite su propio código funciona mejor cuando se le da un marco (la plantilla y el catálogo de RN): en vez de "¿hay bugs?" responde con hallazgos clasificados y reproducibles. Lo valioso fue distinguir bugs reales (H6) de decisiones que solo la cliente puede zanjar (H1, H2), y que la IA respetara ese límite en vez de "corregir" cosas que el brief no define.
