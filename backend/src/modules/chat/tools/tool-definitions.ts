// Anthropic tool schemas. Descriptions are written for the LLM to read —
// they should tell it exactly when to call each tool and what arguments mean.
// Keep them terse; long descriptions inflate every call.

import type Anthropic from '@anthropic-ai/sdk';

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: 'search_venues',
    description:
      'Search Nashik turfs by free-text query, sport, rating, indoor/outdoor. ' +
      'Use this when the user names a venue, area, amenity, or sport but does not ask for the closest option.',
    input_schema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Free-text search across venue name, address, area, description.' },
        sport: { type: 'string', description: 'Sport code, e.g. CRICKET, FOOTBALL, BADMINTON, TENNIS.' },
        min_rating: { type: 'number', description: 'Minimum average rating (0-5).' },
        indoor: { type: 'boolean', description: 'True to restrict to indoor grounds only.' },
        limit: { type: 'integer', description: 'Max results (1-10). Default 5.' },
      },
    },
  },
  {
    name: 'find_nearby_venues',
    description:
      "List turfs closest to the user's current GPS location. " +
      "Use this whenever the user says 'near me', 'nearby', 'close by', or does not name an area. " +
      'Requires lat/lng — call it with the user_context coordinates.',
    input_schema: {
      type: 'object',
      required: ['lat', 'lng'],
      properties: {
        lat: { type: 'number' },
        lng: { type: 'number' },
        sport: { type: 'string' },
        radius_km: { type: 'number', description: 'Search radius in km (0.5-25). Default 10.' },
        limit: { type: 'integer', description: 'Max results (1-10). Default 5.' },
      },
    },
  },
  {
    name: 'get_venue_details',
    description:
      'Get full details for one venue: grounds, sports, amenities, operating hours summary, starting price, recent reviews. ' +
      'Use this after search/find has narrowed down to a specific venue the user asked about.',
    input_schema: {
      type: 'object',
      required: ['venue_id_or_slug'],
      properties: {
        venue_id_or_slug: { type: 'string', description: 'UUID or slug returned by search_venues/find_nearby_venues.' },
      },
    },
  },
  {
    name: 'check_availability',
    description:
      'For a specific ground and date, list every slot with price and state (AVAILABLE / BOOKED / MAINTENANCE / …). ' +
      'Use when the user asks about a specific time, or after recommend_best to confirm nearby alternatives.',
    input_schema: {
      type: 'object',
      required: ['ground_id', 'date'],
      properties: {
        ground_id: { type: 'string', description: 'Ground UUID.' },
        date: { type: 'string', description: 'IST date YYYY-MM-DD.' },
        duration_minutes: { type: 'integer', description: 'Override slot duration (15-240). Default = ground config.' },
      },
    },
  },
  {
    name: 'recommend_best',
    description:
      "Best-match recommender for 'find me a good turf'-style questions. Returns the top 3 turfs ranked by distance, rating, price, and real availability at the requested time. " +
      'PREFER this tool over search/find when the user wants a recommendation, not a list.',
    input_schema: {
      type: 'object',
      required: ['lat', 'lng', 'date'],
      properties: {
        lat: { type: 'number' },
        lng: { type: 'number' },
        date: { type: 'string', description: 'IST date YYYY-MM-DD (today, tomorrow — resolve relative dates yourself).' },
        start_time: { type: 'string', description: "IST time HH:MM. Omit to mean 'any earliest available'." },
        duration_minutes: { type: 'integer', description: 'Requested slot length. Default = ground config.' },
        sport_code: { type: 'string' },
        max_price_rupees: { type: 'number', description: 'Max acceptable price per slot in ₹.' },
        radius_km: { type: 'number', description: 'Search radius in km. Default 10.' },
      },
    },
  },
];

export const TOOL_NAMES = TOOL_DEFINITIONS.map((t) => t.name);
