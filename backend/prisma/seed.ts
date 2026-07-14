// Seeds: sports catalogue + one Nashik demo partner/venue/grounds.
// Spec: Part 2.5.2 §14.
//
// Reference codes come from BEFORE-INSERT triggers, not from this file.
// Identity for the demo partner uses role = PARTNER, so reference_code stays NULL.

import { PrismaClient, Role, VenueStatus, GroundStatus, SurfaceType, PartnerStatus } from '@prisma/client';

const prisma = new PrismaClient();

const SPORTS = [
  { code: 'FOOTBALL',   displayName: 'Football',    defaultDurationMinutes: 60, defaultMaxPlayers: 10, displayOrder: 1 },
  { code: 'CRICKET',    displayName: 'Box Cricket', defaultDurationMinutes: 90, defaultMaxPlayers: 14, displayOrder: 2 },
  { code: 'BADMINTON',  displayName: 'Badminton',   defaultDurationMinutes: 60, defaultMaxPlayers: 4,  displayOrder: 3 },
  { code: 'PICKLEBALL', displayName: 'Pickleball',  defaultDurationMinutes: 60, defaultMaxPlayers: 4,  displayOrder: 4 },
  { code: 'TENNIS',     displayName: 'Tennis',      defaultDurationMinutes: 60, defaultMaxPlayers: 4,  displayOrder: 5 },
  { code: 'BASKETBALL', displayName: 'Basketball',  defaultDurationMinutes: 60, defaultMaxPlayers: 10, displayOrder: 6 },
  { code: 'VOLLEYBALL', displayName: 'Volleyball',  defaultDurationMinutes: 60, defaultMaxPlayers: 12, displayOrder: 7 },
];

async function main() {
  console.log('Seeding sports…');
  for (const s of SPORTS) {
    await prisma.sport.upsert({
      where: { code: s.code },
      update: s,
      create: s,
    });
  }

  console.log('Seeding demo partner + venue + grounds…');

  const identity = await prisma.identity.upsert({
    where: { firebaseUid: 'seed:goalzone-partner' },
    update: {},
    create: {
      firebaseUid: 'seed:goalzone-partner',
      email: 'goalzone.demo@turfx.in',
      phone: '+919999900001',
      role: Role.PARTNER,
    },
  });

  const partner = await prisma.partner.upsert({
    where: { identityId: identity.id },
    update: {},
    create: {
      identityId: identity.id,
      businessName: 'GoalZone Sports Pvt Ltd',
      displayName: 'GoalZone Sports',
      phone: '+919999900001',
      email: 'goalzone.demo@turfx.in',
      address: 'Gangapur Road, Nashik 422013',
      city: 'Nashik',
      state: 'Maharashtra',
      status: PartnerStatus.ACTIVE,
      isVerified: true,
    },
  });

  const venue = await prisma.venue.upsert({
    where: { slug: 'goalzone-nashik' },
    update: {},
    create: {
      partnerId: partner.id,
      name: 'GoalZone Nashik',
      slug: 'goalzone-nashik',
      description: 'Premier multi-sport turf in Nashik',
      address: 'Gangapur Road, Nashik 422013',
      area: 'Gangapur Road',
      city: 'Nashik',
      state: 'Maharashtra',
      postalCode: '422013',
      latitude: 20.0059,
      longitude: 73.7784,
      amenities: ['parking', 'washroom', 'cafeteria', 'floodlights', 'drinking_water'],
      status: VenueStatus.PUBLISHED,
    },
  });

  const sportsByCode = Object.fromEntries(
    (await prisma.sport.findMany()).map((s) => [s.code, s.id]),
  );

  const grounds = [
    { name: 'Football Ground A',  code: 'FOOTBALL',  surfaceType: SurfaceType.ARTIFICIAL_TURF, maxPlayers: 12 },
    { name: 'Cricket Box 1',      code: 'CRICKET',   surfaceType: SurfaceType.ARTIFICIAL_TURF, maxPlayers: 14 },
    { name: 'Badminton Court 1',  code: 'BADMINTON', surfaceType: SurfaceType.WOOD,            maxPlayers: 4  },
  ];

  for (const g of grounds) {
    await prisma.ground.upsert({
      // grounds has no natural uniqueness other than reference_code — use (venueId, name)
      // by filtering first, then create when missing.
      where: { id: (await prisma.ground.findFirst({ where: { venueId: venue.id, name: g.name } }))?.id ?? '00000000-0000-0000-0000-000000000000' },
      update: {},
      create: {
        venueId: venue.id,
        sportId: sportsByCode[g.code],
        name: g.name,
        surfaceType: g.surfaceType,
        maxPlayers: g.maxPlayers,
        indoor: g.code === 'BADMINTON',
        lighting: true,
        status: GroundStatus.ACTIVE,
      },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
