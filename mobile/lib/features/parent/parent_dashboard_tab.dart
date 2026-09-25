import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../core/attendance_stats.dart';
import '../../l10n/l10n.dart';
import '../../theme/app_theme.dart';
import '../../widgets/error_state.dart';
import '../../models/models.dart';
import '../auth/auth_controller.dart';
import 'child_detail_screen.dart';
import 'parent_notifications_screen.dart';
import 'parent_repository.dart';

/// Bosh sahifa uchun bitta yuklashda yig'iladigan ma'lumot.
///
/// MUHIM (2026-09-25 audit): bu ekran avval to'g'ridan-to'g'ri `MockData.parentChildren`,
/// `MockData.absenceRequests` va `MockData.childAttendanceToday`ni o'qirdi — ya'ni
/// `ParentRepository`ni butunlay chetlab o'tardi. Natijada `DEMO_MODE=false` bilan
/// qurilgan APK'da ham ota-ona BOSH SAHIFADA soxta farzandlarni ko'rardi. Endi barcha
/// ma'lumot serverdan keladi.
class _DashboardData {
  const _DashboardData({
    required this.children,
    required this.eventsByChild,
    required this.pendingRequestCount,
  });

  final List<Student> children;

  /// Farzand id -> davomat hodisalari. Qiymat `null` bo'lsa shu farzand uchun server
  /// javob bermadi — bunday holatda soxta qiymat KO'RSATILMAYDI, "—" chiqadi.
  final Map<int, List<AttendanceEvent>?> eventsByChild;

  /// Ko'rib chiqilmagan ruxsat so'rovlari soni. Backendda bu endpoint hali bo'lmasa
  /// (2-bosqich) 0 bo'ladi va tegishli karta umuman ko'rsatilmaydi.
  final int pendingRequestCount;
}

class ParentDashboardTab extends ConsumerStatefulWidget {
  const ParentDashboardTab({super.key, this.profile});
  final Map<String, dynamic>? profile;

  @override
  ConsumerState<ParentDashboardTab> createState() => _ParentDashboardTabState();
}

class _ParentDashboardTabState extends ConsumerState<ParentDashboardTab> {
  late Future<_DashboardData> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  void _reload() => setState(() => _future = _load());

  Future<_DashboardData> _load() async {
    final repo = ref.read(parentRepositoryProvider);

    // Farzandlar ro'yxati — asosiy ma'lumot. Bu yiqilsa butun ekran xato holatiga o'tadi
    // (jimgina soxta ro'yxatga tushib ketilmaydi).
    final children = await repo.children();

    final eventsByChild = <int, List<AttendanceEvent>?>{};
    for (final child in children) {
      try {
        eventsByChild[child.id] = await repo.attendance(child.id);
      } catch (_) {
        // Bitta farzandning davomati kelmasa qolganlari baribir ko'rsatiladi —
        // lekin uning o'rniga taxminiy/soxta raqam CHIQARILMAYDI.
        eventsByChild[child.id] = null;
      }
    }

    // Ruxsat so'rovlari endpointi 2-bosqichda qo'shiladi. Hozircha yo'qligi butun bosh
    // sahifani yiqitmasligi kerak, shuning uchun alohida ushlanadi va 0 deb qaraladi.
    var pending = 0;
    try {
      final requests = await repo.absenceRequests();
      pending = requests.where((r) => r.status == 'PENDING').length;
    } catch (_) {
      pending = 0;
    }

    return _DashboardData(
      children: children,
      eventsByChild: eventsByChild,
      pendingRequestCount: pending,
    );
  }

  /// Berilgan hodisalar ichidan BUGUNGI kunga tegishlilarini ajratadi
  /// (avvalgi `MockData.childAttendanceToday` o'rniga).
  List<AttendanceEvent> _todayEvents(List<AttendanceEvent> all) {
    final now = DateTime.now();
    return all
        .where((e) =>
            e.timestamp.year == now.year &&
            e.timestamp.month == now.month &&
            e.timestamp.day == now.day)
        .toList();
  }

