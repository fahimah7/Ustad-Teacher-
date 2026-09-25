import 'dart:io';

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

import 'fixture_book.dart';

void main() {
  late Directory dir;
  late Book book;

  setUpAll(() async => (dir, book) = await createFixtureBook());
  tearDownAll(() => dir.delete(recursive: true));

  Future<TeacherController> pumpReader(WidgetTester tester, {int? savedPage}) async {
    tester.view
      ..physicalSize = const Size(1400, 900)
      ..devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);
    final progressFile = File(p.join(dir.path, 'progress.json'));
    if (progressFile.existsSync()) progressFile.deleteSync();
    if (savedPage != null) progressFile.writeAsStringSync('{"test-book": $savedPage}');
    final progress = await tester.runAsync(() => ProgressStore.open(file: progressFile));
    final model = ModelService(const AppConfig(contentDir: '', llamaServerExe: '', modelPath: ''));
    final teacher = TeacherController(
      builder: PromptBuilder(book: book, systemPrompt: 'قواعد'),
      model: model,
      studentName: 'مریم',
    );
    addTearDown(teacher.dispose);
    await tester.pumpWidget(MaterialApp(
      home: Directionality(
        textDirection: TextDirection.rtl,
        child: ReaderScreen(book: book, teacher: teacher, progress: progress!),
      ),
    ));
    await tester.pumpAndSettle();
    return teacher;
  }

  /// Lets the reader's "scrolling stopped" and "save progress" timers run.
  Future<void> settleTimers(WidgetTester tester) async {
    await tester.pump(const Duration(seconds: 1));
    await tester.pumpAndSettle();
  }

  testWidgets('the whole book is one scrolling list of pages', (tester) async {
    final teacher = await pumpReader(tester);
    expect(find.byType(ListView), findsWidgets);
    expect(find.byType(Image), findsWidgets);
    expect(find.text('صفحهٔ ۱ از ۶ (پی‌دی‌اف)'), findsOneWidget); // page 1 has no printed number
    expect(teacher.currentPage, 1);
  });

  testWidgets('opens at the first page and offers to continue from the saved one', (tester) async {
    final teacher = await pumpReader(tester, savedPage: 5);
    expect(teacher.currentPage, 1);
    expect(find.text('صفحهٔ ۱ از ۶ (پی‌دی‌اف)'), findsOneWidget);

    await tester.tap(find.text('ادامه از صفحهٔ ۶')); // PDF page 5 is printed page 6
    await tester.pumpAndSettle();
    expect(teacher.currentPage, 5);
    expect(find.text('ادامه از صفحهٔ ۶'), findsNothing);

    // Scrolling back from there moves the teacher along too.
    await tester.drag(find.byType(ListView).first, const Offset(0, 2500));
    await tester.pumpAndSettle();
    await settleTimers(tester);
    expect(teacher.currentPage, lessThan(5));
  });

  testWidgets('the teacher always answers about the page in view', (tester) async {
    final teacher = await pumpReader(tester);

    await tester.tap(find.byTooltip('صفحهٔ بعد'));
    await tester.pumpAndSettle();
    expect(find.text('صفحهٔ ۳ از ۷'), findsOneWidget); // PDF page 2 is printed page 3
    expect(teacher.currentPage, 2);

    // Scroll well into the book; when scrolling stops the reader settles on one whole page,
    // and that is the page the teacher is told about.
    await tester.drag(find.byType(ListView).first, const Offset(0, -2000));
    await tester.pumpAndSettle();
    await settleTimers(tester);
    expect(teacher.currentPage, greaterThan(2));
    final printed = book.printedPageOf(teacher.currentPage);
    expect(find.text('صفحهٔ ${String.fromCharCodes('$printed'.codeUnits.map((c) => c + 0x06F0 - 0x30))} از ۷'),
        findsOneWidget);
  });
}
