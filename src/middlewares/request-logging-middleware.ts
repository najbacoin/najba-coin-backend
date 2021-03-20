import { NextFunction, Request, Response } from "express";
import useragent from "useragent";

import logger from "@utils/logger";
import * as core from "express-serve-static-core";
import { AppConfig, Environment } from "@services/app";
import { uuid } from "@utils/common";

const traceIdHeader = `X-Trace-Id`;

const LOGGED_METHODS = ["POST", "PUT", "DELETE", "PATCH"];
const EMPLOYEE_ADDITIONAL_LOGGED_METHODS = ["GET"];
// Get info on how many times lambda is executed in it's lifetime
let run = 0;

function shouldLog(req: Request) {
  const shoulLogByMethod = LOGGED_METHODS.includes(req.method.toUpperCase());
  const shouldLogByLabTest =
    req.originalUrl.includes("lab-test") &&
    EMPLOYEE_ADDITIONAL_LOGGED_METHODS.includes(req.method.toUpperCase());
  return shoulLogByMethod || shouldLogByLabTest;
}

function getRequestLogDetails(req: Request, environment: Environment) {
  let logDetails = {};
  if (environment !== Environment.Local) {
    const agent = useragent.parse(req.headers["user-agent"]);
    logDetails = { run, agent: agent.toString() };
  }
  return logDetails;
}

export function requestLoggingMiddleware(appConfig: AppConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const traceId = req.header(traceIdHeader) || `gen:${uuid()}`;
    (req as LogRequest).traceId = traceId;
    ++run;
    if (shouldLog(req)) {
      logger.info(`REQUEST [${req.method}] ${req.originalUrl}`, {
        ...getRequestLogDetails(req, appConfig.environment),
        traceId,
      });

      res.on("finish", () => {
        logger.info(`RESPONSE [${req.method}] ${req.originalUrl} ${res.statusCode}`, {
          ...getRequestLogDetails(req, appConfig.environment),
          traceId,
        });
      });
    }
    next();
  };
}

const HANDLING_TIME_LOGGING_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"];

export const requestTimeElapsedMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (HANDLING_TIME_LOGGING_METHODS.includes(req.method.toUpperCase())) {
    const startTime = process.hrtime.bigint();

    res.on("finish", () => {
      const endTime = process.hrtime.bigint();
      // RHT - request handling time, in ms
      logger.info(`RHT [${req.method}] ${req.originalUrl} ${res.statusCode}`, {
        time: Number((endTime - startTime) / BigInt(1e6)),
      });
    });
  }
  next();
};

export type LogRequest<
  P extends core.Params = core.ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = core.Query
> = Request<P, ResBody, ReqBody, ReqQuery> & {
  traceId: string;
};