  AttendanceEvent? _firstIn(List<AttendanceEvent> events) {
    for (final e in events) {
      if (e.type == 'IN') return e;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);

    final today = DateTime.now();
    final todayStr =
        '${today.day.toString().padLeft(2, '0')}.${today.month.toString().padLeft(2, '0')}.${today.year}';

    return FutureBuilder<_DashboardData>(
      future: _future,
      builder: (context, snap) {
        final pendingCount = snap.data?.pendingRequestCount ?? 0;

        return Scaffold(
          appBar: AppBar(
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t('parentDash.greeting'),
                  style: const TextStyle(
                      fontWeight: FontWeight.w700, fontSize: 18, letterSpacing: -0.3),
                ),
                Text(todayStr, style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
              ],
            ),
            actions: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  IconButton(
                    icon: Icon(Icons.notifications_outlined, color: AppColors.textPrimary),
                    tooltip: 'Bildirishnomalar',
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ParentNotificationsScreen()),
                    ),
                  ),
                  if (pendingCount > 0)
                    Positioned(
                      top: 10,
                      right: 10,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration:
                            BoxDecoration(color: AppColors.amber, shape: BoxShape.circle),
                      ),
                    ),
                ],
              ),
              IconButton(
                icon: Icon(Icons.logout_rounded, color: AppColors.textMuted, size: 20),
                onPressed: () => ref.read(authControllerProvider.notifier).logout(),
                tooltip: t('common.logout'),
              ),
              const SizedBox(width: 4),
            ],
          ),
          body: _buildBody(snap, pendingCount),
        );
      },
    );
  }

  Widget _buildBody(AsyncSnapshot<_DashboardData> snap, int pendingCount) {
    if (snap.connectionState == ConnectionState.waiting) {
      return const Center(child: CircularProgressIndicator());
    }

    // Xato holati HALOL ko'rsatiladi — avvalgidek jimgina MockData'ga tushib ketilmaydi.
    if (snap.hasError) {
      return AppErrorState(
        message: apiErrorMessage(snap.error!, fallback: 'Ma\'lumotni yuklab bo\'lmadi'),
        onRetry: _reload,
      );
    }

    final data = snap.data;
    if (data == null) {
      return AppErrorState(message: 'Ma\'lumot yo\'q', onRetry: _reload);
    }

    if (data.children.isEmpty) {
      return RefreshIndicator(
        onRefresh: () async => _reload(),
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 64),
          children: [
            Icon(Icons.family_restroom_rounded, size: 48, color: AppColors.textMuted),
            const SizedBox(height: 12),
            Text(
              'Sizga hali farzand biriktirilmagan — maktab ma\'muriyatiga murojaat qiling',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted, fontSize: 13.5),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: () async => _reload(),
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // ── Ko'rib chiqilayotgan arizalar kartasi ──
          if (pendingCount > 0) ...[
            InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ParentNotificationsScreen()),
              ),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.amber.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.amber.withOpacity(0.25)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                          color: AppColors.amber.withOpacity(0.15), shape: BoxShape.circle),
                      child:
                          Icon(Icons.hourglass_top_rounded, color: AppColors.amber, size: 18),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$pendingCount ta ariza ko\'rib chiqilmoqda',
                            style: TextStyle(
                                color: AppColors.amber,
                                fontWeight: FontWeight.bold,
                                fontSize: 13.5),
                          ),
                          Text(
                            'Direktor tomonidan ko\'rib chiqilgach bildirishnoma keladi',
                            style: TextStyle(color: AppColors.textMuted, fontSize: 11.5),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.chevron_right_rounded, color: AppColors.amber, size: 20),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
          ],

          // ── Sarlavha ──
          Text(
            'Farzandlar holati',
            style: TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w700,
                fontSize: 15.5,
                letterSpacing: -0.3),
          ),
          const SizedBox(height: 10),

          // ── Farzand kartalari ──
          ...data.children.map((child) => _childCard(child, data.eventsByChild[child.id])),
        ],
      ),
    );
  }

  Widget _childCard(Student child, List<AttendanceEvent>? allEvents) {
    // Davomat ma'lumoti kelmagan bo'lsa (`null`) — holat "noma'lum", soxta emas.
    final hasData = allEvents != null;
    final todayEvents = hasData ? _todayEvents(allEvents) : const <AttendanceEvent>[];
    final hasArrived = hasData && todayEvents.isNotEmpty;
    final inEvent = _firstIn(todayEvents);
    final stats = hasData ? computeAttendanceStats(allEvents, days: 30) : null;
    final initial = child.fullName.isNotEmpty ? child.fullName[0].toUpperCase() : '?';

    final Color statusColor =
        !hasData ? AppColors.textMuted : (hasArrived ? AppColors.emerald : AppColors.red);
    final String statusText = !hasData
        ? 'Ma\'lumot yo\'q'
        : hasArrived
            ? (inEvent != null
                ? '${inEvent.timestamp.hour.toString().padLeft(2, '0')}:${inEvent.timestamp.minute.toString().padLeft(2, '0')}'
                : 'Maktabda')
            : 'Kelmagan';

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => ChildDetailScreen(student: child)),
        ),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: AppDecorations.card(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      initial,
                      style: TextStyle(
                        color: statusColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          child.fullName,
                          style: TextStyle(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.w700,
                              fontSize: 15.5),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${child.className ?? ''} · ${child.schoolName ?? ''}',
                          style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: AppDecorations.badge(color: statusColor),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            color: statusColor,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          statusText,
                          style: TextStyle(
                            color: statusColor,
                            fontSize: 11.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Divider(color: AppColors.borderSubtle),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Oylik davomat foizi',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                  Text(
                    stats != null ? '${stats.percent}%' : '—',
                    style: TextStyle(
                        color: stats != null ? AppColors.emerald : AppColors.textMuted,
                        fontWeight: FontWeight.bold,
                        fontSize: 13.5),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: stats != null ? stats.percent / 100 : 0,
                  backgroundColor: AppColors.borderSubtle,
                  color: AppColors.emerald,
                  minHeight: 6,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

