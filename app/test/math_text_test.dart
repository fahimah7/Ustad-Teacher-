import 'package:flutter_test/flutter_test.dart';
import 'package:offline_school/ui/math_text.dart';

void main() {
  String show(String text) => splitMath(text).join('|');

  test('formulas split by a dash or spaces are joined so RTL layout cannot reverse them', () {
    expect(show(r'روش $\epsilon$-$\delta$ است'), r'روش |[$\epsilon - \delta$]| است');
    expect(show(r'که $\lim_{x \to 3}$ $\frac{x^2-9}{x-3}$ $= 6$ است'),
        r'که |[$\lim_{x \to 3} \frac{x^2-9}{x-3} = 6$]| است');
  });

  test('Dari between formulas keeps them apart', () {
    expect(show(r'اگر $a$ و $b$'), r'اگر |[$a$]| و |[$b$]');
  });

  test('Dari words inside a formula become ordinary text', () {
    expect(show(r'اگر $x \text{ بزرگتر از } 3$ باشد'), r'اگر |[$x$]| بزرگتر از |[$3$]| باشد');
    expect(show(r'$x$ کوچکتر از $3$'), r'[$x$]| کوچکتر از |[$3$]');
  });

  test('typed Greek letters, symbols and Dari digits become things the math fonts can draw', () {
    expect(show(r'$ε > ۰$'), r'[$\epsilon > 0$]');
    expect(show(r'$x → ∞$'), r'[$x \to \infty$]');
  });

  test('display formulas stay display formulas', () {
    final pieces = splitMath(r'$$x^2$$');
    expect(pieces.single.isMath, isTrue);
    expect(pieces.single.display, isTrue);
  });
}
