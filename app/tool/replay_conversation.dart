// Replays a conversation on one page the way the app does (same prompts, same history),
// and prints each answer. Server on 127.0.0.1:8080, then from app/:
//   dart run tool/replay_conversation.dart <pdfPage> "<question 1>" "<question 2>" ...
import 'dart:io';

import 'package:offline_school/content/book.dart';
import 'package:offline_school/tutor/dari_terms.dart';
import 'package:offline_school/tutor/llama_client.dart';
import 'package:offline_school/tutor/prompt_builder.dart';
import 'package:path/path.dart' as p;

Future<void> main(List<String> args) async {
  final page = int.parse(args.first);
  final appDir = Directory.current.path;
  final book = await Book.load(p.join(appDir, '..', 'content', 'g12-math'));
  await book.preloadPackages();
  final template = await File(p.join(appDir, 'assets', 'prompts', 'teacher_system_fa.txt')).readAsString();
  final builder = PromptBuilder(
      book: book, systemPrompt: fillTeacherPrompt(template, bookTitle: book.titleFa, studentName: 'احمد'));
  final client = LlamaClient(8080);
  final history = <ChatMessage>[];

  for (final question in args.skip(1)) {
    final turn = builder.build(pdfPage: page, question: question, history: history);
    final answer = StringBuffer();
    await for (final piece in client.chat(turn.messages)) {
      answer.write(piece);
    }
    final text = toBookDari(answer.toString());
    stdout.writeln('>>> $question');
    stdout.writeln(text.trim());
    stdout.writeln();
    history
      ..add(ChatMessage('user', question))
      ..add(ChatMessage('assistant', text));
  }
}
