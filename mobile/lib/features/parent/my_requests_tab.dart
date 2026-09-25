import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import 'parent_repository.dart';
import 'submit_absence_screen.dart';

class MyRequestsTab extends ConsumerStatefulWidget {
  const MyRequestsTab({super.key});

  @override
  ConsumerState<MyRequestsTab> createState() => _MyRequestsTabState();
}

class _MyRequestsTabState extends ConsumerState<MyRequestsTab> {
  late Future<List<AbsenceRequest>> _future;
  String _filter = 'ALL';

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    setState(() {
      _future = ref.read(parentRepositoryProvider).absenceRequests();
    });
  }

  Future<void> _onFabTap() async {
    try {
      final students = await ref.read(parentRepositoryProvider).children();
      if (!mounted) return;
      if (students.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t('requests.empty'))));
        return;
      }
      final res = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => SubmitAbsenceScreen(students: students)),
      );
      if (res == true) {
        _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);

    return Scaffold(
      appBar: AppBar(title: Text(t('nav.requests'))),
      body: Column(
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _FilterTab(label: t('requests.filterAll'), isSelected: _filter == 'ALL', onTap: () => setState(() => _filter = 'ALL')),
                const SizedBox(width: 8),
                _FilterTab(label: t('requests.filterPending'), isSelected: _filter == 'PENDING', onTap: () => setState(() => _filter = 'PENDING')),
                const SizedBox(width: 8),
                _FilterTab(label: t('requests.filterApproved'), isSelected: _filter == 'APPROVED', onTap: () => setState(() => _filter = 'APPROVED')),
                const SizedBox(width: 8),
                _FilterTab(label: t('requests.filterRejected'), isSelected: _filter == 'REJECTED', onTap: () => setState(() => _filter = 'REJECTED')),
              ],
            ),
          ),
          Expanded(
            child: FutureBuilder<List<AbsenceRequest>>(
              future: _future,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snap.hasError) {
                  return Center(child: Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary)));
                }
                final allReqs = snap.data ?? [];
                final reqs = _filter == 'ALL' ? allReqs : allReqs.where((r) => r.status == _filter).toList();

                if (reqs.isEmpty) {
                  return Center(child: Text(t('requests.empty'), style: TextStyle(color: AppColors.textFaint)));
                }

                return ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6).copyWith(bottom: 80),
                  itemCount: reqs.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, i) => _RequestCard(req: reqs[i]),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _onFabTap,
        backgroundColor: AppColors.emerald,
        foregroundColor: Colors.white,
        elevation: 3,
        icon: const Icon(Icons.add_rounded, size: 20),
        label: const Text('Ariza yuborish', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
      ),
    );
  }
}

class _FilterTab extends StatelessWidget {
  const _FilterTab({required this.label, required this.isSelected, required this.onTap});
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.emerald : AppColors.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? AppColors.emerald : AppColors.borderSubtle),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : AppColors.textSecondary,
            fontSize: 12.5,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({required this.req});
  final AbsenceRequest req;

  String _formatDateString(String d) {
    try {
      final dt = DateTime.parse(d);
      return DateFormat('dd.MM.yyyy').format(dt);
    } catch (_) {
      return d;
    }
  }

  Color get _statusColor => switch (req.status) {
        'APPROVED' => AppColors.emerald,
        'REJECTED' => AppColors.red,
        _ => AppColors.amber,
      };

  String get _statusLabel => switch (req.status) {
        'APPROVED' => t('requests.approved'),
        'REJECTED' => t('requests.rejected'),
        _ => t('requests.pending'),
      };

  String _reasonLabel(String type) => switch (type) {
        'ILLNESS' => t('requests.reasonIllness'),
        'FAMILY' => t('requests.reasonFamily'),
        _ => t('requests.reasonOther'),
      };

  @override
  Widget build(BuildContext context) {
    final start = _formatDateString(req.startDate);
    final end = _formatDateString(req.endDate);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppDecorations.card(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                req.studentName,
                style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 15),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: AppDecorations.badge(color: _statusColor),
                child: Text(_statusLabel, style: TextStyle(color: _statusColor, fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(Icons.calendar_today_rounded, size: 13, color: AppColors.textMuted),
              const SizedBox(width: 6),
              Text('$start — $end', style: TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: AppDecorations.badge(color: AppColors.cyan),
                child: Text(_reasonLabel(req.reasonType), style: TextStyle(color: AppColors.cyan, fontSize: 11)),
              ),
            ],
          ),
          if (req.reasonText != null && req.reasonText!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(req.reasonText!, style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.35)),
          ],
          if (req.reviewNote != null && req.reviewNote!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: AppColors.bgInput, borderRadius: BorderRadius.circular(10)),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.notes_rounded, size: 14, color: AppColors.textMuted),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '${req.reviewedBy ?? 'Maktab'}: ${req.reviewNote}',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 12, fontStyle: FontStyle.italic),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
