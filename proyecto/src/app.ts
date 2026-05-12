import express, { type Express } from "express";
import { apiRouter } from "./routes";
import { errorHandler, notFoundHandler } from "./middlewares/error-handler";

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
