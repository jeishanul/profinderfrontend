/**
 * The province -> city -> barangay lists behind the location picker, served by Laravel (`/v1/locations/*`, kept in
 * line with PSA's PSGC list by `locations:sync`) through `server/api/locations/*`. Codes are PSA codes: the older
 * 4-digit province / 6-digit city codes, or a 10-digit PSGC code for places created since.
 */
export interface Province {
  code: string
  name: string
  slug: string
}

export interface CityMunicipality {
  code: string
  provinceCode: string
  name: string
  slug: string
}

export interface Barangay {
  cityCode: string
  /** Saved records store the barangay by this name. */
  name: string
  slug: string
}
