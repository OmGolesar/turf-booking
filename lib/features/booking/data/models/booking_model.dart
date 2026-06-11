import '../../domain/entities/booking.dart';
class BookingModel extends Booking {
  const BookingModel({required super.id, required super.turfId, required super.turfName,
    required super.turfImage, required super.userId, required super.date,
    required super.startTime, required super.endTime, required super.totalAmount,
    required super.status, required super.createdAt});
  factory BookingModel.fromJson(Map<String, dynamic> json) {
    return BookingModel(id: json['id'] as String, turfId: json['turf_id'] as String,
      turfName: json['turf_name'] as String, turfImage: json['turf_image'] as String,
      userId: json['user_id'] as String, date: DateTime.parse(json['date'] as String),
      startTime: json['start_time'] as String, endTime: json['end_time'] as String,
      totalAmount: (json['total_amount'] as num).toDouble(),
      status: BookingStatus.values.firstWhere((e) => e.name == json['status']),
      createdAt: DateTime.parse(json['created_at'] as String));
  }
}
