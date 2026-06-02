# Bitácora del Taller — Juan Sebastián Henao Parra

> **Documento vivo.** Registro de la auditoría humana sobre el código generado con IA, los resultados de los tests y las correcciones aplicadas.

---

## Sección 1 — Hallazgos de la auditoría humana (Etapa 3)

### Inventario inicial

- **Archivos generados por la IA (capa de implementación):**
  - `src/domain/`: `models.ts`, `constants.ts`
  - `src/repositories/`: `in-memory-store.ts`, `libro.repository.ts`, `ejemplar.repository.ts`, `estudiante.repository.ts`, `prestamo.repository.ts`, `multa.repository.ts`, `index.ts`
  - `src/services/`: `catalogo.service.ts`, `estudiante.service.ts`, `prestamo.service.ts`, `multa.service.ts`
  - `src/controllers/`: `libro.controller.ts`, `estudiante.controller.ts`, `prestamo.controller.ts`, `multa.controller.ts`
  - `src/routes/`: `libros.routes.ts`, `estudiantes.routes.ts`, `prestamos.routes.ts`, `multas.routes.ts` (+ wiring en `index.ts`)
  - `src/utils/`: `fechas.ts`, `validacion.ts`, `query.ts`
  - `tests/`: `unit/fechas.test.ts`, `unit/reglas-negocio.test.ts`, `unit/validacion.test.ts`, `integration/flujo-prestamo.test.ts`, `helpers/seed.ts`
