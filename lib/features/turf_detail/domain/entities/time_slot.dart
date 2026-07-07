import 'package:cloud_firestore/cloud_firestore.dart';

/// Status of a time slot.
enum SlotStatus { available, booked, blocked }

/// Time slot entity for booking availability.
class TimeSlot {
  final String id;
  final String date; // "YYYY-MM-DD"
  final String startTime; // "HH:mm"
  final String endTime; // "HH:mm"
  final double price;
  final SlotStatus status;
  final String sport;
  final int groundNumber;
  final String? bookingId;

  const TimeSlot({
    required this.id,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.price,
    this.status = SlotStatus.available,
    this.sport = 'Football',
    this.groundNumber = 1,
    this.bookingId,
  });

  bool get isAvailable => status == SlotStatus.available;
  bool get isBooked => status == SlotStatus.booked;
  bool get isBlocked => status == SlotStatus.blocked;

  /// Construct from Firestore doc.
  factory TimeSlot.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return TimeSlot(
      id: doc.id,
      date: data['date'] as String,
      startTime: data['startTime'] as String,
      endTime: data['endTime'] as String,
      price: (data['price'] as num).toDouble(),
      status: SlotStatus.values.firstWhere(
        (s) => s.name == (data['status'] as String? ?? 'available'),
        orElse: () => SlotStatus.available,
      ),
      sport: data['sport'] as String? ?? 'Football',
      groundNumber: data['groundNumber'] as int? ?? 1,
      bookingId: data['bookingId'] as String?,
    );
  }

  Map<String, dynamic> toFirestore() => {
        'date': date,
        'startTime': startTime,
        'endTime': endTime,
        'price': price,
        'status': status.name,
        'sport': sport,
        'groundNumber': groundNumber,
        'bookingId': bookingId,
      };
}
