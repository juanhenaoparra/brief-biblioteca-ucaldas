# Especificación Formal — Sistema de Préstamo de Libros

> **Autor:** Juan Sebastián Henao Parra
> **Fecha:** 2026-05-12
> **Versión:** 1.0
> **Brief de origen:** Correo de Diana Restrepo, Coordinadora de Biblioteca UCaldas

---

## 1. Propósito del sistema

API REST que gestiona el ciclo de préstamo de libros físicos de la Biblioteca de la Universidad de Caldas. Permite consultar catálogo, registrar préstamos y devoluciones, controlar renovaciones, calcular multas automáticas y reportar préstamos vencidos. Reemplaza la hoja de cálculo actual y expone los datos para consumo desde la app móvil y el portal de estudiantes. Persistencia en memoria en esta versión (no hay base de datos hasta el próximo semestre).

---

## 2. Alcance

**Incluido en esta versión:**

- Catálogo de libros con ejemplares múltiples por libro.
- Gestión de estudiantes de pregrado y posgrado.
- Creación, renovación y devolución de préstamos.
- Cálculo automático de multas al devolver tarde.
- Consulta de préstamos vigentes y de préstamos vencidos.
- Consulta del historial de préstamos por estudiante.
- Reglas de límites por tipo de estudiante y por tipo de libro (normal vs alta demanda).
- Bloqueo de préstamos por morosidad (vencidos sin devolver o multas pendientes).

**Explícitamente fuera del alcance:**

- Préstamos a profesores investigadores (hasta 10 libros, 30 días) — la cliente lo declara fuera del alcance.
- Persistencia en base de datos (queda para el próximo semestre, con presupuesto).
- Autenticación / autorización (sin login, sin roles).
- Frontend (móvil y portal son consumidores externos, no se construyen aquí).
- Pago de multas (solo se registran y se acumulan; el cobro físico es presencial).
- Notificaciones push o por correo de vencimientos (solo se exponen vía endpoint).
- Reserva de libros con lista de espera (la API la modela como bandera, no como cola).

---

## 3. Modelo de datos

### Entidad: Libro

| Campo          | Tipo    | Obligatorio | Descripción                                              |
|----------------|---------|-------------|----------------------------------------------------------|
| `id`           | string  | sí          | Identificador único del título (UUID generado por API).  |
| `titulo`       | string  | sí          | Título del libro.                                        |
| `autor`        | string  | sí          | Autor principal.                                         |
| `sala`         | string  | sí          | Sala física donde se ubica.                              |
| `alta_demanda` | boolean | sí          | `true` si pertenece a sala de reserva (plazo 3 días).    |

### Entidad: Ejemplar

| Campo                | Tipo    | Obligatorio | Descripción                                                                |
|----------------------|---------|-------------|----------------------------------------------------------------------------|
| `codigo_inventario`  | string  | sí          | Código único de inventario por ejemplar físico (PK natural).               |
| `libro_id`           | string  | sí          | FK al libro al que pertenece.                                              |
| `estado`             | enum    | sí          | `"disponible"` \| `"prestado"`.                                            |
| `solicitado_por_otro`| boolean | sí          | `true` si otro estudiante registró una solicitud sobre este ejemplar (bloquea renovación). |

### Entidad: Estudiante

| Campo               | Tipo    | Obligatorio | Descripción                                              |
|---------------------|---------|-------------|----------------------------------------------------------|
| `codigo`            | string  | sí          | Código único institucional (PK).                         |
| `nombre`            | string  | sí          | Nombre completo.                                         |
| `programa`          | string  | sí          | Programa académico.                                      |
| `semestre`          | integer | sí          | Semestre actual (>= 1).                                  |
| `tipo`              | enum    | sí          | `"pregrado"` \| `"posgrado"`.                            |

### Entidad: Préstamo

