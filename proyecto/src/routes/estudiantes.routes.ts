import { Router } from "express";
import {
  getEstudiante,
  getHistorial,
  postEstudiante,
} from "../controllers/estudiante.controller";

export const estudiantesRouter = Router();

estudiantesRouter.post("/estudiantes", postEstudiante);
estudiantesRouter.get("/estudiantes/:codigo", getEstudiante);
estudiantesRouter.get("/estudiantes/:codigo/historial", getHistorial);
