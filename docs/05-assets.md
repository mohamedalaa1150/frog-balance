# قائمة الأصول: الرسومات والأصوات وبرومبتات توليدها

> **ليه الـ texture keys مهمة؟** الـ keys اللي تحت هي **العقد** بين المصمم والكود.
> - Codex بيرسم نسخة مؤقتة من كل key في المرحلة 2.
> - المصمم بيسلّم نفس الأسماء والمقاسات بالظبط في فولدر `/assets-source`.
> - المرحلة 6 بتبدّل المؤقت بالنهائي من غير ما تلمس منطق اللعب.

## 1. الرسومات (Texture keys)

**المقاسات:** كلها بالبكسل على مقاس التصميم (1280×720). سلّمها **@2x** يعني ضعف المقاس، بصيغة PNG بخلفية شفافة.

| Key | المقاس (1x) | الوصف |
|---|---|---|
| `bg_title` | 1280×720 | البركة عند الفجر، وضفدوع قاعد على ورقة لوتس. فيه مساحة فاضية في النص للعنوان. |
| `bg_map` | 1280×720 | بركة كبيرة من فوق، فيها 6 جزر متوزعة على مسار. |
| `bg_world_1` … `bg_world_6` | 1280×720 + نسخة portrait بإضافة `_p` (720×1280) | الألوان بالترتيب: فجر وردي، ونهار زهري، وغابة خضرا، وشلال أزرق، وكهف بنفسجي مضيء، وسما نجوم كحلي. **التفاصيل هادية في النص** علشان الميزان يبان بوضوح (مبدأ الاتساق). |
| `mascot_base` | 360×380 | ضفدوع قاعد وبيبص للأمام، ودراعاته مفرودة للجنب وماسك محور الذراع. ده الإطار الافتراضي. |
| `mascot_sheet` | 8 إطارات × 360×380 | الإطارات: idle، وlook_left، وlook_right، وstrain_left، وstrain_right، وhappy، وjump، وclap. |
| `beam` | 820×36 | ذراع الميزان: لونه أزرق كحلي، وأطرافه مستديرة. |
| `pan` | 240×56 | طبق الكفة: أصفر دافي، وحافته بارزة، ومنظوره خفيف من فوق. |
| `pan_post` | 24×70 | العمود اللي شايل الكفة على طرف الذراع. |
| `pan_glow` | 300×100 | هالة إضاءة للكفة النشطة (لون واحد، وبيتعمل لها tint). |
| `frog_token` | 64×64 | ضفدع صغير بسيط قاعد. **ده العنصر اللي الطفل بيعدّه:** ظله واضح، ومفيش تفاصيل كتير. |
| `frog_token_ghost` | 64×64 | نفس الضفدع بس شفاف بإطار متقطع. ده لتلميح العدد الناقص. |
| `frog_pile` | 240×140 | كومة ضفادع (هي مصدر الضفادع اللي الطفل بيسحب منها). |
| `num_tile_1` … `num_tile_10` | 120×150 | أرقام بلاستيك تلاتية الأبعاد ناعمة، **من غير الرقم نفسه**. الكود هو اللي بيكتب الرقم فوقها علشان إعداد «مشرقي / غربي» يشتغل. وكل رقم ليه لون ثابت (1 أزرق، و2 أخضر، و3 برتقالي، …). |
| `lock_badge` | 40×40 | قفل صغير لطيف بيتحط على العناصر الثابتة. |
| `peg_lock` | 90×90 | وتد خشب بيقفل الميزان في وضع المقارنة. |
| `tray_bg` | 1280×170 | رف خشب أو ورقة لوتس طويلة للصينية. |
| `btn_play`، `btn_home`، `btn_hint`، `btn_replay`، `btn_next`، `btn_sound_on`، `btn_sound_off`، `btn_settings`، `btn_lock`، `btn_read`، `btn_back` | 112×112 | أيقونات دايرية مرسومة بأسلوب واحد، والرموز عالمية ومن غير نص. |
| `predict_left`، `predict_right`، `predict_equal` | 160×160 | زرار سهم لتحت فوق كل كفة، وزرار «=» في النص. |
| `symbol_gt`، `symbol_lt`، `symbol_eq` | 110×110 | الرموز > و< و= بشكل ملوّن وبارز. |
| `star_full`، `star_empty` | 96×96 | نجوم التقييم. |
| `lily_level`، `lily_level_locked` | 150×150 | ورقة لوتس بتمثل مستوى. |
| `island_1` … `island_6`، `island_locked` | 280×220 | الجزر اللي على خريطة العوالم. |
| `number_line` | 1000×90 | خط أعداد من 0 لـ 10 (العلامات بس، والأرقام الكود هو اللي بيكتبها). |
| `particle_star`، `particle_bubble`، `particle_confetti` | 24×24 | جزيئات الاحتفال. |
| `hint_hand` | 110×110 | يد كرتونية بتشاور، للسهم الإرشادي. |
| `app_icon` | 1024×1024 | أيقونة التطبيق: وش ضفدوع وميزان صغير. |

