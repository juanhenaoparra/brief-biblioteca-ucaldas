# Especificación — Sistema de Préstamo de Libros

> **Autor:** Juan Sebastián Henao Parra
> **Fecha:** 2026-05-12
> **Versión:** 1.0
> **Brief de origen:** Correo de Diana Restrepo, Coordinadora de Biblioteca UCaldas

---

## 1. Propósito del sistema

Construir una API REST que le permita a la biblioteca de la U. de Caldas dejar de manejar los préstamos en una hoja de cálculo. La idea es que desde la API se pueda consultar el catálogo, prestar libros, devolverlos, renovar préstamos, calcular multas y saber quién tiene libros vencidos. Por ahora los datos viven en memoria; la base de datos queda para más adelante cuando salga el presupuesto. La API la van a consumir la app móvil y el portal de estudiantes, así que el frontend lo hace otra persona.

---

## 2. Alcance

**Lo que sí entra en esta versión:**

- Catálogo de libros con varios ejemplares por título.
- Estudiantes de pregrado y posgrado.
- Crear, renovar y devolver préstamos.
- Multas automáticas cuando alguien devuelve tarde.
- Ver préstamos vigentes y préstamos vencidos.
- Historial de préstamos por estudiante.
- Bloquear préstamos a quien tenga vencidos o multas sin pagar.
- Plazos distintos según el tipo de libro (normal vs. alta demanda).

**Lo que no entra (al menos por ahora):**

- Profesores investigadores. La misma cliente dijo que ese caso lo manejan aparte.
- Base de datos. Todo en memoria hasta que haya presupuesto.
- Login / autenticación. No la pidieron.
- Frontend. Esto es solo la API.
- Pagar multas desde la API. Por ahora solo se calculan y se acumulan; el pago lo manejan en mostrador.
- Notificaciones por correo o push. Si quieren ver vencidos, consultan el endpoint.
- Cola de espera FIFO con prioridades. Solo modelo si hay alguien esperando o no (bandera), no el orden.

---

## 3. Modelo de datos

### Libro

| Campo          | Tipo    | Obligatorio | Descripción                                              |
|----------------|---------|-------------|----------------------------------------------------------|
| `id`           | string  | sí          | ID único del libro (UUID generado por la API).           |
| `titulo`       | string  | sí          | Título.                                                  |
| `autor`        | string  | sí          | Autor principal.                                         |
| `sala`         | string  | sí          | Sala donde se ubica.                                     |
| `alta_demanda` | boolean | sí          | `true` si es de sala de reserva (plazo de 3 días).       |

### Ejemplar

Cada libro puede tener varios ejemplares físicos, cada uno con su propio código de inventario.

| Campo                 | Tipo    | Obligatorio | Descripción                                                              |
|-----------------------|---------|-------------|--------------------------------------------------------------------------|
| `codigo_inventario`   | string  | sí          | Código del ejemplar físico (esta es la "llave" real).                    |
| `libro_id`            | string  | sí          | A qué libro pertenece.                                                   |
| `estado`              | enum    | sí          | `"disponible"` o `"prestado"`.                                           |
| `solicitado_por_otro` | boolean | sí          | `true` si otro estudiante ya pidió este ejemplar (esto bloquea renovar). |

### Estudiante

| Campo      | Tipo    | Obligatorio | Descripción                                  |
|------------|---------|-------------|----------------------------------------------|
| `codigo`   | string  | sí          | Código institucional del estudiante.         |
| `nombre`   | string  | sí          | Nombre completo.                             |
| `programa` | string  | sí          | Programa académico.                          |
| `semestre` | integer | sí          | Semestre actual (≥ 1).                       |
| `tipo`     | enum    | sí          | `"pregrado"` o `"posgrado"`.                 |

### Préstamo

| Campo                       | Tipo     | Obligatorio | Descripción                                                                |
|-----------------------------|----------|-------------|----------------------------------------------------------------------------|
| `id`                        | string   | sí          | ID único del préstamo (UUID).                                              |
| `estudiante_codigo`         | string   | sí          | Quién prestó el libro.                                                     |
| `ejemplar_codigo`           | string   | sí          | Qué ejemplar se llevó.                                                     |
| `fecha_prestamo`            | ISO 8601 | sí          | Cuándo se prestó (UTC).                                                    |
| `fecha_devolucion_esperada` | ISO 8601 | sí          | Cuándo lo tiene que devolver (15 o 3 días después según el libro).         |
| `fecha_devolucion_real`     | ISO 8601 | no          | Cuándo lo devolvió de verdad. Vacío mientras esté activo.                  |
| `estado`                    | enum     | sí          | `"activo"` o `"devuelto"`.                                                 |
| `renovaciones`              | integer  | sí          | Cuántas veces se renovó (arranca en 0).                                    |

