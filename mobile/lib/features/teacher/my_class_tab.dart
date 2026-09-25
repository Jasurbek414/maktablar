import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/error_state.dart';
import '../director/class_students_screen.dart';
import 'teacher_attendance_tab.dart' show TeacherNoClassAssigned;
import 'teacher_repository.dart';

/// "Mening sinfim" — o'qituvchi rahbar bo'lgan sinf(lar).
///
/// Sinf kartasiga bosilganda mavjud `ClassStudentsScreen` ochiladi (direktor ilovasidagi
/// ekran NUSXALANMAYDI — u allaqachon `classId` bo'yicha ishlaydi va server TEACHER uchun
/// o'quvchilar ro'yxatini o'zi filtrlaydi).
class MyClassTab extends ConsumerWidget {
  const MyClassTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);

    final async = ref.watch(teacherClassesProvider);

    return Scaffold(
      appBar: AppBar(title: Text(t('teacher.myClassTitle'))),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AppErrorState(
          message: apiErrorMessage(e, fallback: t('teacher.classesLoadFailed')),
          onRetry: () => ref.invalidate(teacherClassesProvider),
        ),
        data: (classes) {
          if (classes.isEmpty) return const TeacherNoClassAssigned();
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(teacherClassesProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
              itemCount: classes.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, i) => _ClassCard(classRoom: classes[i]),
            ),
          );
        },
      ),
    );
  }
}

class _ClassCard extends StatelessWidget {
  const _ClassCard({required this.classRoom});
  final SchoolClassRoom classRoom;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: () => Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => ClassStudentsScreen(classRoom: classRoom)),
      ),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: AppDecorations.card(),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: AppColors.emerald.withOpacity(0.12),
                borderRadius: BorderRadius.circular(16),
              ),
              alignment: Alignment.center,
              child: Text(
                classRoom.name,
                style: TextStyle(
                    color: AppColors.emerald, fontWeight: FontWeight.bold, fontSize: 15),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    classRoom.name,
                    style: TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 16),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${classRoom.studentCount} ${t('classes.studentsCount')}',
                    style: TextStyle(color: AppColors.textMuted, fontSize: 12.5),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
          ],
        ),
      ),
    );
  }
}