- **Dependencias instaladas:** ninguna nueva en esta etapa. Para los UUID se usó `crypto.randomUUID` (nativo de Node), evitando agregar la librería `uuid`.
- **Dependencias que NO pedí pero la IA agregó:** ninguna en esta etapa. (En el scaffolding previo —prompt #02— sí había anticipado el middleware `HttpError`, que aquí resultó útil.)
- **Archivos que NO pedí pero la IA generó:** `src/utils/query.ts` (parseo de query params) y `tests/helpers/seed.ts`. Ninguno se pidió explícitamente; ambos son razonables y los acepté.

### Mapeo de reglas a código

| Regla | Archivo y línea aproximada | ¿Aplica correctamente? | Notas |
|---|---|---|---|
| RN1 — cupo por tipo | `services/prestamo.service.ts:79` | Sí | Límite tomado de `constants.ts` (3/5). |
| RN2 — plazo por tipo de libro | `services/prestamo.service.ts:32,113`; `utils/fechas.ts:13` | Sí | 15 / 3 días vía `sumarDias`. |
| RN3 — bloqueo por vencidos | `services/prestamo.service.ts:89` | Sí | Calcula vencidos al vuelo sobre activos. |
| RN4 — bloqueo por multas | `services/prestamo.service.ts:98` | Sí | Suma `monto_total` de multas con `pagada=false`. |
| RN5 — ejemplar no doble | `services/prestamo.service.ts:74` | Sí | Ver H4: orden de validación. |
| RN6 — no renovar si esperan | `services/prestamo.service.ts:190,197` | Parcial | Ver H1: contradice a RN2 en el cálculo. |
| RN7 — solo activos se renuevan | `services/prestamo.service.ts:182` | Sí | Devuelve `estado_actual`. |
| RN8 — multa al devolver tarde | `services/prestamo.service.ts:154`; `utils/fechas.ts:21` | Sí | Días calendario, redondeo hacia arriba (D1). |
| RN9 — solo activos se devuelven | `services/prestamo.service.ts:134` | Sí | Libera ejemplar y apaga la bandera de espera. |
| RN10 — solo pregrado/posgrado | `services/estudiante.service.ts:24` | Sí | `400 tipo_estudiante_no_soportado`. |
| RN11 — marcar lista de espera | `services/prestamo.service.ts:217` | Parcial | Ver H5: exige que el solicitante exista. |
| RN12 — vencido calculado | `services/prestamo.service.ts:37,233,247` | Sí | No persiste el estado, lo calcula. |

### Hallazgos detectados

#### Hallazgo H1

- **Archivo:** `src/services/prestamo.service.ts:197`
- **Tipo:** decisión cuestionable (ambigüedad de la especificación)
- **Severidad:** media
- **Regla violada:** RN2 vs. RN6
- **Descripción:** RN2 dice que el plazo es "15 días **desde hoy**", aplica al "crear o renovar". RN6 dice que al renovar "se suman 15 días **a la fecha esperada**". Son cálculos distintos. El código sigue RN6 (suma sobre la fecha esperada actual). Si un libro se renueva el último día, las dos reglas dan resultados diferentes.
- **Cómo lo detecté:** lectura humana comparando RN2 y RN6.
- **Reproducción:** crear préstamo (esperada = hoy+15), renovar el día 14 → con RN6 la nueva fecha es hoy+30; con RN2 sería hoy+14+15 = hoy+29.

#### Hallazgo H2

- **Archivo:** `src/services/prestamo.service.ts:182,197`
- **Tipo:** decisión cuestionable / omisión
- **Severidad:** media
- **Regla violada:** ninguna específica (RN7 solo exige estado activo)
- **Descripción:** se permite renovar un préstamo **vencido** (activo pero con fecha pasada). Como RN6 suma el plazo a la fecha esperada (pasada), un préstamo muy vencido puede seguir vencido tras renovar, incrementando `renovaciones` sin resolver la morosidad. Una biblioteca real no suele permitir renovar libros vencidos.
- **Cómo lo detecté:** lectura humana del flujo de renovación.
- **Reproducción:** crear préstamo con esperada hace 20 días, renovar → nueva esperada = hace 5 días (sigue vencido), `renovaciones=1`.

#### Hallazgo H3

- **Archivo:** `src/services/prestamo.service.ts:174-200`
- **Tipo:** omisión
- **Severidad:** baja
- **Regla violada:** ninguna (la spec no define tope; es la pregunta abierta #4)
- **Descripción:** no hay límite de renovaciones. Un estudiante puede renovar indefinidamente si nadie más solicita el ejemplar.
- **Cómo lo detecté:** lectura humana + pregunta abierta #4 de la especificación.
- **Reproducción:** renovar el mismo préstamo N veces; `renovaciones` crece sin tope.

#### Hallazgo H4

- **Archivo:** `src/services/prestamo.service.ts:74` (RN5) frente a `:79-104` (RN1/RN3/RN4)
- **Tipo:** decisión cuestionable (orden de validación)
- **Severidad:** media
- **Regla violada:** ninguna específica
- **Descripción:** la disponibilidad del ejemplar (RN5) se valida **antes** de las reglas que dependen del estudiante (cupo, vencidos, multas). Un estudiante bloqueado por multas que pida un ejemplar ya prestado recibe `ejemplar_no_disponible` en vez del error que explica su bloqueo real. El orden está documentado en el código, pero es discutible.
- **Cómo lo detecté:** lectura humana del orden de los `throw`.
- **Reproducción:** estudiante con multa pendiente hace `POST /prestamos` sobre un ejemplar prestado → responde `ejemplar_no_disponible`, no `tiene_multas_pendientes`.

#### Hallazgo H5

- **Archivo:** `src/services/prestamo.service.ts:212`
- **Tipo:** decisión cuestionable
- **Severidad:** baja
- **Regla violada:** RN11 (sobre-validación)
- **Descripción:** `solicitud-espera` exige que el `estudiante_codigo` del solicitante exista en el repositorio (`404` si no). RN11 solo pide que el solicitante sea **distinto al titular**; no obliga a que esté registrado. Es una validación extra que la spec no pidió.
- **Cómo lo detecté:** lectura humana contra el texto de RN11.
- **Reproducción:** `POST /prestamos/:id/solicitud-espera` con un código no registrado → `404 estudiante_no_encontrado` en vez de prender la bandera.

#### Hallazgo H6

- **Archivo:** `src/utils/validacion.ts` (`exigirString`)
- **Tipo:** bug menor
- **Severidad:** baja
- **Regla violada:** ninguna específica
- **Descripción:** `exigirString` validaba contra vacío con `trim()` pero **devolvía el valor original** sin recortar. Un título como `" Clean Code "` quedaba almacenado con espacios, ensuciando búsquedas y comparaciones (`sala`, `codigo`).
- **Cómo lo detecté:** lectura humana de la función de validación.
- **Reproducción:** `POST /libros` con `titulo: "  X  "` → se guardaba `"  X  "`. **(Corregido — ver B2.)**

#### Hallazgo H7

- **Archivo:** `src/utils/validacion.ts` (`asObjeto`)
- **Tipo:** omisión
- **Severidad:** baja
- **Regla violada:** ninguna
- **Descripción:** la validación no rechaza campos desconocidos en el body. `POST /libros` con un campo extra (`{titulo, autor, sala, alta_demanda, color}`) lo ignora en silencio en vez de avisar. No es incorrecto, pero permite typos silenciosos en los nombres de campo.
- **Cómo lo detecté:** lectura humana.
- **Reproducción:** enviar un campo de más en cualquier `POST` → se acepta e ignora.

#### Hallazgo H8

- **Archivo:** `src/services/prestamo.service.ts:233` (`listarPrestamos`)
- **Tipo:** decisión cuestionable
- **Severidad:** baja
- **Regla violada:** ninguna
- **Descripción:** `GET /prestamos?estudiante=CODIGO_INEXISTENTE` devuelve `[]` (lista vacía) en lugar de `404`. La spec solo lista `400` para ese endpoint, así que es defendible, pero puede ocultar errores de tipeo en el código del estudiante.
- **Cómo lo detecté:** lectura humana del filtro.
- **Reproducción:** `GET /prestamos?estudiante=NO-EXISTE` → `200 []`.

#### Hallazgo H9

- **Archivo:** `tests/unit/reglas-negocio.test.ts` (import inicial)
- **Tipo:** bug (de los tests, detectado en la primera corrida)
- **Severidad:** baja
- **Regla violada:** ninguna
- **Descripción:** la IA importó `seedEjemplar` sin usarlo; con `noUnusedLocals` activo, `ts-jest` no compiló el suite y **toda** la suite de reglas no corrió.
- **Cómo lo detecté:** primera ejecución de `npm test` (suite "failed to run").
- **Reproducción:** ya corregido — ver B1.

---

## Sección 2 — Resultados de los tests (Etapa 4)

### Primera ejecución

- **Tests totales:** 31 (14 corrieron; el suite de reglas no compiló)
- **Pasaron:** 14
- **Fallaron:** 0 por aserción, pero **1 suite no compiló** (`reglas-negocio.test.ts`) por el import sin usar (H9).

### Análisis de los fallos

| Test | Tipo de fallo | ¿Bug del código o test mal escrito? | Acción tomada |
|---|---|---|---|
| `reglas-negocio.test.ts` (suite completo) | Error de compilación (TS6133, import sin usar) | Test mal escrito | Quité el import → B1 |
| `RN8 — multa al devolver tarde` | Riesgo de *flakiness* (comparar días exactos con `Date.now()` llamado dos veces) | Test mal diseñado (preventivo) | Aserté la relación `monto = dias*2000` y `dias >= 5`, no el valor exacto |

### Última ejecución (post-correcciones)

- **Tests totales:** 36
- **Pasaron:** 36
- **Fallaron:** 0
- **Cobertura:** ~86% statements global (domain y routes al 100%).

### Tests rojos declarados (bugs no corregidos por tiempo)

- Ninguno en rojo. Quedan **documentados pero no corregidos** (decisiones, no bugs claros): H1, H2, H4, H5 — se dejan así porque dependen de aclaraciones de la cliente (ver preguntas #1, #4, #7 de la especificación) y cambiar el comportamiento sin confirmación podría contradecir el brief.

---

## Sección 3 — Bugs corregidos (Etapa 5)

### Bug B1

- **Hallazgo asociado:** H9
- **Descripción del bug:** import `seedEjemplar` sin usar rompía la compilación del suite de reglas bajo `noUnusedLocals`.
- **Test que lo reveló:** la primera corrida de `npm test` (suite "failed to run").
- **Corrección aplicada:** eliminar `seedEjemplar` de la lista de imports en `reglas-negocio.test.ts`.
- **Tipo de corrección:** por mí a mano (edición directa del import).
- **Resultado:** el suite compila y corre; 31/31 en verde. Sin regresiones.

### Bug B2

- **Hallazgo asociado:** H6
- **Descripción del bug:** `exigirString` no recortaba espacios; guardaba strings con whitespace.
- **Test que lo reveló:** test nuevo `validacion.test.ts` → "recorta espacios alrededor del valor (B2)".
- **Corrección aplicada:** en `exigirString`, calcular `const limpio = valor.trim()` y devolver `limpio`.
- **Tipo de corrección:** por mí a mano durante la auditoría, con test que la fija.
- **Resultado:** 36/36 en verde. Sin regresiones.

---

## Sección 4 — Aprendizajes (mínimo 3)

### Aprendizaje A1

> La IA copia fielmente las reglas que le das, **incluyendo sus contradicciones**. RN2 ("15 días desde hoy") y RN6 ("sumar 15 a la fecha esperada") se contradicen para la renovación, y la IA simplemente eligió una (RN6) y dejó un comentario `// RN2/RN6` sin avisar que chocaban. Si yo no hubiera escrito ambas reglas y luego las hubiera comparado a mano, el conflicto pasa silencioso a producción. La IA no "piensa" en consistencia entre reglas; traduce cada una por separado.

### Aprendizaje A2

> El compilador estricto es un mejor auditor que la lectura rápida. El bug que tumbó la primera corrida (H9) no fue una regla mal implementada sino un import sin usar que, con `noUnusedLocals`, impidió compilar **todo** el suite de reglas. Una config estricta convierte descuidos de la IA en errores ruidosos en vez de bugs callados.

### Aprendizaje A3

> Las pruebas con fechas son una trampa sutil. Mi primer instinto fue afirmar que una multa de "5 días tarde" valía exactamente `10000`, pero como el test calcula la fecha con `Date.now()` y el servicio vuelve a llamar `Date.now()` milisegundos después, el `Math.ceil` podía dar 6 días y la aserción se volvía intermitente. Aprendí a afirmar la **relación invariante** (`monto = dias * 2000`) y dejar el cálculo exacto del redondeo a un test con fechas fijas y deterministas (`fechas.test.ts`).

### Aprendizaje A4

> "Más validación" no siempre es mejor. La IA agregó en `solicitud-espera` una verificación de que el solicitante existe (H5) que la regla RN11 nunca pidió. Es el mismo patrón que vi en el scaffolding (anticipó `HttpError`): la IA tiende a "mejorar de más". A veces ayuda, a veces inventa requisitos que el brief no tiene y que pueden romper un caso de uso válido.

---

## Sección 5 — Decisiones de prompt (autorreflexión)

**¿Hubo algún prompt que reescribiste a mitad de la sesión?**

Sí, pero no de tests sino de **registro**: a mitad de la sesión decidí cambiar la sección "Prompt enviado (literal)" de la carpeta `prompts/` por una versión reconstruida a partir del *output* de cada interacción, redactada de forma clara y concisa. Reconozco la tensión con la plantilla, que pedía el prompt literal "con errores de tipeo incluidos"; la decisión fue priorizar legibilidad del entregable. En cuanto a la generación de tests, sí los anclé explícitamente a las reglas de negocio (un `describe` por RN) en vez de pedir "genera tests" a secas, para que cubrieran el contrato y no solo el código.

**¿Hubo algún momento en que la IA "dijo que terminó" pero al verificar tú descubriste que no?**

En la implementación grande (prompt #05) la IA afirmó dejar todo "en verde", pero la primera corrida real mostró que un suite completo **no compilaba** por un import sin usar (H9/B1). El "terminé" era cierto a nivel de lógica pero falso a nivel de "los tests corren". Confirma que hay que ejecutar siempre, no creerle al resumen. La IA lo corrigió en el mismo paso al correr `npm test`, pero el episodio dejó claro que el "está funcionando" necesita evidencia de ejecución, no la palabra del modelo.

---

## Chatbot Ollama — Registro

> Taller `02-tu-trabajo/taller-ollama-chatbot.md`: usar un modelo local (Ollama)
> como asistente para generar y ejecutar pruebas contra la API, sin costos de API
> en la nube y manteniendo el código privado.

### Modelo usado

- **Nombre:** `qwen2.5-coder:7b`
- **RAM consumida aproximada:** 8–16 GB

### Preguntas útiles que generó el chatbot

| Pregunta que hice | Qué generó el chatbot | ¿Fue útil? |
|---|---|---|
| "genera la prueba RN1 completa: crear los 3 préstamos válidos para pregrado y luego intentar el cuarto" | Un plan paso a paso (crear estudiante → crear 3 libros con ejemplares → 3 préstamos `201` → 4º préstamo esperando `409`), cada paso con su `curl` y una explicación, más un bloque "EJECUTAR" con la secuencia completa. | **Parcial.** La *estructura* del plan y la identificación de RN1 fueron correctas y útiles como guion; pero el **contrato de la API que usó estaba inventado** y no coincide con nuestra implementación (ver limitaciones), así que ningún `curl` habría funcionado tal cual. |

### Limitaciones observadas

**¿El chatbot inventó endpoints / contrato que no existen?** Sí, y fue el problema central:

- **Prefijo y puerto equivocados:** usó `http://localhost:3001/api/...`. Nuestra API corre en el puerto **3010** y **no tiene prefijo `/api`**: las rutas son `/estudiantes`, `/libros`, `/prestamos` directamente.
- **IDs numéricos autoincrementales inventados:** asumió `libros/1`, `estudianteId: 1`, `ejemplarId: 1`. En nuestro modelo los libros usan **UUID**, los estudiantes su **`codigo`** (string) y los ejemplares su **`codigo_inventario`** (string). No hay enteros 1, 2, 3.
- **Campos del body incorrectos / faltantes:**
  - `POST /estudiantes` con `{nombre, tipo}` → faltan los obligatorios `codigo`, `programa`, `semestre` → daría `400 datos_invalidos`.
  - `POST /libros` con `{titulo, tipo: "normal"}` → inventó el campo `tipo`; nuestro contrato usa `alta_demanda` (boolean) y exige además `autor` y `sala` → `400`.
  - `POST /libros/:id/ejemplares` con body vacío → falta `codigo_inventario` → `400`.
  - `POST /prestamos` con `{estudianteId, ejemplarId}` numéricos → nuestro contrato es `{estudiante_codigo, ejemplar_codigo}` (strings).

**¿Confundió reglas / tuvo incoherencias internas?** Sí:

- **Test que no probaría lo que dice:** crea solo 3 ejemplares (libros 1–3) y luego intenta el 4º préstamo con `ejemplarId: 4`, que **no existe**. Eso daría `404 ejemplar_no_encontrado` *antes* de llegar a evaluar RN1, así que el `409` esperado **nunca se alcanzaría**. Para probar RN1 de verdad hace falta un 4º ejemplar disponible.
- **Contradicción en su propia explicación:** el texto dice "creamos tres libros, uno de alta demanda y dos normales", pero los tres `curl` mandan `"tipo": "normal"`. Ninguno es de alta demanda.

**¿Tuvo que corregirle algo / glitches del modelo?** Sí, salida corrupta típica de un modelo local:

- JSON truncado: `-d 'o": "Libro B", "tipo": "normal"}'` (le faltó el inicio `{"titulo": "Libro B"...`).
- Comando roto: `curl -X POSlhost:3001/...` (debía ser `POST http://localhost:3001/...`).
- Palabras cortadas: "solicita el segstamo", "el segstamo".

Lo único que el chatbot acertó de fondo fue la **definición conceptual de RN1** (pregrado ≤ 3 préstamos activos, si no `409`). El fallo no fue entender la regla, sino **mapearla a nuestra API real**: usó un contrato REST genérico porque el *system prompt* no estaba ajustado a nuestra implementación (justo el requisito clave del taller: guardar el system prompt adaptado en `prompts/07-system-prompt-chatbot.md`).

### Comparación: chatbot local vs. ChatGPT/Claude en la nube

**Diferencias en calidad:**

- El modelo local (`qwen2.5-coder:7b`) produjo salida con **JSON malformado, comandos corruptos y palabras truncadas**, errores que rara vez aparecen en los modelos grandes de la nube.
- **Alucinó el contrato completo de la API** (prefijo `/api`, IDs numéricos, campos `tipo`) en vez de pedir o respetar el esquema real. Un modelo de la nube con el mismo system prompt suele anclarse mejor a las restricciones dadas.
- No detectó el **error lógico** de su propio test (probar RN1 con un ejemplar inexistente), algo que un modelo más capaz tiende a notar.

**Ventajas de correrlo localmente:**

- **Costo cero por token:** se puede iterar sobre los prompts de prueba sin gastar en API de nube.
- **Privacidad:** el código y la especificación de la API **no salen de la máquina**, relevante para una entidad como la biblioteca.
- **Sin dependencia de red ni de límites de tasa:** funciona offline.
- A cambio, **paga en RAM** (8–16 GB ocupados) y en **calidad/fiabilidad de la salida**, que exige más revisión humana.

**Conclusión:** para este caso, el chatbot local sirve como **generador de borradores de guion de pruebas** (la estructura paso a paso es un buen punto de partida), pero **no como fuente de comandos ejecutables**: hay que corregirle el contrato contra la especificación real antes de correr nada. Refuerza el aprendizaje de la auditoría: el modelo —local o no— produce algo *plausible* que igual hay que validar contra la realidad de la API.
