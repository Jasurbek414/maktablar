import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../l10n/l10n.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';
import 'children_tab.dart';
import 'parent_profile_tab.dart';

/// Ota-ona ilovasining ildiz ekrani — pastki navigatsiya bilan
/// (Farzandlarim / Profil), xodim ilovasidagi DirectorHomeShell bilan bir xil naqsh.
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

    final tabs = [
      const ChildrenTab(),
      ParentProfileTab(profile: profile),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: tabs),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        type: BottomNavigationBarType.fixed,
        items: [
          BottomNavigationBarItem(icon: const Icon(Icons.family_restroom_rounded), label: t('nav.children')),
          BottomNavigationBarItem(icon: const Icon(Icons.person_rounded), label: t('nav.profile')),
        ],
      ),
    );
  }
}
