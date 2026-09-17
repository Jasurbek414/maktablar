import '../models/models.dart';

/// Veb-ilova (frontend/src/utils/attendanceStats.js) bilan bir xil hisob-kitob —
/// faqat haqiqiy IN/OUT hodisalaridan. "Kechikish" hisoblanmaydi, chunki backend
/// schemasida maktab boshlanish vaqti tushunchasi yo'q (V1ReportsController bilan
/// bir xil qoida).
class AttendanceStats {
  final int presentDays;
  final int absentDays;
  final int schoolDays;
  final int percent;
  final int periodDays;

  AttendanceStats({
    required this.presentDays,
    required this.absentDays,
    required this.schoolDays,
    required this.percent,
    required this.periodDays,
  });
}

bool _isSchoolDay(DateTime d) => d.weekday != DateTime.sunday;

AttendanceStats computeAttendanceStats(List<AttendanceEvent> events, {int days = 30}) {
  final now = DateTime.now();
  final from = DateTime(now.year, now.month, now.day).subtract(Duration(days: days - 1));

  final presentDates = <String>{};
  for (final ev in events) {
    if (ev.type != 'IN') continue;
    if (ev.timestamp.isBefore(from) || ev.timestamp.isAfter(now)) continue;
    presentDates.add('${ev.timestamp.year}-${ev.timestamp.month}-${ev.timestamp.day}');
  }

  var schoolDays = 0;
  for (var d = from; !d.isAfter(now); d = d.add(const Duration(days: 1))) {
    if (_isSchoolDay(d)) schoolDays++;
  }

  final presentDays = presentDates.length;
  final absentDays = (schoolDays - presentDays).clamp(0, schoolDays);
  final percent = schoolDays > 0 ? ((presentDays / schoolDays) * 100).round() : 0;

  return AttendanceStats(
    presentDays: presentDays,
    absentDays: absentDays,
    schoolDays: schoolDays,
    percent: percent,
    periodDays: days,
  );
}

/// Faqat haqiqiy sonlardan tuzilgan xulosa kaliti — shaxsiyat/psixologik baho EMAS.
String attendanceSummaryKey(AttendanceStats s) {
  if (s.schoolDays == 0) return 'noData';
  if (s.presentDays == 0) return 'noAttendance';
  if (s.percent >= 90) return 'excellent';
  if (s.percent >= 75) return 'good';
  if (s.percent >= 50) return 'moderate';
  return 'low';
}
