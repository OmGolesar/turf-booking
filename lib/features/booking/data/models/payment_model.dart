import '../../domain/entities/payment.dart';
class PaymentModel extends Payment {
  const PaymentModel({required super.id, required super.bookingId, required super.amount,
    required super.method, required super.status, required super.createdAt});
  factory PaymentModel.fromJson(Map<String, dynamic> json) {
    return PaymentModel(id: json['id'] as String, bookingId: json['booking_id'] as String,
      amount: (json['amount'] as num).toDouble(),
      method: PaymentMethod.values.firstWhere((e) => e.name == json['method']),
      status: PaymentStatus.values.firstWhere((e) => e.name == json['status']),
      createdAt: DateTime.parse(json['created_at'] as String));
  }
}
