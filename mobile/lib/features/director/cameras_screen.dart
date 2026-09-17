import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import 'director_repository.dart';

Color _statusColor(String status) {
  switch (status) {
    case 'ONLINE':
      return AppColors.emerald;
    case 'MAINTENANCE':
      return AppColors.amber;
    default:
      return AppColors.red;
  }
}

String _statusLabel(String status) {
  switch (status) {
    case 'ONLINE':
      return t('cameras.online');
    case 'MAINTENANCE':
      return t('cameras.maintenance');
    default:
      return t('cameras.offline');
  }
}

/// Maktabdagi kameralarni kuzatish ekrani — faqat MONITORING (nom, xona, holat,
/// hodisalar tarixi). Jonli video oqim YO'Q, chunki tizimda umuman video-stream
/// infratuzilmasi mavjud emas (veb-ilova Cameras.jsx bilan bir xil, ataylab halol
/// bo'sh holat ko'rsatiladi — soxta oqim emulyatsiya qilinmaydi).
class CamerasScreen extends ConsumerStatefulWidget {
  const CamerasScreen({super.key, required this.schoolId});
  final int schoolId;

  @override
  ConsumerState<CamerasScreen> createState() => _CamerasScreenState();
}

class _CamerasScreenState extends ConsumerState<CamerasScreen> {
  late Future<List<CameraInfo>> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(directorRepositoryProvider).cameras(widget.schoolId);
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);
    return Scaffold(
      appBar: AppBar(title: Text(t('cameras.title'))),
      body: FutureBuilder<List<CameraInfo>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
          if (snap.hasError) return Center(child: Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary)));
          final cams = snap.data ?? [];
          if (cams.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.videocam_off_rounded, size: 48, color: AppColors.textFaint),
                  const SizedBox(height: 12),
                  Text(t('cameras.empty'), textAlign: TextAlign.center, style: TextStyle(color: AppColors.textFaint)),
                ]),
              ),
            );
          }
          final online = cams.where((c) => c.status == 'ONLINE').length;
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                child: Row(children: [
                  Icon(Icons.circle, size: 9, color: AppColors.emerald),
                  const SizedBox(width: 6),
                  Text('$online/${cams.length} ${t('cameras.onlineCount')}', style: TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
                ]),
              ),
              Expanded(
                child: GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.05),
                  itemCount: cams.length,
                  itemBuilder: (context, i) {
                    final cam = cams[i];
                    return InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => _CameraDetailScreen(camera: cam))),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(colors: [AppColors.bgCard, AppColors.bgCardAlt], begin: Alignment.topLeft, end: Alignment.bottomRight),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: AppColors.borderEmerald),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Container(
                                width: double.infinity,
                                decoration: BoxDecoration(color: AppColors.bgMain, borderRadius: BorderRadius.circular(10)),
                                alignment: Alignment.center,
                                child: Icon(Icons.videocam_rounded, color: AppColors.textFaint, size: 30),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(cam.name, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
                            const SizedBox(height: 2),
                            Text(
                              cam.roomName != null ? '${cam.roomNumber ?? ''} ${cam.roomName}'.trim() : t('cameras.noRoom'),
                              style: TextStyle(color: AppColors.textMuted, fontSize: 11.5),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(color: _statusColor(cam.status).withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
                              child: Row(mainAxisSize: MainAxisSize.min, children: [
                                Container(width: 6, height: 6, decoration: BoxDecoration(color: _statusColor(cam.status), shape: BoxShape.circle)),
                                const SizedBox(width: 5),
                                Text(_statusLabel(cam.status), style: TextStyle(color: _statusColor(cam.status), fontSize: 10.5, fontWeight: FontWeight.w600)),
                              ]),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _CameraDetailScreen extends ConsumerStatefulWidget {
  const _CameraDetailScreen({required this.camera});
  final CameraInfo camera;

  @override
  ConsumerState<_CameraDetailScreen> createState() => _CameraDetailScreenState();
}

class _CameraDetailScreenState extends ConsumerState<_CameraDetailScreen> {
  late Future<List<CameraEvent>> _future;

  @override
  void initState() {
    super.initState();
    _future = ref.read(directorRepositoryProvider).cameraEvents(widget.camera.id);
  }

  @override
  Widget build(BuildContext context) {
    final cam = widget.camera;
    return Scaffold(
      appBar: AppBar(title: Text(cam.name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          AspectRatio(
            aspectRatio: 16 / 10,
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [AppColors.bgCard, AppColors.bgCardAlt], begin: Alignment.topLeft, end: Alignment.bottomRight),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.borderEmerald),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.videocam_off_rounded, color: AppColors.textFaint, size: 40),
                  const SizedBox(height: 10),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Text(t('cameras.liveNotConnected'), textAlign: TextAlign.center, style: TextStyle(color: AppColors.textFaint, fontSize: 12.5)),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(color: AppColors.bgCardAlt, borderRadius: BorderRadius.circular(10)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(t('cameras.room'), style: TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
                Text(cam.roomName != null ? '${cam.roomNumber ?? ''} ${cam.roomName}'.trim() : t('cameras.noRoom'), style: TextStyle(color: AppColors.textSecondary, fontSize: 12.5)),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(color: AppColors.bgCardAlt, borderRadius: BorderRadius.circular(10)),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(t('cameras.status'), style: TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
                Text(_statusLabel(cam.status), style: TextStyle(color: _statusColor(cam.status), fontSize: 12.5, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          const SizedBox(height: 22),
          Text(t('cameras.recentEvents'), style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
          const SizedBox(height: 10),
          FutureBuilder<List<CameraEvent>>(
            future: _future,
            builder: (context, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const Padding(padding: EdgeInsets.symmetric(vertical: 24), child: Center(child: CircularProgressIndicator()));
              }
              if (snap.hasError) return Text(apiErrorMessage(snap.error!), style: TextStyle(color: AppColors.textSecondary));
              final events = snap.data ?? [];
              if (events.isEmpty) return Text(t('cameras.noEvents'), style: TextStyle(color: AppColors.textFaint));
              final fmt = DateFormat('dd.MM.yyyy HH:mm');
              return Column(
                children: events.take(20).map((e) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: AppColors.bgCardAlt, borderRadius: BorderRadius.circular(10)),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline_rounded, size: 16, color: AppColors.textFaint),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(e.description ?? e.type, style: TextStyle(color: AppColors.textPrimary, fontSize: 12.5)),
                              const SizedBox(height: 2),
                              Text(fmt.format(e.occurredAt.toLocal()), style: TextStyle(color: AppColors.textFaint, fontSize: 11)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              );
            },
          ),
        ],
      ),
    );
  }
}
