/// Payment entity.
class Payment {
  final String id;
  final String bookingId;
  final double amount;
  final PaymentMethod method;
  final PaymentStatus status;
  final DateTime createdAt;

  const Payment({
    required this.id,
    required this.bookingId,
    required this.amount,
    required this.method,
    required this.status,
    required this.createdAt,
  });
}

enum PaymentMethod { upi, card, netBanking, wallet }

enum PaymentStatus { pending, success, failed, refunded }
