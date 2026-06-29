import * as Crypto from "expo-crypto";

/** レコード ID（UUID v4）。端末内で生成。 */
export function newId(): string {
  return Crypto.randomUUID();
}
