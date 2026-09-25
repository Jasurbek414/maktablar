import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/mock_data.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key, required this.schoolId});
  final int schoolId;

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);

    final pendingCount = MockData.allAbsenceRequests.where((r) => r.status == 'PENDING').length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bildirishnomalar'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: AppColors.borderSubtle)),
            ),
            child: TabBar(
              controller: _tabCtrl,
              indicatorColor: AppColors.emerald,
              indicatorWeight: 2.5,
              labelColor: AppColors.emerald,
              unselectedLabelColor: AppColors.textMuted,
              tabs: [
                Tab(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('Arizalar'),
                      if (pendingCount > 0) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                          decoration: BoxDecoration(color: AppColors.red, borderRadius: BorderRadius.circular(10)),
                          child: Text('$pendingCount', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ],
                  ),
                ),
                const Tab(text: 'Xabarlar'),
              ],
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _ArizalarList(schoolId: widget.schoolId),
          _XabarlarList(schoolId: widget.schoolId),
        ],
      ),
    );
  }
}

class _ArizalarList extends ConsumerStatefulWidget {
  const _ArizalarList({required this.schoolId});
  final int schoolId;

  @override
  ConsumerState<_ArizalarList> createState() => _ArizalarListState();
}

class _ArizalarListState extends ConsumerState<_ArizalarList> {
  String _filter = 'PENDING';

  String _reasonLabel(String type) => switch (type) {
        'ILLNESS' => t('requests.reasonIllness'),
        'FAMILY' => t('requests.reasonFamily'),
        _ => t('requests.reasonOther'),
      };

  @override
  Widget build(BuildContext context) {
    final all = MockData.allAbsenceRequests;
    final filtered = _filter == 'ALL' ? all : all.where((r) => r.status == _filter).toList();

    return Column(
      children: [
        // Minimalist Filter Chips
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              _FilterChip(
                label: t('requests.pending'),
                active: _filter == 'PENDING',
                badge: all.where((r) => r.status == 'PENDING').length,
                onTap: () => setState(() => _filter = 'PENDING'),
              ),
              const SizedBox(width: 8),
              _FilterChip(
                label: t('requests.allStatuses'),
                active: _filter == 'ALL',
                onTap: () => setState(() => _filter = 'ALL'),
              ),
              const SizedBox(width: 8),
              _FilterChip(
                label: t('requests.approved'),
                active: _filter == 'APPROVED',
                onTap: () => setState(() => _filter = 'APPROVED'),
              ),
              const SizedBox(width: 8),
              _FilterChip(
                label: t('requests.rejected'),
                active: _filter == 'REJECTED',
                onTap: () => setState(() => _filter = 'REJECTED'),
              ),
            ],
          ),
        ),

