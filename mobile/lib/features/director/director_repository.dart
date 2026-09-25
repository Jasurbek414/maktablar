import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../models/models.dart';
import '../../core/mock_data.dart';
import '../auth/auth_controller.dart';

class DirectorRepository {
  DirectorRepository(this._ref);
  final Ref _ref;

  Future<Map<String, dynamic>> school(int schoolId) async {
    if (kDemoMode) return MockData.school;
    final res = await _ref.read(apiClientProvider).get('/api/schools/$schoolId');
    return res.data as Map<String, dynamic>;
  }

  Future<List<Student>> students(int schoolId) async {
    if (kDemoMode) return MockData.students;
    final res = await _ref.read(apiClientProvider).get('/api/students', query: {'schoolId': schoolId});
    return (res.data as List).map((e) => Student.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<TeacherSummary>> teachers(int schoolId) async {
    if (kDemoMode) return MockData.teachers;
    final res = await _ref.read(apiClientProvider).get('/api/users', query: {'role': 'TEACHER', 'schoolId': schoolId});
    return (res.data as List).map((e) => TeacherSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<SchoolClassRoom>> classes(int schoolId) async {
    if (kDemoMode) return MockData.classes;
    final res = await _ref.read(apiClientProvider).get('/api/classes', query: {'schoolId': schoolId});
    return (res.data as List).map((e) => SchoolClassRoom.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Student>> studentsByClass(int classId) async {
    if (kDemoMode) return MockData.students.where((s) => s.id % 3 == classId % 3).toList();
    final res = await _ref.read(apiClientProvider).get('/api/students', query: {'classId': classId});
    return (res.data as List).map((e) => Student.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<AttendanceOverview> attendanceOverview(int schoolId) async {
    if (kDemoMode) return MockData.attendanceOverview;
    final res = await _ref.read(apiClientProvider).get('/api/attendance/overview', query: {'schoolId': schoolId});
    return AttendanceOverview.fromJson(res.data as Map<String, dynamic>);
  }

  Future<List<CameraInfo>> cameras(int schoolId) async {
    if (kDemoMode) return MockData.cameras;
    final res = await _ref.read(apiClientProvider).get('/api/cameras', query: {'schoolId': schoolId});
    return (res.data as List).map((e) => CameraInfo.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<CameraEvent>> cameraEvents(int cameraId) async {
    if (kDemoMode) return [];
    final res = await _ref.read(apiClientProvider).get('/api/cameras/$cameraId/events');
    return (res.data as List).map((e) => CameraEvent.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<RecognitionDevice>> recognitionDevices(int schoolId) async {
    if (kDemoMode) return MockData.devices;
    final res = await _ref.read(apiClientProvider).get('/api/attendance/devices/$schoolId');
    return (res.data as List).map((e) => RecognitionDevice.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<RecognitionEvent>> recognitionFeed(int schoolId, {String? date}) async {
    if (kDemoMode) return MockData.recognitionFeed();
    final res = await _ref.read(apiClientProvider).get('/api/attendance/school/$schoolId', query: {
      if (date != null) 'date': date,
    });
    return (res.data as List).map((e) => RecognitionEvent.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<AttendanceEvent>> studentAttendance(int studentId) async {
    if (kDemoMode) return MockData.studentAttendance(studentId);
    final res = await _ref.read(apiClientProvider).get('/api/attendance/student/$studentId');
    return (res.data as List).map((e) => AttendanceEvent.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<PersonNoteEntry>> notes(String personType, int personId) async {
    if (kDemoMode) return MockData.studentNotes(personId);
    final res = await _ref.read(apiClientProvider).get('/api/notes', query: {'personType': personType, 'personId': personId});
    return (res.data as List).map((e) => PersonNoteEntry.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<PersonNoteEntry> addNote(String personType, int personId, String text) async {
    if (kDemoMode) return PersonNoteEntry(id: DateTime.now().millisecondsSinceEpoch, text: text, authorName: 'Demo', createdAt: DateTime.now());
    final res = await _ref
        .read(apiClientProvider)
        .post('/api/notes', data: {'personType': personType, 'personId': personId, 'text': text});
    return PersonNoteEntry.fromJson(res.data as Map<String, dynamic>);
  }

  Future<List<ChatMessage>> studentMessages(int studentId) async {
    if (kDemoMode) return MockData.studentMessages(studentId);
    final res = await _ref.read(apiClientProvider).get('/api/students/$studentId/messages');
    return (res.data as List).map((e) => ChatMessage.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ChatMessage> sendStudentMessage(int studentId, String text) async {
    if (kDemoMode) return ChatMessage(id: DateTime.now().millisecondsSinceEpoch, text: text, senderType: 'STAFF', senderName: 'Demo', createdAt: DateTime.now());
    final res = await _ref.read(apiClientProvider).post('/api/students/$studentId/messages', data: {'text': text});
    return ChatMessage.fromJson(res.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> updateProfile({String? fullName, String? phone}) async {
    if (kDemoMode) return {'success': true};
    final res = await _ref.read(apiClientProvider).patch('/api/auth/me', data: {
      if (fullName != null) 'fullName': fullName,
      if (phone != null) 'phone': phone,
    });
    return res.data as Map<String, dynamic>;
  }

  Future<void> changePassword(String oldPassword, String newPassword) async {
    if (kDemoMode) return;
    await _ref.read(apiClientProvider).post('/api/auth/change-password', data: {
      'oldPassword': oldPassword,
      'newPassword': newPassword,
    });
  }

  Future<List<AbsenceRequest>> absenceRequests(int schoolId) async {
    if (kDemoMode) return MockData.allAbsenceRequests;
    final res = await _ref.read(apiClientProvider).get('/api/absence-requests', query: {'schoolId': schoolId});
    return (res.data as List).map((e) => AbsenceRequest.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Sana oralig'i bo'yicha davomat hisoboti — `GET /api/v1/reports/weekly/`.
  ///
  /// Bu endpoint backendda ALLAQACHON bor edi (`V1ReportsController#weekly`), lekin mobil
  /// ilova undan foydalanmasdi: hisobot ekrani qattiq kodlangan sonlarni ko'rsatardi
  /// (`avgPresent = 432`, `barData = [415, 428, ...]`). `classId` ixtiyoriy filtri
  /// 2026-09-25 da qo'shildi.
  Future<RangeReport> rangeReport({
    required int schoolId,
    required DateTime from,
    required DateTime to,
    int? classId,
  }) async {
    if (kDemoMode) return RangeReport.empty;
    final res = await _ref.read(apiClientProvider).get('/api/v1/reports/weekly/', query: {
      'schoolId': schoolId,
      'start_date': _ymd(from),
      'end_date': _ymd(to),
      if (classId != null) 'classId': classId,
    });
    return RangeReport.fromJson(res.data as Map<String, dynamic>);
  }

  static String _ymd(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> reviewAbsenceRequest(int id, String status, String? note) async {
    if (kDemoMode) {
      final index = MockData.allAbsenceRequests.indexWhere((r) => r.id == id);
      if (index != -1) {
        final req = MockData.allAbsenceRequests[index];
        MockData.allAbsenceRequests[index] = AbsenceRequest(
          id: req.id, studentId: req.studentId, studentName: req.studentName,
          className: req.className, startDate: req.startDate, endDate: req.endDate,
          reasonType: req.reasonType, reasonText: req.reasonText,
          status: status, reviewNote: note, reviewedBy: 'Direktor',
          createdAt: req.createdAt,
        );
      }
      return;
    }
    await _ref.read(apiClientProvider).post('/api/absence-requests/$id/review', data: {
      'status': status,
      if (note != null) 'note': note,
    });
  }
}

/// `GET /api/v1/reports/weekly/` javobidagi bitta kun.
class ReportDay {
  const ReportDay({
    required this.date,
    required this.total,
    required this.present,
    required this.absent,
    required this.rate,
  });

  final DateTime date;
  final int total;
  final int present;
  final int absent;
  final double rate;
}

/// Sana oralig'i bo'yicha davomat hisoboti.
class RangeReport {
  const RangeReport({
    required this.days,
    required this.present,
    required this.absent,
    required this.rate,
  });

  final List<ReportDay> days;
  final int present;
  final int absent;
  final double rate;

  static const empty = RangeReport(days: [], present: 0, absent: 0, rate: 0);

  bool get isEmpty => days.isEmpty;

  factory RangeReport.fromJson(Map<String, dynamic> j) {
    final daily = (j['daily'] as Map?) ?? const {};
    final days = daily.entries.map((e) {
      final v = (e.value as Map?) ?? const {};
      return ReportDay(
        date: DateTime.parse(e.key as String),
        total: (v['total'] as num?)?.toInt() ?? 0,
        present: (v['present'] as num?)?.toInt() ?? 0,
        absent: (v['absent'] as num?)?.toInt() ?? 0,
        rate: (v['attendance_rate'] as num?)?.toDouble() ?? 0,
      );
    }).toList()
      ..sort((a, b) => a.date.compareTo(b.date));

    final overall = (j['overall'] as Map?) ?? const {};
    return RangeReport(
      days: days,
      present: (overall['present'] as num?)?.toInt() ?? 0,
      absent: (overall['absent'] as num?)?.toInt() ?? 0,
      rate: (overall['attendance_rate'] as num?)?.toDouble() ?? 0,
    );
  }
}

final directorRepositoryProvider = Provider<DirectorRepository>((ref) => DirectorRepository(ref));

// ══════════════════════════════════════════════════════════════════════════════
// Ekranlar uchun umumiy providerlar.
//
// MUHIM (2026-09-25 audit): `director_attendance_tab.dart`, `notifications_screen.dart` va
// `attendance_report_screen.dart` avval bu ma'lumotlarni `DirectorRepository`ni chetlab
// o'tib `MockData`dan o'qirdi — ya'ni `DEMO_MODE=false` bilan qurilgan APK'da ham soxta
// arizalar va soxta "eng ko'p qoldirganlar" ro'yxati ko'rinardi.
// ══════════════════════════════════════════════════════════════════════════════

/// Maktab bo'yicha ruxsat so'rovlari.
final directorAbsenceRequestsProvider =
    FutureProvider.family<List<AbsenceRequest>, int>((ref, schoolId) async {
  try {
    return await ref.read(directorRepositoryProvider).absenceRequests(schoolId);
  } on DioException catch (e) {
    // `/api/absence-requests` backendda hali qurilmagan (2-bosqich) — 404 ni "hali
    // so'rov yo'q" deb qaraymiz, boshqa HAR QANDAY xato ko'rinadi.
    if (e.response?.statusCode == 404) return const [];
    rethrow;
  }
});

/// Nishon (badge) uchun — ko'rib chiqilmagan so'rovlar soni.
final directorPendingRequestCountProvider =
    FutureProvider.family<int, int>((ref, schoolId) async {
  final list = await ref.watch(directorAbsenceRequestsProvider(schoolId).future);
  return list.where((r) => r.status == 'PENDING').length;
});

/// Maktab sinflari (hisobot ekranidagi sinf tanlash ro'yxati uchun).
final directorClassesProvider =
    FutureProvider.family<List<SchoolClassRoom>, int>((ref, schoolId) =>
        ref.read(directorRepositoryProvider).classes(schoolId));
