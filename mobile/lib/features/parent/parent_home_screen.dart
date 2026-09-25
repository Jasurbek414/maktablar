import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../l10n/l10n.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';
import 'children_tab.dart';
import 'my_requests_tab.dart';
import 'parent_dashboard_tab.dart';
import 'parent_profile_tab.dart';
import 'parent_repository.dart';

class ParentHomeScreen extends ConsumerStatefulWidget {
  const ParentHomeScreen({super.key});

  @override
  ConsumerState<ParentHomeScreen> createState() => _ParentHomeScreenState();
}

class _ParentHomeScreenState extends ConsumerState<ParentHomeScreen> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(authControllerProvider).profile;
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);

    // Nishon (badge) soni — serverdan. Endpoint hali yo'q bo'lsa provider 0 qaytaradi,
    // ya'ni nishon ko'rinmaydi (avvalgidek soxta son CHIQMAYDI).
    final pendingCount = ref.watch(parentPendingRequestCountProvider).valueOrNull ?? 0;

    final tabs = [
      ParentDashboardTab(profile: profile),
      const ChildrenTab(),
      const MyRequestsTab(),
      ParentProfileTab(profile: profile),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: tabs),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: AppColors.bgSidebar,
          border: Border(top: BorderSide(color: AppColors.borderSubtle, width: 1)),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            child: BottomNavigationBar(
              currentIndex: _index,
              onTap: (i) => setState(() => _index = i),
              backgroundColor: Colors.transparent,
              elevation: 0,
              items: [
                BottomNavigationBarItem(
                  icon: const Icon(Icons.home_outlined),
                  activeIcon: const Icon(Icons.home_rounded),
                  label: t('nav.home'),
                ),
                BottomNavigationBarItem(
                  icon: const Icon(Icons.family_restroom_outlined),
                  activeIcon: const Icon(Icons.family_restroom_rounded),
                  label: t('nav.children'),
                ),
                BottomNavigationBarItem(
                  icon: Stack(clipBehavior: Clip.none, children: [
                    const Icon(Icons.description_outlined),
                    if (pendingCount > 0)
                      Positioned(
                        top: -2, right: -4,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(color: AppColors.amber, shape: BoxShape.circle),
                        ),
                      ),
                  ]),
                  activeIcon: Stack(clipBehavior: Clip.none, children: [
                    const Icon(Icons.description_rounded),
                    if (pendingCount > 0)
                      Positioned(
                        top: -2, right: -4,
                        child: Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(color: AppColors.amber, shape: BoxShape.circle),
                        ),
                      ),
                  ]),
                  label: t('nav.requests'),
                ),
                BottomNavigationBarItem(
                  icon: const Icon(Icons.person_outline_rounded),
                  activeIcon: const Icon(Icons.person_rounded),
                  label: t('nav.profile'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
