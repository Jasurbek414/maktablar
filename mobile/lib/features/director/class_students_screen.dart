import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../core/attendance_stats.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import 'director_repository.dart';
import 'student_detail_screen.dart';

/// Bitta o'quvchi va uning haqiqiy 30 kunlik davomat foizi (sinf ro'yxati uchun).
class _StudentRow {
  _StudentRow(this.student, this.stats);
  final Student student;
  final AttendanceStats? stats;
}

class ClassStudentsScreen extends ConsumerStatefulWidget {
  const ClassStudentsScreen({super.key, required this.classRoom});
  final SchoolClassRoom classRoom;

  @override
  ConsumerState<ClassStudentsScreen> createState() => _ClassStudentsScreenState();
}

class _ClassStudentsScreenState extends ConsumerState<ClassStudentsScreen> {
  late Future<List<_StudentRow>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<_StudentRow>> _load() async {
    final repo = ref.read(directorRepositoryProvider);
    final students = await repo.studentsByClass(widget.classRoom.id);
    final rows = await Future.wait(students.map((s) async {
      try {
        final events = await repo.studentAttendance(s.id);
        return _StudentRow(s, computeAttendanceStats(events));
      } catch (_) {
        return _StudentRow(s, null);
      }
    }));
    return rows;
  }

  Color _percentColor(int p) {
    if (p >= 90) return AppColors.emerald;
    if (p >= 75) return AppColors.cyan;
    if (p >= 50) return AppColors.amber;
    return AppColors.red;
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);
    return Scaffold(
      appBar: AppBar(title: Text(widget.classRoom.name)),
      body: FutureBuilder<List<_StudentRow>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return Center(child: Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary)));
          final rows = snap.data ?? [];
          if (rows.isEmpty) return Center(child: Text(t('classes.empty2'), style: TextStyle(color: AppColors.textFaint)));
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: rows.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, i) {
              final row = rows[i];
              final percent = row.stats?.percent;
              return InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => StudentDetailScreen(student: row.student))),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.bgCard,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.borderEmerald),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(color: AppColors.emerald.withOpacity(0.15), borderRadius: BorderRadius.circular(11)),
                        alignment: Alignment.center,
                        child: Text(row.student.fullName.isNotEmpty ? row.student.fullName[0].toUpperCase() : '?', style: TextStyle(color: AppColors.emerald, fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(row.student.fullName, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w500, fontSize: 14)),
                            const SizedBox(height: 2),
                            Text(
                              percent != null ? t('classes.attendanceLabel') : t('classes.noAttendanceData'),
                              style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      if (percent != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(color: _percentColor(percent).withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
                          child: Text('$percent%', style: TextStyle(color: _percentColor(percent), fontWeight: FontWeight.bold, fontSize: 13)),
                        ),
                      const SizedBox(width: 4),
                      Icon(Icons.chevron_right_rounded, color: AppColors.textFaint, size: 20),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
