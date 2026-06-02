import type { Estudiante } from "../domain/models";
import { InMemoryStore } from "./in-memory-store";

/** Estudiantes, indexados por `codigo` institucional. */
export class EstudianteRepository extends InMemoryStore<Estudiante> {
  constructor() {
    super((estudiante) => estudiante.codigo);
  }
}
