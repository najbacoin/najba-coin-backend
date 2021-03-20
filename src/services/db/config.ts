// tslint:disable-next-line
const pgParse = require("pg-connection-string");
import { createPool, DatabasePoolType, sql } from "slonik";
import { createInterceptors } from "slonik-interceptor-preset";
import { RDS } from "aws-sdk";
import { AppConfig } from "@services/app";
import logger from "@utils/logger";

export type CreateDbPoolConfig = { dbIamAuth: boolean; tls: boolean } & Pick<
  AppConfig,
  "awsRegion" | "db"
>;

export function appConfigToDbConfig(config: CreateDbPoolSpec): CreateDbPoolConfig {
  return {
    awsRegion: config.awsRegion,
    dbIamAuth: config.environment !== "local",
    tls: config.environment !== "local",
    db: config.db,
  };
}

export type CreateDbPoolSpec = Pick<AppConfig, "environment" | "awsRegion" | "db">;

export async function createDbPool(appConfig: CreateDbPoolSpec) {
  return createDbPoolCustom(appConfigToDbConfig(appConfig));
}

patchCreatePoolConfig();

export async function createDbPoolCustom(config: CreateDbPoolConfig): Promise<DatabasePoolType> {
  const pgPassword = config.dbIamAuth
    ? () =>
        getIamRdsToken(config).catch(error => {
          logger.error("Getting iam rds token error", { error });
          throw error;
        })
    : config.db.password;
  logger.debug("Connecting to database", {});

  const connectionConfiguration = {
    host: config.db.host,
    user: config.db.user,
    port: Number(config.db.port),
    database: config.db.database,
    password: (pgPassword as any) as string, // Slonik types are not up to date with pg client capabilities
    ...(config.tls ? { ssl: true, sslmode: "require", allowCleartextPasswords: 1 } : {}),
  };

  return createPool((connectionConfiguration as any) as string, {
    interceptors: [...createInterceptors()],
    typeParsers: [
      {
        name: "timestamp",
        parse: value => (value === null ? value : new Date(`${value}Z`)),
      },
      {
        name: "date",
        parse: value => (value === null ? value : new Date(`${value}Z`)),
      },
      {
        name: "int8",
        parse: value => (value === null ? value : Number(value)),
      },
      {
        name: "json",
        parse: value => (value === null ? value : JSON.parse(value)),
      },
    ],
    preferNativeBindings: false,
  });
}

async function getIamRdsToken(config: Pick<AppConfig, "awsRegion" | "db">): Promise<string> {
  logger.debug("Using iam auth", {});

  const signer = new RDS.Signer();

  return await new Promise<string>((resolve, reject) => {
    signer.getAuthToken(
      {
        region: config.awsRegion,
        hostname: config.db.host,
        port: parseInt(config.db.port),
        username: config.db.user,
      },
      (err, token) => {
        if (err) {
          reject(err);
        } else {
          resolve(token);
        }
      }
    );
  });
}
export function patchCreatePoolConfig() {
  const parse = pgParse.parse;

  pgParse.parse = (arg: string | object) => {
    if (typeof arg === "string") {
      return parse(arg);
    }
    return arg;
  };
}
