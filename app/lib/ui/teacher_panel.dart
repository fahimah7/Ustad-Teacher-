import 'package:flutter/material.dart';

import '../content/fa_numbers.dart';
import '../tutor/teacher_controller.dart';
import 'math_text.dart';

const _quickQuestions = [
  'این صفحه را ساده توضیح بدهید',
  'مثال این صفحه را قدم به قدم توضیح بدهید',
  'یک سوال از این صفحه از من بپرسید',
];

/// The teacher beside the book: status, conversation, quick questions and the input box.
class TeacherPanel extends StatefulWidget {
  const TeacherPanel({super.key, required this.controller, required this.onOpenPage});

  final TeacherController controller;

  /// Opens a PDF page in the reader (used by the page links under the teacher's answers).
  final void Function(int pdfPage) onOpenPage;

  @override
  State<TeacherPanel> createState() => _TeacherPanelState();
}

class _TeacherPanelState extends State<TeacherPanel> {
  final _input = TextEditingController();
  final _scroll = ScrollController();

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _send([String? text]) {
    final question = text ?? _input.text;
    if (question.trim().isEmpty) return;
    widget.controller.ask(question);
    _input.clear();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) _scroll.jumpTo(_scroll.position.maxScrollExtent);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListenableBuilder(
      listenable: widget.controller,
      builder: (context, _) {
        final c = widget.controller;
        _scrollToEnd();
        // Say which page the teacher is looking at, so the student knows what she will answer about.
        final status = c.modelError ??
            (!c.modelReady
                ? 'معلم در حال آماده شدن است…'
                : (c.busy ? 'در حال نوشتن…' : '${_pageName(c.currentPage)} را می‌بینم'));
        return Column(
          children: [
            Container(
              color: theme.colorScheme.primaryContainer,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: theme.colorScheme.primary,
                    child: Icon(Icons.school, color: theme.colorScheme.onPrimary),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('معلمه زهرا', style: theme.textTheme.titleMedium),
                        Text(status,
                            style: theme.textTheme.bodySmall, maxLines: 2, overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: c.messages.isEmpty
                  ? _welcome(theme)
                  : ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.all(12),
                      itemCount: c.messages.length,
                      itemBuilder: (context, i) => _bubble(theme, c.messages[i]),
                    ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  for (final q in _quickQuestions)
                    ActionChip(label: Text(q), onPressed: c.modelReady && !c.busy ? () => _send(q) : null),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _input,
                      enabled: c.modelReady,
                      textDirection: TextDirection.rtl,
                      minLines: 1,
                      maxLines: 4,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: const InputDecoration(
                        hintText: 'سوال خود را بنویسید…',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  if (c.busy)
                    IconButton.filledTonal(onPressed: c.stop, icon: const Icon(Icons.stop), tooltip: 'توقف')
                  else
                    IconButton.filled(
                        onPressed: c.modelReady ? _send : null, icon: const Icon(Icons.send), tooltip: 'فرستادن'),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _welcome(ThemeData theme) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            '${widget.controller.studentName} جان، هر سوالی در بارهٔ این صفحه یا هر جای دیگر کتاب دارید، از من بپرسید.',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyLarge,
          ),
        ),
      );

  String _pageName(int pdfPage) {
    final printed = widget.controller.book.printedPageOf(pdfPage);
    return printed != null ? 'صفحهٔ ${faNum(printed)}' : 'صفحهٔ ${faNum(pdfPage)} (پی‌دی‌اف)';
  }

  Widget _bubble(ThemeData theme, TutorMessage m) {
    if (m.role == TutorRole.divider) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            const Expanded(child: Divider()),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text(m.text, style: theme.textTheme.labelSmall),
            ),
            const Expanded(child: Divider()),
          ],
        ),
      );
    }
    final isTeacher = m.role == TutorRole.teacher;
    final Widget body;
    if (isTeacher && m.text.isEmpty && m.streaming) {
      body = const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2));
    } else if (isTeacher) {
      final text = MathText(m.text, style: theme.textTheme.bodyMedium?.copyWith(height: 1.8));
      body = m.links.isEmpty
          ? text
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                text,
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  children: [
                    for (final link in m.links)
                      ActionChip(
                        avatar: const Icon(Icons.menu_book, size: 16),
                        label: Text(link.label),
                        onPressed: () => widget.onOpenPage(link.pdfPage),
                      ),
                  ],
                ),
              ],
            );
    } else {
      // Show which page the question was asked on, so it's clear what the teacher answers about.
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (m.askedOnPage != null)
            Text('در ${_pageName(m.askedOnPage!)}', style: theme.textTheme.labelSmall),
          Text(m.text, textDirection: TextDirection.rtl),
        ],
      );
    }
    return Align(
      alignment: isTeacher ? AlignmentDirectional.centerStart : AlignmentDirectional.centerEnd,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        constraints: const BoxConstraints(maxWidth: 380),
        decoration: BoxDecoration(
          color: isTeacher ? theme.colorScheme.surfaceContainerHighest : theme.colorScheme.primaryContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: body,
      ),
    );
  }
}
