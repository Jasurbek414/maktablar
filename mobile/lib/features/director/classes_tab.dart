import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import 'class_students_screen.dart';
import 'director_repository.dart';

class ClassesTab extends ConsumerStatefulWidget {
  const ClassesTab({super.key, required this.schoolId});
  final int? schoolId;

  @override
  ConsumerState<ClassesTab> createState() => _ClassesTabState();
}

class _ClassesTabState extends ConsumerState<ClassesTab> {
  Future<List<SchoolClassRoom>>? _future;

  @override
  void initState() {
    super.initState();
    if (widget.schoolId != null) {
      _future = ref.read(directorRepositoryProvider).classes(widget.schoolId!);
    }
  }

  static List<Color> get _gradeColors => [
        AppColors.textFaint,
        const Color(0xFFEF4444), const Color(0xFFF97316), const Color(0xFFF59E0B), const Color(0xFFEAB308),
        const Color(0xFF84CC16), const Color(0xFF10B981), const Color(0xFF14B8A6), const Color(0xFF06B6D4),
        const Color(0xFF3B82F6), const Color(0xFF6366F1), const Color(0xFF8B5CF6),
      ];

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);
    return Scaffold(
      appBar: AppBar(title: Text(t('nav.classes'))),
      body: widget.schoolId == null
          ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(t('classes.notAssigned'), style: TextStyle(color: AppColors.textFaint))))
          : FutureBuilder<List<SchoolClassRoom>>(
              future: _future,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
                if (snap.hasError) return Center(child: Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary)));
                final classes = snap.data ?? [];
                if (classes.isEmpty) return Center(child: Text(t('classes.empty'), style: TextStyle(color: AppColors.textFaint)));
                return GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.15),
                  itemCount: classes.length,
                  itemBuilder: (context, i) {
                    final c = classes[i];
                    final color = _gradeColors[(c.grade ?? 0).clamp(0, _gradeColors.length - 1)];
                    return InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ClassStudentsScreen(classRoom: c))),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: [AppColors.bgCard, AppColors.bgCardAlt], begin: Alignment.topLeft, end: Alignment.bottomRight),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.borderEmerald),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
                              child: Text(c.name, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 15)),
                            ),
                            const Spacer(),
                            Row(
                              children: [
                                Icon(Icons.groups_rounded, size: 15, color: AppColors.textFaint),
                                const SizedBox(width: 5),
                                Text('${c.studentCount} ${t('classes.studentsCount')}', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                              ],
                            ),
                            if (c.teacherName != null) ...[
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Icon(Icons.person_rounded, size: 15, color: AppColors.textFaint),
                                  const SizedBox(width: 5),
                                  Expanded(child: Text(c.teacherName!, style: TextStyle(color: AppColors.textMuted, fontSize: 12), overflow: TextOverflow.ellipsis)),
                                ],
                              ),
                            ],
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
