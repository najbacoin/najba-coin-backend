import { v4 as generateUuid } from "uuid";

export const uuid = (num?: number): string => {
  if (num === undefined) {
    return generateUuid();
  }

  const suffix = num.toString().padStart(12, "0");

  return `00000000-0000-0000-0000-${suffix}`;
};

type Builder<T> = () => T;
export const optionalProp = <T extends object>(condition: boolean, obj: T | Builder<T>): T | {} => {
  return condition ? (typeof obj === "function" ? (obj as Builder<T>)() : obj) : {};
};
