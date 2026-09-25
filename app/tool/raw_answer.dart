// Prints the teacher's raw answer for one page and question, showing every $...$ math segment
// and any Greek letters written outside math, to debug how answers render in the app.
//   Server on 127.0.0.1:8080, then from app/:  dart run tool/raw_answer.dart <pdfPage> "<question>"
import 'dart:io';

import 'package:offline_school/content/book.dart';
import 'package:offline_school/tutor/llama_client.dart';
import 'package:offline_school/tutor/prompt_builder.dart';
import 'package:path/path.dart' as p;

Future<void> main(List<String> args) async {
  final page = int.parse(args[0]);
  final question = args[1];
  final appDir = Directory.current.path;
  final book = await Book.load(p.join(appDir, '..', 'content', 'g12-math'));
  await book.preloadPackages();
  final template = await File(p.join(appDir, 'assets', 'prompts', 'teacher_system_fa.txt')).readAsString();
  final builder = PromptBuilder(
      book: book, systemPrompt: fillTeacherPrompt(template, bookTitle: book.titleFa, studentName: 'مریم'));
  final turn = builder.build(pdfPage: page, question: question);
  stdout.writeln('other pages added: ${turn.sourcePages}');
  final answer = StringBuffer();
  await for (final piece in LlamaClient(8080).chat(turn.messages)) {
    answer.write(piece);
  }
  final text = answer.toString();
  stdout.writeln('math segments:');
  for (final m in RegExp(r'\$\$[^$]+\$\$|\$[^$]+\$').allMatches(text)) {
    stdout.writeln('  ${m.group(0)}');
  }
  final outside = text.replaceAll(RegExp(r'\$\$[^$]+\$\$|\$[^$]+\$'), ' ');
  final greek = RegExp(r'[Ͱ-Ͽ∀-⋿\\]').allMatches(outside).map((m) => m.group(0)).toSet();
  stdout.writeln('symbols outside math: $greek');
  stdout.writeln('unbalanced \$: ${RegExp(r'\$').allMatches(text).length.isOdd}');
}
