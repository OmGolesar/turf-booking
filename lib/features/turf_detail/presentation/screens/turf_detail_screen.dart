import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/turfx_widgets.dart';

/// Turf Detail (Dark) — Figma spec.
class TurfDetailScreen extends StatelessWidget {
  final String turfId;
  const TurfDetailScreen({super.key, required this.turfId});

  static const _heroImage =
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80';

  static const _amenities = [
    _Amenity(Icons.wb_incandescent_outlined, 'Floodlights'),
    _Amenity(Icons.directions_car_outlined, 'Parking'),
    _Amenity(Icons.meeting_room_outlined, 'Changing'),
    _Amenity(Icons.shower_outlined, 'Showers'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              _buildHero(context),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 200),
                sliver: SliverList.list(
                  children: [
                    Text('Amenities',
                        style: AppTypography.h2
                            .copyWith(color: AppColors.textPrimary)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        for (var i = 0; i < _amenities.length; i++) ...[
                          Expanded(child: _AmenityTile(item: _amenities[i])),
                          if (i != _amenities.length - 1)
                            const SizedBox(width: 8),
                        ],
                      ],
                    ),
                    const SizedBox(height: 24),
                    Text('About the Turf',
                        style: AppTypography.h2
                            .copyWith(color: AppColors.textPrimary)),
                    const SizedBox(height: 12),
                    Text(
                      'Central Arena is a state-of-the-art 5-a-side artificial grass '
                      'facility located in the heart of the city. Featuring '
                      'professional-grade floodlighting, premium turf quality, '
                      'and modern locker rooms. Perfect for evening leagues '
                      'and casual competitive matches.',
                      style: AppTypography.bodyXsLong.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: GestureDetector(
                        onTap: () {},
                        child: Text(
                          'Read More ˅',
                          style: AppTypography.labelMdCta.copyWith(
                            color: AppColors.accentGreen,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    Text('Location',
                        style: AppTypography.h2
                            .copyWith(color: AppColors.textPrimary)),
                    const SizedBox(height: 12),
                    Container(
                      height: 190,
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: AppColors.border, width: 1),
                        image: const DecorationImage(
                          image: NetworkImage(
                            'https://maps.googleapis.com/maps/api/staticmap?center=Downtown&zoom=14&size=600x300&maptype=roadmap',
                          ),
                          fit: BoxFit.cover,
                          opacity: 0.6,
                        ),
                      ),
                      child: Stack(
                        children: [
                          const Center(
                            child: Icon(Icons.location_on,
                                color: AppColors.primary, size: 40),
                          ),
                          Positioned(
                            bottom: 8,
                            right: 8,
                            child: TurfRoundIconButton(
                              icon: Icons.open_in_new_rounded,
                              onPressed: () {},
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '124 Arena Blvd, Downtown District\nOpen today: 06:00 - 23:00',
                      style: AppTypography.bodyXs
                          .copyWith(color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Top overlay bar (back + heart)
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 20,
            right: 20,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TurfRoundIconButton(
                  icon: Icons.arrow_back_rounded,
                  onPressed: () => context.pop(),
                ),
                TurfRoundIconButton(
                  icon: Icons.favorite_border_rounded,
                  onPressed: () {},
                ),
              ],
            ),
          ),

          // Bottom booking action bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              child: Container(
                decoration: const BoxDecoration(
                  color: AppColors.surfaceAlt,
                  border: Border(
                    top: BorderSide(color: AppColors.border, width: 1),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Color(0x33000000),
                      blurRadius: 20,
                      offset: Offset(0, -4),
                    ),
                  ],
                ),
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                child: Row(
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Starting from',
                            style: AppTypography.bodyXs
                                .copyWith(color: AppColors.textSecondary)),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('\$45',
                                style: AppTypography.displayLg.copyWith(
                                  color: AppColors.textPrimary,
                                )),
                            Padding(
                              padding: const EdgeInsets.only(bottom: 6, left: 2),
                              child: Text('/hour',
                                  style: AppTypography.bodyXs.copyWith(
                                    color: AppColors.textSecondary,
                                  )),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const Spacer(),
                    TurfPrimaryButton(
                      label: 'Select Date & Slot',
                      fullWidth: false,
                      onPressed: () => context.go(
                        '${RouteNames.slotSelection}?turfId=$turfId&date=',
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHero(BuildContext context) {
    return SliverToBoxAdapter(
      child: SizedBox(
        height: 480,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.network(
              _heroImage,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                color: AppColors.surface,
                child: const Icon(Icons.sports_soccer_rounded,
                    size: 80, color: AppColors.primary),
              ),
            ),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: AppColors.detailHeroOverlay,
              ),
            ),
            Positioned(
              left: 20,
              right: 20,
              bottom: 24,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primaryTint,
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(
                              color: AppColors.primaryTintStrong, width: 1),
                        ),
                        child: Text(
                          'PREMIUM',
                          style: AppTypography.labelMdCta.copyWith(
                            color: AppColors.accentGreen,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      const TurfRatingChip(rating: 4.9, reviewCount: 128),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text('Central Arena',
                      style: AppTypography.displayLg
                          .copyWith(color: AppColors.textPrimary)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined,
                          size: 13, color: AppColors.textSecondary),
                      const SizedBox(width: 4),
                      Text('Downtown District, 2.5km away',
                          style: AppTypography.bodyXs.copyWith(
                              color: AppColors.textSecondary)),
                    ],
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

class _Amenity {
  final IconData icon;
  final String label;
  const _Amenity(this.icon, this.label);
}

class _AmenityTile extends StatelessWidget {
  const _AmenityTile({required this.item});
  final _Amenity item;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(color: AppColors.border, width: 1),
      ),
      child: Column(
        children: [
          Icon(item.icon, size: 20, color: AppColors.accentGreen),
          const SizedBox(height: 8),
          Text(
            item.label,
            style: AppTypography.labelXxs.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
