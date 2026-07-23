// Shared Malaysian state list + reverse-geocoding helpers, used anywhere we
// let a user Auto-Detect Location and fill State/City/District/Postcode
// (Create Listing pickup location, Meetup Location modal, Delivery Address modal).

export const MY_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak',
  'Selangor', 'Terengganu',
  'W.P. Kuala Lumpur', 'W.P. Labuan', 'W.P. Putrajaya',
];

// Nominatim returns raw names like "Wilayah Persekutuan Kuala Lumpur" or "Penang" —
// map those back to the canonical labels used in our State dropdown.
export function normalizeState(raw) {
  if (!raw) return '';
  const cleaned = raw.replace(/^Wilayah Persekutuan\s*/i, '').trim();
  const alias   = { Penang: 'Pulau Pinang' }[cleaned] || cleaned;
  const target  = ['Kuala Lumpur', 'Labuan', 'Putrajaya'].includes(alias) ? `W.P. ${alias}` : alias;
  return MY_STATES.find(s => s.toLowerCase() === target.toLowerCase()) || '';
}

// Reverse-geocode coordinates into a real State / City / District / Postcode via OpenStreetMap Nominatim
export async function reverseGeocode(lat, lon) {
  const res  = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' } }
  );
  const json = await res.json();
  const addr = json.address || {};
  return {
    state:    normalizeState(addr.state),
    city:     addr.city || addr.town || addr.village || addr.municipality || '',
    district: addr.suburb || addr.city_district || addr.county || addr.state_district || '',
    postcode: addr.postcode || '',
  };
}
