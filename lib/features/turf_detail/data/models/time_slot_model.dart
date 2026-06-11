import '../../domain/entities/time_slot.dart';
class TimeSlotModel extends TimeSlot {
  const TimeSlotModel({required super.id, required super.startTime, required super.endTime,
    required super.price, super.isAvailable, super.isBooked});
  factory TimeSlotModel.fromJson(Map<String, dynamic> json) {
    return TimeSlotModel(id: json['id'] as String,
      startTime: DateTime.parse(json['start_time'] as String),
      endTime: DateTime.parse(json['end_time'] as String),
      price: (json['price'] as num).toDouble(),
      isAvailable: json['is_available'] as bool? ?? true,
      isBooked: json['is_booked'] as bool? ?? false);
  }
}
