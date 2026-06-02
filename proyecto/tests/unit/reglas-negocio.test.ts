/**
 * Tests unitarios de las reglas de negocio RN1–RN12, a nivel de servicio.
 * Cada test sigue Arrange–Act–Assert. El estado en memoria se resetea antes de cada uno.
 */
import { TARIFA_MULTA_DIA_COP } from "../../src/domain/constants";
import type { HttpError } from "../../src/middlewares/error-handler";
import {
  ejemplarRepository,
  multaRepository,
  prestamoRepository,
  resetRepositories,
} from "../../src/repositories";
import { registrarEstudiante } from "../../src/services/estudiante.service";
import {
  crearPrestamo,
  devolverPrestamo,
  listarPrestamos,
  listarVencidos,
  renovarPrestamo,
  solicitarEspera,
} from "../../src/services/prestamo.service";
import { randomUUID } from "crypto";
import {
  isoEnDias,
  seedEstudiante,
  seedLibroConEjemplar,
  seedPrestamoActivo,
} from "../helpers/seed";

/** Ejecuta `fn` y devuelve el HttpError que lanza (falla si no lanza). */
function capturar(fn: () => unknown): HttpError {
  try {
    fn();
  } catch (e) {
    return e as HttpError;
  }
  throw new Error("Se esperaba que la operación lanzara un HttpError");
}

beforeEach(() => {
  resetRepositories();
});

describe("RN1 — cupo de préstamos según tipo de estudiante", () => {
  it("bloquea el préstamo 4 de un estudiante de pregrado (límite 3)", () => {
    // Arrange
    seedEstudiante("E1", "pregrado");
    for (let i = 0; i < 3; i++) {
      const { ejemplar } = seedLibroConEjemplar(`A${i}`);
      seedPrestamoActivo({
        estudianteCodigo: "E1",
        ejemplarCodigo: ejemplar.codigo_inventario,
        fechaEsperada: isoEnDias(10), // futuro: no son vencidos
      });
    }
    const { ejemplar: cuarto } = seedLibroConEjemplar("A3");

    // Act
    const error = capturar(() =>
      crearPrestamo({ estudiante_codigo: "E1", ejemplar_codigo: cuarto.codigo_inventario }),
    );

    // Assert
    expect(error.status).toBe(409);
    expect(error.code).toBe("limite_prestamos_alcanzado");
    expect(error.details).toMatchObject({ limite: 3, actuales: 3 });
  });

  it("permite el préstamo 4 y 5 a un estudiante de posgrado (límite 5)", () => {
    // Arrange
    seedEstudiante("P1", "posgrado");
    for (let i = 0; i < 4; i++) {
      const { ejemplar } = seedLibroConEjemplar(`B${i}`);
      seedPrestamoActivo({
        estudianteCodigo: "P1",
        ejemplarCodigo: ejemplar.codigo_inventario,
        fechaEsperada: isoEnDias(10),
      });
    }
    const { ejemplar: quinto } = seedLibroConEjemplar("B4");

    // Act
    const prestamo = crearPrestamo({ estudiante_codigo: "P1", ejemplar_codigo: "B4" });

    // Assert
    expect(prestamo.estado).toBe("activo");
    expect(prestamo.ejemplar_codigo).toBe(quinto.codigo_inventario);
  });
});

describe("RN2 — plazo según el tipo de libro", () => {
  it("asigna 15 días a un libro normal", () => {
    // Arrange
    seedEstudiante("E1");
    seedLibroConEjemplar("N1", false);

    // Act
    const prestamo = crearPrestamo({ estudiante_codigo: "E1", ejemplar_codigo: "N1" });

    // Assert
    const dias =
      (new Date(prestamo.fecha_devolucion_esperada).getTime() -
        new Date(prestamo.fecha_prestamo).getTime()) /
      86_400_000;
    expect(dias).toBeCloseTo(15, 5);
  });

  it("asigna 3 días a un libro de alta demanda", () => {
    // Arrange
    seedEstudiante("E1");
    seedLibroConEjemplar("H1", true);

    // Act
    const prestamo = crearPrestamo({ estudiante_codigo: "E1", ejemplar_codigo: "H1" });

    // Assert
    const dias =
      (new Date(prestamo.fecha_devolucion_esperada).getTime() -
        new Date(prestamo.fecha_prestamo).getTime()) /
      86_400_000;
    expect(dias).toBeCloseTo(3, 5);
  });
});

