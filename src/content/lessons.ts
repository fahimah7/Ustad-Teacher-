import type { Lesson } from "./schema";

/* Demo lessons. Lesson text is sample content (handoff: placeholders on
   screens 15 and W2) and all Dari is a draft awaiting native review. */

export const CHEM12_2_3: Lesson = {
  id: "chem12-2.3", grade: 12, subject: "chem", lang: "fa",
  unit: { n: 2, title: { en: "Atomic structure", fa: "ساختمان اتم" } },
  lesson: { n: 3, title: { en: "Isotopes", fa: "ایزوتوپ‌ها" }, minutes: 8 },
  source: { book: "g12_chemistry_fa", pages: [13, 14] }, reviewed: true,
  blocks: [
    { type: "keyIdea", text: { en: "Atoms of one element always have the same protons, but their neutrons can differ.", fa: "اتم‌های یک عنصر همیشه پروتون‌های یکسان دارند، اما نیوترون‌های شان می‌تواند فرق کند." }, source: { page: 13 } },
    { type: "explanation", text: { en: "Every carbon atom has 6 protons; that is what makes it carbon. But some carbon atoms carry 6 neutrons, some 7, some 8. These versions are called isotopes. They behave the same in chemistry, because their electrons are the same.", fa: "هر اتم کاربن ۶ پروتون دارد؛ همین آن را کاربن می‌سازد. اما بعضی اتم‌های کاربن ۶ نیوترون دارند، بعضی ۷ و بعضی ۸. این نسخه‌ها را ایزوتوپ می‌گویند. رفتار کیمیاوی شان یکسان است، چون الکترون‌های شان یکسان است." }, source: { page: 13 } },
    { type: "figure", spec: { kind: "atoms", items: [{ label: "C-12", nucleus: 16 }, { label: "C-13", nucleus: 19 }, { label: "C-14", nucleus: 22 }] }, caption: { en: "Same 6 protons · 6, 7 and 8 neutrons", fa: "همان ۶ پروتون · ۶، ۷ و ۸ نیوترون" }, source: { page: 13 } },
    { type: "keyTerms", terms: [{ en: "proton", fa: "پروتون" }, { en: "neutron", fa: "نیوترون" }, { en: "isotope", fa: "ایزوتوپ" }, { en: "mass number", fa: "عدد کتله" }] },
    { type: "workedExample", text: { en: "Carbon-14 has 6 protons and 8 neutrons. Mass number = 6 + 8 = 14.", fa: "کاربن-۱۴ دارای ۶ پروتون و ۸ نیوترون است. عدد کتله = ۶ + ۸ = ۱۴." }, source: { page: 14 } },
    { type: "check", question: { en: "Carbon-13 has how many neutrons?", fa: "کاربن-۱۳ چند نیوترون دارد؟" }, options: ["6", "7", "13"], answer: 1 },
  ],
  explain: [
    {
      q: ["what is an isotope", "what are isotopes", "isotope meaning", "define isotope", "ایزوتوپ چیست", "ایزوتوپ چه است"],
      answer: { en: "Isotopes are atoms of the **same element**. They have the same number of protons, but a **different number of neutrons**.", fa: "ایزوتوپ‌ها اتم‌های **یک عنصر** هستند. تعداد پروتون‌های شان یکسان است، اما **تعداد نیوترون‌های شان فرق دارد**." },
      example: { en: "Like two bags of rice from one field: both are rice, one is a little heavier.", fa: "مثل دو بوجی برنج از یک زمین: هر دو برنج است، یکی کمی سنگین‌تر." },
      simpler: { en: "Same atom, different weight. The protons stay; only the neutrons change.", fa: "همان اتم، وزن متفاوت. پروتون‌ها می‌مانند؛ فقط نیوترون‌ها تغییر می‌کنند." },
      check: { question: { en: "Carbon-12 or carbon-14: which has more neutrons?", fa: "کاربن-۱۲ یا کاربن-۱۴: کدام نیوترون بیشتر دارد؟" }, options: [{ en: "Carbon-12", fa: "کاربن-۱۲" }, { en: "Carbon-14", fa: "کاربن-۱۴" }], answer: 1 },
      page: 13,
    },
    {
      q: ["why is it still carbon", "why still carbon", "why same element", "what decides the element", "چرا هنوز کاربن است"],
      answer: { en: "Because it still has **6 protons**. Protons decide the element; extra **neutrons** only make it heavier.", fa: "چون هنوز **۶ پروتون** دارد. پروتون‌ها عنصر را تعیین می‌کنند؛ **نیوترون‌های** اضافی فقط آن را سنگین‌تر می‌سازند." },
      example: { en: "Carbon-12 has 6 neutrons, carbon-14 has 8. Same carbon, a little heavier.", fa: "کاربن-۱۲ شش نیوترون دارد و کاربن-۱۴ هشت. همان کاربن، کمی سنگین‌تر." },
      simpler: { en: "Count the protons. Six protons means carbon, always.", fa: "پروتون‌ها را بشمار. شش پروتون یعنی کاربن، همیشه." },
      check: { question: { en: "Why do isotopes behave the same in chemistry?", fa: "چرا ایزوتوپ‌ها در کیمیا یکسان رفتار می‌کنند؟" }, options: [{ en: "Same electrons", fa: "الکترون‌های یکسان" }, { en: "Same weight", fa: "وزن یکسان" }], answer: 0 },
      page: 13,
    },
    {
      q: ["mass number", "how to find mass number", "calculate mass number", "عدد کتله"],
      answer: { en: "The mass number is **protons + neutrons**. Electrons are so light that we leave them out.", fa: "عدد کتله برابر است با **پروتون + نیوترون**. الکترون‌ها آن‌قدر سبک اند که حساب نمی‌شوند." },
      example: { en: "Carbon-14: 6 protons + 8 neutrons = 14.", fa: "کاربن-۱۴: ۶ پروتون + ۸ نیوترون = ۱۴." },
      page: 14,
    },
  ],
  practice: [
    { q: { en: "How many protons does every carbon atom have?", fa: "هر اتم کاربن چند پروتون دارد؟" }, options: [{ en: "4", fa: "۴" }, { en: "6", fa: "۶" }, { en: "8", fa: "۸" }, { en: "12", fa: "۱۲" }], answer: 1, why: { en: "Six protons is what makes an atom carbon.", fa: "شش پروتون است که اتم را کاربن می‌سازد." }, idea: { en: "The element's number on the table is its number of protons. Carbon is number 6.", fa: "شماره عنصر در جدول، تعداد پروتون‌های آن است. کاربن شماره ۶ است." } },
    { q: { en: "What is the mass number of carbon-13?", fa: "عدد کتله کاربن-۱۳ چند است؟" }, options: [{ en: "6", fa: "۶" }, { en: "7", fa: "۷" }, { en: "13", fa: "۱۳" }, { en: "19", fa: "۱۹" }], answer: 2, why: { en: "The number in the name is the mass number: 6 + 7 = 13.", fa: "عدد در نام، عدد کتله است: ۶ + ۷ = ۱۳." }, idea: { en: "Look at the name: carbon-13. The number after the dash is protons plus neutrons.", fa: "به نام نگاه کن: کاربن-۱۳. عدد بعد از خط، پروتون به‌علاوه نیوترون است." } },
    { q: { en: "Carbon-12 and carbon-14 are isotopes. What is different between them?", fa: "کاربن-۱۲ و کاربن-۱۴ ایزوتوپ اند. چه چیزی بین آن‌ها فرق دارد؟" }, options: [{ en: "The number of protons", fa: "تعداد پروتون‌ها" }, { en: "The number of neutrons", fa: "تعداد نیوترون‌ها" }, { en: "The number of electrons", fa: "تعداد الکترون‌ها" }, { en: "The name of the element", fa: "نام عنصر" }], answer: 1, why: { en: "Same element, same protons. Carbon-14 has two more neutrons.", fa: "همان عنصر، همان پروتون‌ها. کاربن-۱۴ دو نیوترون بیشتر دارد." }, idea: { en: "Try this idea: isotopes are the **same element**, so the protons stay the same. What else is inside the nucleus?", fa: "به این فکر کن: ایزوتوپ‌ها **یک عنصر** اند، پس پروتون‌ها ثابت می‌مانند. دیگر چه چیزی داخل هسته است؟" } },
    { q: { en: "Why do isotopes of carbon react the same way?", fa: "چرا ایزوتوپ‌های کاربن یکسان تعامل می‌کنند؟" }, options: [{ en: "They weigh the same", fa: "هم‌وزن اند" }, { en: "They have the same electrons", fa: "الکترون‌های یکسان دارند" }, { en: "They are the same colour", fa: "هم‌رنگ اند" }, { en: "They have no neutrons", fa: "نیوترون ندارند" }], answer: 1, why: { en: "Chemistry happens with electrons, and isotopes share them.", fa: "کیمیا با الکترون‌ها اتفاق می‌افتد و ایزوتوپ‌ها الکترون‌های یکسان دارند." }, idea: { en: "When atoms react, which particles touch other atoms first: the ones in the middle or the ones outside?", fa: "وقتی اتم‌ها تعامل می‌کنند، کدام ذره‌ها اول با اتم‌های دیگر تماس می‌گیرند: وسطی‌ها یا بیرونی‌ها؟" } },
    { q: { en: "An atom has 6 protons and 7 neutrons. What is it?", fa: "یک اتم ۶ پروتون و ۷ نیوترون دارد. این چیست؟" }, options: [{ en: "Nitrogen-13", fa: "نایتروجن-۱۳" }, { en: "Carbon-13", fa: "کاربن-۱۳" }, { en: "Carbon-7", fa: "کاربن-۷" }, { en: "Oxygen-13", fa: "اکسیجن-۱۳" }], answer: 1, why: { en: "Six protons means carbon; 6 + 7 = 13.", fa: "شش پروتون یعنی کاربن؛ ۶ + ۷ = ۱۳." }, idea: { en: "First decide the element from the protons, then add the neutrons for the number.", fa: "اول عنصر را از پروتون‌ها بشناس، بعد نیوترون‌ها را برای عدد اضافه کن." } },
  ],
};

