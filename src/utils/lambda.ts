import { Context } from "aws-lambda";
import { HttpErrorResponse, toSerializableError } from "@utils/errors";
import logger from "@utils/logger";

export type WrappedLambdaArgs<EVENT, CONFIG> = {
  appConfig: CONFIG;
  event: EVENT;
  context: Context;
};

export function wrapLambdaHandler<EVENT, CONFIG>(
  lambdaName: string,
  readConfig: () => Promise<CONFIG>,
  fn: (args: WrappedLambdaArgs<EVENT, CONFIG>) => Promise<void>,
  options = {
    rethrowKnownErrors: false,
  }
): (event: EVENT, context: Context) => Promise<void> {
  return async (event, context) => {
    let appConfig: CONFIG;
    try {
      appConfig = await readConfig();
    } catch (err) {
      logger.error("Cannot setup lambda handler", { error: toSerializableError(err) });
      throw err;
    }

    try {
      await fn({ appConfig, event, context });
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        logger.error(`${lambdaName} HttpErrorResponse`, {
          msg: error.body,
          code: error.statusCode,
        });

        if (options.rethrowKnownErrors) {
          throw error;
        }
      } else {
        logger.error(`${lambdaName} error`, { serializedError: toSerializableError(error) });

        throw error;
      }
    }
  };
}
