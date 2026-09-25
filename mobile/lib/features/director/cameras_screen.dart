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
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.videocam_off_rounded, size: 48, color: AppColors.textFaint),
                    const SizedBox(height: 12),
                    Text(t('cameras.empty'), style: TextStyle(color: AppColors.textMuted)),
                  ],
                ),
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            itemCount: cams.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, i) {
              final c = cams[i];
              final color = _statusColor(c.status);
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: AppDecorations.card(),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(Icons.videocam_rounded, color: color, size: 22),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(c.name, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 14.5)),
                          const SizedBox(height: 3),
                          Text(
                            [if (c.roomNumber != null) 'Xona: ${c.roomNumber}', if (c.roomName != null) c.roomName].join(' · '),
                            style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                      decoration: AppDecorations.badge(color: color),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(width: 6, height: 6, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                          const SizedBox(width: 5),
                          Text(_statusLabel(c.status), style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