### Multa

| Campo                | Tipo     | Obligatorio | Descripción                                          |
|----------------------|----------|-------------|------------------------------------------------------|
| `id`                 | string   | sí          | ID único (UUID).                                     |
| `estudiante_codigo`  | string   | sí          | A quién se le cobra.                                 |
| `prestamo_id`        | string   | sí          | Por cuál préstamo se generó.                         |
| `dias_retraso`       | integer  | sí          | Días de retraso (calendario).                        |
| `monto_cop`          | integer  | sí          | `dias_retraso * 2000`.                               |
| `pagada`             | boolean  | sí          | `false` al crearla.                                  |
| `fecha_generacion`   | ISO 8601 | sí          | Cuándo se generó (UTC).                              |

### Cómo se relacionan

```
Libro 1 --- N Ejemplar
Estudiante 1 --- N Préstamo
Ejemplar 1 --- N Préstamo (a lo largo del tiempo; solo uno activo a la vez)
Préstamo 0..1 --- 1 Multa (solo si devolvió tarde)
Estudiante 1 --- N Multa
```

---

## 4. Endpoints REST

| Método | Ruta                                  | Para qué                                                 | Body / Query                                        | Respuesta éxito                         | Errores posibles  |
|--------|---------------------------------------|----------------------------------------------------------|-----------------------------------------------------|-----------------------------------------|-------------------|
| `GET`  | `/libros`                             | Ver el catálogo. Se pueden filtrar.                      | Query: `?disponibles=true&sala=X`                   | `200` lista con conteo de ejemplares disponibles | `400`    |
| `GET`  | `/libros/:id`                         | Ver un libro y sus ejemplares.                           | —                                                   | `200`                                   | `404`             |
| `POST` | `/libros`                             | Cargar un libro al catálogo.                             | `{titulo, autor, sala, alta_demanda}`               | `201`                                   | `400`             |
| `POST` | `/libros/:id/ejemplares`              | Agregar un ejemplar a un libro existente.                | `{codigo_inventario}`                               | `201`                                   | `400`, `404`, `409` |
| `GET`  | `/estudiantes/:codigo`                | Ver un estudiante.                                       | —                                                   | `200`                                   | `404`             |
| `POST` | `/estudiantes`                        | Registrar un estudiante.                                 | `{codigo, nombre, programa, semestre, tipo}`        | `201`                                   | `400`, `409`      |
| `GET`  | `/estudiantes/:codigo/historial`      | Ver todo lo que ha prestado un estudiante.               | —                                                   | `200` lista                             | `404`             |
| `POST` | `/prestamos`                          | Prestar un libro.                                        | `{estudiante_codigo, ejemplar_codigo}`              | `201`                                   | `400`, `404`, `409` |
| `POST` | `/prestamos/:id/devolucion`           | Devolver. Aquí se calcula multa si corresponde.          | —                                                   | `200` con préstamo y multa (si aplica)  | `404`, `409`      |
| `POST` | `/prestamos/:id/renovacion`           | Renovar el préstamo si nadie más lo espera.              | —                                                   | `200` con nueva fecha de devolución     | `404`, `409`      |
| `POST` | `/prestamos/:id/solicitud-espera`     | Marcar que otro estudiante está esperando ese ejemplar.  | `{estudiante_codigo}`                               | `200`                                   | `404`, `409`      |
| `GET`  | `/prestamos`                          | Ver préstamos activos.                                   | Query: `?estudiante=...&vencidos=true`              | `200` lista                             | `400`             |
| `GET`  | `/prestamos/vencidos`                 | Solo los que ya están vencidos.                          | —                                                   | `200` lista                             | —                 |
| `GET`  | `/multas`                             | Ver multas. Se pueden filtrar.                           | Query: `?estudiante=...&pagada=false`               | `200` lista                             | `400`             |

---

## 5. Reglas de negocio

### RN1 — Cupo de préstamos según tipo de estudiante

- **Cuándo se evalúa:** al hacer `POST /prestamos`.
- **Qué se valida:**
  - Pregrado: máximo 3 préstamos activos.
  - Posgrado: máximo 5 préstamos activos.
- **Si pasa:** sigue al resto de validaciones.
- **Si no pasa:** `409 Conflict` con `{error: "limite_prestamos_alcanzado", limite: N, actuales: M}`.

### RN2 — Plazo según el tipo de libro

- **Cuándo se evalúa:** al crear o renovar un préstamo.
- **Qué se valida:**
  - Libro normal: 15 días desde hoy.
  - Libro de alta demanda: 3 días desde hoy.
