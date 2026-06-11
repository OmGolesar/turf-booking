/// Booking entity.
class Booking {
  final String id;
  final String turfId;
  final String turfName;
  final String turfImage;
  final String userId;
  final DateTime date;
  final String startTime;
  final String endTime;
  final double totalAmount;
  final BookingStatus status;
  final DateTime createdAt;

  const Booking({
    required this.id, required this.turfId, required this.turfName,
    required this.turfImage, required this.userId, required this.date,
    required this.startTime, required this.endTime, required this.totalAmount,
    required this.status, required this.createdAt,
  });
}

enum BookingStatus { pending, confirmed, completed, cancelled }
