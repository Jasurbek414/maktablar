import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/mock_data.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';

class ParentNotificationsScreen extends ConsumerStatefulWidget {
  const ParentNotificationsScreen({super.key});

  @override
  ConsumerState<ParentNotificationsScreen> createState() =>
      _ParentNotificationsScreenState();
}

class _ParentNotificationsScreenState
    extends ConsumerState<ParentNotificationsScreen>
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

    final pendingCount =
        MockData.absenceRequests.where((r) => r.status == 'PENDING').length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Bildirishnomalar'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            decoration: BoxDecoration(border: Border(bottom: BorderSide(color: AppColors.borderSubtle))),
            child: TabBar(
              controller: _tabCtrl,
              indicatorColor: AppColors.emerald,
              indicatorWeight: 2.5,
              labelColor: AppColors.emerald,
              unselectedLabelColor: AppColors.textMuted,
              tabs: [
                Tab(
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    const Text('Arizalarim'),
                    if (pendingCount > 0) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(color: AppColors.amber, borderRadius: BorderRadius.circular(10)),
                        child: Text('$pendingCount',
                            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ]),
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
          _ArizaStatusList(),
          _XabarlarList(),
        ],
      ),
    );
  }
}

class _ArizaStatusList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(themeModeProvider);
    final requests = MockData.absenceRequests;

    if (requests.isEmpty) {
      return Center(
          child: Text(t('requests.empty'),
              style: TextStyle(color: AppColors.textFaint)));
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      itemCount: requests.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, i) => _RequestStatusCard(request: requests[i]),
    );
  }
}

class _RequestStatusCard extends StatelessWidget {
  const _RequestStatusCard({required this.request});
  final AbsenceRequest request;

  Color get _color => switch (request.status) {
        'APPROVED' => AppColors.emerald,
        'REJECTED' => AppColors.red,
        _ => AppColors.amber,
      };

  String get _statusLabel => switch (request.status) {
        'APPROVED' => t('requests.approved'),
        'REJECTED' => t('requests.rejected'),
        _ => t('requests.pending'),
      };

  IconData get _statusIcon => switch (request.status) {
        'APPROVED' => Icons.check_circle_rounded,
        'REJECTED' => Icons.cancel_rounded,
        _ => Icons.hourglass_top_rounded,
      };

  String _reasonLabel(String type) => switch (type) {
        'ILLNESS' => t('requests.reasonIllness'),
        'FAMILY' => t('requests.reasonFamily'),
        _ => t('requests.reasonOther'),
      };

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppDecorations.card(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(_statusIcon, color: _color, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '${request.studentName} · ${request.className ?? ''}',
                style: TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w600,
                    fontSize: 14.5),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: AppDecorations.badge(color: _color),
              child: Text(_statusLabel,
                  style: TextStyle(color: _color, fontSize: 11, fontWeight: FontWeight.bold)),
            ),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            Icon(Icons.calendar_today_rounded, size: 12, color: AppColors.textMuted),
            const SizedBox(width: 5),
            Text('${request.startDate} — ${request.endDate}',
                style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: AppDecorations.badge(color: AppColors.cyan),
              child: Text(_reasonLabel(request.reasonType),
                  style: TextStyle(color: AppColors.cyan, fontSize: 11)),
            ),
          ]),
          if (request.reasonText != null && request.reasonText!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(request.reasonText!,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.35)),
          ],
          if (request.reviewNote != null && request.reviewNote!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                  color: AppColors.bgInput,
                  borderRadius: BorderRadius.circular(10)),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Icon(Icons.comment_rounded, size: 13, color: _color),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    '${request.reviewedBy ?? 'Maktab'}: ${request.reviewNote}',
                    style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 12,
                        fontStyle: FontStyle.italic),
                  ),
                ),
              ]),
            ),
          ],
        ],
      ),
    );
  }
}

class _XabarlarList extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(themeModeProvider);

    final msgs = [
      ...MockData.studentMessages(MockData.parentChildren.first.id),
      if (MockData.parentChildren.length > 1)
        ...MockData.studentMessages(MockData.parentChildren[1].id),
    ];

    if (msgs.isEmpty) {
      return Center(
          child: Text(t('detail.noMessages'),
              style: TextStyle(color: AppColors.textFaint)));
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      itemCount: msgs.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, i) {
        final msg = msgs[i];
        final isStaff = msg.senderType == 'STAFF';
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: AppDecorations.card(),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: isStaff
                    ? AppColors.emerald.withOpacity(0.12)
                    : AppColors.cyan.withOpacity(0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(
                isStaff ? Icons.school_rounded : Icons.family_restroom_rounded,
                size: 18,
                color: isStaff ? AppColors.emerald : AppColors.cyan,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text(msg.senderName,
                      style: TextStyle(
                          color: isStaff ? AppColors.emerald : AppColors.cyan,
                          fontWeight: FontWeight.w600,
                          fontSize: 13.5)),
                  Text(_fmt(msg.createdAt),
                      style: TextStyle(color: AppColors.textFaint, fontSize: 11)),
                ]),
                const SizedBox(height: 5),
                Text(msg.text,
                    style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5, height: 1.35)),
              ]),
            ),
          ]),
        );
      },
    );
  }

  String _fmt(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 60) return '${diff.inMinutes} daq';
    if (diff.inHours < 24) return '${diff.inHours} soat';
    return '${dt.day}.${dt.month.toString().padLeft(2, '0')}';
  }
}
