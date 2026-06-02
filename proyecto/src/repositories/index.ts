/**
 * Punto único de acceso a la persistencia en memoria.
 *
 * Se exponen instancias singleton (una sola "base de datos" en RAM para toda la
 * app) y un `resetRepositories()` que los vacía — útil para arrancar cada test
 * desde un estado limpio.
 */
import { EjemplarRepository } from "./ejemplar.repository";
import { EstudianteRepository } from "./estudiante.repository";
import { LibroRepository } from "./libro.repository";
import { MultaRepository } from "./multa.repository";
import { PrestamoRepository } from "./prestamo.repository";

export const libroRepository = new LibroRepository();
export const ejemplarRepository = new EjemplarRepository();
export const estudianteRepository = new EstudianteRepository();
export const prestamoRepository = new PrestamoRepository();
export const multaRepository = new MultaRepository();

/** Vacía todos los repositorios. Pensado para los tests. */
export function resetRepositories(): void {
  libroRepository.clear();
  ejemplarRepository.clear();
  estudianteRepository.clear();
  prestamoRepository.clear();
  multaRepository.clear();
}

export {
  LibroRepository,
  EjemplarRepository,
  EstudianteRepository,
  PrestamoRepository,
  MultaRepository,
};
