// 店名 ↔ 座標 ↔ 住所のジオコーディング（§11.5 C）。
// 全て Apple のジオコーダ（OS経由）。送るのは店名/座標のみで、家計データは送らない。
import * as Location from "expo-location";

export interface LocationCandidate {
  lat: number;
  lng: number;
  address: string;
}

/** LocationGeocodedAddress → 日本式の住所文字列。formattedAddress があれば優先。 */
function formatAddress(a: Location.LocationGeocodedAddress): string {
  if (a.formattedAddress) return a.formattedAddress;
  return [a.region, a.city, a.district, a.street, a.streetNumber, a.name]
    .filter(Boolean)
    .join("");
}

/** 座標 → 住所文字列。失敗時は空文字。 */
export async function reverseToAddress(
  lat: number,
  lng: number,
): Promise<string> {
  try {
    const res = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });
    return res[0] ? formatAddress(res[0]) : "";
  } catch {
    return "";
  }
}

/**
 * 店名（＋任意の地名ヒント）から位置候補を返す。
 * iOS のジオコーダは店名のみだと曖昧なので、複数候補を出してユーザーに選ばせる前提。
 */
export async function searchMerchantLocations(
  query: string,
): Promise<LocationCandidate[]> {
  const q = query.trim();
  if (!q) return [];
  let geos: Location.LocationGeocodedLocation[];
  try {
    geos = await Location.geocodeAsync(q);
  } catch {
    return [];
  }
  const out: LocationCandidate[] = [];
  for (const g of geos.slice(0, 5)) {
    out.push({
      lat: g.latitude,
      lng: g.longitude,
      address: await reverseToAddress(g.latitude, g.longitude),
    });
  }
  return out;
}
