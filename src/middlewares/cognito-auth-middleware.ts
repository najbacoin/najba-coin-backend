import { NextFunction, Request, Response } from "express";
import * as core from "express-serve-static-core";

import { LogRequest } from "@middlewares/request-logging-middleware";

export type AuthRequest<
  P extends core.Params = core.ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = core.Query
> = LogRequest<P, ResBody, ReqBody, ReqQuery> & {
  viewer: { userId: string };
};

export function testAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.headers["mock-test-auth"]) {
    (req as AuthRequest).viewer = JSON.parse(req.headers["mock-test-auth"] as string);
    return next();
  }
  return res.sendStatus(401);
}