describe("RN3 — bloqueado si tiene libros vencidos", () => {
  it("rechaza un nuevo préstamo cuando hay uno vencido", () => {
    // Arrange
    seedEstudiante("E1");
    const { ejemplar: viejo } = seedLibroConEjemplar("V1");
    const vencido = seedPrestamoActivo({
      estudianteCodigo: "E1",
      ejemplarCodigo: viejo.codigo_inventario,
      fechaEsperada: isoEnDias(-2), // ya pasó
    });
    seedLibroConEjemplar("V2");

    // Act
    const error = capturar(() =>
      crearPrestamo({ estudiante_codigo: "E1", ejemplar_codigo: "V2" }),
    );

    // Assert
    expect(error.status).toBe(409);
    expect(error.code).toBe("tiene_prestamos_vencidos");
    expect(error.details?.prestamos_vencidos).toContain(vencido.id);
  });
});

describe("RN4 — bloqueado si tiene multas sin pagar", () => {
  it("rechaza un nuevo préstamo si hay una multa pendiente", () => {
    // Arrange
    seedEstudiante("E1");
    multaRepository.save({
      id: randomUUID(),
      estudiante_codigo: "E1",
      prestamo_id: randomUUID(),
      dias_retraso: 3,
      monto_cop: 6000,
      pagada: false,
      fecha_generacion: isoEnDias(-1),
    });
    seedLibroConEjemplar("M1");

    // Act
    const error = capturar(() =>
      crearPrestamo({ estudiante_codigo: "E1", ejemplar_codigo: "M1" }),
    );

    // Assert
    expect(error.status).toBe(409);
    expect(error.code).toBe("tiene_multas_pendientes");
    expect(error.details).toMatchObject({ monto_total: 6000 });
  });
});

describe("RN5 — un ejemplar no se presta dos veces a la vez", () => {
  it("rechaza prestar un ejemplar que ya está prestado", () => {
    // Arrange
    seedEstudiante("E1");
    const { ejemplar } = seedLibroConEjemplar("X1");
    ejemplar.estado = "prestado";
    ejemplarRepository.save(ejemplar);

    // Act
    const error = capturar(() =>
      crearPrestamo({ estudiante_codigo: "E1", ejemplar_codigo: "X1" }),
    );

    // Assert
    expect(error.status).toBe(409);
    expect(error.code).toBe("ejemplar_no_disponible");
  });
});

describe("RN6 — no se renueva si otro estudiante está esperando", () => {
  it("rechaza la renovación cuando el ejemplar está solicitado_por_otro", () => {
    // Arrange
    seedEstudiante("E1");
    const { ejemplar } = seedLibroConEjemplar("R1");
    const prestamo = seedPrestamoActivo({
      estudianteCodigo: "E1",
      ejemplarCodigo: ejemplar.codigo_inventario,
      fechaEsperada: isoEnDias(5),
    });
    ejemplar.solicitado_por_otro = true;
    ejemplarRepository.save(ejemplar);

    // Act
    const error = capturar(() => renovarPrestamo(prestamo.id));

    // Assert
    expect(error.status).toBe(409);
    expect(error.code).toBe("no_renovable_lista_espera");
  });

  it("renueva sumando el plazo a la fecha esperada e incrementa renovaciones", () => {
    // Arrange
    seedEstudiante("E1");
    const { ejemplar } = seedLibroConEjemplar("R2", false);
    const prestamo = seedPrestamoActivo({
      estudianteCodigo: "E1",
      ejemplarCodigo: ejemplar.codigo_inventario,
      fechaEsperada: "2026-06-10T00:00:00.000Z",
    });

    // Act
    const renovado = renovarPrestamo(prestamo.id);

    // Assert
    expect(renovado.renovaciones).toBe(1);
    expect(renovado.fecha_devolucion_esperada).toBe("2026-06-25T00:00:00.000Z");
  });
});

describe("RN7 — solo se renuevan préstamos activos", () => {
  it("rechaza renovar un préstamo devuelto", () => {
    // Arrange
    seedEstudiante("E1");
    const { ejemplar } = seedLibroConEjemplar("R3");
    const prestamo = seedPrestamoActivo({
      estudianteCodigo: "E1",
      ejemplarCodigo: ejemplar.codigo_inventario,
      fechaEsperada: isoEnDias(5),
    });
    prestamo.estado = "devuelto";
    prestamoRepository.save(prestamo);

    // Act
    const error = capturar(() => renovarPrestamo(prestamo.id));

    // Assert
    expect(error.status).toBe(409);
    expect(error.code).toBe("prestamo_no_renovable_estado");
    expect(error.details).toMatchObject({ estado_actual: "devuelto" });
  });
});

