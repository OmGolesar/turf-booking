import 'package:cloud_firestore/cloud_firestore.dart';

import '../../domain/entities/user.dart';

/// Data Transfer Object for User — maps between Firestore and domain entity.
class UserModel extends User {
  const UserModel({
    required super.id,
    required super.name,
    required super.email,
    super.phone,
    super.avatarUrl,
    super.role,
    super.managedTurfId,
    super.totalBookings,
    super.favouriteTurfs,
    super.createdAt,
  });

  factory UserModel.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>;
    return UserModel(
      id: doc.id,
      name: d['name'] as String? ?? '',
      email: d['email'] as String? ?? '',
      phone: d['phone'] as String?,
      avatarUrl: d['avatarUrl'] as String?,
      role: UserRole.values.firstWhere(
        (r) => r.name == (d['role'] as String? ?? 'user'),
        orElse: () => UserRole.user,
      ),
      managedTurfId: d['managedTurfId'] as String?,
      totalBookings: d['totalBookings'] as int? ?? 0,
      favouriteTurfs: List<String>.from(d['favouriteTurfs'] as List? ?? []),
      createdAt: (d['createdAt'] as Timestamp?)?.toDate(),
    );
  }

  Map<String, dynamic> toFirestore() => {
        'name': name,
        'email': email,
        'phone': phone,
        'avatarUrl': avatarUrl,
        'role': role.name,
        'managedTurfId': managedTurfId,
        'totalBookings': totalBookings,
        'favouriteTurfs': favouriteTurfs,
        'createdAt': createdAt != null
            ? Timestamp.fromDate(createdAt!)
            : FieldValue.serverTimestamp(),
      };
}
