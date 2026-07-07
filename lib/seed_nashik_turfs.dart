import 'package:cloud_firestore/cloud_firestore.dart';

const nashikTurfs = [
  {
    "id": "nashik-turf-001",
    "name": "Green Kick Arena",
    "description": "Premium football turf in the heart of Nashik. FIFA-quality artificial grass with floodlights for night games. Ideal for 5-a-side and 7-a-side matches.",
    "location": "Gangapur Road, Nashik",
    "address": "Plot No. 42, Gangapur Road, Near Rajiv Gandhi Bhavan, Nashik 422013",
    "city": "Nashik",
    "latitude": 20.0059,
    "longitude": 73.7835,
    "images": [
      "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800",
      "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800",
      "https://images.unsplash.com/photo-1486286701208-1d58e9338013?w=800"
    ],
    "rating": 4.7,
    "reviewCount": 112,
    "pricePerHour": 800.0,
    "priceWeekday": 800.0,
    "priceWeekend": 1000.0,
    "sports": ["Football"],
    "amenities": ["Parking", "Floodlights", "Washroom", "Changing Room", "Drinking Water"],
    "ownerUid": "OWNER_UID_REPLACE",
    "ownerName": "Rahul Deshmukh",
    "ownerPhone": "+91 94201 11111",
    "openTime": "06:00",
    "closeTime": "22:00",
    "slotDurationMinutes": 60,
    "numberOfGrounds": 2,
    "sportPricing": {"Football": 800.0},
    "isVerified": true,
    "isActive": true,
    "isPopular": true,
    "contactPhone": "+91 94201 11111",
    "distance": 1.2
  },
  {
    "id": "nashik-turf-002",
    "name": "Champions Cricket Hub",
    "description": "State-of-the-art box cricket facility with synthetic pitch. Perfect for corporate matches, tournaments, and casual games. Indoor and outdoor options available.",
    "location": "Pathardi Phata, Nashik",
    "address": "S.No. 15, Pathardi Phata, Near Lodha Splendora, Nashik 422010",
    "city": "Nashik",
    "latitude": 19.9975,
    "longitude": 73.7898,
    "images": [
      "https://images.unsplash.com/photo-1540747913346-19212a4b423d?w=800",
      "https://images.unsplash.com/photo-1562077772-3bd90403f7f0?w=800"
    ],
    "rating": 4.8,
    "reviewCount": 198,
    "pricePerHour": 900.0,
    "priceWeekday": 900.0,
    "priceWeekend": 1200.0,
    "sports": ["Cricket", "Box Cricket"],
    "amenities": ["Parking", "Floodlights", "Washroom", "Drinking Water", "Seating Area", "Scoreboard"],
    "ownerUid": "OWNER_UID_REPLACE",
    "ownerName": "Sunil Patil",
    "ownerPhone": "+91 98220 22222",
    "openTime": "06:00",
    "closeTime": "23:00",
    "slotDurationMinutes": 60,
    "numberOfGrounds": 3,
    "sportPricing": {"Cricket": 900.0, "Box Cricket": 700.0},
    "isVerified": true,
    "isActive": true,
    "isPopular": true,
    "contactPhone": "+91 98220 22222",
    "distance": 2.5
  },
  {
    "id": "nashik-turf-003",
    "name": "SportZone Nashik",
    "description": "Multi-sport facility offering football, badminton, and basketball. Modern equipment, spacious grounds, and competitive pricing. Family-friendly environment.",
    "location": "College Road, Nashik",
    "address": "Opp. K.K. Wagh College, College Road, Nashik 422005",
    "city": "Nashik",
    "latitude": 20.0128,
    "longitude": 73.7947,
    "images": [
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800",
      "https://images.unsplash.com/photo-1519861531473-9200262188bf?w=800"
    ],
    "rating": 4.5,
    "reviewCount": 87,
    "pricePerHour": 600.0,
    "priceWeekday": 600.0,
    "priceWeekend": 800.0,
    "sports": ["Football", "Badminton", "Basketball"],
    "amenities": ["Parking", "Washroom", "Drinking Water", "Changing Room"],
    "ownerUid": "OWNER_UID_REPLACE",
    "ownerName": "Amit Kulkarni",
    "ownerPhone": "+91 99750 33333",
    "openTime": "05:30",
    "closeTime": "22:00",
    "slotDurationMinutes": 60,
    "numberOfGrounds": 4,
    "sportPricing": {"Football": 600.0, "Badminton": 400.0, "Basketball": 500.0},
    "isVerified": true,
    "isActive": true,
    "isPopular": false,
    "contactPhone": "+91 99750 33333",
    "distance": 3.1
  },
  {
    "id": "nashik-turf-004",
    "name": "RoadRunner Futsal",
    "description": "Premium futsal (5-a-side football) with Italian sports flooring. Professional-grade facility, ideal for serious players and weekend leagues.",
    "location": "Ambad, Nashik",
    "address": "MIDC Ambad Phase 2, Near Satpur Ring Road, Nashik 422010",
    "city": "Nashik",
    "latitude": 19.9820,
    "longitude": 73.7553,
    "images": [
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800"
    ],
    "rating": 4.6,
    "reviewCount": 143,
    "pricePerHour": 1000.0,
    "priceWeekday": 1000.0,
    "priceWeekend": 1300.0,
    "sports": ["Football"],
    "amenities": ["Parking", "Floodlights", "Washroom", "Changing Room", "Drinking Water", "Referee Available"],
    "ownerUid": "OWNER_UID_REPLACE",
    "ownerName": "Vikram Shinde",
    "ownerPhone": "+91 90287 44444",
    "openTime": "06:00",
    "closeTime": "23:00",
    "slotDurationMinutes": 60,
    "numberOfGrounds": 2,
    "sportPricing": {"Football": 1000.0},
    "isVerified": true,
    "isActive": true,
    "isPopular": true,
    "contactPhone": "+91 90287 44444",
    "distance": 4.8
  },
  {
    "id": "nashik-turf-005",
    "name": "Badminton Supreme",
    "description": "Dedicated badminton facility with 6 international-standard courts. Proper lighting, shuttle service available, and coaching on weekends.",
    "location": "Panchavati, Nashik",
    "address": "Near Ram Kund Ghat, Panchavati, Nashik 422003",
    "city": "Nashik",
    "latitude": 20.0021,
    "longitude": 73.7720,
    "images": [
      "https://images.unsplash.com/photo-1519861531473-9200262188bf?w=800"
    ],
    "rating": 4.4,
    "reviewCount": 65,
    "pricePerHour": 350.0,
    "priceWeekday": 350.0,
    "priceWeekend": 450.0,
    "sports": ["Badminton"],
    "amenities": ["Parking", "Washroom", "Drinking Water", "Shuttle Available"],
    "ownerUid": "OWNER_UID_REPLACE",
    "ownerName": "Priya Joshi",
    "ownerPhone": "+91 88050 55555",
    "openTime": "06:00",
    "closeTime": "21:00",
    "slotDurationMinutes": 60,
    "numberOfGrounds": 6,
    "sportPricing": {"Badminton": 350.0},
    "isVerified": false,
    "isActive": true,
    "isPopular": false,
    "contactPhone": "+91 88050 55555",
    "distance": 2.9
  },
  {
    "id": "nashik-turf-006",
    "name": "PlayField Nashik",
    "description": "Affordable multi-sport complex with cricket, football, and basketball. Popular with schools and colleges. Bulk booking discounts available.",
    "location": "Dwarka, Nashik",
    "address": "Plot 7, Sector 3, Dwarka, Nashik 422011",
    "city": "Nashik",
    "latitude": 20.0280,
    "longitude": 73.8124,
    "images": [
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800",
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800"
    ],
    "rating": 4.3,
    "reviewCount": 51,
    "pricePerHour": 500.0,
    "priceWeekday": 500.0,
    "priceWeekend": 650.0,
    "sports": ["Football", "Cricket", "Basketball"],
    "amenities": ["Parking", "Washroom", "Drinking Water"],
    "ownerUid": "OWNER_UID_REPLACE",
    "ownerName": "Mangesh More",
    "ownerPhone": "+91 77090 66666",
    "openTime": "05:00",
    "closeTime": "22:00",
    "slotDurationMinutes": 60,
    "numberOfGrounds": 3,
    "sportPricing": {"Football": 500.0, "Cricket": 550.0, "Basketball": 450.0},
    "isVerified": false,
    "isActive": true,
    "isPopular": false,
    "contactPhone": "+91 77090 66666",
    "distance": 5.6
  }
];

