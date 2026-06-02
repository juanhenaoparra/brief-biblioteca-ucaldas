import type { Multa } from "../domain/models";
import { InMemoryStore } from "./in-memory-store";

/** Multas, indexadas por `id`. */
export class MultaRepository extends InMemoryStore<Multa> {
  constructor() {
    super((multa) => multa.id);
  }

  /** Todas las multas de un estudiante. */
  byEstudiante(estudianteCodigo: string): Multa[] {
    return this.filter((m) => m.estudiante_codigo === estudianteCodigo);
  }

  /** Multas sin pagar de un estudiante (bloqueo de préstamos, RN4). */
  pendientesByEstudiante(estudianteCodigo: string): Multa[] {
    return this.filter(
      (m) => m.estudiante_codigo === estudianteCodigo && m.pagada === false,
    );
  }
}
