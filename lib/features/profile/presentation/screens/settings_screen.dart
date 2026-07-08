import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _darkMode = false;
  bool _notifications = true;
  bool _bookingAlerts = true;
  bool _promotions = false;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SectionLabel('Appearance'),
            const SizedBox(height: 8),
            _SettingsCard(
              children: [
                _SwitchTile(
                  icon: Icons.dark_mode_outlined,
                  label: 'Dark Mode',
                  sub: 'Switch to dark theme',
                  value: _darkMode,
                  onChanged: (v) => setState(() => _darkMode = v),
                  isLast: true,
                ),
              ],
            ),
            const SizedBox(height: 20),
            const _SectionLabel('Notifications'),
            const SizedBox(height: 8),
            _SettingsCard(
              children: [
                _SwitchTile(
                  icon: Icons.notifications_outlined,
                  label: 'Push Notifications',
                  sub: 'Receive alerts on your device',
                  value: _notifications,
                  onChanged: (v) => setState(() => _notifications = v),
                ),
                _SwitchTile(
                  icon: Icons.alarm_outlined,
                  label: 'Booking Alerts',
                  sub: 'Reminders before your booking',
                  value: _bookingAlerts,
                  onChanged: (v) => setState(() => _bookingAlerts = v),
                ),
                _SwitchTile(
                  icon: Icons.local_offer_outlined,
                  label: 'Promotions & Offers',
                  sub: 'Deals and discounts',
                  value: _promotions,
                  onChanged: (v) => setState(() => _promotions = v),
                  isLast: true,
                ),
              ],
            ),
            const SizedBox(height: 20),
            const _SectionLabel('About'),
            const SizedBox(height: 8),
            _SettingsCard(
              children: [
                const _InfoTile(
                  icon: Icons.info_outline,
                  label: 'App Version',
                  trailing: '1.0.0',
                  showArrow: false,
                ),
                _InfoTile(
                  icon: Icons.privacy_tip_outlined,
                  label: 'Privacy Policy',
                  onTap: () {},
                ),
                _InfoTile(
                  icon: Icons.description_outlined,
                  label: 'Terms of Service',
                  onTap: () {},
                  isLast: true,
                ),
              ],
            ),
            const SizedBox(height: 32),
            Center(
              child: Text(
                'Made with ❤️ by TurfX',
                style: textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurface.withValues(alpha: 0.3),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  final String text;
  const _SectionLabel(this.text);

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color:
                Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.4),
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
          ),
    );
  }
}

class _SettingsCard extends StatelessWidget {
  final List<Widget> children;
  const _SettingsCard({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.hardEdge,
      child: Column(children: children),
    );
  }
}

class _SwitchTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String sub;
  final bool value;
  final ValueChanged<bool> onChanged;
  final bool isLast;

  const _SwitchTile({
    required this.icon,
    required this.label,
    required this.sub,
    required this.value,
    required this.onChanged,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Icon(icon, color: AppColors.primary, size: 22),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label,
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(sub,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color:
                                  colorScheme.onSurface.withValues(alpha: 0.5),
                            )),
                  ],
                ),
              ),
              Switch(
                value: value,
                onChanged: onChanged,
                activeThumbColor: AppColors.primary,
              ),
            ],
          ),
        ),
        if (!isLast)
          Divider(
            height: 1,
            indent: 52,
            color: colorScheme.onSurface.withValues(alpha: 0.08),
          ),
      ],
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? trailing;
  final VoidCallback? onTap;
  final bool showArrow;
  final bool isLast;

  const _InfoTile({
    required this.icon,
    required this.label,
    this.trailing,
    this.onTap,
    this.showArrow = true,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Column(
      children: [
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(
                children: [
                  Icon(icon, color: AppColors.primary, size: 22),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(label,
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                  ),
                  if (trailing != null)
                    Text(trailing!,
                        style: const TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700,
                        )),
                  if (showArrow && trailing == null)
                    Icon(Icons.open_in_new,
                        size: 16,
                        color: colorScheme.onSurface.withValues(alpha: 0.4)),
                ],
              ),
            ),
          ),
        ),
        if (!isLast)
          Divider(
            height: 1,
            indent: 52,
            color: colorScheme.onSurface.withValues(alpha: 0.08),
          ),
      ],
    );
  }
}
