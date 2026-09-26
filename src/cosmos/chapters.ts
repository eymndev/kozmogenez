export type Beat = { at: number; text: string };

export type Chapter = {
  id: string;
  kicker: string;
  title: string;
  when: string;
  duration: number;
  beats: Beat[];
  facts: string[];
};

export const CHAPTERS: Chapter[] = [
  {
    id: "patlama",
    kicker: "13,8 milyar yıl önce",
    title: "Büyük Patlama",
    when: "Uzay genişler",
    duration: 16,
    beats: [
      {
        at: 0,
        text: "Bu, uzayın içinde bir noktada olan bir infilak değil. Uzayın kendisi genişlemeye başlar.",
      },
      {
        at: 0.34,
        text: "İlk saniyenin çok küçük bir kesrinde evren şişer. Sonra kuarklar, leptonlar ve ışık tek bir sıcak çorba olur.",
      },
      {
        at: 0.68,
        text: "Henüz atom, yıldız ya da gezegen yoktur. Bugün gördüğün her şeyin hammaddesi bu plazmadadır.",
      },
    ],
    facts: [
      "Gözlenebilir evrenin yaşı yaklaşık 13,8 milyar yıldır.",
      "İlk birkaç dakikada çekirdekler oluşur: çoğu hidrojen ve helyum, az miktarda lityum.",
      "Karbon, oksijen ve demir bu aşamada yoktur; onlar sonra yıldızlarda dövülür.",
    ],
  },
  {
    id: "isik",
    kicker: "Yaklaşık 380.000 yıl sonra",
    title: "İlk ışık",
    when: "Evren saydamlaşır",
    duration: 14,
    beats: [
      {
        at: 0,
        text: "Evren hâlâ opak bir sistir. Fotonlar sürekli saçılır, düz bir çizgide yol alamaz.",
      },
      {
        at: 0.36,
        text: "Sıcaklık düşünce elektronlar çekirdeklere bağlanır. İlk kararlı atomlar oluşur ve evren saydamlaşır.",
      },
      {
        at: 0.7,
        text: "O an salınan ışık bugün her yönden gelir: kozmik mikrodalga arka plan, yaklaşık 2,7 kelvin.",
      },
    ],
    facts: [
      "Bu ışıma, evrenin bebek fotoğrafı gibidir.",
      "Üzerindeki çok küçük sıcaklık farkları, ileride galaksi olacak yoğunluk tohumlarıdır.",
      "O günden beri uzayın genişlemesi bu ışığı mikrodalga boyuna kadar germiştir.",
    ],
  },
  {
    id: "yildiz",
    kicker: "Yüz milyonlarca yıl sonra",
    title: "İlk yıldızlar",
    when: "Ağır elementler",
    duration: 16,
    beats: [
      {
        at: 0,
        text: "Karanlık hidrojen bulutları kendi ağırlığıyla çöker. İlk yıldızlar yanar.",
      },
      {
        at: 0.38,
        text: "Bu kuşak bugünkü yıldızlardan çok daha iri ve kısa ömürlüdür. Çekirdeklerinde karbon, oksijen ve silisyum birikir.",
      },
      {
        at: 0.72,
        text: "Patladıklarında bu elementleri uzaya saçarlar. Kemiklerdeki kalsiyum ve kandaki demir, ölmüş yıldızlardan kalmadır.",
      },
    ],
    facts: [
      "Güneş ilk kuşaktan değildir; önceki yıldızların küllerinden doğmuş ikinci ya da üçüncü kuşak bir yıldızdır.",
      "Demirden ağır elementlerin bir kısmı nötron yıldızı çarpışmalarında oluşur.",
      "İlk yıldızlara Popülasyon III denir; henüz doğrudan gözlenmemişlerdir.",
    ],
  },
  {
    id: "galaksi",
    kicker: "Milyarlarca yıl",
    title: "Samanyolu",
    when: "Galaksiler toplanır",
    duration: 14,
    beats: [
      {
        at: 0,
        text: "Kütleçekim gazı, tozu ve karanlık maddeyi dev halelere toplar. İlk galaksiler küçük ve dağınıktır.",
      },
      {
        at: 0.4,
        text: "Cüce galaksiler çarpışıp birleşir. Dönmeye başlayan bir disk belirir: Samanyolu’nun gövdesi.",
      },
      {
        at: 0.74,
        text: "Güneş bugün bu diskin merkezinden yaklaşık 26 bin ışık yılı ötede, oldukça sakin bir yörüngededir.",
      },
    ],
    facts: [
      "Samanyolu’nun en yaşlı yıldızları 13 milyar yıldan daha eskidir.",
      "Disk, şişkin merkez ve görünmez hale birlikte döner.",
      "Andromeda ile yaklaşık 4–5 milyar yıl sonra çarpışması beklenir; Güneş o sırada hâlâ ana kolunda olacaktır.",
    ],
  },
  {
    id: "gunes",
    kicker: "4,57 milyar yıl önce",
    title: "Güneş doğuyor",
    when: "Gezegen diski",
    duration: 16,
    beats: [
      {
        at: 0,
        text: "Bir molekül bulutunun parçası çöker. Ortada bir ön-yıldız, çevresinde yassı bir gaz ve toz diski kalır.",
      },
      {
        at: 0.4,
        text: "Merkezdeki sıcaklık ve basınç hidrojen füzyonunu başlatır. Güneş bir yıldız olur.",
      },
      {
        at: 0.68,
        text: "Toz taneleri yapışarak gezegenimsilere, onlar da gezegenlere dönüşür. Dünya bu diskin taşlı bölgesinde birikir.",
      },
    ],
    facts: [
      "Güneş, ömrünün yaklaşık yarısındaki bir sarı cücedir. Ana kolu kabaca 10 milyar yıl sürer.",
      "İç gezegenler kayalıktır; su ve gaz buzları daha soğuk, dış bölgede dev gezegenleri büyütür.",
      "Güneş sistemi tek değildir: gökadamızda gezegeni olan binlerce yıldız bilinir.",
    ],
  },
  {
    id: "dunya",
    kicker: "4,54 – 4,0 milyar yıl önce",
    title: "Erken Dünya",
    when: "Ay, kabuk, okyanus",
    duration: 18,
    beats: [
      {
        at: 0,
        text: "Genç Dünya erimiş bir küredir. Theia adlı gezegenimsiyle çarpışması yörüngeye eriyik madde saçar; Ay buradan toplanır.",
      },
      {
        at: 0.36,
        text: "Yüzey kabuk bağlar. Batı Avustralya’daki zirkonlar, 4,4 milyar yıl önce sıvı suyun izini taşır.",
      },
      {
        at: 0.7,
        text: "Buhar yoğunlaşır, okyanuslar dolar. Tabanındaki hidrotermal bacalar, mineral ve ısı açısından zengin kimya ocaklarıdır.",
      },
    ],
    facts: [
      "Ay’ın oluşumu, Dünya’nın dönüşünü ve gelgitlerini de değiştirir.",
      "Su, gezegenin kendi gazlarından, göktaşlarından ve kuyrukluyıldızlardan gelmiş olabilir; payları hâlâ tartışılır.",
      "Bu dönemdeki kayalar neredeyse yok olmuştur; tarihi kristaller, göktaşları ve modellerden okuruz.",
    ],
  },
  {
    id: "rna",
    kicker: "Yaklaşık 4,0 – 3,7 milyar yıl önce",
    title: "RNA dünyası",
    when: "Kopyalanan kimya",
    duration: 16,
    beats: [
      {
        at: 0,
        text: "Yaşam hazır bir hücre olarak belirmez. Önce kendini kopyalayabilen bir kimya gerekir.",
      },
      {
        at: 0.34,
        text: "RNA hem dizi olarak bilgi taşır hem, ribozimlerde olduğu gibi, tepkime hızlandırabilir. Erken bir RNA dünyası bu yüzden güçlü bir hipotezdir.",
      },
      {
        at: 0.7,
        text: "Yağ asitleri suda kendiliğinden kesecik oluşturur. İçeri hapsolan kopyalayıcılar, dışarıdaki çorbadan ayrı bir kader edinir.",
      },
    ],
    facts: [
      "Bu bir laboratuvar kanıtı değil, jeoloji ve biyokimyanın ortak hipotezidir. İlk organizmanın fosili yoktur.",
      "En eski tartışmalı biyolojik izler yaklaşık 3,7–3,5 milyar yıl öncesine gider.",
      "Hidrotermal bacalar aday ortamdır; sıcak karasal havuzlar da hâlâ masadadır.",
    ],
  },
  {
    id: "dna",
    kicker: "Yaklaşık 3,5 milyar yıl ve öncesi",
    title: "DNA ve ortak ata",
    when: "LUCA",
    duration: 16,
    beats: [
      {
        at: 0,
        text: "DNA, RNA’dan daha dayanıklı bir arşivdir. Asıl kimyasal işi ise proteinler üstlenir. Üçü birlikte bugünkü canlılığın omurgasıdır.",
      },
      {
        at: 0.4,
        text: "Bakteriden insana genetik kod neredeyse ortaktır. Son evrensel ortak ata, yani LUCA, ilk canlı değildir; ondan da eski bir topluluğun soyudur.",
      },
      {
        at: 0.72,
        text: "LUCA’nın zarı, ribozomları ve enerji metabolizması vardı. Ondan iki büyük dal ayrılır: bakteri ve arke.",
      },
    ],
    facts: [
      "Kodun ortaklığı, bildiğimiz yaşamın tek bir kökenden geldiğinin en güçlü izidir.",
      "LUCA muhtemelen sıcak, havasız ve hidrojen açısından zengin bir ortamdaydı.",
      "Virüsler bu ağacın neresine düşer, hâlâ açık bir sorudur; hücresizdirler ama evrime derinden karışırlar.",
    ],
  },
  {
    id: "oksijen",
    kicker: "2,4 – 1,8 milyar yıl önce",
    title: "Oksijen, sonra çekirdek",
    when: "Büyük Oksitlenme",
    duration: 18,
    beats: [
      {
        at: 0,
        text: "Siyanobakteriler suyu parçalayıp oksijen salan fotosentezi geliştirir. Dünya’nın havası yavaşça değişir.",
      },
      {
        at: 0.34,
        text: "Oksijen önce denizdeki demirle tepkir; bantlı demir yatakları birikir. Artan oksijen birçok eski mikrop için zehirdir.",
      },
      {
        at: 0.66,
        text: "Bir hücre, yuttuğu bakteriyi sindirmez. İçeride kalan ortak mitokondri olur. Çekirdekli, yani ökaryot hücrelerin yolu açılır.",
      },
    ],
    facts: [
      "Büyük Oksitlenme Olayı yaklaşık 2,4 milyar yıl öncedir; atmosferdeki oksijen bugünkü düzeye çok sonra çıkar.",
      "Mitokondri, alfa-proteobakteri kökenlidir. Bitkilerdeki kloroplast da sonradan gelen bir siyanobakteridir.",
      "Endosimbiyoz olmadan bugünkü hayvan ve mantar hücrelerinin enerji bütçesi düşünülemez.",
    ],
  },
  {
    id: "kara",
    kicker: "600 – 360 milyon yıl önce",
    title: "Denizden karaya",
    when: "Gövdeler ve bacaklar",
    duration: 18,
    beats: [
      {
        at: 0,
        text: "Çok hücreli gövdeler çoğalır. Ediyakaran canlıları yumuşak, yassı ve bugünkü şubelere pek benzemez.",
      },
      {
        at: 0.34,
        text: "Kambriyen’de, yaklaşık 540 milyon yıl önce, kabuklar, gözler ve av–avcı ilişkileri hızla çeşitlenir.",
      },
      {
        at: 0.7,
        text: "Bitkiler ve eklembacaklılar karaya çıkar. Devoniyen’de lop yüzgeçli balıklardan, bileği andıran yüzgeçlerle tetrapodlar türer.",
      },
    ],
    facts: [
      "Kambriyen bir anda bütün şubelerin yoktan var olduğu an değildir; daha eski hayvan izleri vardır.",
      "Tiktaalik gibi fosiller, yüzgeç ile kol arasındaki kemik düzenini gösterir.",
      "Karadaki ilk ormanlar böcekleri, sonra omurgalıları izler. Sıra bir merdiven değil, ayrı soyların ayrı geçişidir.",
    ],
  },
  {
    id: "dino",
    kicker: "233 – 66 milyon yıl önce",
    title: "Dinozorlar ve bir taş",
    when: "Mezozoyik",
    duration: 16,
    beats: [
      {
        at: 0,
        text: "Dinozorlar uzun süre karasal ekosistemlerin baskın omurgalılarıdır. Memeliler aynı çağda vardır ama çoğu küçüktür.",
      },
      {
        at: 0.5,
        text: "66 milyon yıl önce, yaklaşık 10 kilometrelik bir göktaşı Yucatán’a çarpar. Toz, yangın ve çöken besin ağları kitlesel bir yok oluş başlatır.",
      },
      {
        at: 0.78,
        text: "Kuş olmayan dinozorlar biter. Kuşlar onların yaşayan dalıdır. Boşalan nişlerde memeli soyları çeşitlenir.",
      },
    ],
    facts: [
      "Çarpışmanın krateri Chicxulub’dur. İridyum açısından zengin bir kil tabakası o anı dünya çapında işaretler.",
      "Yok oluşun tek nedeni darbe midir, volkanizma ne kadar pay sahibidir: araştırmanın sürdüğü bir konudur.",
      "Memeliler dinozorlardan sonra ‘belirmez’; onlarla birlikte yaşar, sonra yayılır.",
    ],
  },
  {
    id: "insan",
    kicker: "Son 7 milyon yıl",
    title: "İnsana giden dallar",
    when: "Homininler",
    duration: 18,
    beats: [
      {
        at: 0,
        text: "İnsan, maymunun iyileştirilmiş hali değildir. Şempanzelerle ortak bir atadan ayrılmış ayrı bir daldır.",
      },
      {
        at: 0.36,
        text: "Australopithecus iki ayak üzerinde yürür. Homo erectus Afrika’nın dışına çıkar; alet ve ateş bu soyun dünyasında yer eder.",
      },
      {
        at: 0.72,
        text: "Homo sapiens Afrika’da, yaklaşık 300 bin yıl önce bir popülasyon olarak belirir. Neandertaller ayrı bir daldır; soyları tükenir, izleri birçok insanın DNA’sında kalır.",
      },
    ],
    facts: [
      "Evrim bir merdiven değil ağaçtır. Paranthropus ve Neandertal gibi dalların soyu tükenmiştir.",
      "Tek bir ‘ilk insan’ yoktur. Değişen, bireyler değil popülasyonlardır.",
      "Jebel Irhoud fosilleri Homo sapiens’in yaklaşık 300 bin yıllık Afrika kaydına aittir. Tarihler yeni bulgularla kayar.",
    ],
  },
];

export const TOTAL = CHAPTERS.reduce((sum, chapter) => sum + chapter.duration, 0);

export function locate(time: number): { index: number; local: number; p: number } {
  const t = Math.min(Math.max(time, 0), TOTAL);
  let acc = 0;
  for (let i = 0; i < CHAPTERS.length; i++) {
    const duration = CHAPTERS[i].duration;
    if (i === CHAPTERS.length - 1 || t < acc + duration) {
      const local = Math.min(duration, Math.max(0, t - acc));
      return { index: i, local, p: duration === 0 ? 0 : local / duration };
    }
    acc += duration;
  }
  return { index: 0, local: 0, p: 0 };
}

export function beatIndex(beats: Beat[], p: number): number {
  let index = 0;
  for (let i = 0; i < beats.length; i++) {
    if (beats[i].at <= p + 1e-4) index = i;
  }
  return index;
}

export function chapterStart(index: number): number {
  let t = 0;
  for (let i = 0; i < index && i < CHAPTERS.length; i++) t += CHAPTERS[i].duration;
  return t;
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
