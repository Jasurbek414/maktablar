import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers.dart';
import '../../models/models.dart';
import '../../core/mock_data.dart';
import '../auth/auth_controller.dart';

class ParentRepository {
  ParentRepository(this._ref);
  final Ref _ref;

  Future<List<Student>> children() async {
    if (kDemoMode) return MockData.parentChildren;
    final res = await _ref.read(apiClientProvider).get('/api/guardian-app/children');
    return (res.data as List).map((e) => Student.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<AttendanceEvent>> attendance(int studentId) async {
    if (kDemoMode) return MockData.studentAttendance(studentId);
    final res = await _ref.read(apiClientProvider).get('/api/guardian-app/children/$studentId/attendance');
    return (res.data as List).map((e) => AttendanceEvent.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<PersonNoteEntry>> notes(int studentId) async {
    if (kDemoMode) return MockData.studentNotes(studentId);
    final res = await _ref.read(apiClientProvider).get('/api/guardian-app/children/$studentId/notes');
    return (res.data as List).map((e) => PersonNoteEntry.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<ChatMessage>> messages(int studentId) async {
    if (kDemoMode) return MockData.studentMessages(studentId);
    final res = await _ref.read(apiClientProvider).get('/api/guardian-app/children/$studentId/messages');
    return (res.data as List).map((e) => ChatMessage.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<ChatMessage> sendMessage(int studentId, String text) async {
    if (kDemoMode) {
      return ChatMessage(
        id: DateTime.now().millisecondsSinceEpoch,
        text: text,
        senderType: 'GUARDIAN',
        senderName: 'Ota-ona',
        createdAt: DateTime.now(),
      );
    }
    final res = await _ref.read(apiClientProvider).post('/api/guardian-app/children/$studentId/messages', data: {'text': text});
    return ChatMessage.fromJson(res.data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> updateProfile({String? name}) async {
    if (kDemoMode) {
      return {
        ...MockData.parentProfile,
        if (name != null) 'fullName': name,
      };
    }
    final res = await _ref.read(apiClientProvider).patch('/api/guardian-app/me', data: {
      if (name != null) 'name': name,
    });
    return res.data as Map<String, dynamic>;
  }

  Future<void> changePassword(String oldPassword, String newPassword) async {
    if (kDemoMode) return;
    await _ref.read(apiClientProvider).post('/api/guardian-app/change-password', data: {
      'oldPassword': oldPassword,
      'newPassword': newPassword,
    });
  }

  Future<List<AbsenceRequest>> absenceRequests() async {
    if (kDemoMode) return MockData.absenceRequests;
    final res = await _ref.read(apiClientProvider).get('/api/guardian-app/absence-requests');
    return (res.data as List).map((e) => AbsenceRequest.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<AbsenceRequest> submitAbsenceRequest(Map<String, dynamic> data) async {
    if (kDemoMode) {
      final newReq = AbsenceRequest(
        id: DateTime.now().millisecondsSinceEpoch,
        studentId: data['studentId'] as int? ?? 0,
        studentName: data['studentName'] as String? ?? '',
        className: data['className'] as String?,
        startDate: data['startDate'] as String? ?? '',
        endDate: data['endDate'] as String? ?? '',
        reasonType: data['reasonType'] as String? ?? 'OTHER',
        reasonText: data['reasonText'] as String?,
        status: 'PENDING',
        createdAt: DateTime.now(),
      );
      MockData.absenceRequests.add(newReq);
      return newReq;
    }
    final res = await _ref.read(apiClientProvider).post('/api/guardian-app/absence-requests', data: data);
    return AbsenceRequest.fromJson(res.data as Map<String, dynamic>);
  }
}

final parentRepositoryProvider = Provider<ParentRepository>((ref) => ParentRepository(ref));

// ══════════════════════════════════════════════════════════════════════════════
// Ekranlar uchun umumiy providerlar.
//
// MUHIM (2026-09-25 audit): `parent_dashboard_tab.dart`, `parent_home_screen.dart` va
// `parent_notifications_screen.dart` avval bu ma'lumotlarni `ParentRepository`ni butunlay
// chetlab o'tib `MockData`dan o'qirdi — ya'ni `DEMO_MODE=false` bilan qurilgan APK'da ham
// ota-ona soxta farzandlarni, soxta arizalarni va soxta xabarlarni ko'rardi.
// ══════════════════════════════════════════════════════════════════════════════

final parentChildrenProvider = FutureProvider<List<Student>>(
  (ref) => ref.read(parentRepositoryProvider).children(),
);

/// Ota-onaning barcha ruxsat so'rovlari.
final parentAbsenceRequestsProvider = FutureProvider<List<AbsenceRequest>>((ref) async {
  try {
    return await ref.read(parentRepositoryProvider).absenceRequests();
  } on DioException catch (e) {
    // `/api/guardian-app/absence-requests` backendda hali qurilmagan (2-bosqich) —
    // 404 ni "hali so'rov yo'q" deb qaraymiz, boshqa HAR QANDAY xato ko'rinadi.
    if (e.response?.statusCode == 404) return const [];
    rethrow;
  }
});

/// Pastki navigatsiyadagi nishon (badge) uchun — ko'rib chiqilmagan so'rovlar soni.
final parentPendingRequestCountProvider = FutureProvider<int>((ref) async {
  final list = await ref.watch(parentAbsenceRequestsProvider.future);
  return list.where((r) => r.status == 'PENDING').length;
});

/// Barcha farzandlar bo'yicha xabarlar, eng yangisi birinchi.
final parentAllMessagesProvider = FutureProvider<List<ChatMessage>>((ref) async {
  final repo = ref.read(parentRepositoryProvider);
  final children = await ref.watch(parentChildrenProvider.future);
  final all = <ChatMessage>[];
  for (final child in children) {
    all.addAll(await repo.messages(child.id));
  }
  all.sort((a, b) => b.createdAt.compareTo(a.createdAt));
  return all;
});