export const MATH8_3_1: Lesson = {
  id: "math8-3.1", grade: 8, subject: "math", lang: "fa",
  unit: { n: 3, title: { en: "Fractions and ratios", fa: "کسرها و نسبت‌ها" } },
  lesson: { n: 1, title: { en: "Adding fractions", fa: "جمع کسرها" }, minutes: 10 },
  source: { book: "g8_math_fa", pages: [38, 39] }, reviewed: true,
  blocks: [
    { type: "keyIdea", text: { en: "To add fractions, first make the bottoms the same.", fa: "برای جمع کسرها، اول مخرج‌ها را یکسان کن." }, source: { page: 38 } },
    { type: "explanation", text: { en: "A third and a quarter are pieces of different sizes, so we cut both into twelfths. One third is 4 twelfths, one quarter is 3 twelfths. Now the pieces match and we can count them.", fa: "یک‌سوم و یک‌چهارم تکه‌هایی با اندازه‌های متفاوت اند، پس هر دو را به دوازدهم‌ها می‌بُریم. یک‌سوم برابر ۴ دوازدهم و یک‌چهارم برابر ۳ دوازدهم است. حالا تکه‌ها یکسان اند و می‌توانیم آن‌ها را بشماریم." }, source: { page: 38 } },
    { type: "figure", spec: { kind: "fractionBars", parts: [{ n: 1, d: 3 }, { n: 1, d: 4 }, { n: 7, d: 12 }] }, caption: { en: "⅓ + ¼ = 4⁄12 + 3⁄12 = 7⁄12", fa: "⅓ + ¼ = ۴⁄۱۲ + ۳⁄۱۲ = ۷⁄۱۲" }, source: { page: 38 } },
    { type: "keyTerms", terms: [{ en: "numerator", fa: "صورت" }, { en: "denominator", fa: "مخرج" }, { en: "common denominator", fa: "مخرج مشترک" }] },
    { type: "workedExample", text: { en: "⅓ + ¼: the common denominator is 12. 4⁄12 + 3⁄12 = 7⁄12.", fa: "⅓ + ¼: مخرج مشترک ۱۲ است. ۴⁄۱۲ + ۳⁄۱۲ = ۷⁄۱۲." }, source: { page: 39 } },
    { type: "check", question: { en: "½ + ¼ = ?", fa: "½ + ¼ = ؟" }, options: ["2⁄6", "¾", "2⁄4"], answer: 1 },
  ],
  explain: [
    {
      q: ["how do i add 1/3 and 1/4", "add ⅓ and ¼", "add fractions", "adding fractions", "جمع کسر"],
      answer: { en: "Make the pieces the same size first: thirds and quarters both become **twelfths**. Then ⅓ + ¼ = 4⁄12 + 3⁄12 = **7⁄12**.", fa: "اول تکه‌ها را هم‌اندازه کن: سوم‌ها و چهارم‌ها هر دو **دوازدهم** می‌شوند. بعد ⅓ + ¼ = ۴⁄۱۲ + ۳⁄۱۲ = **۷⁄۱۲**." },
      example: { en: "Like sharing bread: cut every loaf into 12 slices, then count the slices.", fa: "مثل تقسیم نان: هر نان را به ۱۲ تکه ببُر، بعد تکه‌ها را بشمار." },
      simpler: { en: "Same-size pieces first, then count them.", fa: "اول تکه‌های هم‌اندازه، بعد شمردن." },
      page: 38,
    },
  ],
};

