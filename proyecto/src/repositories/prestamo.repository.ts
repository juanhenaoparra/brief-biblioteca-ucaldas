import type { Prestamo } from "../domain/models";
import { InMemoryStore } from "./in-memory-store";

/** Préstamos, indexados por `id`. */
export class PrestamoRepository extends InMemoryStore<Prestamo> {
  constructor() {
    super((prestamo) => prestamo.id);
  }

  /** Historial completo de un estudiante (activos y devueltos). */
  byEstudiante(estudianteCodigo: string): Prestamo[] {
    return this.filter((p) => p.estudiante_codigo === estudianteCodigo);
  }

  /** Préstamos activos de un estudiante (para el cupo, RN1). */
  activosByEstudiante(estudianteCodigo: string): Prestamo[] {
    return this.filter(
      (p) => p.estudiante_codigo === estudianteCodigo && p.estado === "activo",
    );
  }

  /** Todos los préstamos activos del sistema. */
  activos(): Prestamo[] {
    return this.filter((p) => p.estado === "activo");
  }
}
