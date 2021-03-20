import bodyParser from "body-parser";
import { AuthRequest, testAuthMiddleware } from "@middlewares/cognito-auth-middleware";
import * as core from "express-serve-static-core";
import express, { NextFunction, Request, RequestHandler, Response } from "express";
import { AppServices } from "@services/app";

function wrap<T extends RequestHandler | AuthRequestHandler>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve()
      .then(() => fn(req as any, res, next))
      .catch(next);
}

type AuthRequestHandler<
  P extends core.Params = core.ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any
> = (
  req: AuthRequest<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next?: NextFunction
) => any;

export const requestWrappers = (
  app: express.Express,
  appServices: AppServices & { isTesting?: boolean }
) => {
  const userAuthMiddleware = testAuthMiddleware;

  return {
    publicGet: (path: string, handler: RequestHandler) => app.get(path, wrap(handler)),
    publicPost: (path: string, handler: RequestHandler) =>
      app.post(path, bodyParser.json(), wrap(handler)),

    authGet: (path: string, handler: AuthRequestHandler) =>
      app.get(path, userAuthMiddleware, wrap(handler)),

    authPut: (path: string, handler: AuthRequestHandler) =>
      app.put(path, bodyParser.json(), userAuthMiddleware, wrap(handler)),

    authPatch: (path: string, handler: AuthRequestHandler) =>
      app.patch(path, bodyParser.json(), userAuthMiddleware, wrap(handler)),

    authPost: (path: string, handler: AuthRequestHandler) =>
      app.post(path, bodyParser.json(), userAuthMiddleware, wrap(handler)),

    authDelete: (path: string, handler: AuthRequestHandler) =>
      app.delete(path, bodyParser.json(), userAuthMiddleware, wrap(handler)),
  };
};
