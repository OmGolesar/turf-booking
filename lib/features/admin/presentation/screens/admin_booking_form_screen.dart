import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../booking/data/datasources/booking_remote_datasource.dart';
import '../../../booking/domain/entities/booking.dart';
import '../providers/admin_provider.dart';

/// Admin booking form — allows turf owners to add walk-in, phone,
/// or WhatsApp bookings directly into Firestore.
class AdminBookingFormScreen extends ConsumerStatefulWidget {
  const AdminBookingFormScreen({super.key});

  @override
  ConsumerState<AdminBookingFormScreen> createState() =>
      _AdminBookingFormScreenState();
}

class _AdminBookingFormScreenState
    extends ConsumerState<AdminBookingFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _noteCtrl = TextEditingController();

  BookingSource _source = BookingSource.walkIn;
  String _selectedSport = 'Football';
  List<String> _selectedSlotIds = [];
  bool _loading = false;

  // We'll show slots for today by default
  final _today = DateTime.now();
  String get _todayStr =>
      '${_today.year}-${_today.month.toString().padLeft(2, '0')}-${_today.day.toString().padLeft(2, '0')}';

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedSlotIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one slot.')),
      );
      return;
    }

    final user = ref.read(authNotifierProvider).user;
    if (user?.managedTurfId == null) return;

    setState(() => _loading = true);

    try {
      final ds = BookingRemoteDataSourceImpl();

      // Get slot details to compute times and price
      final slotsAsync = ref.read(adminSlotsStreamProvider);
      final slots = slotsAsync.value ?? [];
      final selectedSlots = slots
          .where((s) => _selectedSlotIds.contains(s.id))
          .toList()
        ..sort((a, b) => a.startTime.compareTo(b.startTime));

      if (selectedSlots.isEmpty)
        throw Exception('Could not find slot details.');

      final startTime = selectedSlots.first.startTime;
      final endTime = selectedSlots.last.endTime;
      final turfCharge =
          selectedSlots.fold<double>(0, (sum, s) => sum + s.price);

      await ds.createBooking(BookingRequest(
        turfId: user!.managedTurfId!,
        turfName: 'Your Turf', // replaced in real usage with actual turf name
        turfImage: '',
        turfLocation: 'Nashik',
        userId: user.id,
        userName: _nameCtrl.text.trim(),
        userPhone:
            _phoneCtrl.text.trim().isEmpty ? null : _phoneCtrl.text.trim(),
        date: _todayStr,
        slotIds: _selectedSlotIds,
        startTime: startTime,
        endTime: endTime,
        sport: _selectedSport,
        turfCharge: turfCharge,
        paymentMethod: 'Cash',
        bookingSource: _source,
        adminNote: _noteCtrl.text.trim().isEmpty ? null : _noteCtrl.text.trim(),
      ));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Booking added successfully!'),
            backgroundColor: AppColors.primary,
          ),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString().replaceFirst('Exception: ', '')),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final slotsAsync = ref.watch(adminSlotsStreamProvider);
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Booking'),
        backgroundColor: Colors.transparent,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // ── Booking Source ─────────────────────────────────────────────
            Text('Booking Source',
                style: textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: BookingSource.values.map((s) {
                final labels = {
                  BookingSource.walkIn: '🚶 Walk-in',
                  BookingSource.phone: '📞 Phone',
                  BookingSource.whatsapp: '💬 WhatsApp',
                  BookingSource.app: '📱 App',
                };
                return ChoiceChip(
                  label: Text(labels[s]!),
                  selected: _source == s,
                  onSelected: (_) => setState(() => _source = s),
                  selectedColor: AppColors.primary.withValues(alpha: 0.15),
                );
              }).toList(),
            ),

            const SizedBox(height: 20),

            // ── Customer Info ─────────────────────────────────────────────
            TextFormField(
              controller: _nameCtrl,
              decoration: const InputDecoration(
                labelText: 'Customer Name *',
                prefixIcon: Icon(Icons.person_outline),
              ),
              validator: (v) =>
                  v == null || v.isEmpty ? 'Enter customer name' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Phone Number',
                prefixIcon: Icon(Icons.phone_outlined),
              ),
            ),

            const SizedBox(height: 20),

            // ── Sport ──────────────────────────────────────────────────────
            Text('Sport',
                style: textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: ['Football', 'Cricket', 'Box Cricket', 'Badminton']
                  .map((s) => ChoiceChip(
                        label: Text(s),
                        selected: _selectedSport == s,
                        onSelected: (_) => setState(() => _selectedSport = s),
                        selectedColor:
                            AppColors.primary.withValues(alpha: 0.15),
                      ))
                  .toList(),
            ),

            const SizedBox(height: 20),

            // ── Slot Selection ─────────────────────────────────────────────
            Text("Select Slots (Today: $_todayStr)",
                style: textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),

            slotsAsync.when(
              loading: () => const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
              error: (e, _) => Text('Error loading slots: $e'),
              data: (slots) {
                final available = slots.where((s) => s.isAvailable).toList();
                if (available.isEmpty) {
                  return const Text('No available slots for today.');
                }
                return Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: available.map((slot) {
                    final selected = _selectedSlotIds.contains(slot.id);
                    return GestureDetector(
                      onTap: () {
                        setState(() {
                          if (selected) {
                            _selectedSlotIds.remove(slot.id);
                          } else {
                            _selectedSlotIds.add(slot.id);
                          }
                        });
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: selected
                              ? AppColors.primary
                              : AppColors.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                              color: selected
                                  ? AppColors.primary
                                  : AppColors.primary.withValues(alpha: 0.3)),
                        ),
                        child: Text(
                          '${slot.startTime}–${slot.endTime}',
                          style: TextStyle(
                            color: selected ? Colors.white : AppColors.primary,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                );
              },
            ),

            const SizedBox(height: 20),

            // ── Admin Note ────────────────────────────────────────────────
            TextFormField(
              controller: _noteCtrl,
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Admin Note (optional)',
                prefixIcon: Icon(Icons.note_outlined),
              ),
            ),

            const SizedBox(height: 28),

            // ── Submit ────────────────────────────────────────────────────
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _loading ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                            color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('Add Booking',
                        style: TextStyle(
                            fontWeight: FontWeight.w800, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