| Campo                       | Tipo     | Obligatorio | Descripción                                                            |
|-----------------------------|----------|-------------|------------------------------------------------------------------------|
| `id`                        | string   | sí          | Identificador único del préstamo (UUID).                               |
| `estudiante_codigo`         | string   | sí          | FK al estudiante.                                                      |
| `ejemplar_codigo`           | string   | sí          | FK al ejemplar.                                                        |
| `fecha_prestamo`            | ISO 8601 | sí          | Fecha y hora de creación, en UTC.                                      |
| `fecha_devolucion_esperada` | ISO 8601 | sí          | Calculada según tipo de libro (15 o 3 días desde fecha_prestamo).      |
| `fecha_devolucion_real`     | ISO 8601 | no          | Se asigna al devolver. Null mientras esté activo.                      |
| `estado`                    | enum     | sí          | `"activo"` \| `"devuelto"` \| `"vencido"`.                             |
| `renovaciones`              | integer  | sí          | Contador de renovaciones aplicadas (0 al crear).                       |

### Entidad: Multa

| Campo                | Tipo     | Obligatorio | Descripción                                          |
|----------------------|----------|-------------|------------------------------------------------------|
| `id`                 | string   | sí          | Identificador único (UUID).                          |
| `estudiante_codigo`  | string   | sí          | FK al estudiante.                                    |
| `prestamo_id`        | string   | sí          | FK al préstamo que la generó.                        |
| `dias_retraso`       | integer  | sí          | Días calendario entre `fecha_devolucion_esperada` y `fecha_devolucion_real`. |
| `monto_cop`          | integer  | sí          | `dias_retraso * 2000`.                               |
| `pagada`             | boolean  | sí          | `false` al crear. Marca de pago.                     |
| `fecha_generacion`   | ISO 8601 | sí          | Fecha y hora de generación, en UTC.                  |

### Diagrama de relaciones

```
Libro 1 --- N Ejemplar
Estudiante 1 --- N Préstamo
Ejemplar 1 --- N Préstamo (a lo largo del tiempo; solo uno con estado=activo a la vez)
Préstamo 0..1 --- 1 Multa (solo si devuelto tarde)
Estudiante 1 --- N Multa
```

---

## 4. Endpoints REST

| Método | Ruta                                  | Propósito                                                | Body / Query                                        | Respuesta éxito                         | Códigos error posibles  |
|--------|---------------------------------------|----------------------------------------------------------|-----------------------------------------------------|-----------------------------------------|-------------------------|
| `GET`  | `/libros`                             | Listar catálogo. Filtros opcionales.                     | Query: `?disponibles=true&sala=X`                   | `200` lista de libros con conteo de ejemplares disponibles | `400`         |
| `GET`  | `/libros/:id`                         | Detalle de un libro y sus ejemplares.                    | —                                                   | `200` con libro + ejemplares            | `404`                   |
| `POST` | `/libros`                             | Crear libro (carga inicial del catálogo).                | `{titulo, autor, sala, alta_demanda}`               | `201` con libro creado                  | `400`                   |
| `POST` | `/libros/:id/ejemplares`              | Agregar un ejemplar a un libro existente.                | `{codigo_inventario}`                               | `201` con ejemplar                      | `400`, `404`, `409`     |
| `GET`  | `/estudiantes/:codigo`                | Detalle de un estudiante.                                | —                                                   | `200`                                   | `404`                   |
| `POST` | `/estudiantes`                        | Crear estudiante (alta).                                 | `{codigo, nombre, programa, semestre, tipo}`        | `201`                                   | `400`, `409`            |
| `GET`  | `/estudiantes/:codigo/historial`      | Historial completo de préstamos del estudiante.          | —                                                   | `200` lista de préstamos                | `404`                   |
| `POST` | `/prestamos`                          | Crear préstamo.                                          | `{estudiante_codigo, ejemplar_codigo}`              | `201` con préstamo                      | `400`, `404`, `409`     |
| `POST` | `/prestamos/:id/devolucion`           | Registrar devolución; calcula multa si aplica.           | —                                                   | `200` préstamo + multa (si aplica)      | `404`, `409`            |
| `POST` | `/prestamos/:id/renovacion`           | Renovar préstamo si no hay otro solicitante.             | —                                                   | `200` con nueva `fecha_devolucion_esperada` | `404`, `409`        |
| `POST` | `/prestamos/:id/solicitud-espera`     | Marcar que otro estudiante espera el ejemplar (bloquea renovación). | `{estudiante_codigo}`                  | `200` ejemplar marcado                  | `404`, `409`            |
| `GET`  | `/prestamos`                          | Listar préstamos vigentes (estado=activo).               | Query: `?estudiante=...&vencidos=true`              | `200` lista                             | `400`                   |
| `GET`  | `/prestamos/vencidos`                 | Listar préstamos con `fecha_devolucion_esperada < hoy` y `estado=activo`. | —                                | `200` lista                             | —                       |
| `GET`  | `/multas`                             | Listar multas. Filtros por estudiante o estado pagada.   | Query: `?estudiante=...&pagada=false`               | `200` lista                             | `400`                   |

