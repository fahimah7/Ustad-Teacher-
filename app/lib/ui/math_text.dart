import 'package:flutter/material.dart';
import 'package:flutter_math_fork/flutter_math.dart';

/// One run of a teacher answer: ordinary Dari text, or a formula.
class MathPiece {
  const MathPiece(this.text, {this.isMath = false, this.display = false});

  final String text;
  final bool isMath;
  final bool display;

  @override
  String toString() => isMath ? '[\$$text\$]' : text;
}

/// Right-to-left Dari text with inline `$...$` and display `$$...$$` LaTeX, as the teacher writes it.
class MathText extends StatelessWidget {
  const MathText(this.text, {super.key, this.style});

  final String text;
  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final base = style ?? DefaultTextStyle.of(context).style;
    final spans = <InlineSpan>[
      for (final piece in splitMath(text))
        if (!piece.isMath)
          TextSpan(text: piece.text)
        else
          WidgetSpan(
            alignment: PlaceholderAlignment.middle,
            child: Directionality(
              textDirection: TextDirection.ltr,
              child: Math.tex(
                piece.text,
                mathStyle: piece.display ? MathStyle.display : MathStyle.text,
                textStyle: base.copyWith(fontSize: (base.fontSize ?? 14) * 1.05),
                onErrorFallback: (_) => Text(piece.text, style: base),
              ),
            ),
          ),
    ];
    return Text.rich(TextSpan(style: base, children: spans), textDirection: TextDirection.rtl);
  }

  /// Small models like Markdown; the panel shows plain text, so drop the markers.
  static String cleanMarkdown(String s) => s
      .replaceAll('**', '')
      .replaceAllMapped(RegExp(r'^[ \t]*[-*][ \t]+', multiLine: true), (_) => '• ')
      .replaceAllMapped(RegExp(r'^#+[ \t]*', multiLine: true), (_) => '');
}

final _mathSegment = RegExp(r'\$\$([^$]+)\$\$|\$([^$]+)\$');

/// Splits an answer into text and formulas, repairing what the math fonts can't draw:
/// the math fonts have no Dari letters or digits and no glyph metrics for typed Unicode symbols,
/// so such characters would be drawn on top of each other.
List<MathPiece> splitMath(String input) {
  final source = MathText.cleanMarkdown(input);
  final pieces = <MathPiece>[];
  var last = 0;
  for (final m in _mathSegment.allMatches(source)) {
    if (m.start > last) pieces.add(MathPiece(source.substring(last, m.start)));
    final display = m.group(1) != null;
    pieces.addAll(_formulaPieces((m.group(1) ?? m.group(2))!, display));
    last = m.end;
  }
  if (last < source.length) pieces.add(MathPiece(source.substring(last)));
  return _joinAdjacentFormulas(pieces);
}

// Dari words inside a formula — in \text{...} or bare — become ordinary text between formulas.
final _dariInFormula = RegExp(
    r'\\(?:text|mathrm|textrm|textbf|mbox)\s*\{([^{}]*[\u0600-\u06FF][^{}]*)\}'
    r'|([\u0600-\u06FF](?:[\u0600-\u06FF\u200C ]*[\u0600-\u06FF])?)');

List<MathPiece> _formulaPieces(String tex, bool display) {
  final pieces = <MathPiece>[];
  final t = _unicodeToTex(tex);
  var last = 0;
  void addMath(String s) {
    if (s.trim().isNotEmpty) pieces.add(MathPiece(s.trim(), isMath: true, display: display));
  }

  for (final m in _dariInFormula.allMatches(t)) {
    addMath(t.substring(last, m.start));
    pieces.add(MathPiece(' ${(m.group(1) ?? m.group(2))!.trim()} '));
    last = m.end;
  }
  addMath(t.substring(last));
  return pieces;
}

const _symbols = {
  'ε': r'\epsilon', 'ϵ': r'\epsilon', 'δ': r'\delta', 'Δ': r'\Delta', 'α': r'\alpha', 'β': r'\beta',
  'γ': r'\gamma', 'θ': r'\theta', 'λ': r'\lambda', 'μ': r'\mu', 'π': r'\pi', 'σ': r'\sigma',
  'Σ': r'\Sigma', 'φ': r'\varphi', 'ω': r'\omega', 'Ω': r'\Omega', '≤': r'\le', '≥': r'\ge',
  '≠': r'\ne', '≈': r'\approx', '→': r'\to', '←': r'\leftarrow', '⇒': r'\Rightarrow', '∞': r'\infty',
  '×': r'\times', '÷': r'\div', '±': r'\pm', '∈': r'\in', '∫': r'\int', '∑': r'\sum', '·': r'\cdot',
  '√': r'\sqrt', '°': r'^\circ', '−': '-',
};

/// Typed Unicode symbols → LaTeX commands; Dari/Arabic digits → 0-9.
String _unicodeToTex(String tex) {
  final out = StringBuffer();
  for (final r in tex.runes) {
    final c = String.fromCharCode(r);
    final command = _symbols[c];
    if (command != null) {
      out.write(' $command ');
    } else if (r >= 0x06F0 && r <= 0x06F9) {
      out.writeCharCode(0x30 + r - 0x06F0);
    } else if (r >= 0x0660 && r <= 0x0669) {
      out.writeCharCode(0x30 + r - 0x0660);
    } else {
      out.write(c);
    }
  }
  return out.toString().replaceAll(RegExp(r' {2,}'), ' ');
}

// Formulas separated only by spaces or simple symbols ("$\epsilon$-$\delta$", "$\lim…$ $= 6$")
// are joined: separate formulas in a right-to-left line would be shown in reverse order.
final _simpleSeparator = RegExp(r'^[\s\-–=+,.:;<>()/]*$');

List<MathPiece> _joinAdjacentFormulas(List<MathPiece> pieces) {
  final out = <MathPiece>[];
  for (final piece in pieces) {
    if (piece.isMath && out.isNotEmpty) {
      final prev = out.last;
      if (prev.isMath && prev.display == piece.display) {
        out[out.length - 1] = MathPiece('${prev.text} ${piece.text}', isMath: true, display: piece.display);
        continue;
      }
      if (!prev.isMath &&
          prev.text.length <= 6 &&
          _simpleSeparator.hasMatch(prev.text) &&
          out.length >= 2 &&
          out[out.length - 2].isMath &&
          out[out.length - 2].display == piece.display) {
        final first = out[out.length - 2];
        out
          ..removeLast()
          ..removeLast()
          ..add(MathPiece('${first.text} ${prev.text.trim()} ${piece.text}'.replaceAll(RegExp(r' {2,}'), ' '),
              isMath: true, display: piece.display));
        continue;
      }
    }
    out.add(piece);
  }
  return out;
}