export const MATH8_3_2: Lesson = {
  id: "math8-3.2", grade: 8, subject: "math", lang: "fa",
  unit: { n: 3, title: { en: "Fractions and ratios", fa: "کسرها و نسبت‌ها" } },
  lesson: { n: 2, title: { en: "Ratios", fa: "نسبت‌ها" }, minutes: 9 },
  source: { book: "g8_math_fa", pages: [40, 41] }, reviewed: true,
  blocks: [
    { type: "keyIdea", text: { en: "A ratio compares two amounts: how many of one for every one of the other.", fa: "نسبت دو مقدار را مقایسه می‌کند: از یکی چند تا در برابر هر یکی از دیگری." }, source: { page: 40 } },
    { type: "explanation", text: { en: "If a recipe uses 2 cups of rice for every 3 cups of water, the ratio of rice to water is 2 : 3. Double the pot and it becomes 4 : 6, the same ratio.", fa: "اگر در یک دستور پخت برای هر ۳ پیاله آب ۲ پیاله برنج استفاده شود، نسبت برنج به آب ۲ : ۳ است. دیگ را دو برابر کن و ۴ : ۶ می‌شود، همان نسبت." }, source: { page: 40 } },
    { type: "keyTerms", terms: [{ en: "ratio", fa: "نسبت" }, { en: "equivalent", fa: "معادل" }, { en: "simplify", fa: "ساده کردن" }] },
    { type: "workedExample", text: { en: "Simplify 6 : 9. Both divide by 3, so 6 : 9 = 2 : 3.", fa: "۶ : ۹ را ساده کن. هر دو بر ۳ تقسیم می‌شوند، پس ۶ : ۹ = ۲ : ۳." }, source: { page: 41 } },
    { type: "check", question: { en: "Which ratio is the same as 2 : 3?", fa: "کدام نسبت با ۲ : ۳ برابر است؟" }, options: ["3 : 2", "4 : 6", "2 : 6"], answer: 1 },
  ],
  explain: [
    {
      q: ["what is a ratio", "ratio in simple words", "ratio meaning", "نسبت چیست"],
      answer: { en: "A ratio says **how much of one thing for each amount of another**. 2 : 3 means 2 of the first for every 3 of the second.", fa: "نسبت می‌گوید **از یک چیز در برابر مقداری از چیز دیگر چقدر است**. ۲ : ۳ یعنی ۲ تا از اولی برای هر ۳ تا از دومی." },
      example: { en: "2 cups of rice for every 3 cups of water is a ratio of 2 : 3.", fa: "۲ پیاله برنج برای هر ۳ پیاله آب، نسبت ۲ : ۳ است." },
      simpler: { en: "A ratio is a recipe: this much of one, that much of the other.", fa: "نسبت مثل دستور پخت است: این‌قدر از یکی، آن‌قدر از دیگری." },
      page: 40,
    },
  ],
};

