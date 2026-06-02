# Reflexión final

> **Autor:** Juan Sebastián Henao Parra
> **Proyecto:** API de Préstamo de Libros — Biblioteca UCaldas

---

## 1. ¿Cuál fue la decisión más difícil al traducir el brief?

La decisión inicial del **stack tecnológico**. Fue la que más conocimiento previo
exigió y la que más investigación me tomó antes de poder fijarla, porque no se
trataba de elegir lo que más me gustara sino lo que **encajara con las
restricciones reales del proyecto**: datos en memoria (sin base de datos hasta
que haya presupuesto), una API REST que van a consumir una app móvil y un portal,
sin autenticación y sin frontend de mi lado.

Investigué a fondo para llegar a **Node.js + Express + TypeScript**:

- **TypeScript** sobre JavaScript plano porque el brief tiene muchas reglas de
  negocio con enums y estados (`"disponible"/"prestado"`, `"activo"/"devuelto"`,
  `"pregrado"/"posgrado"`). Los tipos estrictos convierten errores de modelo en
  errores de compilación, no en bugs de producción.
- **Express** por ser el estándar mínimo y maduro para una API REST sin
  sobre-ingeniería, coherente con "por ahora con esto está bien".
- **Persistencia en memoria** detrás de una capa de repositorios, para que el
  día que llegue la base de datos el cambio sea localizado.

Lo difícil no fue escribir la primera línea sino **comprometerme con una base**
sabiendo que arrastra todo lo demás: si me equivocaba en el stack, los servicios,
los controllers y los tests heredaban el error. Por eso fue la decisión que más
peso tuvo y la que más estudio inicial requirió.

---

## 2. ¿Hubo un momento en que la IA generó algo plausible pero incorrecto?

En el momento **no lo detecté en vivo**; fue la **auditoría posterior** la que lo
evidenció. Dos casos concretos quedaron documentados en `bitacora.md`:

- **La IA dijo "todo en verde" cuando no era cierto (H9).** Al terminar la
  implementación grande, la IA reportó la suite corriendo. La primera ejecución
  real de `npm test` mostró que un **suite completo no compilaba** por un import
  sin usar (`noUnusedLocals`). El resumen era plausible —"listo, en verde"— pero
  incorrecto: nadie había ejecutado los tests todavía. Aprendí que el "está
  funcionando" de la IA necesita evidencia de ejecución, no su palabra.

- **La IA resolvió en silencio una contradicción entre reglas (H1).** RN2 dice
  que el plazo es "15 días desde hoy" y RN6 dice "sumar 15 días a la fecha
  esperada". Para la renovación esos dos cálculos **no coinciden**. La IA eligió
  uno (RN6) y dejó un comentario `// RN2/RN6`, pero **no avisó** que las reglas
  chocaban. El código se ve correcto y compila; solo comparando ambas reglas a
  mano se nota el problema.

La lección: la IA traduce cada instrucción por separado y reporta optimismo. La
detección de "plausible pero incorrecto" fue trabajo humano de auditoría, no algo
que la IA señalara sola.

---

## 3. ¿Qué le respondes al jefe que dice "no necesitamos QA"?

Que se necesita **human-in-the-loop en las dos fases del software: cuando se crea
y cuando se valida.** Los agentes de IA nos ayudan con el trabajo pesado —teclear
el código, escribir los tests, repetir patrones— y lo hacen muy rápido, pero eso
es justamente lo que hace al QA *más* necesario, no menos:

- **En la creación**, la IA produce mucho código plausible a gran velocidad. Más
  volumen y más rápido significa más superficie donde puede esconderse un error
  que "se ve bien". Sin alguien validando, ese código entra a producción con la
  confianza de un resumen que dice "todo en verde" (ver pregunta 2).

- **En la validación**, alguien tiene que decidir *qué es correcto*. La IA no
  sabe que RN2 y RN6 se contradicen, ni que renovar un libro vencido no tiene
  sentido para una biblioteca real: esas son decisiones de **criterio y de
  negocio** que requieren un humano que entienda el dominio y el brief.

En este mismo proyecto el QA encontró 9 hallazgos que la IA no reportó, distinguió
**bugs reales** (que corregimos) de **decisiones que solo la cliente puede zanjar**
(que dejamos documentadas en vez de "arreglar" mal). Eso no lo hace un test que se
escribe solo: lo hace una persona ejecutando, leyendo y comparando contra la
especificación.

Resumido: **la IA cambia el QA de "escribir pruebas a mano" a "dirigir y auditar
lo que la IA produce", pero no lo elimina.** Quitar el human-in-the-loop no nos
ahorra QA; solo nos quita la única capa que distingue "compila y parece andar" de
"hace lo correcto".
