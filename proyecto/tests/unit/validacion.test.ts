import { exigirEntero, exigirString } from "../../src/utils/validacion";
import type { HttpError } from "../../src/middlewares/error-handler";

function capturar(fn: () => unknown): HttpError {
  try {
    fn();
  } catch (e) {
    return e as HttpError;
  }
  throw new Error("Se esperaba un HttpError");
}

describe("utils/validacion", () => {
  describe("exigirString", () => {
    it("recorta espacios alrededor del valor (B2)", () => {
      // Arrange + Act
      const valor = exigirString({ titulo: "  Clean Code  " }, "titulo");

      // Assert
      expect(valor).toBe("Clean Code");
    });

    it("lanza 400 datos_invalidos si el campo falta", () => {
      // Act
      const error = capturar(() => exigirString({}, "titulo"));

      // Assert
      expect(error.status).toBe(400);
      expect(error.code).toBe("datos_invalidos");
      expect(error.details).toMatchObject({ campo: "titulo" });
    });

    it("lanza 400 si el string queda vacío tras recortar", () => {
      const error = capturar(() => exigirString({ titulo: "   " }, "titulo"));
      expect(error.status).toBe(400);
    });
  });

  describe("exigirEntero", () => {
    it("rechaza un semestre menor al mínimo", () => {
      const error = capturar(() => exigirEntero({ semestre: 0 }, "semestre", 1));
      expect(error.status).toBe(400);
      expect(error.details).toMatchObject({ motivo: "debe ser >= 1" });
    });

    it("rechaza un valor no entero", () => {
      const error = capturar(() => exigirEntero({ semestre: 2.5 }, "semestre", 1));
      expect(error.status).toBe(400);
    });
  });
});
