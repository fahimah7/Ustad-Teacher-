# Writing the "My rights, my voice" lessons

Ustad is an offline school app for Afghan girls who have been shut out of school since 2021. Besides the
textbooks, it has a section, shown openly in the app, that teaches girls their rights, their history,
how to stand up for themselves, and how to learn and act together safely. You write lessons for it.

Project root: C:\Users\shaye\Desktop\AI Hack for Freedom III. Write only the files your task names, in
`UI Code\src\content\rights\` (create the folder if needed).

## Format: one JSON file per unit, `unit-<n>.json` (UTF-8, ensure_ascii off, indent 2)

    {
      "unit": 1,
      "title": {"en": "...", "fa": "..."},
      "about": {"en": "<one line: what the unit covers>", "fa": "..."},
      "lessons": [
        {
          "id": "r1-1",                                   // r<unit>-<lesson>
          "title": {"en": "...", "fa": "..."},
          "minutes": 5,                                    // 4–8
          "steps": [{"en": "...", "fa": "..."}, ...],      // 3–6 short paragraphs, 2–4 sentences each
          "reflect": {"en": "<one question to think about>", "fa": "..."},
          "check": [                                       // 1–2 multiple-choice questions
            {"q": {"en": "...", "fa": "..."},
             "options": [{"en": "...", "fa": "..."}, ...], // 3 or 4 options, one correct
             "answer": 0,                                  // 0-based index of the correct option
             "why": {"en": "<one sentence>", "fa": "..."}}
          ],
          "practice": null,                                // or a role-play id from the list below
          "sources": ["UDHR, Article 26", ...]             // where the facts come from (for reviewers; not shown)
        }
      ]
    }

Role-play ids you may use in "practice" (the student then practises the conversation with Ustad, who
plays the other person): "family-study" (asking her father or mother to let her keep studying),
"relative-doubts" (answering a relative who says girls don't need school), "friend-circle" (inviting a
trusted friend to a small study circle, safely), "say-no" (saying no firmly and calmly to pressure).

## Language

- `fa` is Afghan Dari, written simply for a girl of 12–18 who may have missed years of school: short
  sentences, everyday words, warm and respectful. Address her as «شما» (plural verbs), never «تو».
  Use Afghan words: مکتب (not مدرسه), شاگرد (not دانش‌آموز), صنف (not کلاس), معارف, پوهنتون, معلومات
  (not اطلاعات). Persian ی and ک only (never Arabic ي / ك). The `fa` text is not a word-for-word
  translation: write it as a Dari speaker would say it.
- `en` is plain English at the same level.

## Rules (important)

- **True and checkable.** Only facts you are sure of (dates, treaty articles, historical people). No
  invented statistics, quotes or stories presented as real. If unsure of a detail, leave it out. List
  your sources in "sources".
- **No names of living private people.** Historical figures are fine. For examples, use invented
  first names only and say they are examples.
- **Safety first, and her choice.** Never push a girl toward risky action. Be honest about risks.
  Stress: nobody must act alone; protect others; she decides; learning itself is resistance; keeping
  herself safe is not cowardice. Nonviolence only; no content about weapons, violence or revenge.
- **Don't name any group or government.** Say "since schools were closed to girls in 2021", "the
  authorities", "those in power". This keeps the screen safer if someone glances at it.
- **Useful, practical, calm.** Concrete steps she can actually take at home; no slogans.
- **No links, phone numbers or websites** (the app is offline and a number could put her at risk).
- Keep each lesson to what fits on two phone screens.

## The units

1. **My rights** (حقوق من): rights belong to every person (Universal Declaration of Human Rights, 1948;
   Afghanistan voted for it); dignity and equality (Art. 1–2); the right to learn (Art. 26; Convention on
   the Rights of the Child, Art. 28, ratified by Afghanistan in 1994; CEDAW Art. 10, ratified 2003);
   thinking, believing and speaking (Art. 18–19); moving, working and marrying only by free choice
   (Art. 13, 23, 16); gathering peacefully (Art. 20; ICCPR Art. 21, ratified 1983). 5 lessons.
2. **Afghan women were always strong** (زنان افغان همیشه قوی بوده‌اند): Rabia Balkhi; Malalai of Maiwand
   (1880); Queen Soraya Tarzi and the first girls' schools (1920s); the 1964 constitution (women's vote);
   women who kept teaching and learning in hard times (homes, secret classes), told generally. 4 lessons.
3. **Faith and knowledge** (ایمان و دانش): the first word revealed was «اقرأ» (Read); the well-known
   saying that seeking knowledge is a duty for every Muslim; Khadija (a merchant), Aisha (a scholar
   who taught many), Fatima al-Fihri (founded al-Qarawiyyin in Fez, 859); girls study in every other
   Muslim-majority country, and scholars, including at Al-Azhar, said closing schools to girls has no
   basis in Islam. 3 lessons.
4. **Standing up for yourself** (از خود دفاع کنید): knowing your worth; saying what you need calmly
   ("I" sentences, choosing the moment, listening first, repeating calmly); talking with family about
   learning (understand their fears for your safety and reputation, offer safe options, ask for small
   steps) — practice "family-study"; answering doubters — practice "relative-doubts"; when something is
   wrong (violence, forced or early marriage): it is not your fault, find one trusted adult, keep
   yourself safe — practice "say-no". 4 lessons.
5. **Learning together, safely** (با هم، در امان): why learning together matters (home study circles are
   the strongest way girls gather today); starting a small study circle safely (3–6 trusted people, an
   ordinary reason to meet such as sewing or a Quran class, changing places and times, no written lists
   of names, no photos, agree what to say if asked) — practice "friend-circle"; sharing books and
   knowledge without a trail (learning packs on memory cards, keep little on phones); speaking up
   together: the right to peaceful assembly, how Afghan women have spoken up since 2021 (statements,
   indoor gatherings with covered faces, writing), the real costs, and a "think it through" checklist
   (who could be hurt, what is the worst case, who knows, is there a safer way) — the choice is hers
   and never alone; if someone is taken (stay calm, protect others by changing plans and removing
   shared information, support her family, remember facts accurately, avoid rumours). 5 lessons.
6. **Staying safe** (در امان ماندن): your phone (screen lock, notification previews, photos and messages
   that could identify others, the app's quick-exit button); if your phone is checked (stay calm, Ustad
   looks like a school app with textbooks, keep no lists of names); taking care of your mind (grief and
   fear are normal, a simple breathing exercise, keeping a small daily routine, talking to someone you
   trust). 3 lessons.

## When done

Check your file(s) with Python: valid JSON, every lesson has all fields, both languages everywhere,
`answer` within range, no Arabic ي/ك, no URLs or phone numbers. Final report (under 100 words): lessons
written and anything a human reviewer should check (facts you were less sure of).
