import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../theme/app_theme.dart';

/// O'quvchi/o'qituvchi ro'yxatlarida ishlatiladigan minimalist qator
class PersonTile extends StatelessWidget {
  const PersonTile({
    super.key,
    required this.name,
    required this.subtitle,
    required this.photoUrl,
    required this.onTap,
    this.badge,
  });

  final String name;
  final String subtitle;
  final String? photoUrl;
  final VoidCallback onTap;
  final Widget? badge;

  @override
  Widget build(BuildContext context) {
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: AppDecorations.card(),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: photoUrl != null
                  ? CachedNetworkImage(
                      imageUrl: '$kApiBaseUrl$photoUrl',
                      width: 44,
                      height: 44,
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => _avatar(initial),
                    )
                  : _avatar(initial),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 14.5,
                      letterSpacing: -0.2,
                    ),
                  ),
                  if (subtitle.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(
                      subtitle,
                      style: TextStyle(color: AppColors.textMuted, fontSize: 12),
                    ),
                  ],
                ],
              ),
            ),
            if (badge != null) ...[
              badge!,
              const SizedBox(width: 8),
            ],
            Icon(Icons.chevron_right_rounded, color: AppColors.textFaint, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _avatar(String initial) => Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: AppColors.emerald.withOpacity(0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        alignment: Alignment.center,
        child: Text(
          initial,
          style: TextStyle(
            color: AppColors.emerald,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
      );
}
