import type { Ejemplar } from "../domain/models";
import { InMemoryStore } from "./in-memory-store";

/** Ejemplares físicos, indexados por `codigo_inventario`. */
export class EjemplarRepository extends InMemoryStore<Ejemplar> {
  constructor() {
    super((ejemplar) => ejemplar.codigo_inventario);
  }

  /** Todos los ejemplares de un libro. */
  byLibro(libroId: string): Ejemplar[] {
    return this.filter((e) => e.libro_id === libroId);
  }

  /** Ejemplares disponibles de un libro (para el conteo del catálogo). */
  disponiblesByLibro(libroId: string): Ejemplar[] {
    return this.filter((e) => e.libro_id === libroId && e.estado === "disponible");
  }
}
