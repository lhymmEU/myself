import type { en } from "./en";

type DictType = typeof en;

type FlattenKeys<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends Record<string, unknown>
    ? FlattenKeys<T[K], P extends "" ? K : `${P}.${K}`>
    : P extends ""
      ? K
      : `${P}.${K}`;
}[keyof T & string];

export type Translations = DictType;
export type TranslationKey = FlattenKeys<DictType>;
