/**
 * Helpers para sembrar datos en los tests sin pasar por toda la API.
 * Usan los repositorios directamente para poder controlar fechas (p. ej. crear
 * un préstamo ya vencido) que por la vía normal no se podrían fijar.
 */
import { randomUUID } from "crypto";
import type { Ejemplar, Estudiante, Libro, Prestamo, TipoEstudiante } from "../../src/domain/models";
import {
  ejemplarRepository,
  estudianteRepository,
  libroRepository,
  prestamoRepository,
} from "../../src/repositories";

export function seedEstudiante(
  codigo: string,
  tipo: TipoEstudiante = "pregrado",
): Estudiante {
  return estudianteRepository.save({
    codigo,
    nombre: `Estudiante ${codigo}`,
    programa: "Ingeniería de Sistemas",
    semestre: 5,
    tipo,
  });
}

export function seedLibro(altaDemanda = false): Libro {
  return libroRepository.save({
    id: randomUUID(),
    titulo: "Estructuras de Datos",
    autor: "N. Wirth",
    sala: "General",
    alta_demanda: altaDemanda,
  });
}

export function seedEjemplar(libroId: string, codigo: string): Ejemplar {
  return ejemplarRepository.save({
    codigo_inventario: codigo,
    libro_id: libroId,
    estado: "disponible",
    solicitado_por_otro: false,
  });
}

/** Crea libro + ejemplar disponible de una vez. */
export function seedLibroConEjemplar(
  codigoEjemplar: string,
  altaDemanda = false,
): { libro: Libro; ejemplar: Ejemplar } {
  const libro = seedLibro(altaDemanda);
  const ejemplar = seedEjemplar(libro.id, codigoEjemplar);
  return { libro, ejemplar };
}

/** Inserta un préstamo activo con fechas a medida (para simular vencidos). */
export function seedPrestamoActivo(args: {
  estudianteCodigo: string;
  ejemplarCodigo: string;
  fechaEsperada: string;
}): Prestamo {
  return prestamoRepository.save({
    id: randomUUID(),
    estudiante_codigo: args.estudianteCodigo,
    ejemplar_codigo: args.ejemplarCodigo,
    fecha_prestamo: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    fecha_devolucion_esperada: args.fechaEsperada,
    fecha_devolucion_real: null,
    estado: "activo",
    renovaciones: 0,
  });
}

/** Fecha ISO desplazada N días respecto a ahora (negativo = pasado). */
export function isoEnDias(dias: number): string {
  return new Date(Date.now() + dias * 86_400_000).toISOString();
}
