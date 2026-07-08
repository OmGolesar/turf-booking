import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../booking/domain/entities/booking.dart';
import '../providers/admin_provider.dart';

class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authNotifierProvider).user;
    final todayBookingsAsync = ref.watch(adminTodayBookingsProvider);
    final slotsAsync = ref.watch(adminSlotsStreamProvider);
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: colorScheme.surface,
      body: CustomScrollView(
        slivers: [
          // ── App Bar ──────────────────────────────────────────────────────────
          SliverAppBar(
            expandedHeight: 140,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF0D1117), Color(0xFF1A2B1A)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 72, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Admin Dashboard 🏟️',
                        style: textTheme.titleLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        user?.name ?? 'Turf Admin',
                        style: textTheme.bodyMedium?.copyWith(
                          color: Colors.white.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.logout, color: Colors.white70),
                onPressed: () {
                  ref.read(authNotifierProvider.notifier).logout();
                  context.go('/welcome');
                },
              ),
            ],
          ),

          // ── Stats Row ─────────────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: todayBookingsAsync.when(
                data: (bookings) {
                  final confirmed = bookings
                      .where((b) => b.status == BookingStatus.confirmed)
                      .length;
                  final revenue =
                      bookings.fold<double>(0, (sum, b) => sum + b.turfCharge);
                  return slotsAsync.when(
                    data: (slots) {
                      final available =
                          slots.where((s) => s.isAvailable).length;
                      final booked = slots.where((s) => s.isBooked).length;
                      return _StatsRow(
                        confirmed: confirmed,
                        revenue: revenue,
                        available: available,
                        booked: booked,
                      );
                    },
                    loading: () => const _StatsRow(
                        confirmed: 0, revenue: 0, available: 0, booked: 0),
                    error: (_, __) => const _StatsRow(
                        confirmed: 0, revenue: 0, available: 0, booked: 0),
                  );
                },
                loading: () => const _StatsRow(
                    confirmed: 0, revenue: 0, available: 0, booked: 0),
                error: (_, __) => const _StatsRow(
                    confirmed: 0, revenue: 0, available: 0, booked: 0),
              ),
            ),
          ),

          // ── Quick Actions ─────────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Quick Actions',
                      style: textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w800)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _ActionCard(
                          icon: Icons.add_circle_outline,
                          label: 'Add Booking',
                          subtitle: 'Walk-in / Phone / WhatsApp',
                          color: AppColors.primary,
                          onTap: () => context.push('/admin/add-booking'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _ActionCard(
                          icon: Icons.grid_view,
                          label: 'Manage Slots',
                          subtitle: 'Block / unblock slots',
                          color: const Color(0xFF2196F3),
                          onTap: () => context.push('/admin/slots'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _ActionCard(
                    icon: Icons.edit_outlined,
                    label: 'Edit Turf Info',
                    subtitle: 'Update name, price, hours, amenities',
                    color: const Color(0xFFFF9800),
                    onTap: () => context.push('/admin/edit-turf'),
                    horizontal: true,
                  ),
                ],
              ),
            ),
          ),

          // ── Today's Bookings ──────────────────────────────────────────────────
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
              child: Text(
                "Today's Bookings",
                style: textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
            ),
          ),

          todayBookingsAsync.when(
            loading: () => const SliverToBoxAdapter(
              child: Center(
                  child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(color: AppColors.primary),
              )),
            ),
            error: (e, _) => SliverToBoxAdapter(
              child: Center(
                  child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text('Error: $e'),
              )),
            ),
            data: (bookings) {
              if (bookings.isEmpty) {
                return const SliverToBoxAdapter(
                  child: _EmptyBookings(),
                );
              }
              return SliverList.builder(
                itemCount: bookings.length,
                itemBuilder: (context, i) =>
                    _AdminBookingTile(booking: bookings[i]),
              );
            },
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ],
      ),
    );
  }
}

// ── Supporting Widgets ────────────────────────────────────────────────────────

class _StatsRow extends StatelessWidget {
  final int confirmed;
  final double revenue;
  final int available;
  final int booked;

