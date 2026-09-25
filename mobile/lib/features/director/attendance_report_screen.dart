import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../../widgets/error_state.dart';
import 'director_repository.dart';

class AttendanceReportScreen extends ConsumerStatefulWidget {
  const AttendanceReportScreen({super.key, required this.schoolId});
  final int schoolId;

  @override
  ConsumerState<AttendanceReportScreen> createState() => _AttendanceReportScreenState();
}

class _AttendanceReportScreenState extends ConsumerState<AttendanceReportScreen> {
  DateTime _from = DateTime.now().subtract(const Duration(days: 30));
  DateTime _to = DateTime.now();
  SchoolClassRoom? _selectedClass;

  /// Hisobot ma'lumoti — ekran ochilishi bilan avtomatik yuklanadi.
  ///
  /// MUHIM (2026-09-25 audit): avval bu ekrandagi HAMMA raqam qattiq kodlangan edi
  /// (`avgRate = 96`, `avgPresent = 432`, `barData = [415, 428, ...]`) va "eng ko'p
  /// qoldirganlar" ro'yxati `MockData.students`dan olinardi. Ya'ni sana yoki sinf
  /// o'zgartirilsa ham ekrandagi raqamlar hech qachon o'zgarmasdi. Endi ma'lumot
  /// `GET /api/v1/reports/weekly/` dan keladi (u backendda allaqachon mavjud edi).
  Future<RangeReport>? _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<RangeReport> _load() => ref.read(directorRepositoryProvider).rangeReport(
        schoolId: widget.schoolId,
        from: _from,
        to: _to,
        classId: _selectedClass?.id,
      );

  void _generate() => setState(() => _future = _load());

  String _fmt(DateTime d) => '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';

  String _fmtShort(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}';