export const MATH8_3_4: Lesson = {
  id: "math8-3.4", grade: 8, subject: "math", lang: "fa",
  unit: { n: 3, title: { en: "Fractions and ratios", fa: "کسرها و نسبت‌ها" } },
  lesson: { n: 4, title: { en: "Dividing fractions", fa: "تقسیم کسرها" }, minutes: 12 },
  source: { book: "g8_math_fa", pages: [44, 45] }, reviewed: true,
  blocks: [
    { type: "keyIdea", text: { en: "Dividing by a fraction is the same as multiplying by its flip.", fa: "تقسیم بر یک کسر همان ضرب در معکوس آن است." }, source: { page: 44 } },
    { type: "explanation", text: { en: "3 ÷ ½ asks: how many halves fit into 3? Each whole holds 2 halves, so 3 wholes hold 6. That is why 3 ÷ ½ = 3 × 2.", fa: "۳ ÷ ½ می‌پرسد: در ۳ چند نصف جا می‌شود؟ هر واحد ۲ نصف دارد، پس ۳ واحد ۶ نصف دارد. به همین دلیل ۳ ÷ ½ = ۳ × ۲." }, source: { page: 44 } },
    { type: "figure", spec: { kind: "fractionBars", parts: [{ n: 1, d: 2 }, { n: 1, d: 2 }, { n: 1, d: 2 }] }, caption: { en: "Three wholes, six halves", fa: "سه واحد، شش نصف" }, source: { page: 44 } },
    { type: "keyTerms", terms: [{ en: "reciprocal", fa: "معکوس" }, { en: "divisor", fa: "مقسوم‌علیه" }] },
    { type: "workedExample", text: { en: "¾ ÷ ½ = ¾ × 2 = 6⁄4 = 1½.", fa: "¾ ÷ ½ = ¾ × ۲ = ۶⁄۴ = ۱½." }, source: { page: 45 } },
  ],
  explain: [
    {
      q: ["why do we flip the fraction to divide", "why flip", "flip the fraction", "dividing fractions", "divide fractions", "چرا کسر را معکوس"],
      answer: { en: "Dividing by ½ asks \"how many halves fit?\" In 3 there are 6 halves, so 3 ÷ ½ = 3 × 2. Flipping turns the question into a multiplication.", fa: "تقسیم بر ½ می‌پرسد «چند نصف جا می‌شود؟» در ۳، شش نصف هست، پس ۳ ÷ ½ = ۳ × ۲. معکوس کردن، سوال را به ضرب تبدیل می‌کند." },
      example: { en: "Three loaves, each cut in half, make six half-loaves.", fa: "سه نان که هر کدام نصف شود، شش نصف‌نان می‌شود." },
      simpler: { en: "Count how many pieces fit. Flipping just counts faster.", fa: "بشمار چند تکه جا می‌شود. معکوس کردن فقط شمردن را تیزتر می‌کند." },
      page: 44,
    },
  ],
};

