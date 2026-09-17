import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';
import 'cameras_screen.dart';
import 'classes_tab.dart';
import 'director_repository.dart';
import 'face_monitoring_screen.dart';
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

    return Scaffold(
      appBar: AppBar(
        title: Text(t('nav.home')),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: t('common.logout'),
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [AppColors.bgCard, AppColors.bgCardAlt], begin: Alignment.topLeft, end: Alignment.bottomRight),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.borderEmerald),
            ),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(gradient: LinearGradient(colors: [AppColors.emerald, const Color(0xFF34D399)]), borderRadius: BorderRadius.circular(16)),
                  alignment: Alignment.center,
                  child: Text(
                    _initial(widget.profile?['fullName'] as String?),
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(widget.profile?['fullName'] as String? ?? '', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 16)),
                      const SizedBox(height: 3),
                      Text(roleLabels[widget.profile?['role']] ?? '', style: TextStyle(color: AppColors.emerald, fontSize: 12.5)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          if (_schoolId == null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Text(t('dashboard.singleSchoolOnly'), style: TextStyle(color: AppColors.textFaint)),
            )
          else ...[
            FutureBuilder<Map<String, dynamic>>(
              future: _schoolFuture,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Padding(padding: EdgeInsets.symmetric(vertical: 40), child: Center(child: CircularProgressIndicator()));
                }
                if (snap.hasError) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary)),
                  );
                }
                final school = snap.data!;
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(school['name'] as String? ?? '', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 18)),
                    const SizedBox(height: 4),
                    Text(
                      [school['districtName'], school['provinceName']].where((e) => e != null).join(', '),
                      style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                    ),
                    const SizedBox(height: 18),
                    Row(
                      children: [
                        _StatCard(label: t('dashboard.students'), value: '${school['studentCount'] ?? 0}', color: AppColors.emerald, icon: Icons.groups_rounded),
                        const SizedBox(width: 12),
                        _StatCard(label: t('dashboard.classes'), value: '${school['classCount'] ?? 0}', color: AppColors.cyan, icon: Icons.meeting_room_rounded),
                      ],
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 24),
            Text(t('dashboard.todayAttendance'), style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 15)),
            const SizedBox(height: 12),
            FutureBuilder<AttendanceOverview>(
              future: _attendanceFuture,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Padding(padding: EdgeInsets.symmetric(vertical: 30), child: Center(child: CircularProgressIndicator()));
                }
                if (snap.hasError) {
                  return Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary));
                }
                final ov = snap.data!;
                final percent = ov.totalStudents > 0 ? ((ov.presentToday / ov.totalStudents) * 100).round() : 0;
                return Column(
                  children: [
                    Row(
                      children: [
                        _StatCard(label: t('dashboard.presentTodayShort'), value: '${ov.presentToday}', color: AppColors.emerald, icon: Icons.check_circle_rounded),
                        const SizedBox(width: 12),
                        _StatCard(label: t('dashboard.absentTodayShort'), value: '${ov.absentToday}', color: AppColors.red, icon: Icons.cancel_rounded),
                        const SizedBox(width: 12),
                        _StatCard(label: '%', value: '$percent%', color: AppColors.amber, icon: Icons.percent_rounded),
                      ],
                    ),
                    if (ov.weeklyPresent.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: [AppColors.bgCard, AppColors.bgCardAlt], begin: Alignment.topLeft, end: Alignment.bottomRight),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.borderEmerald),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(t('dashboard.weeklyTrend'), style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                            const SizedBox(height: 10),
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
            Text(t('dashboard.quickAccess'), style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 15)),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.7,
              children: [
                _QuickAccessCard(
                  icon: Icons.groups_rounded,
                  label: t('nav.students'),
                  color: AppColors.emerald,
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => StudentsTab(schoolId: _schoolId))),
                ),
                _QuickAccessCard(
                  icon: Icons.grid_view_rounded,
                  label: t('nav.classes'),
                  color: AppColors.cyan,
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ClassesTab(schoolId: _schoolId))),
                ),
                _QuickAccessCard(
                  icon: Icons.badge_rounded,
                  label: t('nav.teachers'),
                  color: AppColors.purple,
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => TeachersTab(schoolId: _schoolId))),
                ),
                _QuickAccessCard(
                  icon: Icons.videocam_rounded,
                  label: t('cameras.title'),
                  color: AppColors.amber,
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => CamerasScreen(schoolId: _schoolId!))),
                ),
                _QuickAccessCard(
                  icon: Icons.face_retouching_natural_rounded,
                  label: t('faceMonitor.title'),
                  color: AppColors.emerald,
                  onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => FaceMonitoringScreen(schoolId: _schoolId!))),
                ),
              ],
            ),
          ],
        ],
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
    return BarChart(
      BarChartData(
        maxY: safeMax * 1.2,
        alignment: BarChartAlignment.spaceAround,
        gridData: const FlGridData(show: false),
        borderData: FlBorderData(show: false),
        titlesData: const FlTitlesData(
          leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        barTouchData: BarTouchData(enabled: false),
        barGroups: [
          for (var i = 0; i < values.length; i++)
            BarChartGroupData(x: i, barRods: [
              BarChartRodData(
                toY: values[i].toDouble(),
                color: AppColors.emerald,
                width: 18,
                borderRadius: BorderRadius.circular(4),
                backDrawRodData: BackgroundBarChartRodData(show: true, toY: safeMax * 1.2, color: AppColors.bgCardAlt),
              ),
            ]),
        ],
      ),
    );
  }
}

class _QuickAccessCard extends StatelessWidget {
  const _QuickAccessCard({required this.icon, required this.label, required this.color, required this.onTap});
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(14)),
        child: Row(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(width: 10),
            Expanded(child: Text(label, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13))),
            Icon(Icons.chevron_right_rounded, color: color, size: 18),
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
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: color.withOpacity(0.08), borderRadius: BorderRadius.circular(14)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 10),
            Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 22)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(color: AppColors.textFaint, fontSize: 11)),
          ],
        ),
      ),
    );
  }
}
