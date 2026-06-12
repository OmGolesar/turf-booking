import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/router/route_names.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.go(RouteNames.settings),
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // ── Profile Header ────────────────────────────────
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0D1117), Color(0xFF1A1A2E)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(28),
                  bottomRight: Radius.circular(28),
                ),
              ),
              child: Column(
                children: [
                  Stack(
                    children: [
                      CircleAvatar(
                        radius: 44,
                        backgroundColor:
                            AppColors.primary.withValues(alpha: 0.3),
                        child: const Icon(Icons.person,
                            size: 48, color: AppColors.primary),
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(
                            gradient: AppColors.primaryGradient,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.camera_alt,
                              color: Colors.white, size: 14),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'Om Golesar',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'om.golesar@gmail.com',
                    style: TextStyle(color: Colors.white54, fontSize: 14),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _StatBadge(label: 'Bookings', value: '12'),
                      Container(
                          height: 32, width: 1,
                          color: Colors.white24,
                          margin: const EdgeInsets.symmetric(horizontal: 20)),
                      _StatBadge(label: 'Turfs Played', value: '8'),
                      Container(
                          height: 32, width: 1,
                          color: Colors.white24,
                          margin: const EdgeInsets.symmetric(horizontal: 20)),
                      const _StatBadge(label: 'Hours', value: '24'),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Account',
                      style: textTheme.titleSmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.4),
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                      )),
                  const SizedBox(height: 8),
                  _MenuCard(
                    items: [
                      _MenuItem(
                          icon: Icons.person_outline,
                          label: 'Edit Profile',
                          onTap: () {}),
                      _MenuItem(
                          icon: Icons.phone_outlined,
                          label: 'Change Phone',
                          onTap: () {}),
                      _MenuItem(
                          icon: Icons.lock_outline,
                          label: 'Change Password',
                          onTap: () {}),
                    ],
                  ),

                  const SizedBox(height: 20),
                  Text('Activity',
                      style: textTheme.titleSmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.4),
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                      )),
                  const SizedBox(height: 8),
                  _MenuCard(
                    items: [
                      _MenuItem(
                          icon: Icons.calendar_today_outlined,
                          label: 'My Bookings',
                          onTap: () => context.go(RouteNames.myBookings)),
                      _MenuItem(
                          icon: Icons.favorite_outline,
                          label: 'Favourite Turfs',
                          onTap: () {}),
                      _MenuItem(
                          icon: Icons.receipt_long_outlined,
                          label: 'Transaction History',
                          onTap: () {}),
                    ],
                  ),

                  const SizedBox(height: 20),
                  Text('Support',
                      style: textTheme.titleSmall?.copyWith(
                        color: colorScheme.onSurface.withValues(alpha: 0.4),
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.8,
                      )),
                  const SizedBox(height: 8),
                  _MenuCard(
                    items: [
                      _MenuItem(
                          icon: Icons.help_outline,
                          label: 'Help & Support',
                          onTap: () {}),
                      _MenuItem(
                          icon: Icons.settings_outlined,
                          label: 'Settings',
                          onTap: () => context.go(RouteNames.settings)),
                      _MenuItem(
                          icon: Icons.logout,
                          label: 'Logout',
                          isDestructive: true,
                          onTap: () => context.go(RouteNames.welcome)),
                    ],
                  ),

                  const SizedBox(height: 32),
                  Center(
                    child: Text(
                      'TurfX v1.0.0',
                      style: textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurface.withValues(alpha: 0.3)),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatBadge extends StatelessWidget {
  final String label;
  final String value;
  const _StatBadge({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.w800)),
        Text(label,
            style: const TextStyle(color: Colors.white54, fontSize: 12)),
      ],
    );
  }
}

class _MenuCard extends StatelessWidget {
  final List<_MenuItem> items;
  const _MenuCard({required this.items});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: items.asMap().entries.map((e) {
          final isLast = e.key == items.length - 1;
          return Column(
            children: [
              e.value,
              if (!isLast) const Divider(height: 1, indent: 56),
            ],
          );
        }).toList(),
      ),
    );
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isDestructive;

  const _MenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = isDestructive ? Colors.red : null;
    return ListTile(
      leading: Icon(icon,
          color: isDestructive ? Colors.red : AppColors.primary, size: 22),
      title: Text(
        label,
        style: TextStyle(
            color: color,
            fontWeight: FontWeight.w600,
            fontSize: 15),
      ),
      trailing: Icon(Icons.chevron_right,
          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.3)),
      onTap: onTap,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    );
  }
}