- **Si pasa:** se guarda `fecha_devolucion_esperada` con ese cálculo.
- **Si no pasa:** no hay caso de error; la regla siempre aplica.

### RN3 — Bloqueado si tiene libros vencidos

- **Cuándo se evalúa:** al hacer `POST /prestamos`.
- **Qué se valida:** el estudiante no debe tener préstamos activos cuya fecha esperada ya pasó.
- **Si pasa:** sigue.
- **Si no pasa:** `409 Conflict` con `{error: "tiene_prestamos_vencidos", prestamos_vencidos: [...]}`.

### RN4 — Bloqueado si tiene multas sin pagar

- **Cuándo se evalúa:** al hacer `POST /prestamos`.
- **Qué se valida:** el estudiante no debe tener ninguna multa con `pagada = false`.
- **Si pasa:** sigue.
- **Si no pasa:** `409 Conflict` con `{error: "tiene_multas_pendientes", monto_total: N}`.

### RN5 — Un ejemplar no se presta dos veces a la vez

- **Cuándo se evalúa:** al hacer `POST /prestamos`.
- **Qué se valida:** el ejemplar debe estar `"disponible"`.
- **Si pasa:** se marca como `"prestado"` y se crea el préstamo.
- **Si no pasa:** `409 Conflict` con `{error: "ejemplar_no_disponible"}`.

### RN6 — No se puede renovar si otro estudiante está esperando

- **Cuándo se evalúa:** al hacer `POST /prestamos/:id/renovacion`.
- **Qué se valida:** el ejemplar no debe tener `solicitado_por_otro = true`.
- **Si pasa:** se suman 15 días (o 3 si es alta demanda) a la fecha esperada y se incrementa `renovaciones`.
- **Si no pasa:** `409 Conflict` con `{error: "no_renovable_lista_espera"}`.

### RN7 — Solo se renuevan préstamos activos

- **Cuándo se evalúa:** al hacer `POST /prestamos/:id/renovacion`.
- **Qué se valida:** el préstamo debe estar en estado `"activo"`.
- **Si no pasa:** `409 Conflict` con `{error: "prestamo_no_renovable_estado", estado_actual: ...}`.

### RN8 — Cálculo de la multa al devolver tarde

- **Cuándo se evalúa:** al hacer `POST /prestamos/:id/devolucion`.
- **Qué se valida:** si `fecha_devolucion_real > fecha_devolucion_esperada`.
- **Si pasa:**
  - `dias_retraso = redondear hacia arriba la diferencia en días calendario`.
  - `monto_cop = dias_retraso * 2000`.
  - Se crea la multa con `pagada = false`.
- **Si no pasa:** no se genera multa.

### RN9 — Solo se devuelve un préstamo activo

- **Cuándo se evalúa:** al hacer `POST /prestamos/:id/devolucion`.
- **Qué se valida:** el préstamo debe estar `"activo"`.
- **Si pasa:** se marca como `"devuelto"`, se pone `fecha_devolucion_real = ahora` y se libera el ejemplar.
- **Si no pasa:** `409 Conflict` con `{error: "prestamo_ya_devuelto_o_invalido"}`.

### RN10 — Solo pregrado o posgrado

- **Cuándo se evalúa:** al hacer `POST /estudiantes`.
- **Qué se valida:** `tipo` debe ser `"pregrado"` o `"posgrado"`.
- **Si no pasa:** `400 Bad Request` con `{error: "tipo_estudiante_no_soportado"}`.

### RN11 — Marcar que alguien está esperando un ejemplar

- **Cuándo se evalúa:** al hacer `POST /prestamos/:id/solicitud-espera`.
- **Qué se valida:** el préstamo debe estar `"activo"` y el solicitante debe ser distinto al que tiene el libro.
- **Si pasa:** se prende `solicitado_por_otro = true` en el ejemplar.
- **Si no pasa:** `409 Conflict`.

### RN12 — "Vencido" se calcula al vuelo, no se guarda

- **Cuándo se evalúa:** cuando se listan préstamos o se consultan los vencidos.
- **Qué se valida:** un préstamo está vencido si está `"activo"` y `fecha_devolucion_esperada < ahora`.
- **Si pasa:** se devuelve con `vencido: true` en la respuesta, pero el campo `estado` no cambia.

---

## 6. Decisiones que tomé (cosas que el correo no dice)

### D1 — Los días de retraso son días calendario

- **El hueco:** el correo dice "2.000 pesos por día de retraso" pero no aclara si cuenta sábados, domingos y festivos.
- **Lo que decidí:** días calendario, y si la diferencia da decimales redondeo hacia arriba.
- **Por qué:** es lo más simple, no me obliga a mantener un calendario de festivos colombianos y es lo que hacen casi todas las bibliotecas.

