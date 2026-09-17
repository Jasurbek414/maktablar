import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../l10n/l10n.dart' as l10n;
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/person_tile.dart';
import 'director_repository.dart';
import 'teacher_detail_screen.dart';

class TeachersTab extends ConsumerStatefulWidget {
  const TeachersTab({super.key, required this.schoolId});
  final int? schoolId;

  @override
  ConsumerState<TeachersTab> createState() => _TeachersTabState();
}

class _TeachersTabState extends ConsumerState<TeachersTab> {
  Future<List<TeacherSummary>>? _future;
  String _search = '';

  @override
  void initState() {
    super.initState();
    if (widget.schoolId != null) {
      _future = ref.read(directorRepositoryProvider).teachers(widget.schoolId!);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(l10n.localeProvider);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.t('nav.teachers'))),
      body: widget.schoolId == null
          ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(l10n.t('classes.notAssigned'), style: TextStyle(color: AppColors.textFaint))))
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: TextField(
                    style: TextStyle(color: AppColors.textPrimary),
                    decoration: InputDecoration(hintText: l10n.t('common.search'), prefixIcon: Icon(Icons.search_rounded, color: AppColors.textMuted)),
                    onChanged: (v) => setState(() => _search = v.toLowerCase()),
                  ),
                ),
                Expanded(
                  child: FutureBuilder<List<TeacherSummary>>(
                    future: _future,
                    builder: (context, snap) {
                      if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
                      if (snap.hasError) return Center(child: Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary)));
                      final all = snap.data ?? [];
                      final list = _search.isEmpty ? all : all.where((tc) => tc.fullName.toLowerCase().contains(_search)).toList();
                      if (list.isEmpty) return Center(child: Text(l10n.t('common.notFound'), style: TextStyle(color: AppColors.textFaint)));
                      return ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                        itemCount: list.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, i) {
                          final tch = list[i];
                          return PersonTile(
                            name: tch.fullName,
                            subtitle: tch.subject ?? '',
                            photoUrl: null,
                            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => TeacherDetailScreen(teacher: tch))),
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
