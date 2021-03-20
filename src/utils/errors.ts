import { isNil } from "ramda";
import { CloudWatchLogsDecodedData, CloudWatchLogsEvent, SNSEvent } from "aws-lambda";
import util from "util";
import zlib from "zlib";
import { ValidationError } from "class-validator";
import {
  ForeignKeyIntegrityConstraintViolationError,
  UniqueIntegrityConstraintViolationError,
} from "slonik";

export enum ErrorType {
  unhandled = "unhandled",
  httpErrorResponse = "httpErrorResponse",
  transform = "transform",
  cognito = "cognito",
}

export class HttpErrorResponse<
  T extends { message: string } = { message: string; errors?: any[]; kind?: string }
> extends Error {
  constructor(readonly statusCode: number, readonly body: T) {
    super(body.message);
    Object.setPrototypeOf(this, HttpErrorResponse.prototype);
  }
}

export class TransformError extends Error {
  constructor(readonly message: string, readonly validationErrors: ValidationError[]) {
    super(message);
    Object.setPrototypeOf(this, TransformError.prototype);
  }
}

// function getChildrenErrors(parentErrors: ValidationError[], propPath: string) {
//   let acc: ValidationError[] = [];
//   for (const error of parentErrors) {
//     if (error.constraints) {
//       acc = acc.concat({ ...error, property: `${propPath}.${error.property}` });
//     }
//     if (error.children.length) {
//       acc = acc.concat(getChildrenErrors(error.children, `${propPath}.${error.property}`));
//     }
//   }
//   return acc;
// }

// export const parseValidationErrors = (validationErrors: ValidationError[]): string => {
//   const acc = getChildrenErrors(validationErrors, "");

//   return acc
//     .map(error => {
//       if (isNil(error.constraints)) {
//         return "";
//       } else {
//         return `${Object.values(error.constraints).join(", ")}`;
//       }
//     })
//     .join(";");
// };

export function toSerializableError(error: any): SerializableError {
  if (!error) {
    return { errorType: SerializableErrorType.other, message: "Empty error" };
  }
  if (error.isAxiosError) {
    const axios = error as any;
    return {
      errorType: SerializableErrorType.axios,
      message: error.message,
      httpError: {
        ...(axios.config ? { baseUrl: axios.config.baseURL } : {}),
        ...(axios.request ? { method: axios.request.method, path: axios.request.path } : {}),
        ...(axios.response ? { statusCode: axios.response.status, body: axios.response.data } : {}),
      },
    };
  }
  if (error instanceof TransformError) {
    return {
      errorType: SerializableErrorType.transform,
      message: error.message,
      transformError: {
        validationErrors: error.validationErrors,
        stacktrace: error.stack,
      },
    };
  }
  if (
    error instanceof UniqueIntegrityConstraintViolationError ||
    error instanceof ForeignKeyIntegrityConstraintViolationError
  ) {
    return {
      errorType: SerializableErrorType.database,
      message: error.originalError.message,
      error: {
        name: error.name,
        stacktrace: error.stack,
      },
    };
  }
  if (error instanceof Error) {
    return {
      errorType: SerializableErrorType.vanilla,
      message: error.message.replace("[object Object]", ""),
      error: {
        name: error.name,
        stacktrace: error.stack,
      },
    };
  }
  return { errorType: SerializableErrorType.other, message: String(error) };
}

export enum SerializableErrorType {
  axios = "axios",
  transform = "transform",
  vanilla = "vanilla",
  other = "other",
  business = "business",
  database = "database",
}

export type SerializableError =
  | SerializableBusinessError
  | SerializableAxiosError
  | SerializableTransformError
  | SerializableVanillaError
  | SerializableDatabaseError
  | SerializableOtherError;

interface SerializableBusinessError {
  errorType: SerializableErrorType.business;
  message: string;
}

export interface SerializableAxiosError {
  errorType: SerializableErrorType.axios;
  message: string;
  httpError: {
    body?: object;
    baseUrl?: string;
    method?: string;
    path?: string;
  };
}

interface SerializableTransformError {
  errorType: SerializableErrorType.transform;
  message: string;
  transformError: {
    validationErrors: object[];
    stacktrace: string | undefined;
  };
}

interface SerializableVanillaError {
  errorType: SerializableErrorType.vanilla;
  message: string;
  error: {
    name: string;
    stacktrace: string | undefined;
  };
}
interface SerializableDatabaseError {
  errorType: SerializableErrorType.database;
  message: string;
  error: {
    name: string;
    stacktrace: string | undefined;
  };
}

interface SerializableOtherError {
  errorType: SerializableErrorType.other;
  message: string;
}
