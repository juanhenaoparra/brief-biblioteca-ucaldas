import type { Libro } from "../domain/models";
import { InMemoryStore } from "./in-memory-store";

/** Catálogo de libros, indexado por `id`. */
export class LibroRepository extends InMemoryStore<Libro> {
  constructor() {
    super((libro) => libro.id);
  }
}
