import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/notes_panel.dart';

class TeacherDetailScreen extends ConsumerStatefulWidget {
  const TeacherDetailScreen({super.key, required this.teacher});
  final TeacherSummary teacher;

  @override
  ConsumerState<TeacherDetailScreen> createState() => _TeacherDetailScreenState();
}

class _TeacherDetailScreenState extends ConsumerState<TeacherDetailScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);
    final teacher = widget.teacher;

    return Scaffold(
      appBar: AppBar(
        title: Text(teacher.fullName, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            decoration: BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.borderSubtle))),
            child: TabBar(
              controller: _tabs,
              indicatorColor: AppColors.emerald,
              indicatorWeight: 2.5,
              labelColor: AppColors.emerald,
              unselectedLabelColor: AppColors.textMuted,
              tabs: [Tab(text: t('detail.infoTab')), Tab(text: t('detail.notesTab'))],
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: AppDecorations.card(),
                child: Column(
                  children: [
                    _InfoRow(label: t('profile.login'), value: teacher.username),
                    const Divider(height: 20),
                    _InfoRow(label: t('teacher.subject'), value: teacher.subject ?? t('common.notSpecified')),
                    const Divider(height: 20),
                    _InfoRow(label: t('profile.phoneField'), value: teacher.phone ?? t('common.notSpecified')),
                  ],
                ),
              ),
            ],
          ),
          NotesPanel(personType: 'TEACHER', personId: teacher.id),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
        Text(value, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5)),
      ],
    );
  }
}
