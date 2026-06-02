/**
 * Servicio de estudiantes.
 * Endpoints: POST /estudiantes, GET /estudiantes/:codigo, GET /estudiantes/:codigo/historial.
 */
import type { Estudiante, Prestamo, TipoEstudiante } from "../domain/models";
import { TIPOS_ESTUDIANTE } from "../domain/constants";
import { HttpError } from "../middlewares/error-handler";
import { estudianteRepository, prestamoRepository } from "../repositories";
import { asObjeto, exigirEntero, exigirString } from "../utils/validacion";

function esTipoValido(valor: string): valor is TipoEstudiante {
  return (TIPOS_ESTUDIANTE as readonly string[]).includes(valor);
}

/** POST /estudiantes — registra un estudiante. */
export function registrarEstudiante(body: unknown): Estudiante {
  const datos = asObjeto(body);
  const codigo = exigirString(datos, "codigo");
  const nombre = exigirString(datos, "nombre");
  const programa = exigirString(datos, "programa");
  const semestre = exigirEntero(datos, "semestre", 1);
  const tipo = exigirString(datos, "tipo");

  // RN10 — solo pregrado o posgrado.
  if (!esTipoValido(tipo)) {
    throw new HttpError(400, "tipo_estudiante_no_soportado", undefined, { tipo });
  }

  if (estudianteRepository.has(codigo)) {
    throw new HttpError(409, "estudiante_ya_existe", undefined, { codigo });
  }

  const estudiante: Estudiante = { codigo, nombre, programa, semestre, tipo };
  return estudianteRepository.save(estudiante);
}

/** GET /estudiantes/:codigo — un estudiante (404 si no existe). */
export function obtenerEstudiante(codigo: string): Estudiante {
  const estudiante = estudianteRepository.get(codigo);
  if (!estudiante) {
    throw new HttpError(404, "estudiante_no_encontrado");
  }
  return estudiante;
}

/** GET /estudiantes/:codigo/historial — todos sus préstamos (activos y devueltos). */
export function historialEstudiante(codigo: string): Prestamo[] {
  // Reutiliza la validación de existencia (lanza 404 si no está).
  obtenerEstudiante(codigo);
  return prestamoRepository.byEstudiante(codigo);
}