Future<void> seedNashikTurfsAndSlots() async {
  final db = FirebaseFirestore.instance;
  print("🌱 Starting Seed Process...");

  for (final turfMap in nashikTurfs) {
    final turfId = turfMap['id'] as String;
    
    // 1. Write the turf document
    print("Writing turf $turfId...");
    await db.collection('turfs').doc(turfId).set(turfMap);

    // 2. Generate and write slots for the next 30 days
    final openHour = int.parse((turfMap['openTime'] as String).split(':')[0]);
    final closeHour = int.parse((turfMap['closeTime'] as String).split(':')[0]);
    final numGrounds = turfMap['numberOfGrounds'] as int;
    final price = turfMap['pricePerHour'] as double;
    final sports = (turfMap['sports'] as List<String>);

    final now = DateTime.now();
    
    final List<Future> futures = [];
    
    for (int dayOffset = 0; dayOffset < 30; dayOffset++) {
      final date = now.add(Duration(days: dayOffset));
      final dateStr = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
      
      for (int hour = openHour; hour < closeHour; hour++) {
        final startStr = '${hour.toString().padLeft(2, '0')}:00';
        final endStr = '${(hour + 1).toString().padLeft(2, '0')}:00';
        
        for (int ground = 1; ground <= numGrounds; ground++) {
          final slotId = '${dateStr}_${startStr}_G$ground';
          
          final slotData = {
            "id": slotId,
            "date": dateStr,
            "startTime": startStr,
            "endTime": endStr,
            "sport": sports.first,
            "groundNumber": ground,
            "price": price,
            "status": "available",
            "bookingId": null,
          };
          
          futures.add(db.collection('turfs').doc(turfId).collection('slots').doc(slotId).set(slotData));
        }
      }
    }
    await Future.wait(futures);
    print("✅ Seeded $turfId and 30 days of slots.");
  }
  
  print("🚀 Seeding Complete!");
}
