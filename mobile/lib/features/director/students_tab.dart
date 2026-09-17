import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/person_tile.dart';
import 'director_repository.dart';
import 'student_detail_screen.dart';

class StudentsTab extends ConsumerStatefulWidget {
  const StudentsTab({super.key, required this.schoolId});
  final int? schoolId;

  @override
  ConsumerState<StudentsTab> createState() => _StudentsTabState();
}

class _StudentsTabState extends ConsumerState<StudentsTab> {
  Future<List<Student>>? _future;
  String _search = '';

  @override
  void initState() {
    super.initState();
    if (widget.schoolId != null) {
      _future = ref.read(directorRepositoryProvider).students(widget.schoolId!);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);
    return Scaffold(
      appBar: AppBar(title: Text(t('nav.students'))),
      body: widget.schoolId == null
          ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(t('classes.notAssigned'), style: TextStyle(color: AppColors.textFaint))))
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: TextField(
                    style: TextStyle(color: AppColors.textPrimary),
                    decoration: InputDecoration(hintText: t('common.search'), prefixIcon: Icon(Icons.search_rounded, color: AppColors.textMuted)),
                    onChanged: (v) => setState(() => _search = v.toLowerCase()),
                  ),
                ),
                Expanded(
                  child: FutureBuilder<List<Student>>(
                    future: _future,
                    builder: (context, snap) {
                      if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
                      if (snap.hasError) return Center(child: Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary)));
                      final all = snap.data ?? [];
                      final list = _search.isEmpty ? all : all.where((s) => s.fullName.toLowerCase().contains(_search)).toList();
                      if (list.isEmpty) return Center(child: Text(t('common.notFound'), style: TextStyle(color: AppColors.textFaint)));
                      return ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                        itemCount: list.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, i) {
                          final s = list[i];
                          return PersonTile(
                            name: s.fullName,
                            subtitle: [if (s.className != null) s.className!].join(' · '),
                            photoUrl: s.photoUrl,
                            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => StudentDetailScreen(student: s))),
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
