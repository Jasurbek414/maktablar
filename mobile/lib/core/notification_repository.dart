import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../features/auth/auth_controller.dart';
import 'providers.dart';

/// Backenddagi `/api/notifications` bildirishnomasi.
///
/// Maydonlar `NotificationController#toMap` bilan bir xil
/// (`backend/src/main/java/com/maktab/controller/NotificationController.java`).
///
/// MUHIM: bu endpoint FAQAT XODIM uchun — `CurrentUserService.resolveUser` GUARDIAN
/// tokenini ataylab rad etadi (guardian oqimlari faqat `GuardianAppController` orqali
/// o'tadi). Shuning uchun ota-ona ekranlarida bu repozitoriy ISHLATILMAYDI.
class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.level,
    required this.isRead,
    required this.createdAt,
    this.relatedEntity,
    this.relatedId,
    this.schoolId,
  });

  final int id;
  final String title;
  final String message;

  /// ATTENDANCE | SYSTEM | DEVICE_STATUS | USER_ACTION | ALERT
  final String type;

  /// INFO | SUCCESS | WARNING | ERROR
  final String level;

  final bool isRead;
  final DateTime createdAt;
  final String? relatedEntity;
  final int? relatedId;
  final int? schoolId;

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: (j['id'] as num).toInt(),
        title: j['title'] as String? ?? '',
        message: j['message'] as String? ?? '',
        type: j['type'] as String? ?? 'SYSTEM',
        level: j['level'] as String? ?? 'INFO',
        isRead: j['isRead'] as bool? ?? false,
        createdAt: DateTime.parse(j['createdAt'] as String),
        relatedEntity: j['relatedEntity'] as String?,
        relatedId: (j['relatedId'] as num?)?.toInt(),
        schoolId: (j['schoolId'] as num?)?.toInt(),
      );
}

class NotificationPage {
  const NotificationPage({required this.items, required this.unreadCount});
  final List<AppNotification> items;
  final int unreadCount;

  static const empty = NotificationPage(items: [], unreadCount: 0);
}

class NotificationRepository {
  NotificationRepository(this._ref);
  final Ref _ref;

  Future<NotificationPage> list({int limit = 50}) async {
    // Demo rejimda soxta bildirishnoma O'YLAB CHIQARILMAYDI — bo'sh ro'yxat qaytadi.
    if (kDemoMode) return NotificationPage.empty;
    final res = await _ref
        .read(apiClientProvider)
        .get('/api/notifications', query: {'limit': limit});
    final data = res.data as Map<String, dynamic>;
    final items = (data['notifications'] as List? ?? const [])
        .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
        .toList();
    return NotificationPage(
      items: items,
      unreadCount: (data['unreadCount'] as num?)?.toInt() ?? 0,
    );
  }

  Future<void> markRead(int id) async {
    if (kDemoMode) return;
    await _ref.read(apiClientProvider).put('/api/notifications/$id/read');
  }

  Future<void> markAllRead() async {
    if (kDemoMode) return;
    await _ref.read(apiClientProvider).put('/api/notifications/read-all');
  }
}

final notificationRepositoryProvider =
    Provider<NotificationRepository>((ref) => NotificationRepository(ref));

/// Xodim (direktor/o'qituvchi) bildirishnomalari.
final notificationsProvider = FutureProvider<NotificationPage>(
  (ref) => ref.read(notificationRepositoryProvider).list(),
);
