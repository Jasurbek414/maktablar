import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import 'child_detail_screen.dart';
import 'parent_repository.dart';

class ChildrenTab extends ConsumerStatefulWidget {
  const ChildrenTab({super.key});

  @override
  ConsumerState<ChildrenTab> createState() => _ChildrenTabState();
}

class _ChildrenTabState extends ConsumerState<ChildrenTab> {
  late Future<List<Student>> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(parentRepositoryProvider).children();
  }

  void _reload() => setState(() => _future = ref.read(parentRepositoryProvider).children());

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);
    return Scaffold(
      appBar: AppBar(title: Text(t('nav.children'))),
      body: RefreshIndicator(
        onRefresh: () async => _reload(),
        child: FutureBuilder<List<Student>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snap.hasError) {
              return _ErrorState(message: apiErrorMessage(snap.error!), onRetry: _reload);
            }
            final kids = snap.data ?? [];
            if (kids.isEmpty) {
              return ListView(
                padding: const EdgeInsets.all(24),
                children: [
                  const SizedBox(height: 80),
                  Icon(Icons.family_restroom_rounded, size: 56, color: AppColors.textFaint),
                  const SizedBox(height: 16),
                  Text(
                    t('children.notAssigned'),
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    t('children.contactSchool'),
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.textFaint, fontSize: 12.5),
                  ),
                ],
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: kids.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (context, i) => _ChildCard(
                student: kids[i],
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => ChildDetailScreen(student: kids[i])),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _ChildCard extends StatelessWidget {
  const _ChildCard({required this.student, required this.onTap});
  final Student student;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [AppColors.bgCard, AppColors.bgCardAlt], begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.borderEmerald),
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: student.photoUrl != null
                  ? CachedNetworkImage(
                      imageUrl: '$kApiBaseUrl${student.photoUrl}',
                      width: 56,
                      height: 56,
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => _initialsAvatar(student.fullName),
                    )
                  : _initialsAvatar(student.fullName),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(student.fullName, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 15)),
                  const SizedBox(height: 4),
                  Text(
                    [if (student.className != null) student.className!, if (student.schoolName != null) student.schoolName!].join(' · '),
                    style: TextStyle(color: AppColors.textMuted, fontSize: 12.5),
                  ),
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: AppColors.textFaint),
          ],
        ),
      ),
    );
  }

  Widget _initialsAvatar(String name) => Container(
        width: 56,
        height: 56,
        color: AppColors.emerald.withOpacity(0.15),
        alignment: Alignment.center,
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : '?',
          style: TextStyle(color: AppColors.emerald, fontWeight: FontWeight.bold, fontSize: 20),
        ),
      );
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline_rounded, color: AppColors.red, size: 40),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: TextStyle(color: AppColors.textSecondary)),
            const SizedBox(height: 16),
            OutlinedButton(onPressed: onRetry, child: Text(t('common.retry'))),
          ],
        ),
      ),
    );
  }
}
