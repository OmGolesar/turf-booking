import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/turfx_widgets.dart';
import '../../../turf_detail/domain/entities/time_slot.dart';
import '../../../turf_detail/domain/entities/turf_detail.dart';
import '../../../turf_detail/presentation/providers/turf_detail_provider.dart';
import '../providers/booking_provider.dart';

const _months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const _dow = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/// Date & Slot Selection (Dark) — Figma spec, live-wired to Firestore.
class SlotSelectionScreen extends ConsumerStatefulWidget {
  final String turfId;
  final String date;
  const SlotSelectionScreen({
    super.key,
    required this.turfId,
    required this.date,
  });

  @override
  ConsumerState<SlotSelectionScreen> createState() =>
      _SlotSelectionScreenState();
}

class _SlotSelectionScreenState extends ConsumerState<SlotSelectionScreen> {
  late DateTime _selectedDate;
  late final List<DateTime> _dateItems;

  @override
  void initState() {
    super.initState();
    final today = DateTime.now();
    _dateItems = List.generate(
      7,
      (i) => DateTime(today.year, today.month, today.day + i),
    );
    _selectedDate = _dateItems.first;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(bookingNotifierProvider.notifier)
        ..clearSlots()
        ..setTurf(widget.turfId)
        ..setDate(_isoDate(_selectedDate));
    });
  }

  String _isoDate(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String _fmt12h(String hhmm) {
    final parts = hhmm.split(':');
    if (parts.length < 2) return hhmm;
    final h = int.tryParse(parts[0]) ?? 0;
    final m = parts[1];
    final period = h >= 12 ? 'PM' : 'AM';
    final h12 = h > 12 ? h - 12 : (h == 0 ? 12 : h);
    return '$h12:$m $period';
  }

  @override
  Widget build(BuildContext context) {
    final detail = ref.watch(turfDetailProvider(widget.turfId));
    final slotsAsync = ref.watch(turfSlotsStreamProvider(
      (turfId: widget.turfId, date: _isoDate(_selectedDate)),
    ));
    final bookingState = ref.watch(bookingNotifierProvider);
    final selectedIds = bookingState.selectedSlotIds;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Stack(
        children: [
          CustomScrollView(
            slivers: [
              SliverAppBar(
                pinned: true,
                backgroundColor: AppColors.bg,
                elevation: 0,
                toolbarHeight: 64,
                leading: Padding(
                  padding: const EdgeInsets.only(left: 20),
                  child: TurfRoundIconButton(
                    icon: Icons.arrow_back_rounded,
                    background: AppColors.surface,
                    onPressed: () => context.canPop()
                        ? context.pop()
                        : context.go(RouteNames.home),
                  ),
                ),
                centerTitle: true,
                title: Text(
                  'Pick Date & Slot',
                  style:
                      AppTypography.h2.copyWith(color: AppColors.textPrimary),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 140),
                sliver: SliverList.list(
                  children: [
                    _buildSummaryCard(detail),
                    const SizedBox(height: 24),
                    _buildDatePicker(),
                    const SizedBox(height: 24),
                    _buildAvailableSlotsHeader(),
                    const SizedBox(height: 16),
                    ...slotsAsync.when(
                      data: (slots) => _buildSlotSections(slots, selectedIds),
                      loading: () => const [
                        Padding(
                          padding: EdgeInsets.symmetric(vertical: 40),
                          child: Center(
                            child: CircularProgressIndicator(
                                color: AppColors.primary),
                          ),
                        ),
                      ],
                      error: (e, _) => [
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 40),
                          child: Center(
                            child: Text(
                              'Could not load slots.',
                              style: AppTypography.bodyMd.copyWith(
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Bottom action bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: SafeArea(
              child: Container(
                decoration: const BoxDecoration(
                  color: AppColors.overlayScrim,
                  border: Border(
                    top: BorderSide(color: AppColors.divider, width: 1),
                  ),
                ),
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
                child: TurfPrimaryButton(
                  label: selectedIds.isEmpty
                      ? 'Select a Slot'
                      : 'Confirm Selection (${selectedIds.length})',
                  onPressed: selectedIds.isEmpty
                      ? null
                      : () => context.push(RouteNames.bookingSummary),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard(AsyncValue<TurfDetail> detail) {
    return TurfElevatedCard(
      fillColor: AppColors.bgDeep,
      borderColor: AppColors.divider,
      radius: 18,
      child: detail.when(
        data: (turf) => Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(turf.name,
                      style: AppTypography.h2.copyWith(
                        color: AppColors.textPrimary,
                      )),
                  const SizedBox(height: 4),
                  Text(
                    turf.sports.isNotEmpty
                        ? turf.sports.join(' · ')
                        : 'Synthetic Pitch',
                    style: AppTypography.bodyXs.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(Formatters.price(turf.pricePerHour),
                    style: AppTypography.h2.copyWith(
                      color: AppColors.accentGreenBright,
                    )),
                Text('/hr',
                    style: AppTypography.bodyXs.copyWith(
                      color: AppColors.textSecondary,
                    )),
              ],
            ),
          ],
        ),
        loading: () => const SizedBox(
          height: 44,
          child: Center(
            child: SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                  strokeWidth: 2, color: AppColors.primary),
            ),
          ),
        ),
        error: (_, __) => Text(
          'Turf info unavailable',
          style: AppTypography.bodyMd.copyWith(color: AppColors.textSecondary),
        ),
      ),
    );
  }

  Widget _buildDatePicker() {
    final month = _months[_selectedDate.month - 1];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4),
          child: Text('$month ${_selectedDate.year}',
              style: AppTypography.h2.copyWith(color: AppColors.textPrimary)),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 88,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.zero,
            itemCount: _dateItems.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, i) {
              final d = _dateItems[i];
              final active = d.day == _selectedDate.day &&
                  d.month == _selectedDate.month &&
                  d.year == _selectedDate.year;
              return GestureDetector(
                onTap: () {
                  setState(() => _selectedDate = d);
                  ref.read(bookingNotifierProvider.notifier)
                    ..clearSlots()
                    ..setDate(_isoDate(d));
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  width: 72,
                  height: 88,
                  decoration: BoxDecoration(
                    color: active ? AppColors.primary : AppColors.bgDeep,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    border: Border.all(
                      color: active ? Colors.transparent : AppColors.divider,
                      width: 1,
                    ),
                    boxShadow: active
                        ? [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.4),
                              blurRadius: 14,
                              offset: const Offset(0, 4),
                            )
                          ]
                        : null,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _dow[d.weekday - 1],
                        style: AppTypography.labelMdCtaUpper.copyWith(
                          color: active
                              ? AppColors.accentGreenBright
                              : AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        d.day.toString().padLeft(2, '0'),
                        style: AppTypography.h2.copyWith(
                          color: active
                              ? AppColors.onPrimary
                              : AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildAvailableSlotsHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text('Available Slots',
            style: AppTypography.h2.copyWith(color: AppColors.textPrimary)),
        Row(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: const BoxDecoration(
                color: AppColors.divider,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Text('BOOKED',
                style: AppTypography.labelMdCtaUpper.copyWith(
                  color: AppColors.textSecondary,
                )),
          ],
        ),
      ],
    );
  }

  List<Widget> _buildSlotSections(
      List<TimeSlot> slots, Set<String> selectedIds) {
    if (slots.isEmpty) {
      return [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 40),
          child: Center(
            child: Text(
              'No slots available for this date.',
              style:
                  AppTypography.bodyMd.copyWith(color: AppColors.textSecondary),
            ),
          ),
        ),
      ];
    }

    // De-dup by startTime — pick the first available slot per hour (across grounds)
    final byHour = <String, TimeSlot>{};
    for (final s in slots) {
      final existing = byHour[s.startTime];
      if (existing == null) {
        byHour[s.startTime] = s;
      } else if (existing.isBooked && s.isAvailable) {
        byHour[s.startTime] = s;
      }
    }
    final unique = byHour.values.toList()
      ..sort((a, b) => a.startTime.compareTo(b.startTime));

    final morning = <TimeSlot>[];
    final afternoon = <TimeSlot>[];
    final evening = <TimeSlot>[];
    for (final s in unique) {
      final h = int.tryParse(s.startTime.split(':').first) ?? 0;
      if (h < 12) {
        morning.add(s);
      } else if (h < 17) {
        afternoon.add(s);
      } else {
        evening.add(s);
      }
    }

    final widgets = <Widget>[];
    void addGroup(String label, List<TimeSlot> group) {
      if (group.isEmpty) return;
      widgets.add(_buildSlotGroup(label, group, selectedIds));
      widgets.add(const SizedBox(height: 16));
    }

    addGroup('MORNING', morning);
    addGroup('AFTERNOON', afternoon);
    addGroup('EVENING', evening);
    return widgets;
  }

  Widget _buildSlotGroup(
      String label, List<TimeSlot> slots, Set<String> selectedIds) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label,
            style: AppTypography.labelMdCtaUpper.copyWith(
              color: AppColors.textSecondary,
            )),
        const SizedBox(height: 8),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          padding: EdgeInsets.zero,
          crossAxisCount: 3,
          crossAxisSpacing: 8,
          mainAxisSpacing: 8,
          childAspectRatio: 110 / 48,
          children: slots.map((s) => _slotCell(s, selectedIds)).toList(),
        ),
      ],
    );
  }

  Widget _slotCell(TimeSlot slot, Set<String> selectedIds) {
    final isAvailable = slot.isAvailable;
    final isSelected = selectedIds.contains(slot.id);

    Color bg;
    Color textColor;
    Color? borderColor;
    if (!isAvailable) {
      bg = AppColors.surfaceDim;
      textColor = AppColors.textDisabled;
      borderColor = null;
    } else if (isSelected) {
      bg = AppColors.primary;
      textColor = AppColors.onPrimary;
      borderColor = null;
    } else {
      bg = AppColors.bgDeep;
      textColor = AppColors.textPrimary;
      borderColor = AppColors.divider;
    }

    return GestureDetector(
      onTap: !isAvailable
          ? null
          : () {
              ref.read(bookingNotifierProvider.notifier).toggleSlot(slot.id);
              ref.read(bookingNotifierProvider.notifier).setSport(slot.sport);
            },
      child: Container(
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: borderColor != null
              ? Border.all(color: borderColor, width: 1)
              : null,
        ),
        alignment: Alignment.center,
        child: Text(
          _fmt12h(slot.startTime),
          style: AppTypography.bodyXs.copyWith(
            color: textColor,
            fontWeight: isSelected ? FontWeight.w600 : null,
          ),
        ),
      ),
    );
  }
}
