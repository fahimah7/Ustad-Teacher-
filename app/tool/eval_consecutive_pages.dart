// Asks "what is this page about?" on consecutive pages of one section, in order, as a student
// scrolling through would, and prints which page numbers each answer mentions.
//   Server on 127.0.0.1:8080, then from app/:  dart run tool/eval_consecutive_pages.dart [first] [last]
import 'dart:io';

import 'package:offline_school/content/book.dart';
import 'package:offline_school/content/fa_numbers.dart';
import 'package:offline_school/tutor/llama_client.dart';
import 'package:offline_school/tutor/prompt_builder.dart';
import 'package:path/path.dart' as p;

Future<void> main(List<String> args) async {
  final first = args.isNotEmpty ? int.parse(args[0]) : 250;
  final last = args.length > 1 ? int.parse(args[1]) : 254;
  final appDir = Directory.current.path;
  final book = await Book.load(p.join(appDir, '..', 'content', 'g12-math'));
  await book.preloadPackages();
  final template = await File(p.join(appDir, 'assets', 'prompts', 'teacher_system_fa.txt')).readAsString();
  final builder = PromptBuilder(
      book: book, systemPrompt: fillTeacherPrompt(template, bookTitle: book.titleFa, studentName: 'مریم'));
  final client = LlamaClient(8080);
  final pageNumber = RegExp(r'صفحه[ٔ‌ی]*\s*([۰-۹0-9]+)');

  for (var page = first; page <= last; page++) {
    final turn = builder.build(pdfPage: page, question: 'این صفحه در بارهٔ چیست؟');
    final answer = StringBuffer();
    await for (final piece in client.chat(turn.messages)) {
      answer.write(piece);
    }
    final text = answer.toString();
    final mentioned = [for (final m in pageNumber.allMatches(text)) parseFaInt(m.group(1)!)];
    final pkg = book.cachedPackage(page)!;
    stdout.writeln('--- showing printed ${book.printedPageOf(page)} «${pkg.sectionFa}»  | answer mentions pages $mentioned');
    stdout.writeln('    page summary starts: ${pkg.summaryFa.substring(0, pkg.summaryFa.length.clamp(0, 120))}');
    stdout.writeln('    answer: ${text.replaceAll('\n', ' ').substring(0, text.length.clamp(0, 260))}');
  }
}
