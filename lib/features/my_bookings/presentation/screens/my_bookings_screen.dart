import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/router/route_names.dart';

const _upcoming = [
  {
    'id': '#TRF-20249812',
    'turf': 'Green Arena',
    'location': 'Andheri West',
    'date': 'Today',
    'slot': '6:00 PM — 7:00 PM',
    'amount': '₹967',
    'status': 'Confirmed',
    'sport': 'Football',
  },
  {
    'id': '#TRF-20249756',
    'turf': 'Champions Ground',
    'location': 'Juhu',
    'date': 'Tomorrow',
    'slot': '8:00 AM — 9:00 AM',
    'amount': '₹1,500',
    'status': 'Confirmed',
    'sport': 'Football',
  },
];

const _completed = [
  {
    'id': '#TRF-20249601',
    'turf': 'SportsPlex Central',
    'location': 'Bandra',
    'date': '5 Jun 2025',
    'slot': '4:00 PM — 5:00 PM',
    'amount': '₹1,200',
    'status': 'Completed',
    'sport': 'Cricket',
  },
  {
    'id': '#TRF-20249523',
    'turf': 'Elite Turf Zone',
    'location': 'Powai',
    'date': '2 Jun 2025',
    'slot': '7:00 PM — 8:00 PM',
    'amount': '₹900',
    'status': 'Completed',
    'sport': 'Football',
  },
];

class MyBookingsScreen extends StatelessWidget {
  const MyBookingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('My Bookings'),
          bottom: const TabBar(
            indicatorColor: AppColors.primary,
            labelColor: AppColors.primary,
            tabs: [
              Tab(text: 'Upcoming'),
              Tab(text: 'Completed'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            _BookingList(bookings: _upcoming, isUpcoming: true),
            _BookingList(bookings: _completed, isUpcoming: false),
          ],
        ),
      ),
    );
  }
}

class _BookingList extends StatelessWidget {
  final List<Map<String, dynamic>> bookings;
  final bool isUpcoming;
  const _BookingList({required this.bookings, required this.isUpcoming});

  @override
  Widget build(BuildContext context) {
    if (bookings.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🏟️', style: TextStyle(fontSize: 52)),
            const SizedBox(height: 16),
            Text('No ${isUpcoming ? 'upcoming' : 'completed'} bookings',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: () => context.go(RouteNames.home),
              child: const Text('Book a Turf'),
            ),
          ],
        ),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: bookings.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, i) =>
          _BookingCard(booking: bookings[i], isUpcoming: isUpcoming),
    );
  }
}

class _BookingCard extends StatelessWidget {
  final Map<String, dynamic> booking;
  final bool isUpcoming;
  const _BookingCard({required this.booking, required this.isUpcoming});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: isUpcoming
            ? Border.all(color: AppColors.primary.withValues(alpha: 0.2))
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(Icons.sports_soccer,
                    color: Colors.white, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(booking['turf'] as String,
                        style: textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.w800)),
                    Text(booking['location'] as String,
                        style: textTheme.bodySmall?.copyWith(
                            color: colorScheme.onSurface.withValues(alpha: 0.5))),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isUpcoming
                      ? AppColors.primary.withValues(alpha: 0.12)
                      : Colors.grey.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  booking['status'] as String,
                  style: TextStyle(
                    color: isUpcoming ? AppColors.primary : Colors.grey,
                    fontWeight: FontWeight.w700,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
          const Divider(height: 20),
          Row(
            children: [
              _InfoChip(icon: Icons.calendar_today_outlined,
                  text: booking['date'] as String),
              const SizedBox(width: 16),
              _InfoChip(icon: Icons.schedule_outlined,
                  text: booking['slot'] as String),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                booking['id'] as String,
                style: textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.4)),
              ),
              Text(
                booking['amount'] as String,
                style: textTheme.titleSmall?.copyWith(
                    color: AppColors.primary, fontWeight: FontWeight.w800),
              ),
            ],
          ),
          if (isUpcoming) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {},
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Colors.red),
                  foregroundColor: Colors.red,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Cancel Booking'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoChip({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppColors.primary),
        const SizedBox(width: 4),
        Text(text,
            style: Theme.of(context)
                .textTheme
                .bodySmall
                ?.copyWith(fontWeight: FontWeight.w600)),
      ],
    );
  }
}