### D2 — Todas las fechas en ISO 8601 UTC

- **El hueco:** no se dice qué formato ni qué zona horaria usar.
- **Lo que decidí:** `YYYY-MM-DDTHH:mm:ss.sssZ`, todo en UTC.
- **Por qué:** es el estándar y evita líos cuando la app móvil esté en otra zona horaria.

### D3 — La "lista de espera" es solo una bandera

- **El hueco:** el correo dice que no se puede renovar si alguien más está esperando, pero no pide una cola con prioridades ni notificaciones.
- **Lo que decidí:** el ejemplar tiene `solicitado_por_otro: boolean`. Se prende con `POST /prestamos/:id/solicitud-espera` y se apaga al devolver.
- **Por qué:** cubre la regla sin meterme en una cola FIFO que excede el alcance.

### D4 — "Vencido" no se guarda, se calcula

- **El hueco:** no queda claro si "vencido" es un estado persistido o algo que se calcula al consultar.
- **Lo que decidí:** el campo `estado` solo tiene `"activo"` o `"devuelto"`. Vencido se calcula al vuelo.
- **Por qué:** con datos en memoria un cron job para mutar estados es más lío que beneficio.

### D5 — En esta versión no hay endpoint para pagar multas

- **El hueco:** el correo no explica cómo se registra el pago de una multa.
- **Lo que decidí:** las multas se quedan en `pagada = false`. No hay endpoint para marcarlas como pagadas.
- **Por qué:** el alcance dice "por ahora con esto está bien" y el cobro físico es presencial.

### D6 — El catálogo y los estudiantes se cargan vía POST

- **El hueco:** dicen que ya tienen miles de libros pero el sistema arranca vacío en memoria.
- **Lo que decidí:** exponer `POST /libros`, `POST /libros/:id/ejemplares` y `POST /estudiantes`.
- **Por qué:** sin estos endpoints el sistema no se puede usar. Un seed fijo en código quedaría feo y poco flexible.

### D7 — Códigos HTTP estándar para los errores

- **El hueco:** el correo no menciona códigos HTTP.
- **Lo que decidí:** `400` si el body está mal, `404` si no existe el recurso, `409` si choca con una regla de negocio.
- **Por qué:** es la convención REST y `409` comunica bien la idea de "lo pediste bien pero el sistema no te deja".

---

## 7. Códigos HTTP usados

| Código | Significado            | Cuándo se usa                                                                |
|--------|------------------------|------------------------------------------------------------------------------|
| 200    | OK                     | GETs, devoluciones y renovaciones que salen bien.                            |
| 201    | Created                | POST que crea algo (libro, ejemplar, estudiante, préstamo).                  |
| 400    | Bad Request            | Body mal armado, campo obligatorio faltando, tipo de dato incorrecto.        |
| 404    | Not Found              | El estudiante, libro, ejemplar o préstamo no existe.                         |
| 409    | Conflict               | Una regla de negocio bloquea la operación (cupo, vencidos, multas, etc.).    |
| 500    | Internal Server Error  | Algo se cayó en el servidor.                                                 |

---

## 8. Restricciones técnicas

- **Stack:** Node.js + Express + **TypeScript**.
- **Persistencia:** datos en memoria (objetos y arrays). Sin base de datos.
- **Sin autenticación** en esta versión.
- **Sin frontend.** Solo API REST con JSON.
- **Sin notificaciones externas** (correo, push). Si quieren ver vencidos, consultan `GET /prestamos/vencidos`.

---

## 9. Preguntas que le haría a la cliente

1. **Multas y días hábiles:** los 2.000 por día, ¿cuentan sábados, domingos y festivos o solo días hábiles? (asumí calendario, ver D1).
2. **Pago de multas:** ¿quién y cómo registra que ya pagaron? ¿Lo hace alguien en mostrador? (lo dejé fuera del alcance, ver D5).
3. **Lista de espera:** si dos estudiantes piden el mismo ejemplar, ¿hay un orden FIFO o basta con saber que hay alguien esperando? (asumí lo segundo, ver D3).
4. **Renovaciones infinitas:** ¿puedo renovar el mismo libro 10 veces si nadie más lo pide, o hay un tope?
5. **Cambio de tipo de estudiante:** si un estudiante pasa de pregrado a posgrado, ¿el cupo cambia solo o hay que hacerlo a mano?
6. **Catálogo y disponibilidad:** si un libro tiene 5 ejemplares y 3 están prestados, ¿cómo lo muestro? ¿"disponible", "parcialmente disponible" o el conteo? (estoy devolviendo el conteo).
7. **Reset de morosidad:** cuando devuelven un libro vencido, ¿el bloqueo se quita inmediato o queda con marca por un rato?
