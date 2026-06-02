import { diasRetraso, fechaYaPaso, sumarDias } from "../../src/utils/fechas";

describe("utils/fechas", () => {
  describe("sumarDias", () => {
    it("suma 15 días conservando la hora (plazo normal, RN2)", () => {
      // Arrange
      const base = "2026-06-01T10:00:00.000Z";

      // Act
      const resultado = sumarDias(base, 15);

      // Assert
      expect(resultado).toBe("2026-06-16T10:00:00.000Z");
    });

    it("cruza el cambio de mes correctamente (alta demanda, 3 días)", () => {
      // Arrange
      const base = "2026-06-30T08:00:00.000Z";

      // Act
      const resultado = sumarDias(base, 3);

      // Assert
      expect(resultado).toBe("2026-07-03T08:00:00.000Z");
    });
  });

  describe("diasRetraso", () => {
    it("devuelve 0 cuando se devuelve antes o justo a tiempo", () => {
      // Arrange
      const esperada = "2026-06-10T00:00:00.000Z";
      const real = "2026-06-09T23:00:00.000Z";

      // Act + Assert
      expect(diasRetraso(esperada, real)).toBe(0);
    });

    it("redondea hacia arriba las fracciones de día (D1)", () => {
      // Arrange: 1 día y 1 hora de retraso → cuenta como 2 días.
      const esperada = "2026-06-10T00:00:00.000Z";
      const real = "2026-06-11T01:00:00.000Z";

      // Act + Assert
      expect(diasRetraso(esperada, real)).toBe(2);
    });
  });

  describe("fechaYaPaso", () => {
    it("es true si la fecha esperada quedó atrás respecto a la referencia", () => {
      // Arrange
      const esperada = "2026-06-01T00:00:00.000Z";
      const referencia = "2026-06-02T00:00:00.000Z";

      // Act + Assert
      expect(fechaYaPaso(esperada, referencia)).toBe(true);
    });

    it("es false si la fecha esperada aún no llega", () => {
      // Arrange
      const esperada = "2026-06-10T00:00:00.000Z";
      const referencia = "2026-06-02T00:00:00.000Z";

      // Act + Assert
      expect(fechaYaPaso(esperada, referencia)).toBe(false);
    });
  });
});
