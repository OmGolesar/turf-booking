import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../turf_detail/domain/entities/time_slot.dart';
import '../providers/admin_provider.dart';

/// Admin Slot Manager — view/block/unblock slots by date.
class AdminSlotManagerScreen extends ConsumerWidget {
  const AdminSlotManagerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final slotsAsync = ref.watch(adminSlotsStreamProvider);
    final selectedDate = ref.watch(adminSelectedDateProvider);
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Manage Slots'),
        backgroundColor: Colors.transparent,
      ),
      body: Column(
        children: [
          // ── Date Picker Strip ──────────────────────────────────────────────
          Container(
            color: Theme.of(context).colorScheme.surface,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                const Icon(Icons.calendar_today,
                    size: 18, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(selectedDate,
                    style: textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w700)),
                const Spacer(),
                TextButton.icon(
                  icon: const Icon(Icons.edit_calendar, size: 16),
                  label: const Text('Change Date'),
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now(),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 60)),
                    );
                    if (picked != null) {
                      final dateStr =
                          '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
                      ref.read(adminSelectedDateProvider.notifier).state =
                          dateStr;
                    }
                  },
                ),
              ],
            ),
          ),

          // ── Legend ────────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                _LegendItem(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    label: 'Available'),
                const SizedBox(width: 16),
                _LegendItem(
                    color: Colors.grey.withValues(alpha: 0.3), label: 'Booked'),
                const SizedBox(width: 16),
                _LegendItem(
                    color: Colors.orange.withValues(alpha: 0.2),
                    label: 'Blocked'),
              ],
            ),
          ),

          // ── Slots Grid ────────────────────────────────────────────────────
          Expanded(
            child: slotsAsync.when(
              loading: () => const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
              error: (e, _) => Center(child: Text('Error: $e')),
              data: (slots) {
                if (slots.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text('📅', style: TextStyle(fontSize: 48)),
                        SizedBox(height: 16),
                        Text('No slots configured for this date.'),
                      ],
                    ),
                  );
                }
                return GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    childAspectRatio: 2.0,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                  ),
                  itemCount: slots.length,
                  itemBuilder: (context, i) =>
                      _SlotTile(slot: slots[i], ref: ref),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SlotTile extends StatelessWidget {
  final TimeSlot slot;
  final WidgetRef ref;

  const _SlotTile({required this.slot, required this.ref});

  @override
  Widget build(BuildContext context) {
    final isBooked = slot.status == SlotStatus.booked;
    final isBlocked = slot.status == SlotStatus.blocked;

    Color bgColor;
    Color textColor;
    if (isBooked) {
      bgColor = Colors.grey.withValues(alpha: 0.25);
      textColor = Colors.grey;
    } else if (isBlocked) {
      bgColor = Colors.orange.withValues(alpha: 0.15);
      textColor = Colors.orange;
    } else {
      bgColor = AppColors.primary.withValues(alpha: 0.12);
      textColor = AppColors.primary;
    }

    return GestureDetector(
      onTap: isBooked ? null : () => _onTap(context),
      child: Container(
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: textColor.withValues(alpha: 0.3)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              slot.startTime,
              style: TextStyle(
                  fontSize: 13, fontWeight: FontWeight.w800, color: textColor),
            ),
            if (isBooked)
              Text('Booked',
                  style: TextStyle(
                      fontSize: 9, color: textColor.withValues(alpha: 0.7)))
            else if (isBlocked)
              Text('Blocked',
                  style: TextStyle(
                      fontSize: 9, color: textColor.withValues(alpha: 0.8)))
            else
              Text('Free',
                  style: TextStyle(
                      fontSize: 9, color: textColor.withValues(alpha: 0.7))),
          ],
        ),
      ),
    );
  }

  Future<void> _onTap(BuildContext context) async {
    final user = ref.read(authNotifierProvider).user;
    final turfId = user?.managedTurfId;
    if (turfId == null) return;
    final ds = ref.read(adminDataSourceProvider);

    if (slot.isAvailable) {
      // Block the slot
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Block Slot'),
          content: Text('Block ${slot.startTime}–${slot.endTime}?'),
          actions: [
            TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Cancel')),
            TextButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Block',
                    style: TextStyle(color: Colors.orange))),
          ],
        ),
      );
      if (confirmed == true) {
        await ds.blockSlot(turfId, slot.id, 'Blocked by admin');
      }
    } else if (slot.isBlocked) {
      // Unblock
      await ds.unblockSlot(turfId, slot.id);
    }
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;

  const _LegendItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
            width: 14,
            height: 14,
            decoration: BoxDecoration(
                color: color, borderRadius: BorderRadius.circular(4))),
        const SizedBox(width: 6),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
