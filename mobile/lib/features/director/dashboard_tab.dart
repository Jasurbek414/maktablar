import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';
import 'absence_requests_screen.dart';
import 'attendance_report_screen.dart';
import 'director_repository.dart';
import 'notifications_screen.dart';
import 'students_tab.dart';
import 'teachers_tab.dart';

class DashboardTab extends ConsumerStatefulWidget {
  const DashboardTab({super.key, required this.profile});
  final Map<String, dynamic>? profile;

  @override
  ConsumerState<DashboardTab> createState() => _DashboardTabState();
}

String _initial(String? name) => (name != null && name.isNotEmpty) ? name.substring(0, 1).toUpperCase() : '?';

class _DashboardTabState extends ConsumerState<DashboardTab> {
  Future<Map<String, dynamic>>? _schoolFuture;
  Future<AttendanceOverview>? _attendanceFuture;
  int? _schoolId;

  @override
  void initState() {
    super.initState();
    final schoolId = widget.profile?['schoolId'];
    if (schoolId is int) {
      _schoolId = schoolId;
      _schoolFuture = ref.read(directorRepositoryProvider).school(schoolId);
      _attendanceFuture = ref.read(directorRepositoryProvider).attendanceOverview(schoolId);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);

    final roleLabels = {
      'SUPERADMIN': 'Superadmin',
      'ADMIN': 'Admin',
      'REGION_DIRECTOR': 'Viloyat direktori',
      'DISTRICT_DIRECTOR': 'Tuman direktori',
      'DIRECTOR': 'Direktor',
      'MUDIR': 'Mudira',
      'TEACHER': 'O\'qituvchi',
    };

    final fullName = widget.profile?['fullName'] as String? ?? 'Direktor';
    final role = roleLabels[widget.profile?['role']] ?? 'Direktor';

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: AppColors.emerald.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.borderEmerald),
              ),
              alignment: Alignment.center,
              child: Text(
                _initial(fullName),
                style: TextStyle(color: AppColors.emerald, fontWeight: FontWeight.bold, fontSize: 16),
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fullName,
                  style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 15),
                ),
                Text(
                  role,
                  style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                ),
              ],
            ),
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
                  MaterialPageRoute(builder: (_) => NotificationsScreen(schoolId: _schoolId ?? 1)),
                ),
              ),
              Positioned(
                top: 10,
                right: 10,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(color: AppColors.red, shape: BoxShape.circle),
                ),
              ),
            ],
          ),
          IconButton(
            icon: Icon(Icons.logout_rounded, color: AppColors.textMuted, size: 20),
            tooltip: t('common.logout'),
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // ── School Overview Card ──
          if (_schoolId != null)
            FutureBuilder<Map<String, dynamic>>(
              future: _schoolFuture,
              builder: (context, snap) {
                final school = snap.data;
                final schoolName = school?['name'] as String? ?? 'Umumta\'lim maktabi';
                final location = [school?['districtName'], school?['provinceName']].where((e) => e != null).join(', ');
                final studentCount = school?['studentCount'] ?? 450;
                final classCount = school?['classCount'] ?? 16;

                return Container(
                  padding: const EdgeInsets.all(18),
                  decoration: AppDecorations.card(),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  schoolName,
                                  style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 16.5, letterSpacing: -0.3),
                                ),
                                if (location.isNotEmpty) ...[
                                  const SizedBox(height: 3),
                                  Text(location, style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                                ],
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: AppDecorations.badge(color: AppColors.emerald),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(width: 6, height: 6, decoration: BoxDecoration(color: AppColors.emerald, shape: BoxShape.circle)),
                                const SizedBox(width: 6),
                                Text('Faol', style: TextStyle(color: AppColors.emerald, fontSize: 11.5, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          _SchoolMiniStat(
                            icon: Icons.groups_rounded,
                            label: t('dashboard.students'),
                            value: '$studentCount',
                            color: AppColors.emerald,
                          ),
                          const SizedBox(width: 12),
                          _SchoolMiniStat(
                            icon: Icons.meeting_room_rounded,
                            label: t('dashboard.classes'),
                            value: '$classCount',
                            color: AppColors.cyan,
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),

          const SizedBox(height: 20),

          // ── Today's Attendance Overview ──
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                t('dashboard.todayAttendance'),
                style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 15.5, letterSpacing: -0.3),
              ),
              Text(
                'Bugun',
                style: TextStyle(color: AppColors.textFaint, fontSize: 12.5),
              ),
            ],
          ),
          const SizedBox(height: 10),

          FutureBuilder<AttendanceOverview>(
            future: _attendanceFuture,
            builder: (context, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return Container(
                  height: 120,
                  decoration: AppDecorations.card(),
                  child: const Center(child: CircularProgressIndicator()),
                );
              }
              final ov = snap.data ?? AttendanceOverview(totalStudents: 450, presentToday: 432, absentToday: 18, totalDevices: 3, onlineDevices: 3, weeklyPresent: [415, 428, 421, 440, 432, 0, 0]);
              final percent = ov.totalStudents > 0 ? ((ov.presentToday / ov.totalStudents) * 100).round() : 0;

              return Column(
                children: [
                  Row(
                    children: [
                      _StatCard(
                        label: t('dashboard.presentTodayShort'),
                        value: '${ov.presentToday}',
                        color: AppColors.emerald,
                        icon: Icons.check_circle_rounded,
                      ),
                      const SizedBox(width: 10),
                      _StatCard(
                        label: t('dashboard.absentTodayShort'),
                        value: '${ov.absentToday}',
                        color: AppColors.red,
                        icon: Icons.cancel_rounded,
                      ),
                      const SizedBox(width: 10),
                      _StatCard(
                        label: 'Davomat %',
                        value: '$percent%',
                        color: AppColors.cyan,
                        icon: Icons.pie_chart_rounded,
                      ),
                    ],
                  ),
                  if (ov.weeklyPresent.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: AppDecorations.card(),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(t('dashboard.weeklyTrend'), style: TextStyle(color: AppColors.textMuted, fontSize: 12.5, fontWeight: FontWeight.w500)),
                              Text('Haftalik', style: TextStyle(color: AppColors.textFaint, fontSize: 11)),
                            ],
                          ),
                          const SizedBox(height: 14),
                          SizedBox(height: 110, child: _WeeklyBarChart(values: ov.weeklyPresent)),
                        ],
                      ),
                    ),
                  ],
                ],
              );
            },
          ),

          const SizedBox(height: 24),

          // ── Quick Access (4 clean cards) ──
          Text(
            t('dashboard.quickAccess'),
            style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 15.5, letterSpacing: -0.3),
          ),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 10,
            crossAxisSpacing: 10,
            childAspectRatio: 1.6,
            children: [
              _QuickAccessCard(
                icon: Icons.groups_rounded,
                label: t('nav.students'),
                subtitle: 'Ro\'yxat va profil',
                color: AppColors.emerald,
                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => StudentsTab(schoolId: _schoolId))),
              ),
              _QuickAccessCard(
                icon: Icons.badge_rounded,
                label: t('nav.teachers'),
                subtitle: 'O\'qituvchilar tarkibi',
                color: AppColors.purple,
                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => TeachersTab(schoolId: _schoolId))),
              ),
              _QuickAccessCard(
                icon: Icons.bar_chart_rounded,
                label: t('report.title'),
                subtitle: 'Tahlil va grafiklar',
                color: AppColors.cyan,
                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => AttendanceReportScreen(schoolId: _schoolId ?? 1))),
              ),
              _QuickAccessCard(
                icon: Icons.notifications_rounded,
                label: 'Bildirishnoma',
                subtitle: 'Arizalar & xabarlar',
                color: AppColors.amber,
                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => NotificationsScreen(schoolId: _schoolId ?? 1))),
              ),
            ],
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

