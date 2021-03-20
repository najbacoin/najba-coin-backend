import {
  MetadataStorage,
  ValidationOptions,
  ValidationTypes,
  ValidatorOptions,
  getFromContainer,
  validate,
  registerDecorator,
  ValidationArguments,
} from "class-validator";
import { ValidationMetadataArgs } from "class-validator/metadata/ValidationMetadataArgs";
import { ValidationMetadata } from "class-validator/metadata/ValidationMetadata";
import { ClassType } from "class-transformer/ClassTransformer";
import { plainToClass } from "class-transformer";

import { parse, isValid } from "date-fns";
import logger from "@utils/logger";
import { HttpErrorResponse } from "@utils/errors";

const defaultValidatorOptions = { whitelist: true, groups: undefined };

export const transformToLowerCase = (x: unknown) => (typeof x === "string" ? x.toLowerCase() : x);

export async function transformToClass<T extends object>(
  classType: ClassType<T>,
  plain: T,
  options: ValidatorOptions = defaultValidatorOptions
): Promise<T> {
  try {
    const obj = plainToClass<T, T>(classType, plain);

    const errors = await validate(obj, {
      ...options,
      validationError: { target: false, value: false },
    });
    if (errors.length > 0) {
      logger.error(errors);
      throw new Error(`TransformError: ${classType.name}`);
    }
    return obj;
  } catch (e) {
    logger.error("Transform error", { error: e });
    throw e;
  }
}

export function transformToClassUnsafe<T extends object>(
  classType: ClassType<T>,
  plain: object,
  options: ValidatorOptions = defaultValidatorOptions
): Promise<T> {
  return transformToClass<T>(classType, plain as T, options);
}

export async function transformToRequest<T extends object>(
  classType: ClassType<T>,
  plain: object,
  options: ValidatorOptions = defaultValidatorOptions
): Promise<T> {
  try {
    const processed = trimStrings(plain);
    return await transformToClassUnsafe<T>(classType, processed, options);
  } catch (err) {
    throw new HttpErrorResponse(400, err);
  }
}

function trimStrings(obj: object) {
  const result: { [k: string]: unknown } = {};

  for (const [key, value] of Object.entries(obj)) {
    // only one level for now
    if (typeof value === "string") {
      result[key] = value.trim();
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Checks if value is null and if so, ignores all validators.
 */
export function IsNullable(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    const args: ValidationMetadataArgs = {
      type: ValidationTypes.CONDITIONAL_VALIDATION,
      target: object.constructor,
      propertyName,
      constraints: [(obj: any, _val: any) => obj[propertyName] !== null],
      validationOptions,
    };
    getFromContainer(MetadataStorage).addValidationMetadata(new ValidationMetadata(args));
  };
}

/**
 * Checks if value is undefined and if so, ignores all validators.
 */
export function IsUndefinable(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    const args: ValidationMetadataArgs = {
      type: ValidationTypes.CONDITIONAL_VALIDATION,
      target: object.constructor,
      propertyName,
      constraints: [(obj: any, _val: any) => obj[propertyName] !== undefined],
      validationOptions,
    };
    getFromContainer(MetadataStorage).addValidationMetadata(new ValidationMetadata(args));
  };
}

export function IsFormattedDate(formatTemplate: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: "isUsDateString",
      target: object.constructor,
      propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        defaultMessage(_args?: ValidationArguments) {
          return `${propertyName} must be a valid ${formatTemplate} date string`;
        },
        validate(value: any, _args?: ValidationArguments) {
          if (typeof value !== "string") {
            return false;
          }
          const formatParts = formatTemplate.split("/");
          if (formatParts.length > 0) {
            const dateParts = value.split("/");
            if (
              formatParts[formatParts.length - 1].length !== dateParts[dateParts.length - 1].length
            ) {
              return false;
            }
          }
          const parsed = parse(value, formatTemplate, new Date());
          return isValid(parsed);
        },
      },
    });
  };
}

