import { Router } from "express";
import {
  getPrestamos,
  getVencidos,
  postDevolucion,
  postPrestamo,
  postRenovacion,
  postSolicitudEspera,
} from "../controllers/prestamo.controller";

export const prestamosRouter = Router();

// "/prestamos/vencidos" se registra antes que cualquier ":id" para que no lo capture.
prestamosRouter.get("/prestamos/vencidos", getVencidos);
prestamosRouter.get("/prestamos", getPrestamos);
prestamosRouter.post("/prestamos", postPrestamo);
prestamosRouter.post("/prestamos/:id/devolucion", postDevolucion);
prestamosRouter.post("/prestamos/:id/renovacion", postRenovacion);
prestamosRouter.post("/prestamos/:id/solicitud-espera", postSolicitudEspera);
