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
  String _search = '';

  @override
  void initState() {
    super.initState();
    if (widget.schoolId != null) {
      _future = ref.read(directorRepositoryProvider).classes(widget.schoolId!);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);

    return Scaffold(
      appBar: AppBar(title: Text(t('nav.classes'))),
      body: widget.schoolId == null
          ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(t('classes.notAssigned'), style: TextStyle(color: AppColors.textFaint))))
          : Column(
              children: [
                // Clean Search Bar
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  child: TextField(
                    style: TextStyle(color: AppColors.textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Sinf bo\'yicha qidirish (masalan: 5-B)...',
                      prefixIcon: Icon(Icons.search_rounded, size: 20, color: AppColors.textMuted),
                    ),
                    onChanged: (v) => setState(() => _search = v.trim().toLowerCase()),
                  ),
                ),
                Expanded(
                  child: FutureBuilder<List<SchoolClassRoom>>(
                    future: _future,
                    builder: (context, snap) {
                      if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
                      if (snap.hasError) return Center(child: Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary)));
                      final all = snap.data ?? [];
                      final filtered = _search.isEmpty ? all : all.where((c) => c.name.toLowerCase().contains(_search)).toList();
                      if (filtered.isEmpty) return Center(child: Text(t('classes.empty'), style: TextStyle(color: AppColors.textFaint)));

                      return GridView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 10,
                          crossAxisSpacing: 10,
                          childAspectRatio: 1.25,
                        ),
                        itemCount: filtered.length,
                        itemBuilder: (context, i) {
                          final c = filtered[i];
                          return InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => ClassStudentsScreen(classRoom: c))),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: AppDecorations.card(),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        c.name,
                                        style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 18),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: AppDecorations.badge(color: AppColors.emerald),
                                        child: Text('${c.studentCount}', style: TextStyle(color: AppColors.emerald, fontWeight: FontWeight.bold, fontSize: 12)),
                                      ),
                                    ],
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Icon(Icons.groups_rounded, size: 14, color: AppColors.textMuted),
                                          const SizedBox(width: 6),
                                          Text(
                                            '${c.studentCount} ${t('classes.studentsCount')}',
                                            style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                                          ),
                                        ],
                                      ),
                                      if (c.teacherName != null) ...[
                                        const SizedBox(height: 4),
                                        Row(
                                          children: [
                                            Icon(Icons.person_rounded, size: 14, color: AppColors.textFaint),
                                            const SizedBox(width: 6),
                                            Expanded(
                                              child: Text(
                                                c.teacherName!,
                                                style: TextStyle(color: AppColors.textSecondary, fontSize: 11.5),
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}
