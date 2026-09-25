import 'package:flutter/material.dart';

import '../content/book.dart';
import '../content/library.dart';
import '../progress_store.dart';
import '../tutor/model_service.dart';
import '../tutor/prompt_builder.dart';
import '../tutor/teacher_controller.dart';
import 'reader_screen.dart';

/// Opens the chosen book: loads its pages and notes, prepares the teacher, then shows the reader.
class ReaderLoader extends StatefulWidget {
  const ReaderLoader({
    super.key,
    required this.info,
    required this.studentName,
    required this.model,
    required this.promptTemplate,
  });

  final BookInfo info;
  final String studentName;
  final ModelService model;
  final String promptTemplate;

  @override
  State<ReaderLoader> createState() => _ReaderLoaderState();
}

class _ReaderLoaderState extends State<ReaderLoader> {
  late final Future<(Book, TeacherController, ProgressStore)> _loading = _load();
  TeacherController? _teacher;

  Future<(Book, TeacherController, ProgressStore)> _load() async {
    final book = await Book.load(widget.info.dir);
    await book.preloadPackages();
    final progress = await ProgressStore.open();
    final systemPrompt = fillTeacherPrompt(widget.promptTemplate, bookTitle: book.titleFa, studentName: widget.studentName);
    final teacher = TeacherController(
      builder: PromptBuilder(book: book, systemPrompt: systemPrompt),
      model: widget.model,
      studentName: widget.studentName,
    );
    _teacher = teacher;
    return (book, teacher, progress);
  }

  @override
  void dispose() {
    _teacher?.dispose(); // the conversation ends when the student leaves the book
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _loading,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Scaffold(
            appBar: AppBar(),
            body: Center(child: Text('کتاب باز نشد:\n${snapshot.error}', textAlign: TextAlign.center)),
          );
        }
        final data = snapshot.data;
        if (data == null) {
          return const Scaffold(
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [CircularProgressIndicator(), SizedBox(height: 16), Text('کتاب باز می‌شود…')],
              ),
            ),
          );
        }
        final (book, teacher, progress) = data;
        return ReaderScreen(book: book, teacher: teacher, progress: progress);
      },
    );
  }
}
