import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/error_state.dart';
import 'teacher_repository.dart';

/// O'qituvchining asosiy ish ekrani: o'z sinfining kunlik davomati va kelmaganlarning
/// ota-onasiga Telegram xabari.
///
/// Backendda yangi mantiq YOZILMAGAN — veb paneldagi sinf davomat oynasi bilan AYNAN
/// bir xil endpointlar ishlatiladi (`GET /api/classes/{id}/attendance`,
/// `POST /api/bot/notify-absent`), shuning uchun panel va ilova doim bir xil ro'yxatni
/// ko'rsatadi.
class TeacherAttendanceTab extends ConsumerStatefulWidget {
  const TeacherAttendanceTab({super.key});

  @override
  ConsumerState<TeacherAttendanceTab> createState() => _TeacherAttendanceTabState();
}

class _TeacherAttendanceTabState extends ConsumerState<TeacherAttendanceTab> {
  SchoolClassRoom? _selected;
  DateTime _day = DateTime.now();
  Future<ClassAttendance>? _future;
  bool _sending = false;

  String _ymd(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  String _human(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';

  void _load() {
    final cls = _selected;
    if (cls == null) return;
    setState(() {
      _future = ref
          .read(teacherRepositoryProvider)
          .classAttendance(cls.id, date: _ymd(_day));
    });
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _day,
      firstDate: DateTime(2024),
      lastDate: DateTime.now(),
    );
    if (picked == null) return;
    setState(() => _day = picked);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);

    final classesAsync = ref.watch(teacherClassesProvider);

    return Scaffold(
      appBar: AppBar(title: Text(t('teacher.attendanceTitle'))),
      body: classesAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => AppErrorState(
          message: apiErrorMessage(e, fallback: t('teacher.classesLoadFailed')),
          onRetry: () => ref.invalidate(teacherClassesProvider),
        ),
        data: (classes) {
          if (classes.isEmpty) return const TeacherNoClassAssigned();

          // Birinchi ochilishda birinchi sinf tanlanadi va davomat yuklanadi.
          if (_selected == null) {
            _selected = classes.first;
            WidgetsBinding.instance.addPostFrameCallback((_) => _load());
          }

          return Column(
            children: [
              _filterBar(classes),
              Expanded(child: _body()),
            ],
          );
        },
      ),
    );
  }

  Widget _filterBar(List<SchoolClassRoom> classes) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      decoration: BoxDecoration(
        color: AppColors.bgCard,
        border: Border(bottom: BorderSide(color: AppColors.borderSubtle)),
      ),
      child: Row(
        children: [
          // Sinf bittadan ko'p bo'lsagina tanlash ko'rsatiladi.
          if (classes.length > 1) ...[
            Expanded(
              child: DropdownButtonFormField<SchoolClassRoom>(
                value: _selected,
                isDense: true,
                dropdownColor: AppColors.bgCard,
                decoration: InputDecoration(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  labelText: t('report.selectClass'),
                ),
                items: classes
                    .map((c) => DropdownMenuItem(
                          value: c,
                          child: Text(c.name,
                              style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5)),
                        ))
                    .toList(),
                onChanged: (v) {
                  if (v == null) return;
                  setState(() => _selected = v);
                  _load();
                },
              ),
            ),
            const SizedBox(width: 10),
          ] else
            Expanded(
              child: Text(
                _selected?.name ?? '',
                style: TextStyle(
                    color: AppColors.textPrimary,
                    fontWeight: FontWeight.w700,
                    fontSize: 16),
              ),
            ),
          OutlinedButton.icon(
            onPressed: _pickDate,
            icon: const Icon(Icons.calendar_today_rounded, size: 16),
            label: Text(_human(_day), style: const TextStyle(fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Widget _body() {
    if (_future == null) return const Center(child: CircularProgressIndicator());

    return FutureBuilder<ClassAttendance>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snap.hasError) {
          return AppErrorState(
            message: apiErrorMessage(snap.error!, fallback: t('teacher.attendanceLoadFailed')),
            onRetry: _load,
          );
        }
        final data = snap.data;
        if (data == null) {
          return AppErrorState(message: t('teacher.attendanceLoadFailed'), onRetry: _load);
        }
        if (data.rows.isEmpty) {
          return Center(
            child: Text(t('classes.empty2'),
                style: TextStyle(color: AppColors.textFaint, fontSize: 13.5)),
          );
        }

        return RefreshIndicator(
          onRefresh: () async => _load(),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
            children: [
              _summary(data),
              const SizedBox(height: 14),
              _notifyButton(data),
              const SizedBox(height: 14),
              ...data.rows.map(_studentRow),
            ],
          ),
        );
      },
    );
  }

  Widget _summary(ClassAttendance d) {
    final excused = d.rows.where((r) => r.excused && !r.present).length;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: AppDecorations.card(),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _chip('${d.pct}%', t('teacher.rate'), AppColors.emerald),
          Container(width: 1, height: 30, color: AppColors.borderSubtle),
          _chip('${d.present}', t('teacher.present'), AppColors.cyan),
          Container(width: 1, height: 30, color: AppColors.borderSubtle),
          _chip('${d.absent - excused}', t('teacher.absent'), AppColors.red),
          if (excused > 0) ...[
            Container(width: 1, height: 30, color: AppColors.borderSubtle),
            _chip('$excused', t('teacher.excused'), AppColors.amber),
          ],
        ],
      ),
    );
  }

  Widget _chip(String value, String label, Color color) => Column(
        children: [
          Text(value,
              style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 17)),
          const SizedBox(height: 3),
          Text(label, style: TextStyle(color: AppColors.textMuted, fontSize: 11.5)),
        ],
      );

  Widget _notifyButton(ClassAttendance d) {
    final reachable = d.reachableForAbsent;
    final disabled = reachable == 0 || _sending;

    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: disabled ? null : () => _openNotifySheet(d),
        icon: _sending
            ? const SizedBox(
                width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
            : const Icon(Icons.send_rounded, size: 18),
        label: Text(reachable == 0
            ? t('teacher.noOneToNotify')
            : tParams('teacher.notifyAbsent', {'count': '$reachable'})),
      ),
    );
  }

  /// Xabar matnini tahrirlash oynasi. Andoza tayyor holda keladi, lekin o'qituvchi uni
  /// o'zgartira oladi. `{student}`/`{class}`/`{date}` server tomonida har bir o'quvchi
  /// uchun alohida almashtiriladi.
  Future<void> _openNotifySheet(ClassAttendance d) async {
    final cls = _selected;
    if (cls == null) return;

    final ctrl = TextEditingController(text: t('teacher.notifyTemplate'));
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.bgCard,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
            left: 20, right: 20, top: 20, bottom: MediaQuery.of(ctx).viewInsets.bottom + 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    tParams('teacher.notifyAbsent', {'count': '${d.reachableForAbsent}'}),
                    style: TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.bold,
                        fontSize: 16.5),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.close_rounded, color: AppColors.textFaint),
                  onPressed: () => Navigator.pop(ctx, false),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(t('teacher.notifyHint'),
                style: TextStyle(color: AppColors.textMuted, fontSize: 12, height: 1.35)),
            const SizedBox(height: 12),
            TextField(
              controller: ctrl,
              maxLines: 4,
              style: TextStyle(color: AppColors.textPrimary, fontSize: 14),
              decoration: InputDecoration(labelText: t('teacher.messageText')),
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
                    child: Text(t('teacher.send')),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );

    if (confirmed != true) return;
    final text = ctrl.text.trim();
    if (text.isEmpty) return;

    setState(() => _sending = true);
    try {
      final res = await ref.read(teacherRepositoryProvider).notifyAbsent(
            classId: cls.id,
            date: _ymd(_day),
            text: text,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(tParams('teacher.notifyResult', {
          'students': '${res.students}',
          'sent': '${res.sent}',
          'skipped': '${res.skippedNoTelegram}',
        })),
        backgroundColor: AppColors.emerald,
      ));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(apiErrorMessage(e, fallback: t('teacher.notifyFailed'))),
        backgroundColor: AppColors.red,
      ));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Widget _studentRow(ClassAttendanceRow r) {
    final (color, label) = switch (r.status) {
      'KELDI' => (AppColors.emerald, t('teacher.statusPresent')),
      'SABABLI' => (AppColors.amber, t('teacher.statusExcused')),
      _ => (AppColors.red, t('teacher.statusAbsent')),
    };

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: AppDecorations.card(),
        child: Row(
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(r.fullName,
                      style: TextStyle(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.w600,
                          fontSize: 14)),
                  if (r.inTime != null || r.outTime != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      '${r.inTime ?? "—"} → ${r.outTime ?? "—"}',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 11.5),
                    ),
                  ] else if (!r.present && r.guardiansReachable == 0) ...[
                    const SizedBox(height: 2),
                    // Xabar yubora olmaslik sababi ko'rsatiladi — jimgina o'tkazib
                    // yuborilmaydi.
                    Text(t('teacher.noTelegram'),
                        style: TextStyle(color: AppColors.textFaint, fontSize: 11.5)),
                  ],
                ],
              ),
            ),
            if (r.temperature != null) ...[
              Text(
                '${r.temperature!.toStringAsFixed(1)}°',
                style: TextStyle(
                  color: r.temperature! > 37.2 ? AppColors.red : AppColors.textMuted,
                  fontSize: 12,
                  fontWeight: r.temperature! > 37.2 ? FontWeight.bold : FontWeight.normal,
                ),
              ),
              const SizedBox(width: 10),
            ],
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
              decoration: AppDecorations.badge(color: color),
              child: Text(label,
                  style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}

/// O'qituvchiga sinf biriktirilmagan holat — bo'sh ekran o'rniga nima qilish kerakligi
/// aniq aytiladi (sinf rahbari veb paneldan tayinlanadi).
class TeacherNoClassAssigned extends StatelessWidget {
  const TeacherNoClassAssigned({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.school_outlined, size: 52, color: AppColors.textMuted),
            const SizedBox(height: 14),
            Text(
              t('teacher.noClassAssigned'),
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: AppColors.textPrimary,
                  fontSize: 15,
                  fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              t('teacher.noClassHint'),
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}