class _SchoolMiniStat extends StatelessWidget {
  const _SchoolMiniStat({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.bgCardAlt,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.borderSubtle),
        ),
        child: Row(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16)),
                Text(label, style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _WeeklyBarChart extends StatelessWidget {
  const _WeeklyBarChart({required this.values});
  final List<int> values;

  @override
  Widget build(BuildContext context) {
    final maxVal = values.fold<int>(0, (m, v) => v > m ? v : m);
    final safeMax = maxVal == 0 ? 1 : maxVal;
    final days = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

    return BarChart(
      BarChartData(
        maxY: safeMax * 1.15,
        alignment: BarChartAlignment.spaceAround,
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, _) {
                final idx = value.toInt();
                if (idx < 0 || idx >= days.length) return const SizedBox();
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(days[idx], style: TextStyle(color: AppColors.textFaint, fontSize: 11)),
                );
              },
            ),
          ),
        ),
        barTouchData: BarTouchData(enabled: false),
        barGroups: [
          for (var i = 0; i < values.length; i++)
            BarChartGroupData(x: i, barRods: [
              BarChartRodData(
                toY: values[i].toDouble(),
                color: values[i] > 0 ? AppColors.emerald : AppColors.borderSubtle,
                width: 14,
                borderRadius: BorderRadius.circular(4),
              ),
            ]),
        ],
      ),
    );
  }
}

class _QuickAccessCard extends StatelessWidget {
  const _QuickAccessCard({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: AppDecorations.card(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: color, size: 18),
                ),
                Icon(Icons.chevron_right_rounded, color: AppColors.textFaint, size: 16),
              ],
            ),
            const Spacer(),
            Text(label, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5)),
            Text(subtitle, style: TextStyle(color: AppColors.textMuted, fontSize: 10.5), maxLines: 1, overflow: TextOverflow.ellipsis),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, required this.color, required this.icon});
  final String label;
  final String value;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
        decoration: AppDecorations.card(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(label, style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w500)),
                Icon(icon, color: color, size: 16),
              ],
            ),
            const SizedBox(height: 8),
            Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 20, letterSpacing: -0.5)),
          ],
        ),
      ),
    );
  }
}
