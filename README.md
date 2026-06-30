# IndustrCons — Construction Cost Estimator & Engineering Platform

Statik (backend-siz) tikinti smeta hesablama platforması. Sırf HTML, CSS və Vanilla JavaScript ilə qurulub və **GitHub Pages**-də pulsuz host edilə bilər.

---

## 1. Layihə Strukturu

```
IndustrCons/
├── index.html              # Əsas səhifə (bütün bölmələr: hero, kalkulyator, dashboard, footer)
├── robots.txt               # Axtarış botları üçün qaydalar
├── sitemap.xml               # SEO sitemap
├── README.md
├── data/
│   └── prices.json          # ⭐ BÜTÜN QİYMƏTLƏR BURADADIR — kodu dəyişmədən redaktə edin
└── assets/
    ├── css/
    │   └── style.css         # Bütün dizayn (light/dark, responsive, animasiyalar)
    ├── js/
    │   ├── calculator.js     # Hesablama mühərriki (DOM-dan asılı deyil)
    │   ├── charts.js         # Chart.js əsaslı qrafik render
    │   ├── pdf.js             # jsPDF + QR kod ilə PDF hesabat
    │   └── app.js             # UI: forma, dashboard, dark mode, naviqasiya
    └── img/
        └── favicon.svg
```

**Niyə bu struktur?**
- `calculator.js` saf funksiyalardır (DOM toxunmur) → gələcəkdə backend / mobil tətbiqdə təkrar istifadə oluna bilər.
- `prices.json` tək mənbədir → istifadəçi kodu açmadan qiymətləri yeniləyə bilər.
- Hər modul tək məsuliyyət daşıyır (separation of concerns).

---

## 2. Qiymətləri Necə Dəyişmək Olar

Bütün material və əmsal qiymətləri `data/prices.json` faylındadır. **Heç bir kodu redaktə etməyə ehtiyac yoxdur.**

### Misal: Beton qiymətini dəyişmək
```json
"materialUnitPrices": {
  "concreteM3": 95   <-- bu rəqəmi dəyişin
}
```

### Misal: Yeni şəhər/region əlavə etmək
`cityMultipliers` və `landPricePerM2ByCity` obyektlərinə eyni açarla yeni sətir əlavə edin:
```json
"cityMultipliers": {
  "Yeni Şəhər": 0.95
}
```
Sayt avtomatik olaraq bu yeni şəhəri seçim siyahısına əlavə edəcək (heç bir HTML dəyişikliyi lazım deyil).

### Əsas bölmələr
| Açar | Nəyə təsir edir |
|---|---|
| `baseRatePerM2` | Bina növünə görə əsas m² qiyməti |
| `finishLevels` | Ekonom / Standart / Premium əmsalları |
| `foundationTypes`, `roofTypes` | Təməl və dam növü əmsalları |
| `cityMultipliers` | Regiona görə qiymət fərqi |
| `costBreakdownPercentages` | Xərc kateqoriyalarının ümumi büdcədəki payı (cəmi 1.0 olmalıdır) |
| `materialQuantitiesPerM2` | m² başına material sərfiyyatı |
| `materialUnitPrices` | Material vahid qiymətləri |

> Fayl strukturunu (açar adlarını) dəyişməyin — yalnız rəqəmləri yeniləyin. Struktur dəyişikliyi `calculator.js`-də uyğun yeniləmə tələb edir.

---

## 3. GitHub Pages-də Yerləşdirmə (Deployment)

1. Bu qovluğu (`IndustrCons/`) GitHub-da yeni reponun **kök qovluğuna** yükləyin.
2. Repo → **Settings → Pages** bölməsinə keçin.
3. **Source**: "Deploy from a branch" seçin, branch: `main`, qovluq: `/ (root)`.
4. Bir neçə dəqiqədən sonra sayt `https://<istifadəçi-adı>.github.io/<repo-adı>/` ünvanında aktiv olacaq.
5. Öz domeninizi bağlamaq istəsəniz, `Settings → Pages → Custom domain` bölməsindən `industrcons.az` daxil edin və DNS-də CNAME qeydini host-a yönləndirin.

