import 'dart:io';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:offline_school/config.dart';
import 'package:offline_school/content/book.dart';
import 'package:offline_school/progress_store.dart';
import 'package:offline_school/tutor/model_service.dart';
import 'package:offline_school/tutor/prompt_builder.dart';
import 'package:offline_school/tutor/teacher_controller.dart';
import 'package:offline_school/ui/reader_screen.dart';
import 'package:path/path.dart' as p;

/// The real Grade 12 book in a window like the laptop's, scrolled with the mouse wheel.
void main() {
  final bookDir = p.normalize(p.join(Directory.current.path, '..', 'content', 'g12-math'));
  final skip = !File(p.join(bookDir, 'book.json')).existsSync();

  testWidgets('mouse-wheel scrolling from a saved page updates the teacher', skip: skip, (tester) async {
    tester.view
      ..physicalSize = const Size(1800, 1100)
      ..devicePixelRatio = 1.25;
    addTearDown(tester.view.reset);

    final tmp = Directory.systemTemp.createTempSync('real_book');
    addTearDown(() => tmp.deleteSync(recursive: true));
    final progressFile = File(p.join(tmp.path, 'progress.json'))..writeAsStringSync('{"g12-math": 250}');

    final (book, progress) = (await tester.runAsync(() async {
      final book = await Book.load(bookDir);
      await book.preloadPackages();
      return (book, await ProgressStore.open(file: progressFile));
    }))!;
    final teacher = TeacherController(
      builder: PromptBuilder(book: book, systemPrompt: 'قواعد'),
      model: ModelService(const AppConfig(contentDir: '', llamaServerExe: '', modelPath: '')),
      studentName: 'مریم',
    );
    addTearDown(teacher.dispose);

    await tester.pumpWidget(MaterialApp(
      home: Directionality(
        textDirection: TextDirection.rtl,
        child: ReaderScreen(book: book, teacher: teacher, progress: progress),
      ),
    ));
    await tester.pumpAndSettle();
    expect(teacher.currentPage, 1); // the book opens at its first page

    Future<void> wheel(double dy, int notches) async {
      final pointer = TestPointer(1, PointerDeviceKind.mouse);
      await tester.sendEventToBinding(pointer.hover(tester.getCenter(find.byType(ListView).first)));
      for (var notch = 1; notch <= notches; notch++) {
        await tester.sendEventToBinding(pointer.scroll(Offset(0, dy)));
        await tester.pump(const Duration(milliseconds: 50));
      }
      await tester.pump(const Duration(seconds: 1));
      await tester.pumpAndSettle();
    }

    await wheel(100, 6); // wheel down
    expect(teacher.currentPage, greaterThan(1));

    await tester.tap(find.textContaining('ادامه از'));
    await tester.pumpAndSettle();
    expect(teacher.currentPage, 250);
    await wheel(-100, 6); // wheel up
    expect(teacher.currentPage, lessThan(250));
  });
}
