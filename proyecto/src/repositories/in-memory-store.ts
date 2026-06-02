/**
 * Store genérico en memoria sobre un `Map`. Es la base de todos los repositorios:
 * la persistencia de esta versión vive solo en RAM (restricción técnica, sección 8).
 *
 * La clave de cada entidad se extrae con `keyOf` (p. ej. `libro.id` o
 * `estudiante.codigo`), porque no todas usan el mismo nombre de campo.
 */
export class InMemoryStore<T> {
  private readonly items = new Map<string, T>();

  constructor(private readonly keyOf: (item: T) => string) {}

  /** Inserta o reemplaza (mismo key sobreescribe). Devuelve el item guardado. */
  save(item: T): T {
    this.items.set(this.keyOf(item), item);
    return item;
  }

  get(key: string): T | undefined {
    return this.items.get(key);
  }

  has(key: string): boolean {
    return this.items.has(key);
  }

  /** Todos los items en orden de inserción. */
  all(): T[] {
    return [...this.items.values()];
  }

  /** Filtra por un predicado sobre los items. */
  filter(predicate: (item: T) => boolean): T[] {
    return this.all().filter(predicate);
  }

  /** Vacía el store. Pensado para aislar los tests entre sí. */
  clear(): void {
    this.items.clear();
  }
}
