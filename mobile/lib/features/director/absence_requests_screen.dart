import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api_client.dart';
import '../../core/mock_data.dart';
import '../../core/providers.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import '../auth/auth_controller.dart';

class AbsenceRequestsScreen extends ConsumerStatefulWidget {
  const AbsenceRequestsScreen({super.key, required this.schoolId});
  final int schoolId;

  @override
  ConsumerState<AbsenceRequestsScreen> createState() => _AbsenceRequestsScreenState();
}

class _AbsenceRequestsScreenState extends ConsumerState<AbsenceRequestsScreen> {
  List<AbsenceRequest>? _requests;
  bool _isLoading = true;
  String? _error;
  String _filterStatus = 'ALL';

  @override
  void initState() {
    super.initState();
    _loadRequests();
  }

  Future<void> _loadRequests() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      await Future.delayed(const Duration(milliseconds: 200));
      final list = kDemoMode ? MockData.allAbsenceRequests : await _fetchFromApi();
      setState(() {
        _requests = list;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = apiErrorMessage(e);
        _isLoading = false;
      });
    }
  }

  Future<List<AbsenceRequest>> _fetchFromApi() async {
    final res = await ref.read(apiClientProvider).get('/api/absence-requests', query: {'schoolId': widget.schoolId});
    return (res.data as List).map((e) => AbsenceRequest.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> _updateStatus(int id, String status) async {
    final noteController = TextEditingController();
    final bool? confirm = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.bgCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  status == 'APPROVED' ? t('requests.approve') : t('requests.reject'),
                  style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 16.5),
                ),
                IconButton(icon: Icon(Icons.close_rounded, color: AppColors.textFaint), onPressed: () => Navigator.pop(ctx, false)),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: noteController,
              style: TextStyle(color: AppColors.textPrimary, fontSize: 14),
              maxLines: 3,
              decoration: InputDecoration(
                labelText: t('requests.reviewNote'),
                hintText: 'Izohingizni kiriting...',
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx, false),
                    child: Text(t('common.cancel')),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(ctx, true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: status == 'APPROVED' ? AppColors.emerald : AppColors.red,
                    ),
                    child: Text(t('common.save')),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );

    if (confirm != true) return;

    try {
      if (kDemoMode) {
        final idx = MockData.allAbsenceRequests.indexWhere((r) => r.id == id);
        if (idx >= 0) {
          final old = MockData.allAbsenceRequests[idx];
          MockData.allAbsenceRequests[idx] = AbsenceRequest(
            id: old.id, studentId: old.studentId, studentName: old.studentName,
            className: old.className, startDate: old.startDate, endDate: old.endDate,
            reasonType: old.reasonType, reasonText: old.reasonText,
            status: status,
            reviewNote: noteController.text.trim().isEmpty ? null : noteController.text.trim(),
            reviewedBy: 'Direktor', createdAt: old.createdAt,
          );
        }
      } else {
        await ref.read(apiClientProvider).patch('/api/absence-requests/$id', data: {
          'status': status,
          if (noteController.text.trim().isNotEmpty) 'reviewNote': noteController.text.trim(),
        });
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(t('requests.statusChanged')),
          backgroundColor: AppColors.emerald,
        ));
      }
      _loadRequests();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(apiErrorMessage(e)),
          backgroundColor: AppColors.red,
        ));
      }
    }
  }

  String _reasonText(String type) {
    switch (type) {
      case 'ILLNESS':
        return t('requests.reasonIllness');
      case 'FAMILY':
        return t('requests.reasonFamily');
      default:
        return t('requests.reasonOther');
    }
  }

  Widget _statusBadge(String status) {
    Color color;
    String label;
    switch (status) {
      case 'APPROVED':
        color = AppColors.emerald;
        label = t('requests.approved');
        break;
      case 'REJECTED':
        color = AppColors.red;
        label = t('requests.rejected');
        break;
      default:
        color = AppColors.amber;
        label = t('requests.pending');
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: AppDecorations.badge(color: color),
      child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);

    final filtered = _requests?.where((r) => _filterStatus == 'ALL' || r.status == _filterStatus).toList();

    return Scaffold(
      appBar: AppBar(title: Text(t('requests.title'))),
      body: Column(
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _FilterTab(label: t('requests.allStatuses'), isSelected: _filterStatus == 'ALL', onTap: () => setState(() => _filterStatus = 'ALL')),
                const SizedBox(width: 8),
                _FilterTab(label: t('requests.pending'), isSelected: _filterStatus == 'PENDING', onTap: () => setState(() => _filterStatus = 'PENDING')),
                const SizedBox(width: 8),
                _FilterTab(label: t('requests.approved'), isSelected: _filterStatus == 'APPROVED', onTap: () => setState(() => _filterStatus = 'APPROVED')),
                const SizedBox(width: 8),
                _FilterTab(label: t('requests.rejected'), isSelected: _filterStatus == 'REJECTED', onTap: () => setState(() => _filterStatus = 'REJECTED')),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Text(_error!, style: TextStyle(color: AppColors.red), textAlign: TextAlign.center),
                        ),
                      )
                    : filtered == null || filtered.isEmpty
                        ? Center(child: Text(t('requests.empty'), style: TextStyle(color: AppColors.textFaint)))
                        : RefreshIndicator(
                            onRefresh: _loadRequests,
                            color: AppColors.emerald,
                            backgroundColor: AppColors.bgCard,
                            child: ListView.separated(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                              itemCount: filtered.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 10),
                              itemBuilder: (context, index) {
                                final req = filtered[index];
                                return Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: AppDecorations.card(),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              '${req.studentName} (${req.className})',
                                              style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 15),
                                            ),
                                          ),
                                          _statusBadge(req.status),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          Icon(Icons.calendar_today_rounded, size: 13, color: AppColors.textMuted),
                                          const SizedBox(width: 6),
                                          Text('${req.startDate} — ${req.endDate}', style: TextStyle(color: AppColors.textMuted, fontSize: 12.5)),
                                          const SizedBox(width: 10),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                            decoration: AppDecorations.badge(color: AppColors.cyan),
                                            child: Text(_reasonText(req.reasonType), style: TextStyle(color: AppColors.cyan, fontSize: 11)),
                                          ),
                                        ],
                                      ),
                                      if (req.reasonText != null && req.reasonText!.isNotEmpty) ...[
                                        const SizedBox(height: 8),
                                        Text(req.reasonText!, style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.35)),
                                      ],
                                      if (req.reviewNote != null && req.reviewNote!.isNotEmpty) ...[
                                        const SizedBox(height: 8),
                                        Container(
                                          padding: const EdgeInsets.all(10),
                                          decoration: BoxDecoration(color: AppColors.bgInput, borderRadius: BorderRadius.circular(10)),
                                          child: Row(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Icon(Icons.notes_rounded, size: 14, color: AppColors.textMuted),
                                              const SizedBox(width: 6),
                                              Expanded(
                                                child: Text(req.reviewNote!, style: TextStyle(color: AppColors.textMuted, fontSize: 12, fontStyle: FontStyle.italic)),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                      if (req.status == 'PENDING') ...[
                                        const SizedBox(height: 14),
                                        Row(
                                          children: [
                                            Expanded(
                                              child: OutlinedButton(
                                                onPressed: () => _updateStatus(req.id, 'REJECTED'),
                                                style: OutlinedButton.styleFrom(
                                                  foregroundColor: AppColors.red,
                                                  side: BorderSide(color: AppColors.red.withOpacity(0.35)),
                                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                                ),
                                                child: Text(t('requests.reject'), style: const TextStyle(fontSize: 13)),
                                              ),
                                            ),
                                            const SizedBox(width: 10),
                                            Expanded(
                                              child: ElevatedButton(
                                                onPressed: () => _updateStatus(req.id, 'APPROVED'),
                                                style: ElevatedButton.styleFrom(
                                                  padding: const EdgeInsets.symmetric(vertical: 10),
                                                ),
                                                child: Text(t('requests.approve'), style: const TextStyle(fontSize: 13)),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ],
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

class _FilterTab extends StatelessWidget {
  const _FilterTab({required this.label, required this.isSelected, required this.onTap});
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.emerald : AppColors.bgCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? AppColors.emerald : AppColors.borderSubtle),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : AppColors.textSecondary,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            fontSize: 12.5,
          ),
        ),
      ),
    );
  }
}