        Expanded(
          child: filtered.isEmpty
              ? Center(child: Text(t('requests.empty'), style: TextStyle(color: AppColors.textFaint)))
              : ListView.separated(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, i) {
                    final req = filtered[i];
                    return _RequestCard(
                      request: req,
                      reasonLabel: _reasonLabel(req.reasonType),
                      onAction: () => setState(() {}),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _RequestCard extends StatelessWidget {
  const _RequestCard({required this.request, required this.reasonLabel, required this.onAction});
  final AbsenceRequest request;
  final String reasonLabel;
  final VoidCallback onAction;

  Color get _statusColor => switch (request.status) {
        'APPROVED' => AppColors.emerald,
        'REJECTED' => AppColors.red,
        _ => AppColors.amber,
      };

  String get _statusLabel => switch (request.status) {
        'APPROVED' => 'Tasdiqlangan',
        'REJECTED' => 'Rad etilgan',
        _ => 'Kutilmoqda',
      };

  Future<void> _review(BuildContext context, String newStatus) async {
    final ctrl = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.bgCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  newStatus == 'APPROVED' ? t('requests.approve') : t('requests.reject'),
                  style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16.5),
                ),
                IconButton(icon: Icon(Icons.close_rounded, color: AppColors.textFaint), onPressed: () => Navigator.pop(ctx, false)),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              style: TextStyle(color: AppColors.textPrimary, fontSize: 14),
              maxLines: 3,
              decoration: InputDecoration(
                labelText: t('requests.reviewNote'),
                hintText: 'Izoh kiritishingiz mumkin...',
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: Text(t('common.cancel')),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: newStatus == 'APPROVED' ? AppColors.emerald : AppColors.red,
                    ),
                    child: Text(t('common.save')),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
    if (ok != true) return;

    final idx = MockData.allAbsenceRequests.indexWhere((r) => r.id == request.id);
    if (idx >= 0) {
      final old = MockData.allAbsenceRequests[idx];
      MockData.allAbsenceRequests[idx] = AbsenceRequest(
        id: old.id, studentId: old.studentId, studentName: old.studentName,
        className: old.className, startDate: old.startDate, endDate: old.endDate,
        reasonType: old.reasonType, reasonText: old.reasonText,
        status: newStatus,
        reviewNote: ctrl.text.trim().isEmpty ? null : ctrl.text.trim(),
        reviewedBy: 'Direktor', createdAt: old.createdAt,
      );
    }
    onAction();
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(t('requests.statusChanged')),
        backgroundColor: AppColors.emerald,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppDecorations.card(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${request.studentName} · ${request.className ?? ''}',
                  style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 15),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: AppDecorations.badge(color: _statusColor),
                child: Text(_statusLabel, style: TextStyle(color: _statusColor, fontSize: 11, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(Icons.calendar_today_rounded, size: 13, color: AppColors.textMuted),
              const SizedBox(width: 6),
              Text('${request.startDate} — ${request.endDate}', style: TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: AppDecorations.badge(color: AppColors.cyan),
                child: Text(reasonLabel, style: TextStyle(color: AppColors.cyan, fontSize: 11)),
              ),
            ],
          ),
          if (request.reasonText != null && request.reasonText!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(request.reasonText!, style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.3)),
          ],
          if (request.reviewNote != null && request.reviewNote!.isNotEmpty) ...[
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
                      '${request.reviewedBy ?? 'Direktor'}: ${request.reviewNote}',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 12, fontStyle: FontStyle.italic),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (request.status == 'PENDING') ...[
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _review(context, 'REJECTED'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.red,
                      side: BorderSide(color: AppColors.red.withOpacity(0.4)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    child: Text(t('requests.reject'), style: const TextStyle(fontSize: 13)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _review(context, 'APPROVED'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                    child: Text(t('requests.approve'), style: const TextStyle(fontSize: 13)),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _XabarlarList extends ConsumerStatefulWidget {
  const _XabarlarList({required this.schoolId});
  final int schoolId;

  @override
  ConsumerState<_XabarlarList> createState() => _XabarlarListState();
}

class _XabarlarListState extends ConsumerState<_XabarlarList> {
  final _allMessages = MockData.studentMessages(1) + MockData.studentMessages(3);

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    if (_allMessages.isEmpty) {
      return Center(child: Text(t('detail.noMessages'), style: TextStyle(color: AppColors.textFaint)));
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      itemCount: _allMessages.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, i) {
        final msg = _allMessages[i];
        final isStaff = msg.senderType == 'STAFF';
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: AppDecorations.card(),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: isStaff ? AppColors.emerald.withOpacity(0.12) : AppColors.cyan.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  isStaff ? Icons.person_rounded : Icons.family_restroom_rounded,
                  size: 18,
                  color: isStaff ? AppColors.emerald : AppColors.cyan,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          msg.senderName,
                          style: TextStyle(
                            color: isStaff ? AppColors.emerald : AppColors.cyan,
                            fontWeight: FontWeight.w600,
                            fontSize: 13.5,
                          ),
                        ),
                        Text(
                          _fmtTime(msg.createdAt),
                          style: TextStyle(color: AppColors.textFaint, fontSize: 11),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(msg.text, style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5, height: 1.35)),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  String _fmtTime(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes} daq';
    if (diff.inHours < 24) return '${diff.inHours} soat';
    return '${dt.day}.${dt.month.toString().padLeft(2, '0')}';
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, required this.active, required this.onTap, this.badge = 0});
  final String label;
  final bool active;
  final VoidCallback onTap;
  final int badge;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: active ? AppColors.emerald : AppColors.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: active ? AppColors.emerald : AppColors.borderSubtle),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                color: active ? Colors.white : AppColors.textSecondary,
                fontWeight: active ? FontWeight.bold : FontWeight.w500,
                fontSize: 12.5,
              ),
            ),
            if (badge > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: active ? Colors.white.withOpacity(0.25) : AppColors.red,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$badge',
                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
