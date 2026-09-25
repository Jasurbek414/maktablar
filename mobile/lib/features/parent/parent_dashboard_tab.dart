import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/mock_data.dart';
import '../../core/attendance_stats.dart';
import '../../l10n/l10n.dart';
import '../../theme/app_theme.dart';
import '../../models/models.dart';
import '../auth/auth_controller.dart';
import 'child_detail_screen.dart';
import 'my_requests_tab.dart';
import 'parent_notifications_screen.dart';

class ParentDashboardTab extends ConsumerStatefulWidget {
  const ParentDashboardTab({super.key, this.profile});
  final Map<String, dynamic>? profile;

  @override
  ConsumerState<ParentDashboardTab> createState() => _ParentDashboardTabState();
}

class _ParentDashboardTabState extends ConsumerState<ParentDashboardTab> {
  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);

    final children = MockData.parentChildren;
    final pendingRequests = MockData.absenceRequests.where((e) => e.status == 'PENDING').toList();
    final today = DateTime.now();
    final todayStr = '${today.day.toString().padLeft(2, '0')}.${today.month.toString().padLeft(2, '0')}.${today.year}';

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              t('parentDash.greeting'),
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 18, letterSpacing: -0.3),
            ),
            Text(todayStr, style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
          ],
        ),
        actions: [
          Stack(
            clipBehavior: Clip.none,
            children: [
              IconButton(
                icon: Icon(Icons.notifications_outlined, color: AppColors.textPrimary),
                tooltip: 'Bildirishnomalar',
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ParentNotificationsScreen()),
                ),
              ),
              if (pendingRequests.isNotEmpty)
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(color: AppColors.amber, shape: BoxShape.circle),
                  ),
                ),
            ],
          ),
          IconButton(
            icon: Icon(Icons.logout_rounded, color: AppColors.textMuted, size: 20),
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            tooltip: t('common.logout'),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // ── Pending Requests Alert Card ──
          if (pendingRequests.isNotEmpty) ...[
            InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ParentNotificationsScreen()),
              ),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.amber.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.amber.withOpacity(0.25)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: AppColors.amber.withOpacity(0.15), shape: BoxShape.circle),
                      child: Icon(Icons.hourglass_top_rounded, color: AppColors.amber, size: 18),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${pendingRequests.length} ta ariza ko\'rib chiqilmoqda',
                            style: TextStyle(color: AppColors.amber, fontWeight: FontWeight.bold, fontSize: 13.5),
                          ),
                          Text(
                            'Direktor tomonidan ko\'rib chiqilgach bildirishnoma keladi',
                            style: TextStyle(color: AppColors.textMuted, fontSize: 11.5),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.chevron_right_rounded, color: AppColors.amber, size: 20),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // ── Section Title ──
          Text(
            'Farzandlar holati',
            style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 15.5, letterSpacing: -0.3),
          ),
          const SizedBox(height: 10),

          // ── Children Cards ──
          ...children.map((child) {
            final todayEvents = MockData.childAttendanceToday(child.id);
            final hasArrived = todayEvents.isNotEmpty;
            final inEvent = todayEvents.where((e) => e.type == 'IN').firstOrNull;

            final allEvents = MockData.studentAttendance(child.id);
            final stats = computeAttendanceStats(allEvents, days: 30);
            final initial = child.fullName.isNotEmpty ? child.fullName[0].toUpperCase() : '?';

            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: InkWell(
                borderRadius: BorderRadius.circular(18),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => ChildDetailScreen(student: child)),
                ),
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: AppDecorations.card(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: hasArrived ? AppColors.emerald.withOpacity(0.12) : AppColors.red.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(14),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              initial,
                              style: TextStyle(
                                color: hasArrived ? AppColors.emerald : AppColors.red,
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  child.fullName,
                                  style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 15.5),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${child.className ?? ''} · ${child.schoolName ?? ''}',
                                  style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: AppDecorations.badge(color: hasArrived ? AppColors.emerald : AppColors.red),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: hasArrived ? AppColors.emerald : AppColors.red,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  hasArrived
                                      ? inEvent != null
                                          ? '${inEvent.timestamp.hour.toString().padLeft(2, '0')}:${inEvent.timestamp.minute.toString().padLeft(2, '0')}'
                                          : 'Maktabda'
                                      : 'Kelmagan',
                                  style: TextStyle(
                                    color: hasArrived ? AppColors.emerald : AppColors.red,
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Divider(color: AppColors.borderSubtle),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Oylik davomat foizi', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                          Text('${stats.percent}%', style: TextStyle(color: AppColors.emerald, fontWeight: FontWeight.bold, fontSize: 13.5)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: stats.percent / 100,
                          backgroundColor: AppColors.borderSubtle,
                          color: AppColors.emerald,
                          minHeight: 6,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
