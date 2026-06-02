import request from "supertest";
import { createApp } from "../../src/app";

describe("GET /health", () => {
  it("responde 200 con status ok", async () => {
    const app = createApp();
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("responde 404 con error en rutas inexistentes", async () => {
    const app = createApp();
    const res = await request(app).get("/no-existe");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "ruta_no_encontrada" });
  });
});
