/**
 * Filmin içeriği: bölümler, anlatı cümleleri, çekimler ve kaynaklar.
 * Zamanlama burada yazılmaz; `timeline.ts` metin uzunluğundan hesaplar.
 */

/** `ya`: sahnenin tasvir ettiği an, "yıl önce" cinsinden. Kozmik takvim buradan okunur. */
export type Beat = { text: string; ya: number };

export type Shot = {
  /** `/cosmos/{name}.mp4` ve `/cosmos/{name}.jpg` */
  name: string;
  /** Bu çekimin başladığı anlatı cümlesi. */
  fromBeat: number;
  /** Dikey ekranlarda kırpma odağı (0–1). */
  focus: [number, number];
  /** Yavaş yakınlaşma: başlangıç ve bitiş ölçeği. */
  zoom: [number, number];
};

export type Tone = {
  /** MIDI nota numaraları; müzik bu akoru tutar. */
  chord: number[];
  /** Filtre kesimi (Hz): ne kadar parlak bir doku. */
  brightness: number;
};

export type Chapter = {
  id: string;
  title: string;
  subtitle: string;
  when: string;
  beats: Beat[];
  /** Bölüm sonunda takvimin vardığı an. */
  endYa: number;
  facts: string[];
  evidence: string;
  sources: string[];
  shots: Shot[];
  tone: Tone;
};

export const UNIVERSE_AGE = 13.8e9;

