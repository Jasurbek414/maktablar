import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api_client.dart';
import '../../l10n/l10n.dart';
import '../../models/models.dart';
import '../../theme/app_theme.dart';
import 'parent_repository.dart';

class SubmitAbsenceScreen extends ConsumerStatefulWidget {
  const SubmitAbsenceScreen({super.key, required this.students});
  final List<Student> students;

  @override
  ConsumerState<SubmitAbsenceScreen> createState() => _SubmitAbsenceScreenState();
}

class _SubmitAbsenceScreenState extends ConsumerState<SubmitAbsenceScreen> {
  Student? _selectedStudent;
  DateTime? _startDate;
  DateTime? _endDate;
  String _reasonType = 'ILLNESS';
  final _commentCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    if (widget.students.isNotEmpty) {
      _selectedStudent = widget.students.first;
    }
  }

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickStartDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _startDate ?? DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date != null) {
      setState(() {
        _startDate = date;
        if (_endDate == null || _endDate!.isBefore(date)) {
          _endDate = date;
        }
      });
    }
  }

  Future<void> _pickEndDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _endDate ?? _startDate ?? DateTime.now(),
      firstDate: _startDate ?? DateTime.now().subtract(const Duration(days: 30)),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date != null) {
      setState(() => _endDate = date);
    }
  }

  Future<void> _submit() async {
    if (_selectedStudent == null || _startDate == null || _endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(t('requests.fillRequired'))));
      return;
    }

    setState(() => _submitting = true);
    try {
      final df = DateFormat('yyyy-MM-dd');
      final data = {
        'studentId': _selectedStudent!.id,
        'studentName': _selectedStudent!.fullName,
        'className': _selectedStudent!.className,
        'startDate': df.format(_startDate!),
        'endDate': df.format(_endDate!),
        'reasonType': _reasonType,
        'reasonText': _commentCtrl.text.trim(),
      };
      await ref.read(parentRepositoryProvider).submitAbsenceRequest(data);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(t('requests.sent')),
          backgroundColor: AppColors.emerald,
        ));
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(apiErrorMessage(e))));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(themeModeProvider);
    ref.watch(localeProvider);

    final df = DateFormat('dd.MM.yyyy');

    return Scaffold(
      appBar: AppBar(title: Text(t('requests.submit'))),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: AppDecorations.card(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Child Selector
                Text(t('requests.selectChild'), style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
                const SizedBox(height: 8),
                DropdownButtonFormField<Student>(
                  value: _selectedStudent,
                  dropdownColor: AppColors.bgCard,
                  decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12)),
                  items: widget.students
                      .map((s) => DropdownMenuItem(
                            value: s,
                            child: Text(s.fullName, style: TextStyle(color: AppColors.textPrimary, fontSize: 14)),
                          ))
                      .toList(),
                  onChanged: (val) {
                    if (val != null) setState(() => _selectedStudent = val);
                  },
                ),
                const SizedBox(height: 20),

                // Date Pickers
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t('requests.startDate'), style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
                          const SizedBox(height: 8),
                          InkWell(
                            onTap: _pickStartDate,
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                              decoration: BoxDecoration(
                                color: AppColors.bgInput,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: AppColors.borderSubtle),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    _startDate == null ? '--.--.----' : df.format(_startDate!),
                                    style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5, fontWeight: FontWeight.w500),
                                  ),
                                  Icon(Icons.calendar_today_rounded, size: 15, color: AppColors.emerald),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t('requests.endDate'), style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
                          const SizedBox(height: 8),
                          InkWell(
                            onTap: _pickEndDate,
                            borderRadius: BorderRadius.circular(14),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                              decoration: BoxDecoration(
                                color: AppColors.bgInput,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: AppColors.borderSubtle),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    _endDate == null ? '--.--.----' : df.format(_endDate!),
                                    style: TextStyle(color: AppColors.textPrimary, fontSize: 13.5, fontWeight: FontWeight.w500),
                                  ),
                                  Icon(Icons.calendar_today_rounded, size: 15, color: AppColors.emerald),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Reason Type Selector
                Text(t('requests.reasonType'), style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _ReasonOption(
                      label: t('requests.reasonIllness'),
                      isSelected: _reasonType == 'ILLNESS',
                      icon: Icons.sick_outlined,
                      onTap: () => setState(() => _reasonType = 'ILLNESS'),
                    ),
                    const SizedBox(width: 8),
                    _ReasonOption(
                      label: t('requests.reasonFamily'),
                      isSelected: _reasonType == 'FAMILY',
                      icon: Icons.family_restroom_outlined,
                      onTap: () => setState(() => _reasonType = 'FAMILY'),
                    ),
                    const SizedBox(width: 8),
                    _ReasonOption(
                      label: t('requests.reasonOther'),
                      isSelected: _reasonType == 'OTHER',
                      icon: Icons.more_horiz_rounded,
                      onTap: () => setState(() => _reasonType = 'OTHER'),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Reason Comment
                Text(t('requests.comment'), style: TextStyle(color: AppColors.textSecondary, fontSize: 13, fontWeight: FontWeight.w500)),
                const SizedBox(height: 8),
                TextField(
                  controller: _commentCtrl,
                  style: TextStyle(color: AppColors.textPrimary, fontSize: 14),
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: t('requests.commentHint'),
                  ),
                ),
                const SizedBox(height: 24),

                // Submit Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _submit,
                    child: _submitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(t('requests.submitBtn')),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ReasonOption extends StatelessWidget {
  const _ReasonOption({
    required this.label,
    required this.isSelected,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final bool isSelected;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.emerald.withOpacity(0.12) : AppColors.bgInput,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isSelected ? AppColors.emerald : AppColors.borderSubtle,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 20, color: isSelected ? AppColors.emerald : AppColors.textMuted),
              const SizedBox(height: 5),
              Text(
                label,
                style: TextStyle(
                  color: isSelected ? AppColors.emerald : AppColors.textSecondary,
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