---

## 5. Reglas de negocio

### RN1 — Límite de préstamos activos por tipo de estudiante

- **Trigger:** al recibir `POST /prestamos`.
- **Condición:**
  - Pregrado: máximo 3 préstamos con `estado = "activo"`.
  - Posgrado: máximo 5 préstamos con `estado = "activo"`.
- **Acción si cumple:** continuar con validaciones siguientes.
- **Acción si no cumple:** `409 Conflict` con `{error: "limite_prestamos_alcanzado", limite: N, actuales: M}`.

### RN2 — Plazo de devolución según tipo de libro

- **Trigger:** al crear un préstamo o al renovarlo.
- **Condición:**
  - Libro normal (`alta_demanda = false`): `fecha_devolucion_esperada = fecha_prestamo + 15 días`.
  - Libro alta demanda (`alta_demanda = true`): `fecha_devolucion_esperada = fecha_prestamo + 3 días`.
- **Acción si cumple:** asignar `fecha_devolucion_esperada` calculada.
- **Acción si no cumple:** N/A (la regla siempre aplica; sin error posible).

### RN3 — Bloqueo por préstamo vencido

- **Trigger:** al recibir `POST /prestamos`.
- **Condición:** el estudiante no debe tener ningún préstamo con `estado = "activo"` cuya `fecha_devolucion_esperada < ahora`.
- **Acción si cumple:** continuar.
- **Acción si no cumple:** `409 Conflict` con `{error: "tiene_prestamos_vencidos", prestamos_vencidos: [...]}`.

### RN4 — Bloqueo por multas pendientes

- **Trigger:** al recibir `POST /prestamos`.
- **Condición:** el estudiante no debe tener ninguna multa con `pagada = false`.
- **Acción si cumple:** continuar.
- **Acción si no cumple:** `409 Conflict` con `{error: "tiene_multas_pendientes", monto_total: N}`.

### RN5 — Ejemplar no puede prestarse dos veces simultáneamente

- **Trigger:** al recibir `POST /prestamos`.
- **Condición:** el `ejemplar.estado` debe ser `"disponible"`.
- **Acción si cumple:** marcar `ejemplar.estado = "prestado"` y crear el préstamo.
- **Acción si no cumple:** `409 Conflict` con `{error: "ejemplar_no_disponible"}`.

### RN6 — Renovación bloqueada por lista de espera

- **Trigger:** al recibir `POST /prestamos/:id/renovacion`.
- **Condición:** el ejemplar asociado no debe tener `solicitado_por_otro = true`.
- **Acción si cumple:** sumar 15 días (o 3 si alta demanda) a `fecha_devolucion_esperada`, incrementar `renovaciones`.
- **Acción si no cumple:** `409 Conflict` con `{error: "no_renovable_lista_espera"}`.

### RN7 — Renovación solo sobre préstamo activo

- **Trigger:** al recibir `POST /prestamos/:id/renovacion`.
- **Condición:** `prestamo.estado` debe ser `"activo"`.
- **Acción si no cumple:** `409 Conflict` con `{error: "prestamo_no_renovable_estado", estado_actual: ...}`.