export const BIO8_2_1: Lesson = {
  id: "bio8-2.1", grade: 8, subject: "bio", lang: "fa",
  unit: { n: 2, title: { en: "How plants live", fa: "زندگی گیاهان" } },
  lesson: { n: 1, title: { en: "Photosynthesis", fa: "فوتوسنتز" }, minutes: 9 },
  source: { book: "g8_biology_fa", pages: [22, 23] }, reviewed: true,
  blocks: [
    { type: "keyIdea", text: { en: "Plants make their own food from light, water and air.", fa: "گیاهان غذای خود را از نور، آب و هوا می‌سازند." }, source: { page: 22 } },
    { type: "explanation", text: { en: "Leaves take in carbon dioxide from the air and water from the roots. Using sunlight, they turn these into sugar for food and give out oxygen. This is called photosynthesis.", fa: "برگ‌ها کاربن‌دای‌اکساید را از هوا و آب را از ریشه می‌گیرند. با نور آفتاب این‌ها را به قند برای غذا تبدیل می‌کنند و اکسیجن بیرون می‌دهند. این را فوتوسنتز می‌گویند." }, source: { page: 22 } },
    { type: "keyTerms", terms: [{ en: "chlorophyll", fa: "کلوروفیل" }, { en: "oxygen", fa: "اکسیجن" }, { en: "carbon dioxide", fa: "کاربن‌دای‌اکساید" }] },
    { type: "workedExample", text: { en: "A plant in a dark room stops making sugar, even with water, because light is missing.", fa: "گیاهی در اتاق تاریک حتی با آب هم دیگر قند نمی‌سازد، چون نور نیست." }, source: { page: 23 } },
    { type: "check", question: { en: "What gas do plants give out?", fa: "گیاهان کدام گاز را بیرون می‌دهند؟" }, options: ["Oxygen", "Carbon dioxide", "Nitrogen"], answer: 0 },
  ],
  explain: [
    {
      q: ["what is photosynthesis", "photosynthesis", "how do plants make food", "فوتوسنتز چیست"],
      answer: { en: "Photosynthesis is how plants **make food from light**. Leaves join water and carbon dioxide into sugar, and give out **oxygen**.", fa: "فوتوسنتز روشی است که گیاهان **با نور غذا می‌سازند**. برگ‌ها آب و کاربن‌دای‌اکساید را به قند تبدیل می‌کنند و **اکسیجن** بیرون می‌دهند." },
      example: { en: "The mint on a sunny window grows faster than the mint in a dark corner.", fa: "نعنای کنار کلکین آفتابی زودتر از نعنای گوشه تاریک رشد می‌کند." },
      page: 22,
    },
  ],
};

