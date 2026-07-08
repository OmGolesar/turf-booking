import 'package:cloud_firestore/cloud_firestore.dart';

/// Source of a booking — used by admin panel.
enum BookingSource { app, walkIn, phone, whatsapp }

/// Status of a booking.
enum BookingStatus { pending, confirmed, completed, cancelled }

/// Booking entity — represents a confirmed turf booking.
class Booking {
  final String id;
  final String turfId;
  final String turfName;
  final String turfImage;
  final String turfLocation;
  final String userId;
  final String userName;
  final String? userPhone;
  final String date; // "YYYY-MM-DD"
  final List<String> slotIds;
  final String startTime; // "HH:mm" (first slot)
  final String endTime; // "HH:mm" (last slot end)
  final String sport;
  final int groundNumber;
  final double turfCharge;
  final double bookingFee;
  final double gst;
  final double totalAmount;
  final String paymentMethod;
  final String paymentStatus; // paid | pending
  final BookingSource bookingSource;
  final BookingStatus status;
  final String? adminNote;
  final DateTime createdAt;

  const Booking({
    required this.id,
    required this.turfId,
    required this.turfName,
    required this.turfImage,
    required this.turfLocation,
    required this.userId,
    required this.userName,
    this.userPhone,
    required this.date,
    required this.slotIds,
    required this.startTime,
    required this.endTime,
    required this.sport,
    this.groundNumber = 1,
    required this.turfCharge,
    this.bookingFee = 20,
    required this.gst,
    required this.totalAmount,
    required this.paymentMethod,
    this.paymentStatus = 'pending',
    this.bookingSource = BookingSource.app,
    this.status = BookingStatus.confirmed,
    this.adminNote,
    required this.createdAt,
  });

  /// Number of slots booked.
  int get slotCount => slotIds.length;

  /// Display label for status.
  String get statusLabel =>
      status.name[0].toUpperCase() + status.name.substring(1);

  factory Booking.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>;
    return Booking(
      id: doc.id,
      turfId: d['turfId'] as String,
      turfName: d['turfName'] as String,
      turfImage: d['turfImage'] as String? ?? '',
      turfLocation: d['turfLocation'] as String? ?? '',
      userId: d['userId'] as String,
      userName: d['userName'] as String? ?? '',
      userPhone: d['userPhone'] as String?,
      date: d['date'] as String,
      slotIds: List<String>.from(d['slotIds'] as List? ?? []),
      startTime: d['startTime'] as String,
      endTime: d['endTime'] as String,
      sport: d['sport'] as String? ?? 'Football',
      groundNumber: d['groundNumber'] as int? ?? 1,
      turfCharge: (d['turfCharge'] as num).toDouble(),
      bookingFee: (d['bookingFee'] as num? ?? 20).toDouble(),
      gst: (d['gst'] as num? ?? 0).toDouble(),
      totalAmount: (d['totalAmount'] as num).toDouble(),
      paymentMethod: d['paymentMethod'] as String? ?? 'Cash',
      paymentStatus: d['paymentStatus'] as String? ?? 'pending',
      bookingSource: BookingSource.values.firstWhere(
        (s) => s.name == (d['bookingSource'] as String? ?? 'app'),
        orElse: () => BookingSource.app,
      ),
      status: BookingStatus.values.firstWhere(
        (s) => s.name == (d['status'] as String? ?? 'confirmed'),
        orElse: () => BookingStatus.confirmed,
      ),
      adminNote: d['adminNote'] as String?,
      createdAt: (d['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toFirestore() => {
        'turfId': turfId,
        'turfName': turfName,
        'turfImage': turfImage,
        'turfLocation': turfLocation,
        'userId': userId,
        'userName': userName,
        'userPhone': userPhone,
        'date': date,
        'slotIds': slotIds,
        'startTime': startTime,
        'endTime': endTime,
        'sport': sport,
        'groundNumber': groundNumber,
        'turfCharge': turfCharge,
        'bookingFee': bookingFee,
        'gst': gst,
        'totalAmount': totalAmount,
        'paymentMethod': paymentMethod,
        'paymentStatus': paymentStatus,
        'bookingSource': bookingSource.name,
        'status': status.name,
        'adminNote': adminNote,
        'createdAt': FieldValue.serverTimestamp(),
      };
}
