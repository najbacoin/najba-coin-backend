import { createEnvReader } from "./env-reader";

export enum Lambda {
  Api = "api",
  DbMigrator = "db-migrator",
}

export enum Environment {
  Local = "local",
  Dev = "dev",
  Prod = "prod",
}

export type PostgresDbClientConfig = {
  host: string;
  port: string;
  database: string;
  user: string;
  password: string;
};
export type AppConfig = {
  environment: Environment;
  awsRegion: string;
  db: PostgresDbClientConfig;
};

export const readAppConfig = (): AppConfig => {
  const { readRequiredString } = createEnvReader(process.env);

  return {
    environment: readRequiredString<Environment>("ENVIRONMENT"),
    awsRegion: readRequiredString("AWS_REGION"),
    db: readPostgresDbConfig(),
  };
};

export function readPostgresDbConfig(): PostgresDbClientConfig {
  const { readOptionalString, readRequiredString } = createEnvReader(process.env);
  return {
    host: readRequiredString("PGHOST"),
    port: readOptionalString("PGPORT", "5432"),
    database: readOptionalString("PGDATABASE", "najbacoin"),
    user: readOptionalString("PGUSER", "lambda-api"),
    password: readOptionalString("PGPASSWORD", "changeme"),
  };
}
