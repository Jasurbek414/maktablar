import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../theme/app_theme.dart';

/// O'quvchi/o'qituvchi ro'yxatlarida ishlatiladigan umumiy qator (rasm + ism + qo'shimcha matn).
class PersonTile extends StatelessWidget {
  const PersonTile({super.key, required this.name, required this.subtitle, required this.photoUrl, required this.onTap});
  final String name;
  final String subtitle;
  final String? photoUrl;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.borderEmerald),
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(11),
              child: photoUrl != null
                  ? CachedNetworkImage(imageUrl: '$kApiBaseUrl$photoUrl', width: 44, height: 44, fit: BoxFit.cover, errorWidget: (_, __, ___) => _avatar())
                  : _avatar(),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w500, fontSize: 14)),
                  if (subtitle.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(subtitle, style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                  ],
                ],
              ),
            ),
            Icon(Icons.chevron_right_rounded, color: AppColors.textFaint, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _avatar() => Container(
        width: 44,
        height: 44,
        color: AppColors.emerald.withOpacity(0.15),
        alignment: Alignment.center,
        child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?', style: TextStyle(color: AppColors.emerald, fontWeight: FontWeight.bold)),
      );
}
