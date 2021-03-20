import { Request, Response } from "express";
import { AppServices } from "@services/app";
import { IsString } from "class-validator";
import { IsNullable, IsUndefinable, transformToClassUnsafe } from "@utils/validation";

export const healthCheckController = (app: AppServices) => {
  return async (req: Request<{}, {}, {}, {}>, res: Response<{}>) => {
    const data = {
      isOk: true,
    };

    // runtime validation example
    const unknownData = { animal: null };

    const knownData = await transformToClassUnsafe(RequestBody, unknownData);

    return res.status(200).send(data);
  };
};

class RequestBody {
  @IsString()
  @IsNullable()
  @IsUndefinable()
  animal?: string | null;
}
