import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/mock_data.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';

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
  bool _generated = true; // Auto-generate on entry for smooth experience

  String _fmt(DateTime d) => '${d.day.toString().padLeft(2, '0')}.${d.month.toString().padLeft(2, '0')}.${d.year}';

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

    const avgPresent = 432;
    const avgAbsent = 18;
    const avgRate = 96;

    final topAbsent = [
      (MockData.students[2], 5),
      (MockData.students[4], 4),
      (MockData.students[6], 3),
      (MockData.students[1], 2),
      (MockData.students[8], 2),
    ];

    final barData = [415, 428, 421, 440, 432, 435, 428];
    final days = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

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
                    ...MockData.classes.map((c) => DropdownMenuItem(
                          value: c,
                          child: Text(c.name, style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5)),
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
                    onPressed: () => setState(() => _generated = true),
                  ),
                ),
              ],
            ),
          ),

          if (_generated) ...[
            const SizedBox(height: 16),

            // ── Summary Metrics ──
            Row(
              children: [
                _StatCard(value: '$avgRate%', label: 'O\'rtacha davomat', color: AppColors.emerald, icon: Icons.pie_chart_outline_rounded),
                const SizedBox(width: 10),
                _StatCard(value: '$avgPresent', label: 'Kelgan (o\'rt.)', color: AppColors.cyan, icon: Icons.check_circle_outline_rounded),
                const SizedBox(width: 10),
                _StatCard(value: '$avgAbsent', label: 'Kelmagan', color: AppColors.red, icon: Icons.cancel_outlined),
              ],
            ),
            const SizedBox(height: 16),

            // ── Chart ──
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
                        style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14.5),
                      ),
                      Text('Oxirgi 7 kun', style: TextStyle(color: AppColors.textFaint, fontSize: 11)),
                    ],
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    height: 150,
                    child: BarChart(
                      BarChartData(
                        maxY: 460,
                        minY: 380,
                        gridData: FlGridData(
                          show: true,
                          drawVerticalLine: false,
                          getDrawingHorizontalLine: (_) => FlLine(color: AppColors.borderSubtle, strokeWidth: 1),
                        ),
                        borderData: FlBorderData(show: false),
                        titlesData: FlTitlesData(
                          leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          bottomTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              getTitlesWidget: (value, _) => Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Text(
                                  days[value.toInt() % days.length],
                                  style: TextStyle(color: AppColors.textFaint, fontSize: 11),
                                ),
                              ),
                            ),
                          ),
                        ),
                        barGroups: List.generate(barData.length, (i) {
                          return BarChartGroupData(x: i, barRods: [
                            BarChartRodData(
                              toY: barData[i].toDouble(),
                              fromY: 380,
                              width: 18,
                              color: AppColors.emerald,
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(5)),
                            ),
                          ]);
                        }),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ── Top Absentees List ──
            Container(
              padding: const EdgeInsets.all(18),
              decoration: AppDecorations.card(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t('report.topAbsent'),
                    style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14.5),
                  ),
                  const SizedBox(height: 12),
                  ...List.generate(topAbsent.length, (i) {
                    final (student, daysCount) = topAbsent[i];
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          Container(
                            width: 26,
                            height: 26,
                            decoration: BoxDecoration(
                              color: i == 0 ? AppColors.red.withOpacity(0.12) : AppColors.bgInput,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '${i + 1}',
                              style: TextStyle(
                                color: i == 0 ? AppColors.red : AppColors.textMuted,
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(student.fullName, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w500, fontSize: 13.5)),
                                Text(student.className ?? '', style: TextStyle(color: AppColors.textMuted, fontSize: 11.5)),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                            decoration: AppDecorations.badge(color: AppColors.red),
                            child: Text(
                              '$daysCount kun',
                              style: TextStyle(color: AppColors.red, fontWeight: FontWeight.bold, fontSize: 11.5),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // ── Download PDF ──
            OutlinedButton.icon(
              icon: Icon(Icons.download_rounded, color: AppColors.emerald, size: 18),
              label: Text('Hisobotni yuklab olish (PDF)', style: TextStyle(color: AppColors.emerald, fontWeight: FontWeight.w600)),
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: AppColors.borderEmerald),
              ),
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                  content: const Text('PDF eksport tayyorlanmoqda...'),
                  backgroundColor: AppColors.emerald,
                ));
              },
            ),
            const SizedBox(height: 20),
          ],
        ],
      ),
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