### RN8 — Cálculo de multa al devolver tarde

- **Trigger:** al recibir `POST /prestamos/:id/devolucion`.
- **Condición:** si `fecha_devolucion_real > fecha_devolucion_esperada`.
- **Acción si cumple:**
  - `dias_retraso = ceil((fecha_devolucion_real - fecha_devolucion_esperada) en días calendario)`.
  - `monto_cop = dias_retraso * 2000`.
  - Crear `Multa` con `pagada = false` y vincularla al préstamo y al estudiante.
- **Acción si no cumple:** no se genera multa.

### RN9 — Devolución solo sobre préstamo activo

- **Trigger:** al recibir `POST /prestamos/:id/devolucion`.
- **Condición:** `prestamo.estado` debe ser `"activo"`.
- **Acción si cumple:** marcar `estado = "devuelto"`, asignar `fecha_devolucion_real = ahora`, liberar ejemplar (`estado = "disponible"`, `solicitado_por_otro = false`).
- **Acción si no cumple:** `409 Conflict` con `{error: "prestamo_ya_devuelto_o_invalido"}`.

### RN10 — Tipo de estudiante restringido a pregrado/posgrado

- **Trigger:** al recibir `POST /estudiantes`.
- **Condición:** `tipo ∈ {"pregrado", "posgrado"}`.
- **Acción si no cumple:** `400 Bad Request` con `{error: "tipo_estudiante_no_soportado"}`.

### RN11 — Marca de solicitud sobre ejemplar (alimenta RN6)

- **Trigger:** al recibir `POST /prestamos/:id/solicitud-espera`.
- **Condición:** el `prestamo.estado` debe ser `"activo"` y el solicitante debe ser distinto al actual prestatario.
- **Acción si cumple:** `ejemplar.solicitado_por_otro = true`.
- **Acción si no cumple:** `409 Conflict`.

### RN12 — Estado "vencido" derivado, no almacenado

- **Trigger:** al listar préstamos o consultar vencidos.
- **Condición:** un préstamo con `estado = "activo"` y `fecha_devolucion_esperada < ahora` se reporta como vencido en respuestas, sin necesidad de mutar el registro hasta que se devuelva.
- **Acción si cumple:** marcar la respuesta con `vencido: true`.

---

## 6. Decisiones tomadas (lo que el correo no dice)

### D1 — Días calendario para multa

- **Contexto:** el correo dice "2.000 pesos por día de retraso", pero no precisa si son días hábiles o calendario.
- **Decisión:** días calendario, redondeados hacia arriba.
- **Justificación:** interpretación más simple; alinea con la práctica común de bibliotecas universitarias en Colombia y evita depender de un calendario de festivos.

### D2 — Fechas en ISO 8601 UTC

- **Contexto:** el correo no define formato ni zona horaria.
- **Decisión:** toda fecha en la API se serializa como `YYYY-MM-DDTHH:mm:ss.sssZ` (UTC).
- **Justificación:** estándar industria, evita ambigüedad de zona horaria al consumirse desde móvil y portal.

### D3 — "Lista de espera" modelada como bandera booleana

- **Contexto:** el correo dice "si otro estudiante lo está esperando, no se renueva", pero no pide una cola formal con FIFO ni notificaciones.
- **Decisión:** el ejemplar tiene `solicitado_por_otro: boolean`, encendida por el endpoint `POST /prestamos/:id/solicitud-espera` y apagada al devolver.
- **Justificación:** cubre la regla solicitada (bloquea renovación) sin sobreingeniería. Una cola FIFO con prioridades excede el alcance de esta versión.

### D4 — Estado "vencido" es derivado, no almacenado

- **Contexto:** el correo pide "avisar sobre préstamos vencidos" sin precisar si "vencido" es un estado persistido o calculado al vuelo.
- **Decisión:** se mantiene `estado` con valores `activo / devuelto`. El vencimiento se computa comparando `fecha_devolucion_esperada` contra `ahora` al momento de la consulta.
- **Justificación:** evita un job de cron para mutar estados; con datos en memoria un cron añade complejidad innecesaria.

