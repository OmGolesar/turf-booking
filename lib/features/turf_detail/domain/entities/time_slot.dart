/// Time slot entity for booking availability.
class TimeSlot {
  final String id;
  final DateTime startTime;
  final DateTime endTime;
  final double price;
  final bool isAvailable;
  final bool isBooked;

  const TimeSlot({
    required this.id, required this.startTime, required this.endTime,
    required this.price, this.isAvailable = true, this.isBooked = false,
  });
}
