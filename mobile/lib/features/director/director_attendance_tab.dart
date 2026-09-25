import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import 'absence_requests_screen.dart';
import 'attendance_report_screen.dart';
import 'cameras_screen.dart';
import 'director_repository.dart';
import 'face_monitoring_screen.dart';
import 'notifications_screen.dart';

class DirectorAttendanceTab extends ConsumerStatefulWidget {
  const DirectorAttendanceTab({super.key, required this.schoolId});
  final int schoolId;

  @override
  ConsumerState<DirectorAttendanceTab> createState() => _DirectorAttendanceTabState();
}

class _DirectorAttendanceTabState extends ConsumerState<DirectorAttendanceTab> {
  Future<AttendanceOverview>? _overviewFuture;

  @override
  void initState() {
    super.initState();
    _overviewFuture = ref.read(directorRepositoryProvider).attendanceOverview(widget.schoolId);
  }

  void _reload() => setState(
      () => _overviewFuture = ref.read(directorRepositoryProvider).attendanceOverview(widget.schoolId));

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(t('attendance.title')),
        actions: [
          IconButton(
            icon: Icon(Icons.notifications_outlined, color: AppColors.textPrimary),
            tooltip: 'Bildirishnomalar',
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => NotificationsScreen(schoolId: widget.schoolId)),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => _reload(),
        color: AppColors.emerald,
        backgroundColor: AppColors.bgCard,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            // ── Minimalist Daily Attendance Ring & Stats ──
            FutureBuilder<AttendanceOverview>(
              future: _overviewFuture,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return Container(
                    padding: const EdgeInsets.all(32),
                    decoration: AppDecorations.card(),
                    child: const Center(child: CircularProgressIndicator()),
                  );
                }
                // MUHIM (2026-09-25 audit): avval bu yerda `snap.data ?? MockData.attendanceOverview`
                // turardi — server javob bermasa ekran JIMGINA soxta raqamlarni ko'rsatardi va
                // "ishlayotgandek" ko'rinardi. Endi xato halol aytiladi.
                if (snap.hasError || snap.data == null) {
                  return Container(
                    padding: const EdgeInsets.all(20),
                    decoration: AppDecorations.card(),
                    child: Column(
                      children: [
                        Icon(Icons.cloud_off_rounded, size: 32, color: AppColors.textMuted),
                        const SizedBox(height: 10),
                        Text(
                          snap.error != null
                              ? apiErrorMessage(snap.error!,
                                  fallback: 'Davomat ma\'lumotini yuklab bo\'lmadi')
                              : 'Davomat ma\'lumotini yuklab bo\'lmadi',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: _reload,
                          icon: const Icon(Icons.refresh_rounded, size: 18),
                          label: const Text('Qayta urinish'),
                        ),
                      ],
                    ),
                  );
                }
                final ov = snap.data!;
                final percent = ov.totalStudents > 0
                    ? ((ov.presentToday / ov.totalStudents) * 100).round()
                    : 0;

                return Container(
                  padding: const EdgeInsets.all(18),
                  decoration: AppDecorations.card(),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          // Circular Progress Ring
                          Stack(
                            alignment: Alignment.center,
                            children: [
                              SizedBox(
                                width: 62,
                                height: 62,
                                child: CircularProgressIndicator(
                                  value: percent / 100,
                                  strokeWidth: 6,
                                  backgroundColor: AppColors.borderSubtle,
                                  color: AppColors.emerald,
                                ),
                              ),
                              Text(
                                '$percent%',
                                style: TextStyle(
                                  color: AppColors.textPrimary,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14.5,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Bugungi umumiy davomat',
                                  style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14.5),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  // Avval "450" qattiq kodlangan edi — haqiqiy songa almashtirildi.
                                  '${ov.totalStudents} o\'quvchidan ${ov.presentToday} nafari maktabda',
                                  style: TextStyle(color: AppColors.textMuted, fontSize: 12),
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
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _QuickStat(label: 'Kelganlar', value: '${ov.presentToday}', color: AppColors.emerald),
                          Container(width: 1, height: 28, color: AppColors.borderSubtle),
                          _QuickStat(label: 'Kelmaganlar', value: '${ov.absentToday}', color: AppColors.red),
                          Container(width: 1, height: 28, color: AppColors.borderSubtle),
                          _QuickStat(label: 'Qurilmalar', value: '${ov.onlineDevices}/${ov.totalDevices}', color: AppColors.cyan),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),

            const SizedBox(height: 24),

            // ── Section Title ──
            Text(
              'Davomat boshqaruvi',
              style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 15.5, letterSpacing: -0.3),
            ),
            const SizedBox(height: 12),

            // ── Minimalist Section Cards ──
            _NavTile(
              icon: Icons.bar_chart_rounded,
              title: t('report.title'),
              subtitle: 'Sinf va sana oralig\'i bo\'yicha tahlil',
              color: AppColors.cyan,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => AttendanceReportScreen(schoolId: widget.schoolId)),
              ),
            ),
            const SizedBox(height: 10),

            _NavTile(
              icon: Icons.face_retouching_natural_rounded,
              title: t('faceMonitor.title'),
              subtitle: 'Real vaqtda kirib-chiqishlar va harorat',
              color: AppColors.emerald,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => FaceMonitoringScreen(schoolId: widget.schoolId)),
              ),
            ),
            const SizedBox(height: 10),

            _NavTile(
              icon: Icons.videocam_rounded,
              title: t('cameras.title'),
              subtitle: 'Hikvision kuzatuv kameralari monitoringi',
              color: AppColors.amber,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => CamerasScreen(schoolId: widget.schoolId)),
              ),
            ),
            const SizedBox(height: 10),

            _NavTile(
              icon: Icons.description_rounded,
              title: t('requests.title'),
              subtitle: 'Ota-onalarning qoldirish arizalari',
              color: AppColors.purple,
              badge: ref
                      .watch(directorPendingRequestCountProvider(widget.schoolId))
                      .valueOrNull ??
                  0,
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => AbsenceRequestsScreen(schoolId: widget.schoolId)),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _QuickStat extends StatelessWidget {
  const _QuickStat({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 2),
        Text(label, style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
      ],
    );
  }
}

class _NavTile extends StatelessWidget {
  const _NavTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
    this.badge = 0,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: AppDecorations.card(),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(title, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14.5)),
                      if (badge > 0) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(color: AppColors.red, borderRadius: BorderRadius.circular(10)),
                          child: Text('$badge', style: const TextStyle(color: Colors.white, fontSize: 10.5, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(subtitle, style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: AppColors.textFaint, size: 20),
          ],
        ),
      ),
    );
  }
}
