import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../models/models.dart';

class ParentRepository {
  ParentRepository(this._ref);
  final Ref _ref;

  Future<List<Student>> children() async {
    final res = await _ref.read(apiClientProvider).get('/api/guardian-app/children');
    return (res.data as List).map((e) => Student.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<AttendanceEvent>> attendance(int studentId) async {
    final res = await _ref.read(apiClientProvider).get('/api/guardian-app/children/$studentId/attendance');
    return (res.data as List).map((e) => AttendanceEvent.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<PersonNoteEntry>> notes(int studentId) async {
    final res = await _ref.read(apiClientProvider).get('/api/guardian-app/children/$studentId/notes');
    return (res.data as List).map((e) => PersonNoteEntry.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<ChatMessage>> messages(int studentId) async {
    final res = await _ref.read(apiClientProvider).get('/api/guardian-app/children/$studentId/messages');
    return (res.data as List).map((e) => ChatMessage.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ChatMessage> sendMessage(int studentId, String text) async {
    final res = await _ref.read(apiClientProvider).post('/api/guardian-app/children/$studentId/messages', data: {'text': text});
    return ChatMessage.fromJson(res.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> updateProfile({String? name}) async {
    final res = await _ref.read(apiClientProvider).patch('/api/guardian-app/me', data: {
      if (name != null) 'name': name,
    });
    return res.data as Map<String, dynamic>;
  }

  Future<void> changePassword(String oldPassword, String newPassword) async {
    await _ref.read(apiClientProvider).post('/api/guardian-app/change-password', data: {
      'oldPassword': oldPassword,
      'newPassword': newPassword,
    });
  }
}

final parentRepositoryProvider = Provider<ParentRepository>((ref) => ParentRepository(ref));
