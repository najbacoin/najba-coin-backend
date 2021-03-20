import express from "express";
import helmet from "helmet";
import { healthCheckController } from "@controllers";
import { AppServices } from "@services/app";
import { requestWrappers } from "@utils/express";

type BuildRouterArgs = AppServices & { isTesting?: boolean };

export const buildRouter = async (config: BuildRouterArgs) => {
  const app = express();
  app.use(helmet());
  const { publicGet } = requestWrappers(app, config);

  publicGet("/health", healthCheckController(config));

  return app;
};
