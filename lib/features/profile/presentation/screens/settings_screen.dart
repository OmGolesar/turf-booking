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

    Widget sectionHeader(String title) => Padding(
          padding: const EdgeInsets.fromLTRB(4, 20, 0, 8),
          child: Text(
            title.toUpperCase(),
            style: textTheme.labelSmall?.copyWith(
              color: colorScheme.onSurface.withValues(alpha: 0.4),
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
        );

    Widget switchTile(String label, String sub, bool value,
            ValueChanged<bool> onChanged) =>
        Container(
          margin: const EdgeInsets.only(bottom: 2),
          child: SwitchListTile(
            title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
            subtitle: Text(sub,
                style: textTheme.bodySmall?.copyWith(
                    color: colorScheme.onSurface.withValues(alpha: 0.5))),
            value: value,
            activeColor: AppColors.primary,
            onChanged: onChanged,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            tileColor: colorScheme.surface,
          ),
        );

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            sectionHeader('Appearance'),
            switchTile('Dark Mode', 'Switch to dark theme', _darkMode,
                (v) => setState(() => _darkMode = v)),

            sectionHeader('Notifications'),
            switchTile('Push Notifications', 'Receive alerts on your device',
                _notifications, (v) => setState(() => _notifications = v)),
            switchTile('Booking Alerts', 'Reminders before your booking',
                _bookingAlerts, (v) => setState(() => _bookingAlerts = v)),
            switchTile('Promotions & Offers', 'Deals and discounts',
                _promotions, (v) => setState(() => _promotions = v)),

            sectionHeader('About'),
            Container(
              decoration: BoxDecoration(
                color: colorScheme.surface,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.05),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.info_outline, color: AppColors.primary),
                    title: const Text('App Version', style: TextStyle(fontWeight: FontWeight.w600)),
                    trailing: const Text('1.0.0', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  const Divider(height: 1, indent: 56),
                  ListTile(
                    leading: const Icon(Icons.privacy_tip_outlined, color: AppColors.primary),
                    title: const Text('Privacy Policy', style: TextStyle(fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.open_in_new, size: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    onTap: () {},
                  ),
                  const Divider(height: 1, indent: 56),
                  ListTile(
                    leading: const Icon(Icons.description_outlined, color: AppColors.primary),
                    title: const Text('Terms of Service', style: TextStyle(fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.open_in_new, size: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    onTap: () {},
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
