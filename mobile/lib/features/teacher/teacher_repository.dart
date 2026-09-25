import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/mock_data.dart';
import '../../core/providers.dart';
import '../../models/models.dart';
import '../auth/auth_controller.dart';

/// Sinf davomat jadvalidagi bitta o'quvchi qatori.
///
/// Maydonlar backenddagi `ClassAttendanceService#rows` bilan bir xil
/// (`backend/src/main/java/com/maktab/service/ClassAttendanceService.java`).
class ClassAttendanceRow {
  const ClassAttendanceRow({
    required this.studentId,
    required this.fullName,
    required this.present,
    required this.excused,
    required this.status,
    this.photoUrl,
    this.inTime,
    this.outTime,
    this.temperature,
    required this.guardians,
    required this.guardiansReachable,
  });

  final int studentId;
  final String fullName;
  final String? photoUrl;

  /// Haqiqiy kirish qayd etilganmi. `excused` bundan MUSTAQIL — ruxsati bor
  /// o'quvchi ham `present == false` bo'ladi.
  final bool present;

  /// Tasdiqlangan ruxsat so'rovi shu kunni qamrab oladimi.
  final bool excused;

  /// KELDI | SABABLI | KELMADI
  final String status;

  final String? inTime;
  final String? outTime;
  final double? temperature;

  /// Jami vasiylar va ulardan Telegram xabari yetib boradiganlari.
  final int guardians;
  final int guardiansReachable;

  factory ClassAttendanceRow.fromJson(Map<String, dynamic> j) => ClassAttendanceRow(
        studentId: (j['studentId'] as num).toInt(),
        fullName: j['fullName'] as String? ?? '',
        photoUrl: j['photoUrl'] as String?,
        present: j['present'] as bool? ?? false,
        excused: j['excused'] as bool? ?? false,
        status: j['status'] as String? ??
            ((j['present'] as bool? ?? false) ? 'KELDI' : 'KELMADI'),
        inTime: j['inTime'] as String?,
        outTime: j['outTime'] as String?,
        temperature: (j['temperature'] as num?)?.toDouble(),
        guardians: (j['guardians'] as num?)?.toInt() ?? 0,
        guardiansReachable: (j['guardiansReachable'] as num?)?.toInt() ?? 0,
      );
}

/// Bitta sinfning bir kunlik davomati (jamlanma + qatorlar).
class ClassAttendance {
  const ClassAttendance({
    required this.date,
    required this.total,
    required this.present,
    required this.absent,
    required this.pct,
    required this.rows,
  });

  final String date;
  final int total;
  final int present;
  final int absent;
  final int pct;
  final List<ClassAttendanceRow> rows;

  /// Xabar yuborilganda yetib boradigan vasiylar soni — tugmada ko'rsatiladi.
  /// Ruxsati bor o'quvchilar bu hisobga KIRMAYDI (ota-ona allaqachon bildirgan).
  int get reachableForAbsent => rows
      .where((r) => !r.present && !r.excused)
      .fold(0, (sum, r) => sum + r.guardiansReachable);

  factory ClassAttendance.fromJson(Map<String, dynamic> j) => ClassAttendance(
        date: j['date'] as String? ?? '',
        total: (j['total'] as num?)?.toInt() ?? 0,
        present: (j['present'] as num?)?.toInt() ?? 0,
        absent: (j['absent'] as num?)?.toInt() ?? 0,
        pct: (j['pct'] as num?)?.toInt() ?? 0,
        rows: (j['students'] as List? ?? const [])
            .map((e) => ClassAttendanceRow.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

/// "Kelmaganlarga xabar" natijasi.
class NotifyResult {
  const NotifyResult({
    required this.students,
    required this.guardians,
    required this.sent,
    required this.skippedNoTelegram,
  });

  final int students;
  final int guardians;
  final int sent;
  final int skippedNoTelegram;

  factory NotifyResult.fromJson(Map<String, dynamic> j) => NotifyResult(
        students: (j['students'] as num?)?.toInt() ?? 0,
        guardians: (j['guardians'] as num?)?.toInt() ?? 0,
        sent: (j['sent'] as num?)?.toInt() ?? 0,
        skippedNoTelegram: (j['skippedNoTelegram'] as num?)?.toInt() ?? 0,
      );
}

/// O'qituvchi ilovasi uchun repozitoriy.
///
/// Yangi backend endpointi QO'SHILMAGAN — mavjudlari ishlatiladi. Server TEACHER roli
/// uchun ro'yxatni o'zi filtrlaydi (`CurrentUserService#allowedClassIds`), shuning uchun
/// bu yerda qo'shimcha filtr shart emas: ilova nimani so'rasa ham server faqat
/// o'qituvchining o'z sinflarini qaytaradi.
class TeacherRepository {
  TeacherRepository(this._ref);
  final Ref _ref;

  /// O'qituvchi rahbar bo'lgan sinflar — server filtrlaydi.
  Future<List<SchoolClassRoom>> myClasses() async {
    if (kDemoMode) return MockData.classes;
    final res = await _ref.read(apiClientProvider).get('/api/classes');
    return (res.data as List)
        .map((e) => SchoolClassRoom.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Sinfning bir kunlik davomati. [date] — `yyyy-MM-dd`, berilmasa server bugunni oladi
  /// (Asia/Tashkent bo'yicha).
  Future<ClassAttendance> classAttendance(int classId, {String? date}) async {
    if (kDemoMode) {
      return const ClassAttendance(
          date: '', total: 0, present: 0, absent: 0, pct: 0, rows: []);
    }
    final res = await _ref.read(apiClientProvider).get(
          '/api/classes/$classId/attendance',
          query: {if (date != null) 'date': date},
        );
    return ClassAttendance.fromJson(res.data as Map<String, dynamic>);
  }

  /// Kelmaganlarning ota-onasiga Telegram xabari.
  ///
  /// [text] ichidagi `{student}`, `{class}`, `{date}` server tomonida HAR BIR o'quvchi
  /// uchun alohida almashtiriladi — ota-ona shaxsiy xabar oladi.
  Future<NotifyResult> notifyAbsent({
    required int classId,
    required String date,
    required String text,
  }) async {
    if (kDemoMode) {
      return const NotifyResult(students: 0, guardians: 0, sent: 0, skippedNoTelegram: 0);
    }
    final res = await _ref.read(apiClientProvider).post('/api/bot/notify-absent', data: {
      'classId': classId,
      'date': date,
      'text': text,
    });
    return NotifyResult.fromJson(res.data as Map<String, dynamic>);
  }
}

final teacherRepositoryProvider =
    Provider<TeacherRepository>((ref) => TeacherRepository(ref));

/// O'qituvchining sinflari.
final teacherClassesProvider = FutureProvider<List<SchoolClassRoom>>(
  (ref) => ref.read(teacherRepositoryProvider).myClasses(),
);
