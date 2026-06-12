import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/router/route_names.dart';

const _slots = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM',
  '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM',
  '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM',
];
const _bookedSlots = {'8:00 AM', '4:00 PM', '8:00 PM'};

class SlotSelectionScreen extends StatefulWidget {
  final String turfId;
  final String date;
  const SlotSelectionScreen(
      {super.key, required this.turfId, required this.date});

  @override
  State<SlotSelectionScreen> createState() => _SlotSelectionScreenState();
}

class _SlotSelectionScreenState extends State<SlotSelectionScreen> {
  final Set<String> _selected = {};

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Select Slots')),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Pick Your Time Slots',
                    style: textTheme.headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                Text(
                  widget.date.isEmpty ? 'Today' : widget.date,
                  style: textTheme.bodyMedium?.copyWith(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 16),
                // Legend
                Row(
                  children: [
                    _Legend(color: AppColors.primary.withValues(alpha: 0.15), label: 'Available'),
                    const SizedBox(width: 16),
                    _Legend(
                        color: colorScheme.onSurface.withValues(alpha: 0.1),
                        label: 'Booked'),
                    const SizedBox(width: 16),
                    _Legend(color: AppColors.primary, label: 'Selected'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                childAspectRatio: 2.2,
                mainAxisSpacing: 10,
                crossAxisSpacing: 10,
              ),
              itemCount: _slots.length,
              itemBuilder: (context, i) {
                final slot = _slots[i];
                final isBooked = _bookedSlots.contains(slot);
                final isSelected = _selected.contains(slot);

                Color bgColor;
                Color textColor;
                if (isBooked) {
                  bgColor = colorScheme.onSurface.withValues(alpha: 0.08);
                  textColor = colorScheme.onSurface.withValues(alpha: 0.3);
                } else if (isSelected) {
                  bgColor = AppColors.primary;
                  textColor = Colors.white;
                } else {
                  bgColor = AppColors.primary.withValues(alpha: 0.12);
                  textColor = AppColors.primary;
                }

                return GestureDetector(
                  onTap: isBooked
                      ? null
                      : () {
                          setState(() {
                            if (isSelected) {
                              _selected.remove(slot);
                            } else {
                              _selected.add(slot);
                            }
                          });
                        },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    decoration: BoxDecoration(
                      color: bgColor,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.3),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              )
                            ]
                          : null,
                    ),
                    child: Center(
                      child: Text(
                        slot,
                        style: TextStyle(
                          color: textColor,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          decoration:
                              isBooked ? TextDecoration.lineThrough : null,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          // Bottom bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                if (_selected.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      children: [
                        Text('${_selected.length} slot(s) selected  •  ',
                            style: textTheme.bodyMedium),
                        Text(
                          '₹${800 * _selected.length}',
                          style: textTheme.bodyMedium?.copyWith(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ],
                    ),
                  ),
                GestureDetector(
                  onTap: _selected.isEmpty
                      ? null
                      : () => context.go(RouteNames.bookingSummary),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      gradient: _selected.isEmpty
                          ? const LinearGradient(
                              colors: [Colors.grey, Colors.grey])
                          : AppColors.primaryGradient,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Center(
                      child: Text(
                        _selected.isEmpty
                            ? 'Select at least one slot'
                            : 'Continue to Summary →',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Legend extends StatelessWidget {
  final Color color;
  final String label;
  const _Legend({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(width: 14, height: 14,
            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4))),
        const SizedBox(width: 6),
        Text(label, style: Theme.of(context).textTheme.bodySmall),
      ],
    );
  }
}
