// app/lib/geocoding.ts
import axios from 'axios';

export async function geocodeAddress(fullAddress: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('❌ Missing GOOGLE_MAPS_API_KEY in .env.local');
    return null;
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    const results = response.data.results;

    if (results && results.length > 0) {
      const top = results[0];

      // ❌ Rechazar si es un match parcial (no exacto)
      if (top.partial_match) {
        console.warn('⚠️ Geocoding returned a partial match for:', fullAddress);
        return null;
      }

      const { lat, lng } = top.geometry.location;
      return { lat, lng };
    } else {
      console.warn('⚠️ No results from geocoding API for address:', fullAddress);
      return null;
    }
  } catch (err) {
    console.error('❌ Error fetching geocode:', err);
    return null;
  }
}