/** Lessons from books that are not on this phone. Only their index entry
 *  ships, so search can say where an answer lives without holding the book. */
export const ELSEWHERE = [
  { id: "phys11-4.2", grade: 11, subject: "phys" as const, unit: 4, n: 4.2, title: { en: "Half-life", fa: "نیمه‌عمر" }, snippet: { en: "…half-life lets us measure time…", fa: "…نیمه‌عمر به ما اجازه می‌دهد زمان را اندازه بگیریم…" }, terms: ["carbon-14", "age", "old", "half-life", "radioactive", "dating", "time", "کاربن-۱۴", "سن"], shortAnswer: { en: "Carbon-14 slowly changes into nitrogen at a steady rate. Half of it is gone every 5,730 years, so measuring how much is left tells us how old a bone or a piece of wood is.", fa: "کاربن-۱۴ به آهستگی و با سرعت ثابت به نایتروجن تبدیل می‌شود. هر ۵۷۳۰ سال نصف آن از بین می‌رود، پس اندازه‌گیری مقدار باقی‌مانده سن یک استخوان یا چوب را نشان می‌دهد." }, sizeMB: 44 },
  { id: "phys10-5.1", grade: 10, subject: "phys" as const, unit: 5, n: 5.1, title: { en: "Radioactivity", fa: "رادیواکتیویته" }, snippet: { en: "…radioactive isotopes change over time…", fa: "…ایزوتوپ‌های رادیواکتیف با گذشت زمان تغییر می‌کنند…" }, terms: ["isotope", "isotopes", "radioactive", "radiation", "ایزوتوپ"], sizeMB: 41 },
  { id: "chem11-1.2", grade: 11, subject: "chem" as const, unit: 1, n: 1.2, title: { en: "Atoms", fa: "اتم‌ها" }, snippet: { en: "…protons, neutrons and electrons…", fa: "…پروتون، نیوترون و الکترون…" }, terms: ["atom", "atoms", "isotope", "proton", "neutron", "اتم"], sizeMB: 38 },
];

export const FULL_LESSONS: Lesson[] = [CHEM12_2_3, MATH8_3_1, MATH8_3_2, MATH8_3_4, BIO8_2_1];