### D5 — Sin endpoint para pagar multa en esta versión

- **Contexto:** el correo menciona que se cobra y que mientras esté pendiente bloquea préstamos, pero no detalla cómo se registra el pago.
- **Decisión:** las multas se crean con `pagada = false` y no hay endpoint para marcarlas como pagadas en V1. Se asume gestión presencial.
- **Justificación:** mantiene el alcance del MVP y respeta la restricción "por ahora con esto está bien".

### D6 — Catálogo y estudiantes se cargan vía POST (no se asume seed)

- **Contexto:** el correo dice "tenemos varios miles de libros catalogados" pero el sistema arranca en memoria sin datos.
- **Decisión:** exponer `POST /libros`, `POST /libros/:id/ejemplares` y `POST /estudiantes` para que la biblioteca pueda poblar el sistema.
- **Justificación:** sin estos endpoints el sistema no podría usarse; un seed estático sería frágil.

### D7 — Códigos HTTP unificados para errores de regla de negocio

- **Contexto:** el correo no especifica códigos HTTP.
- **Decisión:** `400` para validación de payload, `404` para recurso inexistente, `409` para violación de regla de negocio.
- **Justificación:** convención REST estándar; `409 Conflict` comunica "tu petición es válida sintácticamente pero choca con el estado del sistema".

---

## 7. Códigos HTTP usados

| Código | Significado            | Cuándo se usa                                                                |
|--------|------------------------|------------------------------------------------------------------------------|
| 200    | OK                     | GET exitosos; devoluciones y renovaciones exitosas.                          |
| 201    | Created                | POST que crea recurso (libro, ejemplar, estudiante, préstamo).               |
| 400    | Bad Request            | Body malformado, campo obligatorio faltante, tipo inválido.                  |
| 404    | Not Found              | Estudiante, libro, ejemplar o préstamo inexistente.                          |
| 409    | Conflict               | Reglas de negocio violadas (límites, vencidos, multas, lista de espera, ejemplar ya prestado, estado inválido). |
| 500    | Internal Server Error  | Excepción no controlada del servidor.                                        |

---

## 8. Restricciones técnicas

- **Stack:** Node.js + Express (JavaScript, sin TypeScript).
- **Persistencia:** datos en memoria (objetos y arrays en módulo del servidor). Sin base de datos.
- **Sin autenticación** en esta versión.
- **Sin frontend** en esta versión. Solo API REST con JSON.
- **Sin notificaciones externas** (correo, push). El cliente consume `GET /prestamos/vencidos` cuando lo necesite.

---

## 9. Preguntas pendientes para la cliente

1. **Multa y días hábiles:** ¿la multa por día se cobra incluyendo sábados, domingos y festivos, o solo días hábiles? (asumido: días calendario — ver D1).
2. **Pago de multas:** ¿cómo se registra el pago de una multa? ¿lo hace un funcionario en mostrador o hay un proceso aparte? (asumido: fuera del alcance V1 — ver D5).
3. **Lista de espera:** si dos estudiantes "solicitan" el mismo ejemplar prestado, ¿hay prioridad (FIFO) o basta con marcar que hay espera? (asumido: bandera booleana sin orden — ver D3).
4. **Renovación múltiple:** ¿un préstamo puede renovarse infinitas veces mientras no haya lista de espera, o hay un tope de renovaciones?
5. **Cambio de tipo de estudiante:** cuando un estudiante de pregrado pasa a posgrado, ¿su límite cambia automáticamente o requiere un proceso manual?
6. **Disponibilidad parcial:** si un libro tiene 5 ejemplares y 3 están prestados, ¿en el catálogo se muestra como "disponible", "parcialmente disponible" o se devuelve el conteo? (asumido: conteo numérico de ejemplares disponibles).
7. **Reset de morosidad:** ¿el bloqueo por vencidos se levanta apenas devuelve, o el estudiante queda marcado por un período?
