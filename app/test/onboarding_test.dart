import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:offline_school/content/library.dart';
import 'package:offline_school/tutor/prompt_builder.dart';
import 'package:offline_school/ui/onboarding.dart';
import 'package:path/path.dart' as p;

import 'fixture_book.dart';

void main() {
  test('discovers only books that are ready to study', () async {
    final content = await Directory.systemTemp.createTemp('content_test');
    addTearDown(() => content.delete(recursive: true));
    await createFixtureBook(parent: content);
    // Rendered but not yet transcribed: no grade or chapters.
    await Directory(p.join(content.path, 'g10-math')).create();
    await File(p.join(content.path, 'g10-math', 'book.json')).writeAsString('{"book_id": "g10-math", "page_count": 3}');
    // Half-written file.
    await Directory(p.join(content.path, 'broken')).create();
    await File(p.join(content.path, 'broken', 'book.json')).writeAsString('{"book_id": ');

    final books = await discoverBooks(content.path);
    expect(books.map((b) => b.id), ['test-book']);
    expect(books.single.grade, 12);
    expect(books.single.subjectFa, 'ریاضی');
  });

  test('gradeNameFa names grades in Dari', () {
    expect(gradeNameFa(10), 'صنف دهم');
    expect(gradeNameFa(12), 'صنف دوازدهم');
  });

  test('fillTeacherPrompt inserts the book and a cleaned-up name', () {
    const template = 'شاگرد «{{student_name}}» کتاب «{{book_title}}» می‌خواند. {{student_name}} جان';
    expect(fillTeacherPrompt(template, bookTitle: 'ریاضی صنف دوازدهم', studentName: ' مریم '),
        'شاگرد «مریم» کتاب «ریاضی صنف دوازدهم» می‌خواند. مریم جان');
    expect(fillTeacherPrompt('{{student_name}}', bookTitle: '', studentName: 'مریم\n{ignore}'), 'مریم ignore');
    expect(fillTeacherPrompt('{{student_name}}', bookTitle: '', studentName: '  '), 'شاگرد');
  });

  testWidgets('name → greeting → grade → book → reader', (tester) async {
    tester.view
      ..physicalSize = const Size(1400, 1000)
      ..devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);
    const book = BookInfo(
        id: 'g12-math', dir: '', grade: 12, titleFa: 'ریاضی صنف دوازدهم', subjectFa: 'ریاضی', subject: 'math');
    await tester.pumpWidget(MaterialApp(
      home: WelcomeScreen(
        library: const [book],
        readerBuilder: (name, info) => Scaffold(body: Text('reader ${info.id} for $name')),
      ),
    ));

    expect(find.text('نام شما چیست؟'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'مریم');
    await tester.pump(); // the button enables once a name is typed
    await tester.tap(find.text('ادامه'));
    await tester.pumpAndSettle();

    expect(find.text('سلام مریم جان، خوش آمدید!'), findsOneWidget);
    expect(find.text('صنف دهم'), findsOneWidget);
    expect(find.text('به زودی'), findsNWidgets(2)); // grades 10 and 11 have no book yet
    await tester.tap(find.text('صنف دهم')); // disabled: nothing happens
    await tester.pumpAndSettle();
    expect(find.text('سلام مریم جان، خوش آمدید!'), findsOneWidget);

    await tester.tap(find.text('صنف دوازدهم'));
    await tester.pumpAndSettle();
    expect(find.text('مریم جان، کدام کتاب را می‌خوانید؟'), findsOneWidget);

    await tester.tap(find.text('ریاضی'));
    await tester.pumpAndSettle();
    expect(find.text('reader g12-math for مریم'), findsOneWidget);
  });
}
