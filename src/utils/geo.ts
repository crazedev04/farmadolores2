type NullableCoords = {
  lat: number | null;
  lng: number | null;
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

const resolveLat = (source: any): number | null =>
  toNumber(source?.latitude) ??
  toNumber(source?._latitude) ??
  toNumber(source?.lat);

const resolveLng = (source: any): number | null =>
  toNumber(source?.longitude) ??
  toNumber(source?._longitude) ??
  toNumber(source?.lng);

export const getCoordsFromPharmacyLike = (item: any): NullableCoords => {
  const fromGps = item?.gps;
  const latFromGps = resolveLat(fromGps);
  const lngFromGps = resolveLng(fromGps);
  if (latFromGps != null && lngFromGps != null) {
    return { lat: latFromGps, lng: lngFromGps };
  }

  const latTopLevel = resolveLat(item);
  const lngTopLevel = resolveLng(item);
  if (latTopLevel != null && lngTopLevel != null) {
    return { lat: latTopLevel, lng: lngTopLevel };
  }

  return { lat: null, lng: null };
};

