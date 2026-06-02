const readline = require("readline");
const { execSync } = require("child_process");

const BASE_URL = "http://localhost:3010";
const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODELO = "qwen2.5-coder:7b"; // cambia si usaste otro

const SYSTEM_PROMPT = `
Eres un asistente de QA especializado en probar la API REST de préstamos de la Biblioteca UCaldas.

BASE URL del servidor: ${BASE_URL}   (SIN prefijo /api)

MODELO DE DATOS Y LLAVES (no inventes IDs autoincrementales):
- Libro: su id es un UUID que genera la API (NO es 1, 2, 3). Campos: titulo, autor, sala, alta_demanda (boolean).
- Ejemplar: la llave real es codigo_inventario (string que tú defines). Pertenece a un libro (libro_id). estado: "disponible" | "prestado".
- Estudiante: la llave es codigo (string institucional). Campos: codigo, nombre, programa, semestre (entero >= 1), tipo ("pregrado" | "posgrado").
- Prestamo: su id es UUID. Referencia estudiante_codigo y ejemplar_codigo (strings, NO numéricos).
- Multa: se calcula sola al devolver tarde; en esta versión NO se paga por la API.

ENDPOINTS REALES (métodos exactos):
- GET  /libros                          (query opcional ?disponibles=true&sala=X) catálogo con conteo de ejemplares
- GET  /libros/:id                      un libro y sus ejemplares (id = UUID)
- POST /libros                          body {titulo, autor, sala, alta_demanda}
- POST /libros/:id/ejemplares           body {codigo_inventario}
- GET  /estudiantes/:codigo
- POST /estudiantes                     body {codigo, nombre, programa, semestre, tipo}
- GET  /estudiantes/:codigo/historial
- POST /prestamos                       body {estudiante_codigo, ejemplar_codigo}
- POST /prestamos/:id/devolucion        registra devolución y calcula multa si aplica -> {prestamo, multa}
- POST /prestamos/:id/renovacion        renueva el préstamo
- POST /prestamos/:id/solicitud-espera  body {estudiante_codigo}  marca que otro estudiante espera
- GET  /prestamos                       (query opcional ?estudiante=...&vencidos=true)
- GET  /prestamos/vencidos
- GET  /multas                          (query opcional ?estudiante=...&pagada=false)

REGLAS DE NEGOCIO:
RN1.  Cupo de préstamos activos: pregrado máx 3, posgrado máx 5. Excedido -> 409 {error:"limite_prestamos_alcanzado", limite, actuales}.
RN2.  Plazo según el libro: 15 días normal, 3 días si alta_demanda. Se refleja en fecha_devolucion_esperada.
RN3.  Con préstamos vencidos activos no puede pedir nuevos -> 409 {error:"tiene_prestamos_vencidos"}.
RN4.  Con multas sin pagar no puede pedir nuevos -> 409 {error:"tiene_multas_pendientes", monto_total}.
RN5.  Un ejemplar "prestado" no se presta de nuevo -> 409 {error:"ejemplar_no_disponible"}.
RN6.  No se renueva si el ejemplar tiene solicitado_por_otro=true -> 409 {error:"no_renovable_lista_espera"}.
RN7.  Solo se renuevan préstamos activos -> 409 {error:"prestamo_no_renovable_estado", estado_actual}.
RN8.  Multa al devolver tarde = dias_retraso * 2000 COP (días calendario, redondeo hacia arriba).
RN9.  Solo se devuelve un préstamo activo -> 409 {error:"prestamo_ya_devuelto_o_invalido"}.
RN10. tipo debe ser "pregrado" o "posgrado" -> 400 {error:"tipo_estudiante_no_soportado"}.
RN11. solicitud-espera: el préstamo debe estar activo y el solicitante ser distinto al titular.
RN12. "vencido" se calcula al vuelo (no es un estado persistido); aparece como vencido:true en los listados.

CÓDIGOS HTTP: 200 OK; 201 Created (POST que crea libro/ejemplar/estudiante/préstamo); 400 (datos_invalidos / query_invalida); 404 (*_no_encontrado); 409 (conflicto de regla de negocio).

INSTRUCCIONES DE COMPORTAMIENTO:
- Para probar una regla, crea primero los datos EN ORDEN: estudiante -> libro -> ejemplar(es) -> préstamo(s).
- Usa SIEMPRE las llaves reales que tú creaste: el "codigo" del estudiante y el "codigo_inventario" del ejemplar; para libro_id usa el UUID que devolvió POST /libros (NO inventes 1, 2, 3).
- Para probar RN1 con un 4º préstamo, crea 4 ejemplares disponibles (uno por préstamo), no 3.
- Genera el curl exacto y explica brevemente qué código HTTP esperas y por qué.
- Si el usuario te pide ejecutar, antepón "EJECUTAR:" al comando en una sola línea.
- Sé conciso. No repitas información que el usuario ya sabe.
`.trim();

const historial = [{ role: "system", content: SYSTEM_PROMPT }];

async function preguntarAlModelo(mensajeUsuario) {
  historial.push({ role: "user", content: mensajeUsuario });

  const respuesta = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODELO,
      messages: historial,
      stream: false,
    }),
  });

  if (!respuesta.ok) {
    throw new Error(`Ollama respondió ${respuesta.status}. ¿Está corriendo? Ejecuta: ollama serve`);
  }

  const datos = await respuesta.json();
  const contenido = datos.message.content;
  historial.push({ role: "assistant", content: contenido });
  return contenido;
}

function ejecutarCurl(respuestaModelo) {
  const lineas = respuestaModelo.split("\n");
  for (const linea of lineas) {
    if (linea.trim().startsWith("EJECUTAR:")) {
      const comando = linea.replace("EJECUTAR:", "").trim();
      console.log(`\n[EJECUTANDO]: ${comando}\n`);
      try {
        const resultado = execSync(comando, { encoding: "utf-8", timeout: 10000 });
        console.log("[RESULTADO]:\n" + resultado);
      } catch (err) {
        console.log("[RESULTADO]:\n" + (err.stdout || err.message));
      }
      return true;
    }
  }
  return false;
}

async function iniciar() {
  console.log("=== Chatbot de Pruebas — Biblioteca UCaldas ===");
  console.log(`Modelo: ${MODELO}`);
  console.log(`Servidor: ${BASE_URL}`);
  console.log('Escribe tu pregunta. Ejemplos:');
  console.log('  "prueba que un pregrado no pueda tener 4 préstamos"');
  console.log('  "ejecuta la prueba RN2 para el plazo de alta demanda"');
  console.log('  "crea datos de prueba para RN1"');
  console.log('Escribe "salir" para terminar.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const preguntar = () => {
    rl.question("Tú: ", async (entrada) => {
      if (entrada.toLowerCase() === "salir") {
        console.log("Hasta luego.");
        rl.close();
        return;
      }

      if (!entrada.trim()) {
        preguntar();
        return;
      }

      try {
        const respuesta = await preguntarAlModelo(entrada);
        console.log(`\nChatbot: ${respuesta}\n`);
        ejecutarCurl(respuesta);
      } catch (err) {
        console.error(`Error: ${err.message}`);
      }

      preguntar();
    });
  };

  preguntar();
}

// Solo arranca el modo interactivo si se ejecuta directamente (node chatbot.js).
// Al requerirlo como módulo se expone el prompt y las funciones para pruebas.
if (require.main === module) {
  iniciar();
}

module.exports = { SYSTEM_PROMPT, BASE_URL, MODELO, preguntarAlModelo, ejecutarCurl };