  const _StatsRow({
    required this.confirmed,
    required this.revenue,
    required this.available,
    required this.booked,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _StatCard(
            label: "Today's\nBookings",
            value: '$confirmed',
            color: AppColors.primary),
        const SizedBox(width: 8),
        _StatCard(
            label: "Revenue\n(Today)",
            value: '₹${revenue.toStringAsFixed(0)}',
            color: const Color(0xFF2196F3)),
        const SizedBox(width: 8),
        _StatCard(
            label: 'Available\nSlots',
            value: '$available',
            color: const Color(0xFF4CAF50)),
        const SizedBox(width: 8),
        _StatCard(
            label: 'Booked\nSlots',
            value: '$booked',
            color: const Color(0xFFFF9800)),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatCard(
      {required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Text(value,
                style: TextStyle(
                    fontSize: 20, fontWeight: FontWeight.w900, color: color)),
            const SizedBox(height: 4),
            Text(label,
                style: TextStyle(
                    fontSize: 10,
                    color: color.withValues(alpha: 0.8),
                    fontWeight: FontWeight.w600),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;
  final bool horizontal;

  const _ActionCard({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.color,
    required this.onTap,
    this.horizontal = false,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: color.withValues(alpha: 0.2)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            )
          ],
        ),
        child: horizontal
            ? Row(
                children: [
                  _iconWidget(color),
                  const SizedBox(width: 14),
                  _textWidget(context),
                ],
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _iconWidget(color),
                  const SizedBox(height: 12),
                  _textWidget(context),
                ],
              ),
      ),
    );
  }

  Widget _iconWidget(Color color) => Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(12)),
        child: Icon(icon, color: color, size: 22),
      );

  Widget _textWidget(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: Theme.of(context)
                  .textTheme
                  .titleSmall
                  ?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 2),
          Text(subtitle,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context)
                      .colorScheme
                      .onSurface
                      .withValues(alpha: 0.5))),
        ],
      );
}

class _AdminBookingTile extends StatelessWidget {
  final Booking booking;
  const _AdminBookingTile({required this.booking});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;
    final sourceColor = booking.bookingSource == BookingSource.app
        ? AppColors.primary
        : const Color(0xFFFF9800);
    final sourceLabel = switch (booking.bookingSource) {
      BookingSource.app => '📱 App',
      BookingSource.walkIn => '🚶 Walk-in',
      BookingSource.phone => '📞 Phone',
      BookingSource.whatsapp => '💬 WhatsApp',
    };

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 3),
          )
        ],
      ),
      child: Row(
        children: [
          // Time column
          Container(
            width: 60,
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Column(
              children: [
                Text(booking.startTime,
                    style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        color: AppColors.primary)),
                Text('—',
                    style: TextStyle(
                        fontSize: 10,
                        color: AppColors.primary.withValues(alpha: 0.6))),
                Text(booking.endTime,
                    style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary)),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(booking.userName,
                    style: textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w700)),
                if (booking.userPhone != null)
                  Text(booking.userPhone!,
                      style: textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.5))),
                const SizedBox(height: 4),
                Text('${booking.sport} • Ground ${booking.groundNumber}',
                    style: textTheme.bodySmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.6))),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: sourceColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(sourceLabel,
                    style: TextStyle(
                        fontSize: 10,
                        color: sourceColor,
                        fontWeight: FontWeight.w700)),
              ),
              const SizedBox(height: 6),
              Text('₹${booking.turfCharge.toStringAsFixed(0)}',
                  style: textTheme.titleSmall?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w800,
                  )),
            ],
          ),
        ],
      ),
    );
  }
}

class _EmptyBookings extends StatelessWidget {
  const _EmptyBookings();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          children: [
            const Text('📅', style: TextStyle(fontSize: 48)),
            const SizedBox(height: 16),
            Text('No bookings today',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text('Add a walk-in booking or wait for app bookings',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context)
                        .colorScheme
                        .onSurface
                        .withValues(alpha: 0.5)),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
