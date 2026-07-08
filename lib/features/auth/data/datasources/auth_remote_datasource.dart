import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart' as fb;

import '../../domain/entities/user.dart';
import '../models/user_model.dart';

/// Remote data source for authentication — backed by Firebase Auth.
abstract class AuthRemoteDataSource {
  Future<UserModel> login({required String email, required String password});
  Future<UserModel> signup(
      {required String name,
      required String email,
      required String password,
      String? phone});
  Future<void> logout();
  Stream<UserModel?> get authStateChanges;
  Future<UserModel?> getCurrentUser();
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final fb.FirebaseAuth _auth;
  final FirebaseFirestore _firestore;

  AuthRemoteDataSourceImpl({
    fb.FirebaseAuth? auth,
    FirebaseFirestore? firestore,
  })  : _auth = auth ?? fb.FirebaseAuth.instance,
        _firestore = firestore ?? FirebaseFirestore.instance;

  @override
  Stream<UserModel?> get authStateChanges {
    return _auth.authStateChanges().asyncMap((fbUser) async {
      if (fbUser == null) return null;
      return _fetchOrCreateUser(fbUser);
    });
  }

  @override
  Future<UserModel?> getCurrentUser() async {
    final fbUser = _auth.currentUser;
    if (fbUser == null) return null;
    return _fetchOrCreateUser(fbUser);
  }

  @override
  Future<UserModel> login({
    required String email,
    required String password,
  }) async {
    final credential = await _auth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
    return _fetchOrCreateUser(credential.user!);
  }

  @override
  Future<UserModel> signup({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    final credential = await _auth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
    await credential.user!.updateDisplayName(name);

    // Create user doc in Firestore
    final model = UserModel(
      id: credential.user!.uid,
      name: name,
      email: email,
      phone: phone,
      role: UserRole.user,
      createdAt: DateTime.now(),
    );
    await _firestore
        .collection('users')
        .doc(credential.user!.uid)
        .set(model.toFirestore());

    return model;
  }

  @override
  Future<void> logout() => _auth.signOut();

  /// Fetch user doc from Firestore; create one if it doesn't exist yet.
  Future<UserModel> _fetchOrCreateUser(fb.User fbUser) async {
    final doc = await _firestore.collection('users').doc(fbUser.uid).get();
    if (doc.exists) {
      return UserModel.fromFirestore(doc);
    }
    // First-time Google sign-in / edge case: create doc
    final model = UserModel(
      id: fbUser.uid,
      name: fbUser.displayName ?? 'TurfX User',
      email: fbUser.email ?? '',
      phone: fbUser.phoneNumber,
      role: UserRole.user,
      createdAt: DateTime.now(),
    );
    await _firestore
        .collection('users')
        .doc(fbUser.uid)
        .set(model.toFirestore(), SetOptions(merge: true));
    return model;
  }
}