describe("RN8 — cálculo de multa al devolver tarde", () => {
  it("genera una multa de dias_retraso * 2000 al devolver tarde", () => {
    // Arrange
    seedEstudiante("E1");
    const { ejemplar } = seedLibroConEjemplar("D1");
    const prestamo = seedPrestamoActivo({
      estudianteCodigo: "E1",
      ejemplarCodigo: ejemplar.codigo_inventario,
      fechaEsperada: isoEnDias(-5), // 5 días tarde
    });

    // Act
    const { multa } = devolverPrestamo(prestamo.id);

    // Assert
    expect(multa).not.toBeNull();
    expect(multa?.dias_retraso).toBeGreaterThanOrEqual(5);
    expect(multa?.monto_cop).toBe((multa?.dias_retraso ?? 0) * TARIFA_MULTA_DIA_COP);
    expect(multa?.pagada).toBe(false);
  });

  it("no genera multa al devolver a tiempo", () => {
    // Arrange
    seedEstudiante("E1");
    const { ejemplar } = seedLibroConEjemplar("D2");
    const prestamo = seedPrestamoActivo({
      estudianteCodigo: "E1",
      ejemplarCodigo: ejemplar.codigo_inventario,
      fechaEsperada: isoEnDias(5), // aún no vence
    });

    // Act
    const { multa } = devolverPrestamo(prestamo.id);

    // Assert
    expect(multa).toBeNull();
  });
});

describe("RN9 — solo se devuelve un préstamo activo", () => {
  it("libera el ejemplar al devolver y rechaza una segunda devolución", () => {
    // Arrange
    seedEstudiante("E1");
    const { ejemplar } = seedLibroConEjemplar("D3");
    ejemplar.estado = "prestado";
    ejemplarRepository.save(ejemplar);
    const prestamo = seedPrestamoActivo({
      estudianteCodigo: "E1",
      ejemplarCodigo: ejemplar.codigo_inventario,
      fechaEsperada: isoEnDias(5),
    });

    // Act
    devolverPrestamo(prestamo.id);
    const error = capturar(() => devolverPrestamo(prestamo.id));

    // Assert
    expect(ejemplarRepository.get("D3")?.estado).toBe("disponible");
    expect(error.status).toBe(409);
    expect(error.code).toBe("prestamo_ya_devuelto_o_invalido");
  });
});

describe("RN10 — solo pregrado o posgrado", () => {
  it("rechaza un tipo de estudiante no soportado", () => {
    // Act
    const error = capturar(() =>
      registrarEstudiante({
        codigo: "E9",
        nombre: "Profe Investigador",
        programa: "Doctorado",
        semestre: 1,
        tipo: "profesor",
      }),
    );

    // Assert
    expect(error.status).toBe(400);
    expect(error.code).toBe("tipo_estudiante_no_soportado");
  });
});

describe("RN11 — marcar que alguien está esperando un ejemplar", () => {
  it("prende solicitado_por_otro cuando lo pide un estudiante distinto", () => {
    // Arrange
    seedEstudiante("TITULAR");
    seedEstudiante("OTRO");
    const { ejemplar } = seedLibroConEjemplar("W1");
    const prestamo = seedPrestamoActivo({
      estudianteCodigo: "TITULAR",
      ejemplarCodigo: ejemplar.codigo_inventario,
      fechaEsperada: isoEnDias(5),
    });

    // Act
    solicitarEspera(prestamo.id, { estudiante_codigo: "OTRO" });

    // Assert
    expect(ejemplarRepository.get("W1")?.solicitado_por_otro).toBe(true);
  });

  it("rechaza la solicitud si el solicitante es el mismo titular", () => {
    // Arrange
    seedEstudiante("TITULAR");
    const { ejemplar } = seedLibroConEjemplar("W2");
    const prestamo = seedPrestamoActivo({
      estudianteCodigo: "TITULAR",
      ejemplarCodigo: ejemplar.codigo_inventario,
      fechaEsperada: isoEnDias(5),
    });

    // Act
    const error = capturar(() =>
      solicitarEspera(prestamo.id, { estudiante_codigo: "TITULAR" }),
    );

    // Assert
    expect(error.status).toBe(409);
    expect(error.code).toBe("solicitante_es_titular");
  });
});

describe("RN12 — 'vencido' se calcula al vuelo, no se guarda", () => {
  it("marca vencido:true sin cambiar el estado persistido", () => {
    // Arrange
    seedEstudiante("E1");
    const { ejemplar: ev } = seedLibroConEjemplar("VV1");
    const { ejemplar: en } = seedLibroConEjemplar("VV2");
    const vencido = seedPrestamoActivo({
      estudianteCodigo: "E1",
      ejemplarCodigo: ev.codigo_inventario,
      fechaEsperada: isoEnDias(-1),
    });
    seedPrestamoActivo({
      estudianteCodigo: "E1",
      ejemplarCodigo: en.codigo_inventario,
      fechaEsperada: isoEnDias(10),
    });

    // Act
    const vencidos = listarVencidos();
    const soloVencidos = listarPrestamos({ vencidos: true });

    // Assert
    expect(vencidos).toHaveLength(1);
    expect(vencidos[0].id).toBe(vencido.id);
    expect(vencidos[0].vencido).toBe(true);
    expect(soloVencidos).toHaveLength(1);
    // El estado persistido sigue siendo "activo" (no se muta).
    expect(prestamoRepository.get(vencido.id)?.estado).toBe("activo");
  });
});
