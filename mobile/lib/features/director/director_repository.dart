import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../models/models.dart';

class DirectorRepository {
  DirectorRepository(this._ref);
  final Ref _ref;

  Future<Map<String, dynamic>> school(int schoolId) async {
    final res = await _ref.read(apiClientProvider).get('/api/schools/$schoolId');
    return res.data as Map<String, dynamic>;
  }

  Future<List<Student>> students(int schoolId) async {
    final res = await _ref.read(apiClientProvider).get('/api/students', query: {'schoolId': schoolId});
    return (res.data as List).map((e) => Student.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<TeacherSummary>> teachers(int schoolId) async {
    final res = await _ref.read(apiClientProvider).get('/api/users', query: {'role': 'TEACHER', 'schoolId': schoolId});
    return (res.data as List).map((e) => TeacherSummary.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<SchoolClassRoom>> classes(int schoolId) async {
    final res = await _ref.read(apiClientProvider).get('/api/classes', query: {'schoolId': schoolId});
    return (res.data as List).map((e) => SchoolClassRoom.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Student>> studentsByClass(int classId) async {
    final res = await _ref.read(apiClientProvider).get('/api/students', query: {'classId': classId});
    return (res.data as List).map((e) => Student.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<AttendanceOverview> attendanceOverview(int schoolId) async {
    final res = await _ref.read(apiClientProvider).get('/api/attendance/overview', query: {'schoolId': schoolId});
    return AttendanceOverview.fromJson(res.data as Map<String, dynamic>);
  }

  Future<List<CameraInfo>> cameras(int schoolId) async {
    final res = await _ref.read(apiClientProvider).get('/api/cameras', query: {'schoolId': schoolId});
    return (res.data as List).map((e) => CameraInfo.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<CameraEvent>> cameraEvents(int cameraId) async {
    final res = await _ref.read(apiClientProvider).get('/api/cameras/$cameraId/events');
    return (res.data as List).map((e) => CameraEvent.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<RecognitionDevice>> recognitionDevices(int schoolId) async {
    final res = await _ref.read(apiClientProvider).get('/api/attendance/devices/$schoolId');
    return (res.data as List).map((e) => RecognitionDevice.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<RecognitionEvent>> recognitionFeed(int schoolId, {String? date}) async {
    final res = await _ref.read(apiClientProvider).get('/api/attendance/school/$schoolId', query: {
      if (date != null) 'date': date,
    });
    return (res.data as List).map((e) => RecognitionEvent.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<AttendanceEvent>> studentAttendance(int studentId) async {
    final res = await _ref.read(apiClientProvider).get('/api/attendance/student/$studentId');
    return (res.data as List).map((e) => AttendanceEvent.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<PersonNoteEntry>> notes(String personType, int personId) async {
    final res = await _ref.read(apiClientProvider).get('/api/notes', query: {'personType': personType, 'personId': personId});
    return (res.data as List).map((e) => PersonNoteEntry.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<PersonNoteEntry> addNote(String personType, int personId, String text) async {
    final res = await _ref
        .read(apiClientProvider)
        .post('/api/notes', data: {'personType': personType, 'personId': personId, 'text': text});
    return PersonNoteEntry.fromJson(res.data as Map<String, dynamic>);
  }

  Future<List<ChatMessage>> studentMessages(int studentId) async {
    final res = await _ref.read(apiClientProvider).get('/api/students/$studentId/messages');
    return (res.data as List).map((e) => ChatMessage.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ChatMessage> sendStudentMessage(int studentId, String text) async {
    final res = await _ref.read(apiClientProvider).post('/api/students/$studentId/messages', data: {'text': text});
    return ChatMessage.fromJson(res.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> updateProfile({String? fullName, String? phone}) async {
    final res = await _ref.read(apiClientProvider).patch('/api/auth/me', data: {
      if (fullName != null) 'fullName': fullName,
      if (phone != null) 'phone': phone,
    });
    return res.data as Map<String, dynamic>;
  }

  Future<void> changePassword(String oldPassword, String newPassword) async {
    await _ref.read(apiClientProvider).post('/api/auth/change-password', data: {
      'oldPassword': oldPassword,
      'newPassword': newPassword,
    });
  }
}

final directorRepositoryProvider = Provider<DirectorRepository>((ref) => DirectorRepository(ref));