export const CHAPTERS: Chapter[] = [
  {
    id: "patlama",
    title: "Büyük Patlama",
    subtitle: "Uzay genişler",
    when: "13,8 milyar yıl önce",
    beats: [
      {
        ya: UNIVERSE_AGE,
        text: "Bu, uzayın içinde bir noktada olan bir patlama değil. Uzayın kendisi, her yerde aynı anda genişlemeye başlar.",
      },
      {
        ya: UNIVERSE_AGE,
        text: "Şişme kuramına göre saniyenin çok küçük bir kesrinde evren bir anda büyür. Ardından kuarklar, elektronlar ve ışık yoğun, sıcak bir çorba olur.",
      },
      {
        ya: UNIVERSE_AGE,
        text: "İlk birkaç dakikada ilk çekirdekler dövülür: hidrojen, helyum ve bir tutam lityum. Henüz atom, yıldız ya da gezegen yoktur.",
      },
    ],
    endYa: UNIVERSE_AGE,
    facts: [
      "Evrenin yaşı yaklaşık 13,8 milyar yıldır; bu değer kozmik mikrodalga arka plan ölçümlerinden hesaplanır.",
      "Büyük Patlama’nın bir merkezi yoktur: hangi galakside durursan dur, ötekilerin senden uzaklaştığını görürsün.",
      "Karbon, oksijen ve demir bu aşamada yoktur; onlar çok sonra yıldızların içinde üretilir.",
    ],
    evidence:
      "Uzak galaksilerin ışığı kırmızıya kayar: ne kadar uzaktalarsa o kadar hızlı uzaklaşırlar. Evrendeki hidrojen–helyum oranı da ilk dakikaların çekirdek sentezinin öngördüğü değerle uyuşur.",
    sources: ["Planck İşbirliği (2020), Astronomy & Astrophysics 641, A6"],
    shots: [{ name: "patlama", fromBeat: 0, focus: [0.5, 0.5], zoom: [1.14, 1.02] }],
    tone: { chord: [38, 45, 50, 52, 57], brightness: 520 },
  },
  {
    id: "isik",
    title: "İlk ışık",
    subtitle: "Evren saydamlaşır",
    when: "Büyük Patlama’dan 380.000 yıl sonra",
    beats: [
      {
        ya: UNIVERSE_AGE,
        text: "Evren hâlâ opak, parlayan bir sistir. Işık serbest elektronlara çarpıp saçılır; düz bir çizgide ilerleyemez.",
      },
      {
        ya: UNIVERSE_AGE - 3.8e5,
        text: "Sıcaklık yaklaşık 3.000 kelvine düşünce elektronlar çekirdeklere bağlanır. İlk kararlı atomlar oluşur ve evren saydamlaşır.",
      },
      {
        ya: UNIVERSE_AGE - 4e5,
        text: "O an serbest kalan ışık bugün hâlâ her yönden gelir: kozmik mikrodalga arka plan, yaklaşık 2,7 kelvin.",
      },
    ],
    endYa: 13.7e9,
    facts: [
      "Bu ışıma, evrenin bilinen en eski fotoğrafıdır.",
      "Üzerindeki yüz binde birlik sıcaklık farkları, ileride galaksi olacak yoğunluk tohumlarıdır.",
      "Ardından yüz milyon yılı aşkın bir karanlık çağ gelir: henüz tek bir yıldız bile yanmamıştır.",
    ],
    evidence:
      "Arka plan ışıması 1965’te Penzias ve Wilson tarafından neredeyse tesadüfen keşfedildi. COBE, WMAP ve Planck uyduları onu bütün gökyüzünde haritaladı; tayfı neredeyse kusursuz bir kara cisim eğrisidir.",
    sources: [
      "Penzias & Wilson (1965), Astrophysical Journal",
      "Planck İşbirliği (2020), Astronomy & Astrophysics",
    ],
    shots: [{ name: "isik", fromBeat: 0, focus: [0.5, 0.5], zoom: [1.02, 1.14] }],
    tone: { chord: [41, 48, 53, 57, 60], brightness: 760 },
  },
  {
    id: "yildiz",
    title: "İlk yıldızlar",
    subtitle: "Ağır elementler dövülür",
    when: "Büyük Patlama’dan 100–200 milyon yıl sonra",
    beats: [
      {
        ya: 13.68e9,
        text: "Karanlık madde kümelerinin içinde soğuyan hidrojen bulutları kendi ağırlığıyla çöker. İlk yıldızlar yanar.",
      },
      {
        ya: 13.55e9,
        text: "Bu kuşak bugünkü yıldızlardan çok daha iri ve kısa ömürlüdür. Çekirdeklerinde karbon, oksijen ve silisyum birikir.",
      },
      {
        ya: 13.4e9,
        text: "Patladıklarında bu elementleri uzaya saçarlar. Kemiklerindeki kalsiyum ve kanındaki demir, çoktan ölmüş yıldızlardan kalmadır.",
      },
    ],
    endYa: 13.2e9,
    facts: [
      "İlk yıldızlara Popülasyon III denir; henüz doğrudan gözlenmemişlerdir.",
      "Güneş ilk kuşaktan değildir; önceki kuşakların küllerinden doğmuş, ağır elementçe zengin bir yıldızdır.",
      "Altın ve platin gibi ağır elementlerin önemli bir kısmı nötron yıldızı çarpışmalarında oluşur.",
    ],
    evidence:
      "James Webb Uzay Teleskobu, Büyük Patlama’dan yalnızca birkaç yüz milyon yıl sonra parlayan galaksileri görüntüledi. 2017’de iki nötron yıldızının çarpışması hem kütleçekim dalgalarıyla hem ışıkla izlendi ve ağır element üretiminin izi yakalandı.",
    sources: ["Abbott vd. (2017), Astrophysical Journal Letters", "Carniani vd. (2024), Nature"],
    shots: [{ name: "yildiz", fromBeat: 0, focus: [0.42, 0.5], zoom: [1.03, 1.16] }],
    tone: { chord: [43, 50, 55, 59, 62], brightness: 900 },
  },
  {
    id: "galaksi",
    title: "Samanyolu",
    subtitle: "Galaksiler toplanır",
    when: "13 – 8 milyar yıl önce",
    beats: [
      {
        ya: 13e9,
        text: "Kütleçekim gazı, tozu ve karanlık maddeyi dev halelerde toplar. İlk galaksiler küçük, düzensiz ve kalabalıktır.",
      },
      {
        ya: 11e9,
        text: "Cüce galaksiler çarpışıp birleşir. Dönmeye başlayan bir disk belirir: Samanyolu’nun gövdesi.",
      },
      {
        ya: 9e9,
        text: "Bugün Güneş bu diskin merkezinden yaklaşık 26 bin ışık yılı ötede, sakin bir yörüngede dolanıyor.",
      },
    ],
    endYa: 8e9,
    facts: [
      "Samanyolu’nun en yaşlı yıldızları 13 milyar yıldan daha eskidir.",
      "Yaklaşık 10 milyar yıl önce Gaia–Enceladus adlı bir cüce galaksi Samanyolu’yla birleşti; izleri bugün yıldızların hareketinde okunur.",
      "Andromeda ile çarpışma uzun süre kesin sanıldı; 2025’teki yeni hesaplar önümüzdeki 10 milyar yıl için olasılığı yaklaşık yarı yarıya buluyor.",
    ],
    evidence:
      "Gaia uydusu bir milyardan fazla yıldızın konumunu ve hareketini ölçtü. Bu dev harita, Samanyolu’nun hangi parçaların birleşmesiyle büyüdüğünü geriye doğru okumayı sağlıyor: galaktik arkeoloji.",
    sources: ["Helmi vd. (2018), Nature", "Sawala vd. (2025), Nature Astronomy"],
    shots: [{ name: "galaksi", fromBeat: 0, focus: [0.5, 0.5], zoom: [1.16, 1.02] }],
    tone: { chord: [36, 43, 48, 52, 55, 59], brightness: 820 },
  },
  {
    id: "gunes",
    title: "Güneş doğuyor",
    subtitle: "Gezegen diski",
    when: "4,57 milyar yıl önce",
    beats: [
      {
        ya: 4.6e9,
        text: "Bir molekül bulutunun bir parçası çöker. Ortada bir ön-yıldız, çevresinde yassı bir gaz ve toz diski kalır.",
      },
      {
        ya: 4.57e9,
        text: "Merkezde sıcaklık ve basınç hidrojen füzyonunu başlatır. Güneş bir yıldız olur.",
      },
      {
        ya: 4.565e9,
        text: "Toz taneleri yapışarak gezegenimsilere, onlar da gezegenlere dönüşür. Dünya, diskin kayalık iç bölgesinde birikir.",
      },
    ],
    endYa: 4.55e9,
    facts: [
      "Güneş, ömrünün yaklaşık yarısındaki bir sarı cücedir; kararlı evresi kabaca 10 milyar yıl sürer.",
      "İç gezegenler kayalıktır; buzların donabildiği soğuk dış bölgede dev gezegenler büyür.",
      "Bugün 6.000’i aşkın ötegezegen biliniyor; gezegen sistemleri gökadamızda istisna değil, kural gibi görünüyor.",
    ],
    evidence:
      "Göktaşlarındaki en eski katı parçacıklar radyometrik yöntemle 4,567 milyar yıl olarak tarihlenir. ALMA radyo teleskopu, genç yıldızların çevresinde tam da bu tür halkalı diskleri görüntüledi.",
    sources: [
      "Connelly vd. (2012), Science",
      "ALMA Ortaklığı (2015), Astrophysical Journal Letters",
    ],
    shots: [{ name: "gunes", fromBeat: 0, focus: [0.5, 0.5], zoom: [1.22, 1.03] }],
    tone: { chord: [41, 48, 53, 57, 64], brightness: 1100 },
  },
  {
    id: "dunya",
    title: "Erken Dünya",
    subtitle: "Ay, kabuk, okyanus",
    when: "4,54 – 4,3 milyar yıl önce",
    beats: [
      {
        ya: 4.54e9,
        text: "Genç Dünya erimiş bir küredir. Theia adlı gezegen boyutlu bir cisimle çarpışması yörüngeye eriyik saçar; Ay bu enkazdan toplanır.",
      },
      {
        ya: 4.45e9,
        text: "Yüzey soğuyup kabuk bağlar. Batı Avustralya’daki zirkon kristalleri, 4,4 milyar yıl önce sıvı suyun izini taşır.",
      },
      {
        ya: 4.4e9,
        text: "Buhar yoğunlaşır, okyanuslar dolar. Tabanlarındaki hidrotermal bacalar, mineral ve ısı bakımından zengin kimya ocaklarıdır.",
      },
    ],
    endYa: 4.3e9,
    facts: [
      "Dev çarpışma hipotezi Ay’ın oluşumu için en güçlü açıklamadır; ayrıntıları hâlâ tartışılıyor.",
      "Su, gezegenin kendi gazlarından, göktaşlarından ve kuyrukluyıldızlardan gelmiş olabilir; payları tartışmalıdır.",
      "Bu dönemden neredeyse hiç kaya kalmadı; tarihini kristallerden, göktaşlarından ve modellerden okuyoruz.",
    ],
    evidence:
      "Apollo’nun getirdiği Ay kayaları, Dünya’nınkilerle neredeyse aynı izotop imzasını taşır. Jack Hills zirkonlarındaki oksijen izotopları, bu kristallerin suyla etkileşmiş bir kabukta oluştuğuna işaret eder.",
    sources: ["Canup & Asphaug (2001), Nature", "Wilde vd. (2001), Nature"],
    shots: [
      { name: "dunya", fromBeat: 0, focus: [0.4, 0.5], zoom: [1.18, 1.04] },
      { name: "bacalar", fromBeat: 2, focus: [0.55, 0.55], zoom: [1.04, 1.16] },
    ],
    tone: { chord: [38, 45, 50, 53, 57], brightness: 700 },
  },
  {
    id: "rna",
    title: "RNA dünyası",
    subtitle: "Kendini kopyalayan kimya",
    when: "Yaklaşık 4,4 – 4,2 milyar yıl önce",
    beats: [
      {
        ya: 4.3e9,
        text: "Yaşam hazır bir hücre olarak belirmez. Önce kendini kopyalayabilen bir kimya gerekir.",
      },
      {
        ya: 4.27e9,
        text: "RNA hem bilgi taşıyabilir hem de, ribozimlerde olduğu gibi, tepkimeleri hızlandırabilir. Erken bir RNA dünyası bu yüzden güçlü bir hipotezdir.",
      },
      {
        ya: 4.24e9,
        text: "Yağ asitleri suda kendiliğinden kesecikler oluşturur. İçeri hapsolan kopyalayıcılar, dışarıdaki çorbadan ayrı bir kader edinir.",
      },
    ],
    endYa: 4.21e9,
    facts: [
      "Bu bir kesinlik değil, jeoloji ile biyokimyanın ortak hipotezidir; ilk kopyalayıcıların fosili yoktur.",
      "Hidrotermal bacalar da sıcak karasal havuzlar da aday ortamlar arasında.",
      "Bugün bile her hücrede proteinleri birleştiren ribozomun kalbi RNA’dan yapılmıştır.",
    ],
    evidence:
      "1980’lerde RNA’nın enzim gibi davranabildiği keşfedildi ve bu buluş 1989 Nobel Kimya Ödülü’nü getirdi. Laboratuvarda, RNA yapı taşlarının erken Dünya’ya benzer koşullarda basit moleküllerden oluşabildiği gösterildi.",
    sources: ["Gilbert (1986), Nature", "Powner, Gerland & Sutherland (2009), Nature"],
    shots: [{ name: "rna", fromBeat: 0, focus: [0.6, 0.55], zoom: [1.04, 1.16] }],
    tone: { chord: [34, 41, 46, 50, 53], brightness: 640 },
  },
  {
    id: "dna",
    title: "DNA ve ortak ata",
    subtitle: "LUCA",
    when: "Yaklaşık 4,2 – 3,5 milyar yıl önce",
    beats: [
      {
        ya: 4.2e9,
        text: "DNA, RNA’dan daha dayanıklı bir arşivdir; kimyasal işin çoğunu ise proteinler üstlenir. Üçü birlikte bugünkü yaşamın omurgasıdır.",
      },
      {
        ya: 4.2e9,
        text: "Bakteriden insana genetik kod neredeyse ortaktır. Son evrensel ortak ata, LUCA, ilk canlı değildir; daha eski bir topluluğun hayatta kalan soyudur.",
      },
      {
        ya: 4e9,
        text: "LUCA’nın zarı, ribozomları ve enerji metabolizması vardı. Ondan iki büyük dal ayrılır: bakteriler ve arkeler.",
      },
    ],
    endYa: 3.5e9,
    facts: [
      "Kodun ortaklığı, bilinen tüm yaşamın tek bir kökenden geldiğinin en güçlü kanıtıdır.",
      "2024’teki bir genom analizi LUCA’yı yaklaşık 4,2 milyar yıl öncesine yerleştiriyor; belirsizlik payı büyük.",
      "Yaygın kabul gören en eski yaşam izleri arasında Avustralya’daki yaklaşık 3,5 milyar yıllık stromatolitler var.",
    ],
    evidence:
      "Bugünkü canlıların genleri karşılaştırılıp soy ağacı geriye doğru sarılarak ortak atada hangi genlerin bulunduğu tahmin edilir. Moleküler saatler, bu ayrılmaların kabaca ne zaman olduğunu hesaplar.",
    sources: ["Moody vd. (2024), Nature Ecology & Evolution"],
    shots: [{ name: "dna", fromBeat: 0, focus: [0.3, 0.5], zoom: [1.12, 1.02] }],
    tone: { chord: [36, 43, 48, 50, 55], brightness: 780 },
  },
  {
    id: "oksijen",
    title: "Oksijen, sonra çekirdek",
    subtitle: "Büyük Oksitlenme",
    when: "2,4 – 1,8 milyar yıl önce",
    beats: [
      {
        ya: 2.5e9,
        text: "Siyanobakteriler suyu parçalayıp oksijen salan fotosentezi geliştirir. Dünya’nın havası yavaş yavaş değişir.",
      },
      {
        ya: 2.4e9,
        text: "Oksijen önce denizdeki çözünmüş demirle tepkimeye girer; bantlı demir yatakları birikir. Artan oksijen birçok eski mikrop için zehirdir.",
      },
      {
        ya: 2e9,
        text: "Bir hücre, yuttuğu bir bakteriyi sindirmez. İçeride kalan ortak mitokondriye dönüşür; çekirdekli, yani ökaryot hücrelerin yolu açılır.",
      },
    ],
    endYa: 1.8e9,
    facts: [
      "Büyük Oksitlenme Olayı yaklaşık 2,4 milyar yıl öncedir; havadaki oksijen bugünkü düzeyine çok daha sonra ulaşır.",
      "Mitokondri alfa-proteobakteri kökenlidir. Bitkilerdeki kloroplast da sonradan içeri alınmış bir siyanobakteridir.",
      "Bu ortaklık olmadan hayvan, bitki ve mantar hücrelerinin enerji bütçesi düşünülemez.",
    ],
    evidence:
      "Mitokondrinin kendi küçük DNA’sı ve bakteri tipi ribozomları vardır; ikiye bölünerek çoğalır. Kayalarda ise 2,4 milyar yıl önce kükürt izotoplarındaki özel bir imzanın kaybolması, havaya oksijen girdiğini gösterir.",
    sources: [
      "Sagan (Margulis) (1967), Journal of Theoretical Biology",
      "Lyons, Reinhard & Planavsky (2014), Nature",
    ],
    shots: [{ name: "hucre", fromBeat: 0, focus: [0.45, 0.5], zoom: [1.16, 1.02] }],
    tone: { chord: [33, 40, 45, 48, 52], brightness: 860 },
  },
  {
    id: "kara",
    title: "Denizden karaya",
    subtitle: "Gövdeler ve bacaklar",
    when: "600 – 360 milyon yıl önce",
    beats: [
      {
        ya: 600e6,
        text: "Çok hücreli gövdeler çoğalır. Ediyakara canlıları yumuşak ve yassıdır; bugünkü hayvan gruplarına pek benzemez.",
      },
      {
        ya: 540e6,
        text: "Kambriyen’de, yaklaşık 540 milyon yıl önce, kabuklar, gözler ve av–avcı ilişkileri hızla çeşitlenir.",
      },
      {
        ya: 470e6,
        text: "Önce bitkiler ve eklembacaklılar karaya çıkar. Devoniyen’de lop yüzgeçli balıklardan, bileği andıran yüzgeçleriyle ilk dört ayaklılar türer.",
      },
    ],
    endYa: 365e6,
    facts: [
      "Kambriyen “patlaması” yoktan var oluş değildir; daha eski hayvan izleri de vardır.",
      "Tiktaalik gibi fosiller, yüzgeçle bacak arasındaki kemik düzenini gösterir.",
      "Bu bir merdiven değil: farklı soylar, farklı zamanlarda karaya geçer.",
    ],
    evidence:
      "Kanada’daki Burgess Şeyli ve Çin’deki Chengjiang yatakları Kambriyen hayvanlarını yumuşak dokularıyla birlikte korudu. Tiktaalik, tam da öngörülen yaştaki (yaklaşık 375 milyon yıl) kayalarda aranarak bulundu.",
    sources: ["Daeschler, Shubin & Jenkins (2006), Nature"],
    shots: [
      { name: "kambriyen", fromBeat: 0, focus: [0.5, 0.55], zoom: [1.04, 1.15] },
      { name: "kita", fromBeat: 2, focus: [0.62, 0.6], zoom: [1.14, 1.03] },
    ],
    tone: { chord: [41, 48, 53, 55, 60], brightness: 980 },
  },
  {
    id: "dino",
    title: "Dinozorlar ve bir taş",
    subtitle: "Mezozoyik",
    when: "233 – 66 milyon yıl önce",
    beats: [
      {
        ya: 200e6,
        text: "Dinozorlar uzun süre karaların baskın omurgalılarıdır. Memeliler de aynı çağda yaşar, ama çoğu küçüktür.",
      },
      {
        ya: 66e6,
        text: "66 milyon yıl önce, yaklaşık 10 kilometrelik bir göktaşı Yucatán’a çarpar. Toz, yangınlar ve çöken besin zincirleri kitlesel bir yok oluşu başlatır.",
      },
      {
        ya: 66e6,
        text: "Kuş olmayan dinozorlar yok olur; kuşlar onların yaşayan koludur. Boşalan nişlerde memeliler hızla çeşitlenir.",
      },
    ],
    endYa: 60e6,
    facts: [
      "Çarpışmanın izi Chicxulub krateridir. İridyumca zengin ince bir kil tabakası o anı bütün dünyada işaretler.",
      "Türlerin yaklaşık dörtte üçü bu olayda yok oldu.",
      "Hindistan’daki Deccan volkanizmasının yok oluşta ne kadar payı olduğu hâlâ araştırılıyor.",
    ],
    evidence:
      "1980’de Alvarez ekibi, Kretase–Paleojen sınırındaki kilde olağandışı miktarda iridyum buldu. Krater 1990’larda Yucatán’da gömülü olarak tanımlandı; şok kuvars ve cam boncuklar aynı darbeyi doğrular.",
    sources: ["Alvarez vd. (1980), Science", "Schulte vd. (2010), Science"],
    shots: [
      { name: "dino", fromBeat: 0, focus: [0.56, 0.45], zoom: [1.03, 1.14] },
      { name: "carpisma", fromBeat: 1, focus: [0.5, 0.55], zoom: [1.16, 1.03] },
    ],
    tone: { chord: [34, 41, 46, 49, 53], brightness: 600 },
  },
  {
    id: "insan",
    title: "İnsana giden dallar",
    subtitle: "Homininler",
    when: "Son 7 milyon yıl",
    beats: [
      {
        ya: 7e6,
        text: "İnsan, maymunun geliştirilmiş hâli değildir. Şempanzelerle ortak bir atadan ayrılmış ayrı bir daldır.",
      },
      {
        ya: 3.5e6,
        text: "Australopithecus iki ayak üzerinde yürür. Homo erectus Afrika’nın dışına çıkar; taş aletler ve ateş bu soyun dünyasına girer.",
      },
      {
        ya: 3e5,
        text: "Homo sapiens yaklaşık 300 bin yıl önce Afrika’da belirir. Neandertaller ayrı bir daldır; soyları tükenir ama izleri bugün birçok insanın DNA’sında yaşar.",
      },
    ],
    endYa: 4e4,
    facts: [
      "Evrim bir merdiven değil, dallanan bir ağaçtır. Paranthropus ve Neandertal gibi kolların soyu tükenmiştir.",
      "Tek bir “ilk insan” yoktur; değişen, bireyler değil popülasyonlardır.",
      "Afrika dışı kökenli insanların genomunun yaklaşık yüzde 1–2’si Neandertal kökenlidir.",
    ],
    evidence:
      "Fas’taki Jebel Irhoud fosilleri, Homo sapiens kaydını yaklaşık 300 bin yıl geriye taşıdı. Fosil kemiklerden okunan antik DNA, Neandertallerle melezleşmeyi doğrudan gösterdi; bu çalışmalar Svante Pääbo’ya 2022 Nobel Ödülü’nü getirdi.",
    sources: ["Hublin vd. (2017), Nature", "Green vd. (2010), Science"],
    shots: [{ name: "insan", fromBeat: 0, focus: [0.5, 0.6], zoom: [1.14, 1.02] }],
    tone: { chord: [38, 45, 50, 54, 57, 62], brightness: 1000 },
  },
];

export const CLOSING_SOURCES = ["Carl Sagan (1977), The Dragons of Eden — kozmik takvim fikri"];
