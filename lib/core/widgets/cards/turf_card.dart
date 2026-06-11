import 'package:flutter/material.dart';

/// Reusable turf card widget for TurfX.
///
/// Displays turf thumbnail, name, location, rating, and price.
/// Used in home (nearby/popular) and listing screens.
class TurfCard extends StatelessWidget {
  final String name;
  final String location;
  final String imageUrl;
  final double rating;
  final String price;
  final VoidCallback? onTap;
  final bool isCompact;

  const TurfCard({
    super.key,
    required this.name,
    required this.location,
    required this.imageUrl,
    required this.rating,
    required this.price,
    this.onTap,
    this.isCompact = false,
  });

  @override
  Widget build(BuildContext context) {
    // TODO: Implement full design in Step 3
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name, style: Theme.of(context).textTheme.titleMedium),
              Text(location, style: Theme.of(context).textTheme.bodySmall),
              Text(price, style: Theme.of(context).textTheme.titleSmall),
            ],
          ),
        ),
      ),
    );
  }
}
