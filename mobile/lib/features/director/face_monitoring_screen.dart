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
        color: AppColors.emerald,
        backgroundColor: AppColors.bgCard,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          children: [
            Text(
              t('faceMonitor.devices'),
              style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 15, letterSpacing: -0.3),
            ),
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
                return Column(
                  children: devices.map((d) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _DeviceRow(device: d),
                  )).toList(),
                );
              },
            ),
            const SizedBox(height: 20),
            Text(
              t('faceMonitor.liveFeed'),
              style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w700, fontSize: 15, letterSpacing: -0.3),
            ),
            const SizedBox(height: 10),
            FutureBuilder<List<RecognitionEvent>>(
              future: _feedFuture,
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Padding(padding: EdgeInsets.symmetric(vertical: 40), child: Center(child: CircularProgressIndicator()));
                }
                if (snap.hasError) return Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary));
                final feed = snap.data ?? [];
                if (feed.isEmpty) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Center(child: Text(t('faceMonitor.noEvents'), style: TextStyle(color: AppColors.textFaint))),
                  );
                }
                final fmt = DateFormat('HH:mm:ss');
                return Column(
                  children: feed.map((e) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _EventTile(event: e, fmt: fmt),
                  )).toList(),
                );
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
    final isOnline = device.online;
    final color = isOnline ? AppColors.emerald : AppColors.red;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: AppDecorations.card(),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.tablet_android_rounded, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  (device.deviceName != null && device.deviceName!.isNotEmpty) ? device.deviceName! : device.deviceSerial,
                  style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5),
                ),
                Text(
                  device.ipAddress ?? device.deviceSerial,
                  style: TextStyle(color: AppColors.textMuted, fontSize: 11.5),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: AppDecorations.badge(color: color),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(width: 5, height: 5, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                const SizedBox(width: 5),
                Text(
                  isOnline ? 'ONLAYN' : 'OFLAYN',
                  style: TextStyle(color: color, fontSize: 10.5, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EventTile extends StatelessWidget {
  const _EventTile({required this.event, required this.fmt});
  final RecognitionEvent event;
  final DateFormat fmt;

  @override
  Widget build(BuildContext context) {
    final isOut = event.type == 'OUT';
    final initial = event.studentName.isNotEmpty ? event.studentName[0].toUpperCase() : '?';

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: AppDecorations.card(),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.emerald.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            alignment: Alignment.center,
            child: Text(
              initial,
              style: TextStyle(color: AppColors.emerald, fontWeight: FontWeight.bold, fontSize: 15),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.studentName,
                  style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13.5),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(
                      fmt.format(event.timestamp.toLocal()),
                      style: TextStyle(color: AppColors.textFaint, fontSize: 11.5),
                    ),
                    if (event.temperature != null) ...[
                      const SizedBox(width: 8),
                      Text(
                        '${event.temperature!.toStringAsFixed(1)}°C',
                        style: TextStyle(color: AppColors.cyan, fontSize: 11.5, fontWeight: FontWeight.w500),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: AppDecorations.badge(color: isOut ? AppColors.amber : AppColors.emerald),
            child: Text(
              isOut ? 'CHIQISH' : 'KIRISH',
              style: TextStyle(
                color: isOut ? AppColors.amber : AppColors.emerald,
                fontSize: 10.5,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
