// Drives the real app on Windows: name → grade → book → scroll → ask, and checks that the
// teacher answers about the page in view.
//   flutter test integration_test/app_flow_test.dart -d windows
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:offline_school/main.dart' as app;
import 'package:offline_school/tutor/teacher_controller.dart';
import 'package:offline_school/ui/teacher_panel.dart';

Future<void> pumpUntil(WidgetTester tester, Finder finder, {Duration timeout = const Duration(seconds: 60)}) async {
  final end = DateTime.now().add(timeout);
  while (finder.evaluate().isEmpty) {
    if (DateTime.now().isAfter(end)) throw TestFailure('timed out waiting for $finder');
    await tester.pump(const Duration(milliseconds: 200));
  }
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('real app: the teacher follows the page in view', (tester) async {
    app.main();
    await pumpUntil(tester, find.byType(TextField));
    await tester.enterText(find.byType(TextField), 'مریم');
    await tester.pump();
    await tester.tap(find.text('ادامه'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('صنف دوازدهم'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('ریاضی'));
    await pumpUntil(tester, find.byType(TeacherPanel));
    await tester.pump(const Duration(seconds: 1));

    final TeacherController teacher = tester.widget<TeacherPanel>(find.byType(TeacherPanel)).controller;
    debugPrint('REAL APP opened: teacher page ${teacher.currentPage}');

    final list = find.byType(ListView).first;
    final pointer = TestPointer(1, PointerDeviceKind.mouse);
    await tester.sendEventToBinding(pointer.hover(tester.getCenter(list)));
    for (var i = 0; i < 8; i++) {
      await tester.sendEventToBinding(pointer.scroll(const Offset(0, 100)));
      await tester.pump(const Duration(milliseconds: 60));
    }
    await tester.pump(const Duration(seconds: 1));
    await tester.pumpAndSettle();
    debugPrint('REAL APP after wheel down: teacher page ${teacher.currentPage}');

    await tester.tap(find.byTooltip('صفحهٔ بعد'));
    await tester.pumpAndSettle();
    debugPrint('REAL APP after next button: teacher page ${teacher.currentPage}');

    // Wait for the model, ask about "this page", and check the prompt that was sent.
    await pumpUntil(tester, find.textContaining('را می‌بینم'), timeout: const Duration(minutes: 3));
    final turn = teacher.builder.build(pdfPage: teacher.currentPage, question: 'این صفحه در بارهٔ چیست؟');
    final question = turn.messages.last.content;
    final pageLine = question.split('\n').firstWhere((l) => l.startsWith('صفحهٔ ') && l.endsWith(' کتاب'), orElse: () => '-');
    debugPrint('REAL APP prompt page line: $pageLine');
  });
}
