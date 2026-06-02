# Diff de correcciones — qué cambié a mano vs. qué corrigió la IA

> **Autor:** Juan Sebastián Henao Parra
> **Proyecto:** API de Préstamo de Libros — Biblioteca UCaldas

Este documento traza la frontera entre el trabajo humano y el de la IA. El
proyecto se construyó casi por completo con *prompting* (vibecoding): yo dirigí
y la IA escribió el código. La pregunta que responde este archivo es:
**¿dónde metió mano el humano directamente, y qué corrigió la IA por su cuenta
durante el prompting?**

---

## Resumen

| Tipo de cambio | Autor | Cantidad |
|---|---|---|
| Edición directa de código a mano | **Humano** | 1 línea (`env.ts`) |
| Correcciones de bugs / ajustes | **IA (vía prompt)** | 4 |

La única línea que toqué a mano en todo el código fue el puerto por defecto.
Todo lo demás —incluidas las correcciones de bugs— salió de prompts dirigidos
a la IA.

---

## 1. Cambios hechos a mano por el humano

### C1 — Puerto por defecto en `env.ts`

- **Archivo:** `proyecto/src/config/env.ts`
- **Motivo:** el `3000` por defecto chocaba con otro servicio que tenía
  corriendo localmente; lo moví a `3010` para levantar la API sin conflicto.
- **Cómo se hizo:** edición directa en el editor, sin prompt.

```diff
- port: Number(process.env.PORT ?? 3000),
+ port: Number(process.env.PORT ?? 3010),
```

> Nota: este cambio quedó incluido en el commit `554f7bf` junto con el código
> generado por la IA, porque al hacer `git add proyecto/src/` se agregó también
> esta edición manual. Es el único punto del repositorio donde una línea de
> código fue escrita directamente por mí y no por la IA.

---

## 2. Correcciones hechas por la IA (vía prompting)

Estas correcciones las ejecutó la IA mientras procesaba mis prompts. No las
escribí yo; las provocó el flujo de trabajo (un test que no compilaba, una
regla mal aplicada, etc.) y la IA las resolvió en la misma sesión.

### IA1 — Import sin usar que tumbaba el suite de tests (B1 / H9)

- **Archivo:** `proyecto/tests/unit/reglas-negocio.test.ts`
- **Qué pasó:** la IA importó `seedEjemplar` sin usarlo. Con `noUnusedLocals`,
  `ts-jest` no compiló y **todo** el suite de reglas no corrió.
- **Cómo se detectó:** la primera ejecución de `npm test` (suite "failed to run").
- **Corrección (IA):**

```diff
 import {
   isoEnDias,
-  seedEjemplar,
   seedEstudiante,
   seedLibroConEjemplar,
   seedPrestamoActivo,
 } from "../helpers/seed";
```

### IA2 — `exigirString` no recortaba espacios (B2 / H6)

- **Archivo:** `proyecto/src/utils/validacion.ts`
- **Qué pasó:** validaba contra vacío con `trim()` pero devolvía el string
  original; un `" Clean Code "` quedaba guardado con espacios.
- **Cómo se detectó:** auditoría humana; lo señalé y la IA lo corrigió con un
  test que lo fija (`validacion.test.ts`).
- **Corrección (IA):**

```diff
   if (typeof valor !== "string") invalido(campo, "debe ser un string");
-  if (valor.trim() === "") invalido(campo, "no puede estar vacío");
-  return valor;
+  const limpio = valor.trim();
+  if (limpio === "") invalido(campo, "no puede estar vacío");
+  return limpio;
```

### IA3 — `jest.config.ts` → `jest.config.js` (scaffolding, prompt #02)

- **Archivo:** `proyecto/jest.config.js`
- **Qué pasó:** el primer intento usó `jest.config.ts`, que Jest 29 no parsea
  sin `ts-node`. La IA cambió la config a `.js` para no agregar otra dependencia.
- **Cómo se detectó:** fallo al correr Jest la primera vez.
- **Corrección (IA):** renombrar y reescribir la config en JavaScript.

### IA4 — Test de multa con riesgo de *flakiness* (RN8)

- **Archivo:** `proyecto/tests/unit/reglas-negocio.test.ts`
- **Qué pasó:** afirmar un monto exacto (`10000`) era frágil, porque el test y
  el servicio llaman `Date.now()` con milisegundos de diferencia y `Math.ceil`
  podía dar un día de más.
- **Corrección (IA):** afirmar la **relación invariante** en vez del valor exacto:

```ts
expect(multa?.dias_retraso).toBeGreaterThanOrEqual(5);
expect(multa?.monto_cop).toBe((multa?.dias_retraso ?? 0) * TARIFA_MULTA_DIA_COP);
```

El cálculo exacto del redondeo se cubre aparte con fechas fijas en
`fechas.test.ts`.

### IA5 — JSON malformado devolvía 500 en vez de 400 (B3)

- **Archivo:** `proyecto/src/middlewares/error-handler.ts`
- **Qué pasó:** al probar la API con el chatbot de Ollama (taller), un body con JSON
  inválido provocaba `500 error_interno`. `body-parser` lanza un error
  `entity.parse.failed` (statusCode 400) que el handler no reconocía como `HttpError`.
- **Cómo se detectó:** ejecución real de las sesiones guiadas contra la API viva
  (ver `bitacora.md`, "Validación de las sesiones guiadas").
- **Corrección (IA):** manejar el caso como `400 json_invalido` y loguear los
  errores no controlados antes del `500`. Con test de integración.

```diff
   if (err instanceof HttpError) {
     res.status(err.status).json({ error: err.code, ...err.details });
     return;
   }
+  if (err instanceof Error && (err as { type?: string }).type === "entity.parse.failed") {
+    res.status(400).json({ error: "json_invalido" });
+    return;
+  }
+  console.error("[error_interno]", err);
   res.status(500).json({ error: "error_interno" });
```

---

## 3. Conclusión

El reparto de trabajo fue casi total hacia la IA: **una sola línea** de código
(el puerto) la escribí a mano. Hasta las correcciones de bugs salieron de
prompts. Eso no significa que el humano no trabajara: mi rol fue de **dirección
y auditoría** —decidir el stack, traducir el brief a especificación, ordenar
las capas, detectar los hallazgos (ver `bitacora.md`) y validar cada corrida de
tests—. El código lo tecleó la IA; el criterio de qué construir y qué aceptar
fue humano.