## 2. هوية بصرية (Style Bible)
- **الأسلوب:** فلات ثنائي الأبعاد مع ظلال ناعمة خفيفة (soft 2.5D)، وحواف مستديرة، وخطوط خارجية ملونة بدرجة أغمق من لون الشكل نفسه (مش أسود).
- **الألوان:**
  - أخضر ضفدوع `#5CC85A`
  - أصفر الكفوف `#FFD23F`
  - أزرق الذراع `#2E5AAC`
  - كريمي `#FFF6E5` للخلفيات الفاتحة
- **الشخصية:**
  - النسب: رأس كبير، وعيون كبيرة لامعة، وابتسامة دافية، وخدود وردي.
  - **مش نسخة من المنتج البلاستيك:** لازم يكون له عنصر مميز، زي **منديل أحمر صغير على الرقبة** وبقعة صفرا على الراس.
- **الخلفيات:** درجات ناعمة، وتشبّع قليل في المنطقة اللي ورا الميزان.

## 3. برومبتات توليد الصور (Midjourney / GPT-Image / Firefly)

**طريقة الاستخدام:** البرومبت الأساسي (A) بيتضاف أول كل برومبت، علشان كل الصور تطلع بنفس الأسلوب.

**A: الأسلوب الأساسي**
```
children's educational game art, soft 2.5D flat illustration, rounded friendly shapes, thick colored outlines slightly darker than fill (no black outlines), gentle soft shading, warm cheerful palette (frog green #5CC85A, sunny yellow #FFD23F, navy blue #2E5AAC, cream #FFF6E5), clean vector look, high readability for ages 4-8, no text, no letters, no numbers, no logos, no watermark
```

**B: ضفدوع (الإطار الأساسي ومرجع الشخصية)**
```
[A] character design sheet of an original cute chubby green frog mascot named Dofdou, big glossy eyes, warm wide smile, pink cheeks, small red neckerchief, tiny yellow spot on the head, sitting upright facing camera, both arms stretched out sideways as if holding a horizontal bar at shoulder height, full body, centered, plain transparent background, front view + 3/4 view + back view, consistent proportions
```
**إطارات التعبيرات:** نفس البرومبت مع استبدال الوضع بواحد من دول:
- `looking to the left with curious eyes`
- `straining as if carrying something heavy on its right arm, one eye squinting`
- `jumping joyfully with arms up`
- `clapping happily, eyes closed with joy`

