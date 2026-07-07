import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/route_names.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radius.dart';
import '../../../../core/theme/app_typography.dart';
import '../../../../core/widgets/turfx_widgets.dart';

/// Date & Slot Selection (Dark) — Figma spec.
class SlotSelectionScreen extends StatefulWidget {
  final String turfId;
  final String date;
  const SlotSelectionScreen({
    super.key,
    required this.turfId,
    required this.date,
  });

  @override
  State<SlotSelectionScreen> createState() => _SlotSelectionScreenState();
}

class _SlotSelectionScreenState extends State<SlotSelectionScreen> {
  int _selectedDate = 1; // 0..6 (default TUE 17)
  final Set<String> _selectedSlots = {'05:00 PM', '06:00 PM'};

  static const _bookedSlots = {'08:00 AM', '03:00 PM'};

  static const _dateItems = [
    _DateItem('MON', '16'),
    _DateItem('TUE', '17'),
    _DateItem('WED', '18'),
    _DateItem('THU', '19'),
    _DateItem('FRI', '20'),
    _DateItem('SAT', '21'),
    _DateItem('SUN', '22'),
  ];

  static const _morning = [
    '06:00 AM', '07:00 AM', '08:00 AM',
    '09:00 AM', '10:00 AM', '11:00 AM',
  ];
  static const _afternoon = [
    '12:00 PM', '01:00 PM', '02:00 PM',
    '03:00 PM', '04:00 PM',
  ];
  static const _evening = [
    '05:00 PM', '06:00 PM', '07:00 PM',
    '08:00 PM', '09:00 PM',
  ];

  @override
  Widget build(BuildContext context) {
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
                    onPressed: () => context.pop(),
                  ),
                ),
                centerTitle: true,
                title: Text(
                  'Pick Date & Slot',
                  style: AppTypography.h2
                      .copyWith(color: AppColors.textPrimary),
                ),
              ),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 140),
                sliver: SliverList.list(
                  children: [
                    _buildSummaryCard(),
                    const SizedBox(height: 24),
                    _buildDatePicker(),
                    const SizedBox(height: 24),
                    _buildAvailableSlotsHeader(),
                    const SizedBox(height: 16),
                    _buildSlotGroup('MORNING', _morning),
                    const SizedBox(height: 16),
                    _buildSlotGroup('AFTERNOON', _afternoon),
                    const SizedBox(height: 16),
                    _buildSlotGroup('EVENING', _evening),
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
                  label: _selectedSlots.isEmpty
                      ? 'Select a Slot'
                      : 'Confirm Selection',
                  onPressed: _selectedSlots.isEmpty
                      ? null
                      : () => context.go(RouteNames.bookingSummary),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard() {
    return TurfElevatedCard(
      fillColor: AppColors.bgDeep,
      borderColor: AppColors.divider,
      radius: 18,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Downtown Premium Turf',
                    style: AppTypography.h2.copyWith(
                      color: AppColors.textPrimary,
                    )),
                const SizedBox(height: 4),
                Text('5v5 Synthetic Pitch',
                    style: AppTypography.bodyXs.copyWith(
                      color: AppColors.textSecondary,
                    )),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('\$45',
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
    );
  }

  Widget _buildDatePicker() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4),
          child: Text('October 2023',
              style: AppTypography.h2
                  .copyWith(color: AppColors.textPrimary)),
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
              final active = i == _selectedDate;
              return GestureDetector(
                onTap: () => setState(() => _selectedDate = i),
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
                        _dateItems[i].dow,
                        style: AppTypography.labelMdCtaUpper.copyWith(
                          color: active
                              ? AppColors.accentGreenBright
                              : AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _dateItems[i].day,
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

  Widget _buildSlotGroup(String label, List<String> slots) {
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
          children: slots.map(_slotCell).toList(),
        ),
      ],
    );
  }

  Widget _slotCell(String slot) {
    final isBooked = _bookedSlots.contains(slot);
    final isSelected = _selectedSlots.contains(slot);

    Color bg;
    Color textColor;
    Color? borderColor;
    if (isBooked) {
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
      onTap: isBooked
          ? null
          : () => setState(() {
                if (isSelected) {
                  _selectedSlots.remove(slot);
                } else {
                  _selectedSlots.add(slot);
                }
              }),
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
          slot,
          style: AppTypography.bodyXs.copyWith(
            color: textColor,
            fontWeight: isSelected ? FontWeight.w600 : null,
          ),
        ),
      ),
    );
  }
}

class _DateItem {
  final String dow;
  final String day;
  const _DateItem(this.dow, this.day);
}