  Future<void> _pickDate(bool isFrom) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: isFrom ? _from : _to,
      firstDate: DateTime(2024),
      lastDate: DateTime.now(),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: ColorScheme.dark(
            primary: AppColors.emerald,
            surface: AppColors.bgCard,
          ),
        ),
        child: child!,
      ),
    );
    if (picked == null) return;
    setState(() {
      if (isFrom) {
        _from = picked;
        if (_to.isBefore(_from)) _to = _from;
      } else {
        _to = picked;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);

    final classesAsync = ref.watch(directorClassesProvider(widget.schoolId));

    return Scaffold(
      appBar: AppBar(title: Text(t('report.title'))),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // ── Minimalist Filter Section ──
          Container(
            padding: const EdgeInsets.all(18),
            decoration: AppDecorations.card(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  t('report.selectPeriod'),
                  style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _DateField(
                        label: t('requests.startDate'),
                        value: _fmt(_from),
                        onTap: () => _pickDate(true),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _DateField(
                        label: t('requests.endDate'),
                        value: _fmt(_to),
                        onTap: () => _pickDate(false),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<SchoolClassRoom?>(
                  value: _selectedClass,
                  dropdownColor: AppColors.bgCard,
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    labelText: t('report.selectClass'),
                  ),
                  items: [
                    DropdownMenuItem(
                      value: null,
                      child: Text(t('report.allClasses'), style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5)),
                    ),
                    // Sinflar serverdan keladi; ular hali yuklanmagan bo'lsa ro'yxat
                    // faqat "Barcha sinflar" bandidan iborat bo'ladi.
                    ...(classesAsync.valueOrNull ?? const <SchoolClassRoom>[])
                        .map((c) => DropdownMenuItem(
                              value: c,
                              child: Text(c.name,
                                  style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5)),
                            )),
                  ],
                  onChanged: (v) => setState(() => _selectedClass = v),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.refresh_rounded, size: 18),
                    label: Text(t('report.generate')),
                    onPressed: _generate,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // ── Natija: haqiqiy hisobot (GET /api/v1/reports/weekly/) ──
          FutureBuilder<RangeReport>(
            future: _future,
            builder: (context, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 48),
                  child: Center(child: CircularProgressIndicator()),
                );
              }
              if (snap.hasError) {
                return AppErrorState(
                  message: apiErrorMessage(snap.error!,
                      fallback: 'Hisobotni yuklab bo\'lmadi'),
                  onRetry: _generate,
                );
              }
              final report = snap.data;
              if (report == null || report.isEmpty) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 48),
                  child: Center(
                    child: Text(
                      'Tanlangan davr uchun ma\'lumot yo\'q',
                      style: TextStyle(color: AppColors.textFaint, fontSize: 13.5),
                    ),
                  ),
                );
              }
              return _results(report);
            },
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  /// Haqiqiy hisobot natijasi: jamlanma ko'rsatkichlar + kunlik dinamika grafigi.
  ///
  /// "Eng ko'p qoldirgan o'quvchilar" bloki ATAYLAB olib tashlandi — backendda bunday
  /// endpoint yo'q va avvalgi ro'yxat `MockData.students`dan olingan soxta ro'yxat edi.
  /// Soxta "PDF yuklab olish" tugmasi ham olib tashlandi (u hech narsa yuklamasdi, faqat
  /// "tayyorlanmoqda..." deb yozardi). Sinf bo'yicha haqiqiy Excel yuklab olish veb
  /// panelda va sinf davomat ekranida mavjud.
  Widget _results(RangeReport report) {
    final rate = report.rate.round();
    final days = report.days;
    // Grafik o'qini ma'lumotga moslaymiz — avval 380..460 qattiq kodlangan edi.
    final maxPresent =
        days.map((d) => d.present).fold<int>(0, (a, b) => a > b ? a : b);
    final maxY = (maxPresent <= 0 ? 1 : maxPresent * 1.15).toDouble();

    return Column(
      children: [
        // ── Jamlanma ──
        Row(
          children: [
            _StatCard(
                value: '$rate%',
                label: 'O\'rtacha davomat',
                color: AppColors.emerald,
                icon: Icons.pie_chart_outline_rounded),
            const SizedBox(width: 10),
            _StatCard(
                value: '${report.present}',
                label: 'Kelgan (jami)',
                color: AppColors.cyan,
                icon: Icons.check_circle_outline_rounded),
            const SizedBox(width: 10),
            _StatCard(
                value: '${report.absent}',
                label: 'Kelmagan (jami)',
                color: AppColors.red,
                icon: Icons.cancel_outlined),
          ],
        ),
        const SizedBox(height: 16),

        // ── Kunlik dinamika ──
        Container(
          padding: const EdgeInsets.all(18),
          decoration: AppDecorations.card(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Davomat dinamikasi',
                    style: TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600,
                        fontSize: 14.5),
                  ),
                  Text('${days.length} kun',
                      style: TextStyle(color: AppColors.textFaint, fontSize: 11)),
                ],
              ),
              const SizedBox(height: 18),
              SizedBox(
                height: 150,
                child: BarChart(
                  BarChartData(
                    maxY: maxY,
                    minY: 0,
                    gridData: FlGridData(
                      show: true,
                      drawVerticalLine: false,
                      getDrawingHorizontalLine: (_) =>
                          FlLine(color: AppColors.borderSubtle, strokeWidth: 1),
                    ),
                    borderData: FlBorderData(show: false),
                    titlesData: FlTitlesData(
                      leftTitles:
                          const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      rightTitles:
                          const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      topTitles:
                          const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          // Uzun davrda har bir sana sig'maydi — oraliq tashlab ko'rsatamiz.
                          interval: 1,
                          getTitlesWidget: (value, _) {
                            final i = value.toInt();
                            if (i < 0 || i >= days.length) return const SizedBox.shrink();
                            final step = (days.length / 7).ceil();
                            if (step > 1 && i % step != 0) return const SizedBox.shrink();
                            return Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Text(
                                _fmtShort(days[i].date),
                                style: TextStyle(color: AppColors.textFaint, fontSize: 10),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                    barGroups: List.generate(days.length, (i) {
                      return BarChartGroupData(x: i, barRods: [
                        BarChartRodData(
                          toY: days[i].present.toDouble(),
                          fromY: 0,
                          width: days.length > 14 ? 6 : 18,
                          color: AppColors.emerald,
                          borderRadius:
                              const BorderRadius.vertical(top: Radius.circular(5)),
                        ),
                      ]);
                    }),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _DateField extends StatelessWidget {
  const _DateField({required this.label, required this.value, required this.onTap});
  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: AppColors.bgInput,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.borderSubtle),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(Icons.calendar_today_rounded, size: 13, color: AppColors.emerald),
                const SizedBox(width: 6),
                Text(value, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.value, required this.label, required this.color, required this.icon});
  final String value;
  final String label;
  final Color color;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
        decoration: AppDecorations.card(),
        child: Column(
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(height: 6),
            Text(value, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 17, letterSpacing: -0.3)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(color: AppColors.textMuted, fontSize: 10.5), textAlign: TextAlign.center, maxLines: 1),
          ],
        ),
      ),
    );
  }
}