**C: خلفية عالم (مثال: العالم 1)**
```
[A] wide landscape game background, calm pond at sunrise with pink and peach sky, lotus flowers and lily pads at the edges, soft mist, the center area kept simple and low-detail with a flat soft-green ground area where a balance scale will be placed, horizontal 16:9, no characters
```
**باقي العوالم:** استبدل الوصف بواحد من دول:
- `flower island at bright noon`
- `friendly green forest clearing`
- `gentle waterfall with blue tones`
- `cave with glowing purple crystals, still cheerful not scary`
- `night pond under a starry navy sky with a big smiling moon`

**D: بلاطة رقم (من غير رقم)**
```
[A] single chunky glossy plastic toy tile shaped like a soft rounded rectangle block, front face flat and empty for a number to be printed later, color: {bright blue}, slight top-down perspective, soft shadow below, transparent background, game asset
```

**E: الضفدع الصغير (العنصر اللي بيتعد)**
```
[A] tiny simple green frog token for counting, sitting, very clear silhouette, minimal details, two big eyes, readable at 48 pixels, transparent background, game icon
```

> **بعد التوليد:** شيل الخلفية، ووحّد المقاسات حسب الجدول، وراجع اتساق شخصية ضفدوع بين كل الإطارات قبل التسليم.

## 4. الأصوات

### 4.1 المؤثرات (SFX)
**المواصفات:** صيغة mp3، وmono، ومستوى الصوت ‎−20 LUFS، والمدة أقل من ثانية ونص.

| Key | الوصف |
|---|---|
| `sfx_pickup` | «بوب» صغير لما الطفل يرفع عنصر. |
| `sfx_drop_pan` | «بلوب» خفيف لما العنصر يستقر على الكفة. ويتعمل له نسختين، وبعدين بيتبدّلوا عشوائي (`_a` و`_b`). |
| `sfx_bounce_back` | «وووب» ناعم لما العنصر يرجع مكانه (**مش صوت غلط**). |
| `sfx_beam_creak` | صرير خشب لطيف قصير لما الذراع يتحرك. |
| `sfx_balanced_ding` | جرس نقي لما الميزان يتوازن. |
| `sfx_success` | احتفال قصير (من ثانية ونص لـ تانيتين). |
| `sfx_star_1`، `sfx_star_2`، `sfx_star_3` | نغمات متصاعدة لظهور النجوم. |
| `sfx_button` | نقرة ناعمة على الأزرار. |
| `sfx_pan_full` | «بونغ» خفيف لما الكفة تتملي. |
| `sfx_lock_shake` | خشخشة صغيرة لما الطفل يحاول يحرّك عنصر ثابت. |
| `sfx_unlock` | فتح قفل بشكل سحري. |
| `sfx_ribbit` | نقيق ضفدوع لطيف، وبيشتغل عشوائي وهو idle (مرة كل 20 ثانية على الأكتر). |

### 4.2 الموسيقى
- **الملفات:** `music_title`، و`music_world_1` لحد `music_world_6`.
- **المواصفات:** loops من 60 لـ 90 ثانية، وإيقاعها هادي (من 90 لـ 110 BPM).
- **الآلات:** خشبية، زي ماريمبا وأوكوليلي وفلوت.
- **قيود:** من غير غناء، ومن غير طبول قوية.

### 4.3 التعليق الصوتي (VO)
- **المصدر:** كل الـ keys والنصوص موجودة في `content/strings.ar.json`، وفيها 75 جملة.
- **الصوت:** صوت راوٍ دافي، ذكر أو أنثى، بنبرة طفولية ودودة.
- **التسجيل:** ملف لكل key، والاسم هو `<key>.mp3`.
- **المواصفات:** mono، و44.1 kHz، ومستوى ‎−16 LUFS، و150 مللي ثانية صمت في أول كل ملف وآخره.
- **أرقام العدّ** (من `count_01` لـ `count_20`): لازم تتسجّل **بنفس الطاقة والسرعة** علشان التسلسل يطلع طبيعي.
- **بديل سريع:** ElevenLabs (متوصّل عندك). أقدر أولّد كل الملفات دفعة واحدة بعد ما تختار الصوت.
