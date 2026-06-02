/**
 * Tests de integración sobre la API HTTP (Express + Supertest).
 * Cubren el flujo feliz de extremo a extremo y los códigos HTTP de la spec (D7).
 */
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../../src/app";
import { resetRepositories } from "../../src/repositories";

let app: Express;

beforeEach(() => {
  resetRepositories();
  app = createApp();
});

/** Carga un libro y devuelve su id. */
async function crearLibro(altaDemanda = false): Promise<string> {
  const res = await request(app)
    .post("/libros")
    .send({ titulo: "Clean Code", autor: "R. Martin", sala: "General", alta_demanda: altaDemanda });
  return res.body.id as string;
}

describe("Flujo de préstamo de extremo a extremo", () => {
  it("crea libro, ejemplar, estudiante, presta y devuelve (happy path)", async () => {
    // Arrange: catálogo y estudiante
    const libroId = await crearLibro();
    await request(app).post(`/libros/${libroId}/ejemplares`).send({ codigo_inventario: "INV-1" });
    await request(app)
      .post("/estudiantes")
      .send({ codigo: "2026-1", nombre: "Ana", programa: "Sistemas", semestre: 4, tipo: "pregrado" });

    // Act: préstamo
    const prestamoRes = await request(app)
      .post("/prestamos")
      .send({ estudiante_codigo: "2026-1", ejemplar_codigo: "INV-1" });

    // Assert: 201 y ejemplar marcado prestado
    expect(prestamoRes.status).toBe(201);
    expect(prestamoRes.body.estado).toBe("activo");
    const libroRes = await request(app).get(`/libros/${libroId}`);
    expect(libroRes.body.libro.ejemplares_disponibles).toBe(0);

    // Act + Assert: devolución a tiempo → 200 sin multa
    const devolucionRes = await request(app).post(`/prestamos/${prestamoRes.body.id}/devolucion`);
    expect(devolucionRes.status).toBe(200);
    expect(devolucionRes.body.multa).toBeNull();
    expect(devolucionRes.body.prestamo.estado).toBe("devuelto");
  });

  it("GET /libros?disponibles=true filtra y devuelve el conteo", async () => {
    // Arrange
    const conStock = await crearLibro();
    await request(app).post(`/libros/${conStock}/ejemplares`).send({ codigo_inventario: "S-1" });
    await crearLibro(); // sin ejemplares

    // Act
    const res = await request(app).get("/libros").query({ disponibles: "true" });

    // Assert
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].ejemplares_disponibles).toBe(1);
  });
});

describe("Códigos HTTP de error (D7)", () => {
  it("400 cuando falta un campo obligatorio en el body", async () => {
    // Act: falta alta_demanda
    const res = await request(app).post("/libros").send({ titulo: "X", autor: "Y", sala: "Z" });

    // Assert
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("datos_invalidos");
  });

  it("404 cuando el libro no existe", async () => {
    const res = await request(app).get("/libros/no-existe");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "libro_no_encontrado" });
  });

  it("409 al agregar un ejemplar con código duplicado", async () => {
    // Arrange
    const libroId = await crearLibro();
    await request(app).post(`/libros/${libroId}/ejemplares`).send({ codigo_inventario: "DUP" });

    // Act
    const res = await request(app)
      .post(`/libros/${libroId}/ejemplares`)
      .send({ codigo_inventario: "DUP" });

    // Assert
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("codigo_inventario_duplicado");
  });

  it("400 cuando un query param booleano viene mal escrito", async () => {
    const res = await request(app).get("/libros").query({ disponibles: "si" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("query_invalida");
  });
});
