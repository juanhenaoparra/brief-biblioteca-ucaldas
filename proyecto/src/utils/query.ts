/**
 * Helpers para leer query params. Express los entrega como `string | string[]`
 * o `undefined`; aquí los normalizamos y validamos (un booleano mal escrito es
 * un `400`, decisión D7).
 */
import { HttpError } from "../middlewares/error-handler";

/** Lee un query param de tipo string (o `undefined` si no vino). */
export function leerString(valor: unknown): string | undefined {
  if (valor === undefined) return undefined;
  if (typeof valor !== "string") {
    throw new HttpError(400, "query_invalida", "El parámetro debe ser un string simple");
  }
  return valor;
}

/** Lee un query param booleano: solo acepta "true" o "false". */
export function leerBoolean(valor: unknown, campo: string): boolean | undefined {
  if (valor === undefined) return undefined;
  if (valor === "true") return true;
  if (valor === "false") return false;
  throw new HttpError(400, "query_invalida", `"${campo}" debe ser "true" o "false"`, {
    campo,
  });
}
