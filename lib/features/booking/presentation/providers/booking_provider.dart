import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/datasources/booking_remote_datasource.dart';
import '../../domain/entities/booking.dart';

// ── Dependency Providers ───────────────────────────────────────────────────────

final bookingRemoteDataSourceProvider =
    Provider<BookingRemoteDataSource>((ref) {
  return BookingRemoteDataSourceImpl();
});

// ── Booking State ─────────────────────────────────────────────────────────────

class BookingState {
  final Booking? latestBooking;
  final bool isLoading;
  final String? errorMessage;
  final String? selectedPaymentMethod;

  // Slot selection state
  final Set<String> selectedSlotIds;
  final String? selectedDate;
  final String? selectedSport;
  final String? turfId;

  const BookingState({
    this.latestBooking,
    this.isLoading = false,
    this.errorMessage,
    this.selectedPaymentMethod = 'UPI / GPay',
    this.selectedSlotIds = const {},
    this.selectedDate,
    this.selectedSport,
    this.turfId,
  });

  BookingState copyWith({
    Booking? latestBooking,
    bool? isLoading,
    String? errorMessage,
    String? selectedPaymentMethod,
    Set<String>? selectedSlotIds,
    String? selectedDate,
    String? selectedSport,
    String? turfId,
  }) {
    return BookingState(
      latestBooking: latestBooking ?? this.latestBooking,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      selectedPaymentMethod:
          selectedPaymentMethod ?? this.selectedPaymentMethod,
      selectedSlotIds: selectedSlotIds ?? this.selectedSlotIds,
      selectedDate: selectedDate ?? this.selectedDate,
      selectedSport: selectedSport ?? this.selectedSport,
      turfId: turfId ?? this.turfId,
    );
  }
}

// ── Booking Notifier ───────────────────────────────────────────────────────────

class BookingNotifier extends StateNotifier<BookingState> {
  final BookingRemoteDataSource _dataSource;
  final Ref _ref;

  BookingNotifier(this._dataSource, this._ref) : super(const BookingState());

  void toggleSlot(String slotId) {
    final selected = Set<String>.from(state.selectedSlotIds);
    if (selected.contains(slotId)) {
      selected.remove(slotId);
    } else {
      selected.add(slotId);
    }
    state = state.copyWith(selectedSlotIds: selected);
  }

  void setDate(String date) => state = state.copyWith(selectedDate: date);
  void setSport(String sport) => state = state.copyWith(selectedSport: sport);
  void setTurf(String turfId) => state = state.copyWith(turfId: turfId);
  void setPaymentMethod(String method) =>
      state = state.copyWith(selectedPaymentMethod: method);

  void clearSlots() => state = state.copyWith(selectedSlotIds: {});

  Future<Booking?> createBooking({
    required String turfId,
    required String turfName,
    required String turfImage,
    required String turfLocation,
    required String startTime,
    required String endTime,
    required double turfCharge,
  }) async {
    final user = _ref.read(authNotifierProvider).user;
    if (user == null) {
      state = state.copyWith(errorMessage: 'Please log in to book.');
      return null;
    }
    if (state.selectedSlotIds.isEmpty) {
      state = state.copyWith(errorMessage: 'Please select at least one slot.');
      return null;
    }

    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final booking = await _dataSource.createBooking(BookingRequest(
        turfId: turfId,
        turfName: turfName,
        turfImage: turfImage,
        turfLocation: turfLocation,
        userId: user.id,
        userName: user.name,
        userPhone: user.phone,
        date: state.selectedDate!,
        slotIds: state.selectedSlotIds.toList(),
        startTime: startTime,
        endTime: endTime,
        sport: state.selectedSport ?? 'Football',
        turfCharge: turfCharge,
        paymentMethod: state.selectedPaymentMethod ?? 'UPI / GPay',
      ));
      state = BookingState(latestBooking: booking);
      return booking;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString().replaceFirst('Exception: ', ''),
      );
      return null;
    }
  }

  Future<void> cancelBooking(Booking booking) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await _dataSource.cancelBooking(
          booking.id, booking.turfId, booking.slotIds);
      state = const BookingState();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to cancel booking. Please try again.',
      );
    }
  }

  void clearError() => state = state.copyWith(errorMessage: null);
}

final bookingNotifierProvider =
    StateNotifierProvider<BookingNotifier, BookingState>((ref) {
  return BookingNotifier(ref.watch(bookingRemoteDataSourceProvider), ref);
});

// ── My Bookings Providers ─────────────────────────────────────────────────────

final upcomingBookingsProvider =
    FutureProvider.autoDispose<List<Booking>>((ref) async {
  final user = ref.watch(authNotifierProvider).user;
  if (user == null) return [];
  return ref
      .watch(bookingRemoteDataSourceProvider)
      .getUpcomingBookings(user.id);
});

final completedBookingsProvider =
    FutureProvider.autoDispose<List<Booking>>((ref) async {
  final user = ref.watch(authNotifierProvider).user;
  if (user == null) return [];
  return ref
      .watch(bookingRemoteDataSourceProvider)
      .getCompletedBookings(user.id);
});
