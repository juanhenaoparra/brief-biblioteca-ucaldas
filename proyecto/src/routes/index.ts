import { Router } from "express";
import { healthRouter } from "./health";
import { librosRouter } from "./libros.routes";
import { estudiantesRouter } from "./estudiantes.routes";
import { prestamosRouter } from "./prestamos.routes";
import { multasRouter } from "./multas.routes";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(librosRouter);
apiRouter.use(estudiantesRouter);
apiRouter.use(prestamosRouter);
apiRouter.use(multasRouter);
