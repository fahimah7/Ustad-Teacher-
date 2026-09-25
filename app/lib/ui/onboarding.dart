import 'package:flutter/material.dart';

import '../content/library.dart';

/// Builds the reader for the chosen book (supplied by the app shell, replaced in tests).
typedef ReaderBuilder = Widget Function(String studentName, BookInfo book);

/// The grades offered in this version; grades without a ready book show "به زودی".
const offeredGrades = [10, 11, 12];

/// Step 1: the teacher introduces herself and asks the student's name.
class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key, required this.library, required this.readerBuilder});

  final List<BookInfo> library;
  final ReaderBuilder readerBuilder;

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  final _name = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  void _continue() {
    final name = _name.text.trim();
    if (name.isEmpty) return;
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => GradeScreen(studentName: name, library: widget.library, readerBuilder: widget.readerBuilder),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 460),
          child: Card(
            margin: const EdgeInsets.all(24),
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const TeacherAvatar(radius: 40),
                  const SizedBox(height: 16),
                  Text('سلام! من معلمه زهرا هستم، معلم شما.', style: theme.textTheme.headlineSmall, textAlign: TextAlign.center),
                  const SizedBox(height: 8),
                  Text('نام شما چیست؟', style: theme.textTheme.titleMedium),
                  const SizedBox(height: 20),
                  TextField(
                    controller: _name,
                    autofocus: true,
                    textDirection: TextDirection.rtl,
                    textAlign: TextAlign.center,
                    maxLength: 30,
                    onSubmitted: (_) => _continue(),
                    decoration: const InputDecoration(hintText: 'نام خود را بنویسید', border: OutlineInputBorder()),
                  ),
                  Text(
                    'نام شما فقط در همین برنامه دیده می‌شود و در هیچ جایی ذخیره نمی‌شود.',
                    style: theme.textTheme.bodySmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  ValueListenableBuilder(
                    valueListenable: _name,
                    builder: (context, value, _) => FilledButton.icon(
                      onPressed: value.text.trim().isEmpty ? null : _continue,
                      icon: const Icon(Icons.arrow_forward),
                      label: const Text('ادامه'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Step 2: greet the student by name and let her choose her grade.
class GradeScreen extends StatelessWidget {
  const GradeScreen({super.key, required this.studentName, required this.library, required this.readerBuilder});

  final String studentName;
  final List<BookInfo> library;
  final ReaderBuilder readerBuilder;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final grades = {...offeredGrades, ...library.map((b) => b.grade)}.toList()..sort();
    return Scaffold(
      appBar: AppBar(),
      body: _ChoicePage(
        header: Row(
          children: [
            const TeacherAvatar(radius: 32),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('سلام $studentName جان، خوش آمدید!', style: theme.textTheme.headlineSmall),
                  const SizedBox(height: 4),
                  Text('خوشحالم که امروز با هم درس می‌خوانیم. لطفاً صنف خود را انتخاب کنید.',
                      style: theme.textTheme.titleMedium),
                ],
              ),
            ),
          ],
        ),
        choices: [
          for (final grade in grades)
            _ChoiceCard(
              icon: Icons.school,
              title: gradeNameFa(grade),
              subtitle: library.any((b) => b.grade == grade) ? null : 'به زودی',
              onTap: library.any((b) => b.grade == grade)
                  ? () => Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => BookScreen(
                          studentName: studentName,
                          grade: grade,
                          books: [for (final b in library) if (b.grade == grade) b],
                          readerBuilder: readerBuilder,
                        ),
                      ))
                  : null,
            ),
        ],
      ),
    );
  }
}

/// Step 3: choose a book of the chosen grade.
class BookScreen extends StatelessWidget {
  const BookScreen({
    super.key,
    required this.studentName,
    required this.grade,
    required this.books,
    required this.readerBuilder,
  });

  final String studentName;
  final int grade;
  final List<BookInfo> books;
  final ReaderBuilder readerBuilder;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(gradeNameFa(grade))),
      body: _ChoicePage(
        header: Text('$studentName جان، کدام کتاب را می‌خوانید؟', style: theme.textTheme.headlineSmall),
        choices: [
          for (final book in books)
            _ChoiceCard(
              icon: book.subject == 'math' ? Icons.calculate : Icons.menu_book,
              title: book.subjectFa,
              subtitle: book.titleFa,
              onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => readerBuilder(studentName, book))),
            ),
        ],
      ),
    );
  }
}

class TeacherAvatar extends StatelessWidget {
  const TeacherAvatar({super.key, this.radius = 20});

  final double radius;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return CircleAvatar(
      radius: radius,
      backgroundColor: scheme.primary,
      child: Icon(Icons.school, color: scheme.onPrimary, size: radius),
    );
  }
}

class _ChoicePage extends StatelessWidget {
  const _ChoicePage({required this.header, required this.choices});

  final Widget header;
  final List<Widget> choices;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 720),
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.all(24),
          children: [
            header,
            const SizedBox(height: 28),
            Wrap(spacing: 16, runSpacing: 16, children: choices),
          ],
        ),
      ),
    );
  }
}

class _ChoiceCard extends StatelessWidget {
  const _ChoiceCard({required this.icon, required this.title, this.subtitle, this.onTap});

  final IconData icon;
  final String title;
  final String? subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final enabled = onTap != null;
    return SizedBox(
      width: 200,
      height: 150,
      child: Card(
        color: enabled ? theme.colorScheme.primaryContainer : theme.colorScheme.surfaceContainerHighest,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Opacity(
            opacity: enabled ? 1 : 0.5,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 40, color: theme.colorScheme.primary),
                const SizedBox(height: 10),
                Text(title, style: theme.textTheme.titleLarge),
                if (subtitle != null) Text(subtitle!, style: theme.textTheme.bodySmall),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
