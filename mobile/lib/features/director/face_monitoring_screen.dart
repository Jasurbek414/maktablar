import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import 'director_repository.dart';
import 'student_detail_screen.dart';

/// Face ID orqali tanilgan o'quvchilarni real vaqtda kuzatish — qurilmalar holati
/// (onlayn/oflayn) + bugungi kunda tanilganlar ro'yxati. Bu `/api/attendance/devices`
/// va `/api/attendance/school/{id}` dan foydalanadi — CamerasScreen'dagi video-kuzatuv
/// (`/api/cameras`) bilan ARALASHTIRILMASIN, bular backend'da alohida tizimlar.
class FaceMonitoringScreen extends ConsumerStatefulWidget {
  const FaceMonitoringScreen({super.key, required this.schoolId});
  final int schoolId;

  @override
  ConsumerState<FaceMonitoringScreen> createState() => _FaceMonitoringScreenState();
}

class _FaceMonitoringScreenState extends ConsumerState<FaceMonitoringScreen> {
  late Future<List<RecognitionDevice>> _devicesFuture;
  late Future<List<RecognitionEvent>> _feedFuture;

  @override
  void initState() {
    super.initState();
    final repo = ref.read(directorRepositoryProvider);
    _devicesFuture = repo.recognitionDevices(widget.schoolId);
    _feedFuture = repo.recognitionFeed(widget.schoolId);
  }

  Future<void> _reload() async {
    final repo = ref.read(directorRepositoryProvider);
    setState(() {
      _devicesFuture = repo.recognitionDevices(widget.schoolId);
      _feedFuture = repo.recognitionFeed(widget.schoolId);
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);
    return Scaffold(
      appBar: AppBar(title: Text(t('faceMonitor.title'))),
      body: RefreshIndicator(
        onRefresh: _reload,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(t('faceMonitor.devices'), style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 10),
            FutureBuilder<List<RecognitionDevice>>(
              future: _devicesFuture,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Padding(padding: EdgeInsets.symmetric(vertical: 20), child: Center(child: CircularProgressIndicator()));
                }
                if (snap.hasError) return Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary));
                final devices = snap.data ?? [];
                if (devices.isEmpty) return Text(t('faceMonitor.noDevices'), style: TextStyle(color: AppColors.textFaint, fontSize: 12.5));
                return Column(children: devices.map((d) => _DeviceRow(device: d)).toList());
              },
            ),
            const SizedBox(height: 26),
            Text(t('faceMonitor.liveFeed'), style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
            const SizedBox(height: 10),
            FutureBuilder<List<RecognitionEvent>>(
              future: _feedFuture,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Padding(padding: EdgeInsets.symmetric(vertical: 30), child: Center(child: CircularProgressIndicator()));
                }
                if (snap.hasError) return Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary));
                final events = [...(snap.data ?? [])]..sort((a, b) => b.timestamp.compareTo(a.timestamp));
                if (events.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    child: Text(t('faceMonitor.noEvents'), style: TextStyle(color: AppColors.textFaint, fontSize: 12.5)),
                  );
                }
                return Column(children: events.map((e) => _EventRow(event: e)).toList());
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _DeviceRow extends StatelessWidget {
  const _DeviceRow({required this.device});
  final RecognitionDevice device;

  @override
  Widget build(BuildContext context) {
    final color = device.online ? AppColors.emerald : AppColors.red;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: AppColors.bgCard, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.borderEmerald)),
      child: Row(
        children: [
          Container(width: 9, height: 9, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(device.deviceName ?? device.deviceSerial, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w500, fontSize: 13)),
                if (device.ipAddress != null)
                  Text(device.ipAddress!, style: TextStyle(color: AppColors.textFaint, fontSize: 11, fontFamily: 'monospace')),
              ],
            ),
          ),
          if (device.pendingEvents > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: AppColors.amber.withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
              child: Text('${device.pendingEvents} ${t('faceMonitor.pending')}', style: TextStyle(color: AppColors.amber, fontSize: 10.5, fontWeight: FontWeight.w600)),
            ),
        ],
      ),
    );
  }
}

class _EventRow extends StatelessWidget {
  const _EventRow({required this.event});
  final RecognitionEvent event;

  @override
  Widget build(BuildContext context) {
    final isIn = event.type == 'IN';
    final fmt = DateFormat('HH:mm:ss');
    final hot = (event.temperature ?? 0) > 37.2;
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: () => Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => StudentDetailScreen(student: Student(id: event.studentId, fullName: event.studentName, photoUrl: event.studentPhoto, faceId: event.faceId)),
      )),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: AppColors.bgCard, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.borderEmerald)),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: event.studentPhoto != null
                  ? CachedNetworkImage(imageUrl: '$kApiBaseUrl${event.studentPhoto}', width: 40, height: 40, fit: BoxFit.cover, errorWidget: (_, __, ___) => _avatar())
                  : _avatar(),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(event.studentName, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w500, fontSize: 13)),
                  const SizedBox(height: 2),
                  Row(children: [
                    Text(fmt.format(event.timestamp.toLocal()), style: TextStyle(color: AppColors.textFaint, fontSize: 11)),
                    if (event.temperature != null) ...[
                      const SizedBox(width: 8),
                      Text('${event.temperature}°C', style: TextStyle(color: hot ? AppColors.red : AppColors.textFaint, fontSize: 11, fontWeight: hot ? FontWeight.w700 : FontWeight.normal)),
                    ],
                  ]),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
              decoration: BoxDecoration(color: (isIn ? AppColors.emerald : AppColors.textFaint).withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
              child: Text(isIn ? t('event.in') : t('event.out'), style: TextStyle(color: isIn ? AppColors.emerald : AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.w600)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _avatar() => Container(
        width: 40,
        height: 40,
        color: AppColors.emerald.withOpacity(0.15),
        alignment: Alignment.center,
        child: Text(event.studentName.isNotEmpty ? event.studentName[0].toUpperCase() : '?', style: TextStyle(color: AppColors.emerald, fontWeight: FontWeight.bold)),
      );
}
