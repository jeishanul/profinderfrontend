import { slugify } from '#shared/utils/slugify'
import provincesData from './data/ph-locations/provinces.json'
import citiesData from './data/ph-locations/cities.json'
import barangaysData from './data/ph-locations/barangays.json'

/**
 * Philippines administrative-division data (Province -> City/Municipality ->
 * Barangay) for the location search required by the client's spec doc —
 * vendored from the `phil-reg-prov-mun-brgy` npm package's JSON (88
 * provinces, 1,627 cities/municipalities, 41,582 barangays; ISC licensed, no
 * runtime deps) rather than hand-authored, so it's the real dataset, not a
 * partial mock. Served through `server/api/locations/*` in small
 * per-selection slices — never shipped to the client as one ~1.8MB blob.
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
  name: string
}

const PROVINCES: Province[] = (provincesData as Array<{ name: string, prov_code: string }>)
  .map(p => ({ code: p.prov_code, name: p.name, slug: slugify(p.name) }))
  .sort((a, b) => a.name.localeCompare(b.name))

const CITIES: CityMunicipality[] = (citiesData as Array<{ name: string, prov_code: string, mun_code: string }>)
  .map(c => ({ code: c.mun_code, provinceCode: c.prov_code, name: c.name, slug: slugify(c.name) }))
  .sort((a, b) => a.name.localeCompare(b.name))

const BARANGAYS: Barangay[] = (barangaysData as Array<{ name: string, mun_code: string }>)
  .map(b => ({ cityCode: b.mun_code, name: b.name }))
  .sort((a, b) => a.name.localeCompare(b.name))

export function getProvinces(): Province[] {
  return PROVINCES
}

export function getCitiesByProvince(provinceCode: string): CityMunicipality[] {
  const prov = PROVINCES.find(p => p.code === provinceCode || p.slug === provinceCode)
  const code = prov ? prov.code : provinceCode
  return CITIES.filter(city => city.provinceCode === code)
}

export function getBarangaysByCity(cityCode: string): Barangay[] {
  const city = CITIES.find(c => c.code === cityCode || c.slug === cityCode)
  const code = city ? city.code : cityCode
  return BARANGAYS.filter(barangay => barangay.cityCode === code)
}

export function getProvinceByCode(provinceCode: string): Province | undefined {
  return PROVINCES.find(p => p.code === provinceCode || p.slug === provinceCode)
}

export function getCityByCode(cityCode: string): CityMunicipality | undefined {
  return CITIES.find(c => c.code === cityCode || c.slug === cityCode)
}
