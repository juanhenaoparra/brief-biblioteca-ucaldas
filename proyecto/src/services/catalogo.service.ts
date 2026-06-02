/**
 * Servicio de catálogo: libros y sus ejemplares.
 * Endpoints: GET /libros, GET /libros/:id, POST /libros, POST /libros/:id/ejemplares.
 */
import { randomUUID } from "crypto";
import type { Ejemplar, Libro } from "../domain/models";
import { HttpError } from "../middlewares/error-handler";
import { ejemplarRepository, libroRepository } from "../repositories";
import { asObjeto, exigirBoolean, exigirString } from "../utils/validacion";

/** Libro del catálogo con el conteo de ejemplares (decisión: devolvemos el conteo). */
export interface LibroConDisponibilidad extends Libro {
  ejemplares_total: number;
  ejemplares_disponibles: number;
}

/** Filtros de `GET /libros`. */
export interface FiltrosLibros {
  disponibles?: boolean;
  sala?: string;
}

function conDisponibilidad(libro: Libro): LibroConDisponibilidad {
  const ejemplares = ejemplarRepository.byLibro(libro.id);
  const disponibles = ejemplares.filter((e) => e.estado === "disponible");
  return {
    ...libro,
    ejemplares_total: ejemplares.length,
    ejemplares_disponibles: disponibles.length,
  };
}

/** POST /libros — carga un libro al catálogo. */
export function crearLibro(body: unknown): Libro {
  const datos = asObjeto(body);
  const libro: Libro = {
    id: randomUUID(),
    titulo: exigirString(datos, "titulo"),
    autor: exigirString(datos, "autor"),
    sala: exigirString(datos, "sala"),
    alta_demanda: exigirBoolean(datos, "alta_demanda"),
  };
  return libroRepository.save(libro);
}

/** GET /libros — catálogo con conteo de ejemplares, filtrable por sala y disponibilidad. */
export function listarLibros(filtros: FiltrosLibros): LibroConDisponibilidad[] {
  let libros = libroRepository.all();
  if (filtros.sala !== undefined) {
    libros = libros.filter((l) => l.sala === filtros.sala);
  }
  let resultado = libros.map(conDisponibilidad);
  if (filtros.disponibles === true) {
    resultado = resultado.filter((l) => l.ejemplares_disponibles > 0);
  }
  return resultado;
}

/** GET /libros/:id — un libro con todos sus ejemplares. */
export function obtenerLibro(id: string): { libro: LibroConDisponibilidad; ejemplares: Ejemplar[] } {
  const libro = libroRepository.get(id);
  if (!libro) {
    throw new HttpError(404, "libro_no_encontrado");
  }
  return { libro: conDisponibilidad(libro), ejemplares: ejemplarRepository.byLibro(id) };
}

/** POST /libros/:id/ejemplares — agrega un ejemplar a un libro existente. */
export function agregarEjemplar(libroId: string, body: unknown): Ejemplar {
  if (!libroRepository.has(libroId)) {
    throw new HttpError(404, "libro_no_encontrado");
  }
  const datos = asObjeto(body);
  const codigo = exigirString(datos, "codigo_inventario");
  if (ejemplarRepository.has(codigo)) {
    throw new HttpError(409, "codigo_inventario_duplicado", undefined, {
      codigo_inventario: codigo,
    });
  }
  const ejemplar: Ejemplar = {
    codigo_inventario: codigo,
    libro_id: libroId,
    estado: "disponible",
    solicitado_por_otro: false,
  };
  return ejemplarRepository.save(ejemplar);
}
