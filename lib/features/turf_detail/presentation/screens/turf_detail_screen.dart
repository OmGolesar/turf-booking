import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/turfx_widgets.dart';
import '../../domain/entities/turf_detail.dart';
import '../providers/turf_detail_provider.dart';

/// Turf Detail (Dark) — Figma spec, live-wired to Firestore.
class TurfDetailScreen extends ConsumerWidget {
  final String turfId;
  const TurfDetailScreen({super.key, required this.turfId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(turfDetailProvider(turfId));
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: detail.when(
        loading: () => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Text(
              'Could not load turf.\n$e',
              textAlign: TextAlign.center,
              style:
                  AppTypography.bodyMd.copyWith(color: AppColors.textSecondary),
            ),
          ),
        ),
        data: (turf) => _buildContent(context, turf),
      ),
    );
  }

  Widget _buildContent(BuildContext context, TurfDetail turf) {
    final heroImage = turf.images.isNotEmpty
        ? turf.images.first
        : 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80';

    return Stack(
      children: [
        CustomScrollView(
          slivers: [
            _buildHero(context, turf, heroImage),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 200),
              sliver: SliverList.list(
                children: [
                  Text('Amenities',
                      style: AppTypography.h2
                          .copyWith(color: AppColors.textPrimary)),
                  const SizedBox(height: 12),
                  _buildAmenities(turf.amenities),
                  const SizedBox(height: 24),
                  Text('About the Turf',
                      style: AppTypography.h2
                          .copyWith(color: AppColors.textPrimary)),
                  const SizedBox(height: 12),
                  Text(
                    turf.description.isNotEmpty
                        ? turf.description
                        : '${turf.name} — a premium turf facility.',
                    style: AppTypography.bodyXsLong.copyWith(
                      color: AppColors.textSecondary,
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
                    '${turf.address}\nOpen today: ${turf.openTime} - ${turf.closeTime}',
                    style: AppTypography.bodyXs
                        .copyWith(color: AppColors.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),

        // Top overlay bar
        Positioned(
          top: MediaQuery.of(context).padding.top + 8,
          left: 20,
          right: 20,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TurfRoundIconButton(
                icon: Icons.arrow_back_rounded,
                onPressed: () => context.canPop()
                    ? context.pop()
                    : context.go(RouteNames.home),
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
                          Text(Formatters.price(turf.pricePerHour),
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
                    onPressed: () => context.push(
                      '${RouteNames.slotSelection}?turfId=$turfId&date=',
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAmenities(List<String> amenities) {
    if (amenities.isEmpty) {
      return Text(
        'Amenity info coming soon.',
        style: AppTypography.bodyXs.copyWith(color: AppColors.textSecondary),
      );
    }
    final tiles = amenities.take(4).toList();
    return Row(
      children: [
        for (var i = 0; i < tiles.length; i++) ...[
          Expanded(child: _AmenityTile(label: tiles[i])),
          if (i != tiles.length - 1) const SizedBox(width: 8),
        ],
      ],
    );
  }

  Widget _buildHero(BuildContext context, TurfDetail turf, String heroImage) {
    return SliverToBoxAdapter(
      child: SizedBox(
        height: 480,
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.network(
              heroImage,
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
                      if (turf.isVerified)
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
                            'VERIFIED',
                            style: AppTypography.labelMdCta.copyWith(
                              color: AppColors.accentGreen,
                            ),
                          ),
                        ),
                      if (turf.isVerified) const SizedBox(width: 8),
                      TurfRatingChip(
                          rating: turf.rating, reviewCount: turf.reviewCount),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(turf.name,
                      style: AppTypography.displayLg
                          .copyWith(color: AppColors.textPrimary)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined,
                          size: 13, color: AppColors.textSecondary),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(turf.location,
                            style: AppTypography.bodyXs
                                .copyWith(color: AppColors.textSecondary)),
                      ),
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

IconData _amenityIcon(String label) {
  final l = label.toLowerCase();
  if (l.contains('flood') || l.contains('light')) {
    return Icons.wb_incandescent_outlined;
  }
  if (l.contains('park')) return Icons.directions_car_outlined;
  if (l.contains('chang')) return Icons.meeting_room_outlined;
  if (l.contains('shower')) return Icons.shower_outlined;
  if (l.contains('wash') || l.contains('toilet')) return Icons.wc_outlined;
  if (l.contains('water') || l.contains('drink'))
    return Icons.local_drink_outlined;
  if (l.contains('seat')) return Icons.event_seat_outlined;
  if (l.contains('score')) return Icons.scoreboard_outlined;
  if (l.contains('wifi')) return Icons.wifi_rounded;
  if (l.contains('cafe') || l.contains('food'))
    return Icons.restaurant_outlined;
  return Icons.check_circle_outline_rounded;
}

class _AmenityTile extends StatelessWidget {
  const _AmenityTile({required this.label});
  final String label;

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
          Icon(_amenityIcon(label), size: 20, color: AppColors.accentGreen),
          const SizedBox(height: 8),
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: AppTypography.labelXxs.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