**Qeyd:** Layihə tam statikdir — heç bir build addımı (npm install, webpack və s.) lazım deyil. Fayllar birbaşa işləyir.

### Lokal test
Layihəni lokal aç maq üçün sadəcə `index.html`-i brauzerdə açmaq kifayət etməyə bilər (fetch() CORS səbəbiylə bloklana bilər). Lokal server işə salın:
```bash
# Python ilə
python3 -m http.server 8080

# və ya VS Code-da "Live Server" əlavəsi
```
Sonra `http://localhost:8080` ünvanına keçin.

---

## 4. Gələcək İnkişaf (Future-Ready Architecture)

Layihə elə qurulub ki, aşağıdakı funksiyalar **mövcud kodu yenidən yazmadan** əlavə oluna bilər:

| İstiqamət | Necə inteqrasiya olunur |
|---|---|
| **Firebase / Supabase** | `calculator.js`-dəki `loadPrices()` funksiyasını Firestore/Supabase sorğusu ilə əvəz edin; qalan kod dəyişmir. |
| **İstifadəçi hesabları** | `app.js`-ə auth modulu əlavə edin; hesablama nəticələrini istifadəçi ID-si ilə bazaya yazın. |
| **Admin Panel** | `data/prices.json`-u idarə edən ayrı `/admin` səhifəsi qurun (Firebase Auth + Firestore ilə real-time yeniləmə). |
| **AI Chat Köməkçi** | `#tools` bölməsindəki placeholder kart artıq hazırdır — Anthropic/OpenAI API çağırışı üçün yeni `assistant.js` modulu əlavə edin. |
| **Real-vaxt material qiymətləri** | `loadPrices()` funksiyasını xarici API endpoint-ə yönləndirin; JSON strukturunu eyni saxlayın ki, `calculator.js` dəyişməsin. |
| **Bloq / İş elanları / Texnika icarəsi / Əmlak** | `pages/` qovluğunda yeni statik səhifələr və ya CMS (məs. Headless CMS) inteqrasiyası üçün hazır skelet. |

---

## 5. Texnoloji Stack

- **HTML5 / CSS3** — semantik, responsive, dark-mode dəstəkli
- **Vanilla JavaScript (ES6+)** — heç bir framework yoxdur
- **Chart.js** (CDN) — interaktiv qrafiklər
- **jsPDF** (CDN) — PDF hesabat generasiyası
- **QRCode.js** (CDN) — PDF-də QR kod
- **Google Fonts** — Space Grotesk (başlıqlar), Inter (mətn), JetBrains Mono (rəqəmlər)

Heç bir build aləti (Webpack, Vite və s.) tələb olunmur — bu sadəliyi qoruyur və GitHub Pages ilə tam uyğunluq təmin edir.

---

## 6. Dizayn Sistemi

| Token | Dəyər |
|---|---|
| Primary | `#1B4F8C` |
| Primary Light | `#2E7DD1` |
| Accent | `#E8A33D` |
| Background | `#F2F5F8` (light) / `#0E1620` (dark) |
| Display Font | Space Grotesk |
| Body Font | Inter |
| Mono / Data Font | JetBrains Mono |

Bütün rənglər və ölçülər `assets/css/style.css`-in başında CSS dəyişənləri (`:root`) kimi təyin olunub — dizaynı dəyişmək üçün yalnız bu dəyişənləri redaktə edin.

---

## 7. Lisenziya & Məsuliyyət

Bu alət yalnız **təxmini** smeta təqdim edir. Real tikinti dəyərləri material bazarı, podratçı qiymətləri və layihə xüsusiyyətlərindən asılı olaraq dəyişə bilər. IndustrCons rəsmi maliyyə təklifi və ya müqavilə sənədi deyil.

© 2026 IndustrCons. Bütün hüquqlar qorunur.
