// Nashik bounding box + amenity allow-list (Part 3.2 §8).
// Nashik district lies roughly within 19.85–20.15 N, 73.65–73.95 E.
export const NASHIK_BOUNDS = { latMin: 19.85, latMax: 20.15, lngMin: 73.65, lngMax: 73.95 } as const;

export const ALLOWED_AMENITIES = [
  'parking',
  'washroom',
  'cafeteria',
  'floodlights',
  'drinking_water',
  'first_aid',
  'lockers',
  'seating',
  'wifi',
  'changing_room',
] as const;

export type Amenity = (typeof ALLOWED_AMENITIES)[number];

export function isNashikCoords(lat: number, lng: number): boolean {
  return lat >= NASHIK_BOUNDS.latMin && lat <= NASHIK_BOUNDS.latMax && lng >= NASHIK_BOUNDS.lngMin && lng <= NASHIK_BOUNDS.lngMax;
}
