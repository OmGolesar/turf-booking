import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/router/route_names.dart';

const _turfs = [
  {
    'id': '1',
    'name': 'Green Arena',
    'location': 'Andheri West',
    'rating': 4.8,
    'price': 800,
    'sport': 'Football',
    'image': 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=400',
  },
  {
    'id': '2',
    'name': 'SportsPlex Central',
    'location': 'Bandra',
    'rating': 4.6,
    'price': 1200,
    'sport': 'Cricket',
    'image': 'https://images.unsplash.com/photo-1540747913346-19212a4b423d?w=400',
  },
  {
    'id': '3',
    'name': 'Champions Ground',
    'location': 'Juhu',
    'rating': 4.9,
    'price': 1500,
    'sport': 'Football',
    'image': 'https://images.unsplash.com/photo-1486286701208-1d58e9338013?w=400',
  },
  {
    'id': '4',
    'name': 'Elite Turf Zone',
    'location': 'Powai',
    'rating': 4.7,
    'price': 900,
    'sport': 'Football',
    'image': 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400',
  },
  {
    'id': '5',
    'name': 'City Play Arena',
    'location': 'Goregaon',
    'rating': 4.5,
    'price': 700,
    'sport': 'Basketball',
    'image': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400',
  },
  {
    'id': '6',
    'name': 'Prime Sports Hub',
    'location': 'Malad',
    'rating': 4.6,
    'price': 850,
    'sport': 'Cricket',
    'image': 'https://images.unsplash.com/photo-1562077772-3bd90403f7f0?w=400',
  },
];

const _sports = ['All', 'Football', 'Cricket', 'Basketball', 'Tennis', 'Badminton'];

class TurfListingScreen extends StatefulWidget {
  final String? initialCategory;
  const TurfListingScreen({super.key, this.initialCategory});

  @override
  State<TurfListingScreen> createState() => _TurfListingScreenState();
}

class _TurfListingScreenState extends State<TurfListingScreen> {
  String _selectedSport = 'All';
  String _sortBy = 'Rating';

  @override
  void initState() {
    super.initState();
    if (widget.initialCategory != null &&
        _sports.contains(widget.initialCategory)) {
      _selectedSport = widget.initialCategory!;
    }
  }

  List<Map<String, dynamic>> get _filtered {
    var list = _turfs.cast<Map<String, dynamic>>();
    if (_selectedSport != 'All') {
      list = list.where((t) => t['sport'] == _selectedSport).toList();
    }
    if (_sortBy == 'Price ↑') {
      list = [...list]
        ..sort((a, b) => (a['price'] as int).compareTo(b['price'] as int));
    } else if (_sortBy == 'Price ↓') {
      list = [...list]
        ..sort((a, b) => (b['price'] as int).compareTo(a['price'] as int));
    } else {
      list = [...list]
        ..sort((a, b) =>
            (b['rating'] as double).compareTo(a['rating'] as double));
    }
    return list;
  }

  void _showSort() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text('Sort By',
                    style: Theme.of(context)
                        .textTheme
                        .titleLarge
                        ?.copyWith(fontWeight: FontWeight.w800)),
                const Spacer(),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ...['Rating', 'Price ↑', 'Price ↓'].map((s) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(s,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  trailing: _sortBy == s
                      ? const Icon(Icons.check_circle_rounded,
                          color: AppColors.primary)
                      : const Icon(Icons.radio_button_unchecked,
                          color: Colors.grey),
                  onTap: () {
                    setState(() => _sortBy = s);
                    Navigator.pop(context);
                  },
                )),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final turfs = _filtered;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Find Turfs'),
        actions: [
          InkWell(
            onTap: _showSort,
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              child: Row(
                children: [
                  const Icon(Icons.sort_rounded, size: 18,
                      color: AppColors.primary),
                  const SizedBox(width: 4),
                  Text(_sortBy,
                      style: const TextStyle(
                          color: AppColors.primary, fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // ── Sport Filter Chips ──────────────────────────────
          SizedBox(
            height: 52,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: _sports.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final selected = _selectedSport == _sports[i];
                return ChoiceChip(
                  label: Text(_sports[i]),
                  selected: selected,
                  selectedColor: AppColors.primary,
                  labelStyle: TextStyle(
                    color: selected ? Colors.white : null,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                  onSelected: (_) =>
                      setState(() => _selectedSport = _sports[i]),
                );
              },
            ),
          ),

          // ── Results count ────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: [
                Text(
                  '${turfs.length} turf${turfs.length != 1 ? 's' : ''} found',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context)
                            .colorScheme
                            .onSurface
                            .withValues(alpha: 0.5),
                      ),
                ),
              ],
            ),
          ),

          // ── Turf List ────────────────────────────────────────
          Expanded(
            child: turfs.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('🏟️',
                            style: TextStyle(fontSize: 48)),
                        const SizedBox(height: 12),
                        Text('No turfs found for "$_selectedSport"'),
                        const SizedBox(height: 8),
                        TextButton(
                          onPressed: () =>
                              setState(() => _selectedSport = 'All'),
                          child: const Text('Clear Filter'),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                    itemCount: turfs.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 14),
                    itemBuilder: (context, i) =>
                        _TurfListCard(turf: turfs[i]),
                  ),
          ),
        ],
      ),
    );
  }
}

class _TurfListCard extends StatelessWidget {
  final Map<String, dynamic> turf;
  const _TurfListCard({required this.turf});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return GestureDetector(
      onTap: () => context.go(RouteNames.turfDetailPath(turf['id'] as String)),
      child: Container(
        decoration: BoxDecoration(
          color: colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.07),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.hardEdge,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image with price badge
            Stack(
              children: [
                SizedBox(
                  height: 180,
                  width: double.infinity,
                  child: Image.network(
                    turf['image'] as String,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: AppColors.primary.withValues(alpha: 0.12),
                      child: const Center(
                        child: Icon(Icons.sports_soccer,
                            size: 64, color: AppColors.primary),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 12,
                  right: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      gradient: AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '₹${turf['price']}/hr',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // Details
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Name + Rating
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          turf['name'] as String,
                          style: textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Row(
                        children: [
                          const Icon(Icons.star_rounded,
                              color: Colors.amber, size: 16),
                          const SizedBox(width: 2),
                          Text(
                            '${turf['rating']}',
                            style: textTheme.bodyMedium
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  // Location + Sport
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined,
                          size: 14, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        turf['location'] as String,
                        style: textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.5),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          turf['sport'] as String,
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Book button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => context.go(
                        RouteNames.turfDetailPath(turf['id'] as String),
                      ),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: const Text('View & Book'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
