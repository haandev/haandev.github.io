---
title: "Temizliği en eski okuyucu belirler"
date: "2026-11-??"
description: "Çok sürümlü bir sistemde silmek iki adımdır: veri önce ölür, sonra gömülür. Ölüme yazan karar verir, gömülmeye en eski okuyucu. Vacuum horizon bu iki adım arasındaki çizgidir; PostgreSQL'de, InnoDB'de, Oracle'da, Cassandra'da, TiDB'de, Delta Lake'te ve Linux çekirdeğinde başka adlarla aynı çizgi. Çizgiyi kimin tuttuğu, nasıl ölçüldüğü ve tutan olduğunda kimin bedel ödediği."
ogDescription: "Horizon bir ortalama değil, bir minimumdur: bin okuyucudan biri yeter."
bodyClass: "s-vh"
dek: "Silmek iki adımdır: <span class=\"a\">ölüm ve gömülme</span>. Ölüme yazan karar verir; <span class=\"g\">gömülmeye en eski okuyucu</span>."
tags:
  - "veritabanı"
  - "mvcc"
  - "postgresql"
  - "çöp toplama"
  - "sistem tasarımı"
---

<!--
TASLAK. Şekil yerleri [Şekil: ...] olarak işaretli; her biri ayrı bir .mdx
bileşeni olacak. Kaynaklar ve sayılar yayından önce tek tek kontrol edilmeli.
-->

## 1. Problem: kimsenin veri eklemediği bir tablo büyüyor

Pazartesi sabahı bir alarm gelir: `orders` tablosu cuma akşamı 30 GB'tı, şimdi 210 GB. Hafta sonu trafiği normal, yeni müşteri yok, toplu yükleme yok. Satır sayısı neredeyse aynı. Sorgular yavaşlamış, `autovacuum` bütün hafta sonu çalışmış ama hiçbir şey kazandırmamış.

Sebep, cuma 18:40'ta Mehmet'in dizüstü bilgisayarında açık kalan bir SQL istemcisidir. Mehmet bir rapor için `BEGIN` yazmış, tek bir `SELECT` çalıştırmış, sonucu kopyalamış ve bilgisayarın kapağını kapatmış. Bağlantı kopmamış; oturum `idle in transaction` durumunda bekliyor. O transaction hiçbir şey kilitlemiyor, hiçbir şey yazmıyor, CPU harcamıyor. Ama veritabanının bütün temizlik mekanizmasını cuma 18:40'a çivilemiş durumda.

Hafta sonu boyunca `orders` tablosundaki her `UPDATE` eski satırı yerinde bıraktı ve yenisini yazdı. Vacuum her geçişinde bu eski satırları buldu ve her seferinde aynı kararı verdi: **silemem, biri hâlâ görüyor olabilir.**

Kimse görmüyordu. Ama veritabanı bunu bilemez; bildiği tek şey, cuma 18:40'tan beri açık bir snapshot'ın var olduğudur.

## 2. Neden eski sürüm hemen silinmez

Çok sürümlü eşzamanlılık denetimi (MVCC) okuyucu ile yazıcıyı birbirinden ayırmanın en yaygın yoludur. Okuyucu kilit almaz; transaction başladığında veritabanının bir **anlık görüntüsünü** (snapshot) alır ve bütün sorgularını o görüntü üzerinde çalıştırır. Yazıcı da okuyucuyu beklemez; satırın üzerine yazmak yerine yeni bir sürüm üretir.

Bu düzenin bir sonucu vardır: bir satır güncellendiğinde ya da silindiğinde eski hâli **o an** gereksiz hâle gelmez. Güncelleme anından önce başlamış bir snapshot o satırı hâlâ eski hâliyle görmek zorundadır. Eski sürüm, onu görebilecek son snapshot kapanana kadar yaşamalıdır.

Silmek bu yüzden iki ayrı olaydır:

1. **Ölüm.** Yazan transaction satırın artık geçerli olmadığını işaretler. Bu bir yazma işlemidir ve anında olur.
2. **Gömülme.** Satırın kapladığı yer geri alınır. Bu bir temizlik işlemidir ve ancak ölümden önce başlamış bütün okuyucular gittiğinde mümkündür.

İki olay arasındaki satıra PostgreSQL *dead tuple*, InnoDB *undo kaydı*, Cassandra *tombstone* der. İsimler farklıdır; durum aynıdır: **ölü ama henüz gömülemeyen veri.**

[Şekil: ÖlümVeGömülme — bir satırın zaman çizgisi: yazıldı → güncellendi (ölüm) → en eski snapshot kapandı (gömülme izni) → vacuum yeri geri aldı. İki olay arasındaki aralık taralı.]

## 3. Horizon: iş değil, izin

Genel jargonda *vacuum horizon* iki kelimenin birleşimidir ve iki kelime iki farklı şeyi anlatır.

- **Vacuum** bir iştir: ölü sürümleri, silinmiş kayıtları bulup yerlerini geri almak.
- **Horizon** bir izindir: "bu çizgiden eskisini artık kimse görmüyor ve görmeyecek" noktası.

İkisini ayırmak önemlidir, çünkü problemlerin neredeyse hepsi ikinci kelimededir. Vacuum'un yavaş çalışması bir ayar meselesidir; worker sayısı, maliyet limitleri, eşik değerleri. Horizon'un ilerlememesi ise bir ayar meselesi değildir. Vacuum ne kadar sık ve ne kadar hızlı çalışırsa çalışsın, horizon'un gerisinde kalan hiçbir şeye dokunamaz. Pazartesi sabahki tabloda autovacuum'un bütün hafta sonu boşuna çalışmasının sebebi budur: iş yapılıyordu, izin yoktu.

Horizon'un tanımı tek satırdır:

```
horizon = min(her aktif okuyucunun snapshot'ı)
```

Bu tanımın en önemli kelimesi `min`'dir. **Horizon bir ortalama değil, bir minimumdur.** Bin okuyucunun dokuz yüz doksan dokuzu milisaniyeler içinde biten sorgular çalıştırıyor olabilir; horizon'u belirleyen, kalan birdir. Bir minimum fonksiyonunda tek bir uç değer bütün sonucu belirler ve diğer değerlerin ne kadar iyi olduğunun hiçbir önemi yoktur.

Bunun pratik anlamı şudur: horizon en yavaş okuyucunun hızında ilerler. Sistemin geri kalanı ne kadar sağlıklı olursa olsun.

[Şekil: MinimumÇizgisi — yatay zaman ekseni üzerinde onlarca kısa okuyucu çubuğu ve bir tane çok uzun çubuk. Horizon çizgisi uzun çubuğun başlangıcına yapışmış; sağında birikmiş ölü sürümler.]

## 4. Aynı çizgi, başka adlar

Kavram yeni değildir ve veritabanlarına özgü de değildir. Aynı çizgi, birden fazla sürümü aynı anda tutan her sistemde başka bir adla karşımıza çıkar:

| Sistem | Adı | Okuyucu kim sayılıyor? |
|---|---|---|
| PostgreSQL | xmin horizon, *removable cutoff* | Açık transaction'lar, replication slot'lar, standby'lar, hazırlanmış (prepared) transaction'lar |
| MySQL InnoDB | purge, *read view* | Açık read view'lar; birikim *history list length* ile görünür |
| Oracle | undo retention | Açık sorgular; ama bkz. bölüm 5 |
| TiDB | GC safe point | `tidb_gc_life_time` süresinden genç transaction'lar |
| CockroachDB | GC threshold, `gc.ttlseconds` | Belirli bir süreden genç zaman damgaları; yedekleme ve changefeed için *protected timestamp* |
| Cassandra ve LSM tabanlı sistemler | tombstone, `gc_grace_seconds` | Okuyucu değil: tombstone'u henüz görmemiş **replikalar** |
| Delta Lake, Iceberg | `VACUUM`, snapshot expiry | Time travel sorguları ve eşzamanlı yazıcılar |
| Linux çekirdeği (RCU) | grace period | Read-side kritik bölgede olan CPU'lar |
| Kilitsiz veri yapıları | epoch, hazard pointer | Belleği hâlâ tutan thread'ler |

Literatürdeki genel adları da aynı şeyi söyler: *low watermark*, *GC safe point*, *oldest active snapshot*.

Tablonun asıl ilginç sütunu üçüncüsüdür. Her sistemde soru aynıdır: "en eski okuyucu nerede?" Farklı olan, **neyin okuyucu sayıldığıdır.** Ve horizon sorunlarının çoğu, ekibin okuyucu olduğunu bilmediği bir şeyden çıkar.

PostgreSQL'de okuyucu yalnızca açık bir transaction değildir. Bir standby'ın `hot_standby_feedback` ile gönderdiği snapshot da okuyucudur; tüketicisi aylar önce kapatılmış bir replication slot da; iki aşamalı commit'in ortasında unutulmuş bir `PREPARE TRANSACTION` da. Bunların hiçbiri `pg_stat_activity`'de "uzun süren sorgu" olarak görünmez.

Cassandra satırı tablonun geri kalanından ayrıdır ve ayrı olduğu için öğreticidir. Orada tombstone'u bekleten bir okuyucu değil, bir **replikadır**: silme işlemini henüz almamış bir düğüm. Tombstone o düğüm onarılmadan silinirse, düğüm eski veriyi hâlâ taşıdığı için bir sonraki onarımda silinmiş veri geri gelir. Literatürde buna *zombie* ya da *resurrection* denir. Yapı aynıdır: ölü veri, ölümü görmemiş son taraf ölümü görene kadar gömülemez.

## 5. Tutan biri olduğunda bedeli kim öder

Horizon'u geride tutan bir okuyucu olduğunda sistemin önünde iki seçenek vardır ve ikisi de bir şeyi feda eder.

**Okuyucuyu korumak.** Horizon beklenir; eski sürümler okuyucu bitene kadar saklanır. Okuyucu doğru sonucu alır, ama bedeli **depolama** öder. PostgreSQL ve InnoDB varsayılan olarak bu yolu seçer. Pazartesi sabahki 210 GB bu seçimin faturasıdır.

**Depolamayı korumak.** Belirli bir sınırdan sonra horizon zorla ilerletilir; eski sürümler okuyucuya rağmen silinir. Depolama sınırlı kalır, ama bedeli **okuyucu** öder: sorgusu yarıda hata alır. Oracle'ın meşhur `ORA-01555: snapshot too old` hatası tam olarak budur. Undo alanı dolduğunda Oracle eski sürümleri geri dönüştürür ve onlara ihtiyaç duyan uzun sorguyu öldürür. TiDB'de `tidb_gc_life_time`'dan uzun süren bir transaction, GC safe point'in gerisinde kaldığını söyleyen bir hatayla sonlanır.

İki seçenek arasında doğru olan yoktur; yalnızca açıkça seçilmiş olan vardır. Oracle bunu bir ayar olarak sunar: `RETENTION GUARANTEE` açıldığında undo saklanmak zorundadır ve bu sefer bedeli **yazıcılar** öder; undo alanı dolduğunda DML hata almaya başlar. Okuyucu, yazıcı, depolama: üçünden biri mutlaka öder.

Aynı ikilem, sorunu bir replikaya taşıyarak çözmeye çalışınca da karşımıza çıkar. Uzun analitik sorguları PostgreSQL standby'ına yönlendirmek yaygın bir öneridir. `hot_standby_feedback` kapalıysa, standby primary'den gelen temizlik kayıtlarını uygulayabilmek için sorguları iptal eder (`canceling statement due to conflict with recovery`): bedeli okuyucu öder. Açıksa, standby kendi en eski snapshot'ını primary'ye bildirir ve primary'nin horizon'unu geride tutar: bedeli yine primary'nin depolaması öder. **Okuyucuyu başka bir makineye taşımak, horizon'u taşımaz.**

[Şekil: ÜçBedel — üçgen: köşelerde okuyucu, yazıcı, depolama. Her köşenin yanında onu seçen sistem/ayar: PostgreSQL varsayılanı (depolama öder), Oracle varsayılanı (okuyucu öder), Oracle `RETENTION GUARANTEE` (yazıcı öder).]

## 6. Gözlenen horizon, ilan edilen horizon

Tablodaki sistemleri bir başka eksende daha ayırmak mümkündür: horizon'un nasıl belirlendiği.

**Gözlenen horizon.** Sistem okuyucuları tek tek izler ve horizon'u gerçekten var olan en eski okuyucudan hesaplar. PostgreSQL, InnoDB ve RCU böyledir. Güvenlidir: hiçbir okuyucu kendisinden önce silinmiş bir veriyle karşılaşmaz. Ama **sınırsızdır**: tek bir okuyucu horizon'u süresiz tutabilir.

**İlan edilen horizon.** Sistem okuyucuları izlemez; bir süre ilan eder. "Tombstone'lar on gün saklanır." "Silinen dosyalar yedi gün tutulur." "GC on dakikadan eskisini temizler." Cassandra'nın `gc_grace_seconds` değeri (varsayılan 864000 saniye, yani on gün), Delta Lake'in yedi günlük `VACUUM` saklama süresi ve TiDB'nin `tidb_gc_life_time` değeri böyledir. Bu yaklaşım **sınırlıdır**: depolama ne kadar büyüyebileceği önceden bellidir. Ama artık bir gözlem değil, bir **sözdür**, ve söz tutulmayabilir. On günden uzun süre kapalı kalıp onarılmayan bir Cassandra düğümü silinmiş veriyi geri getirir. Yedi günden kısa bir saklama süresiyle çalıştırılan Delta `VACUUM`'u, hâlâ eski dosyaları okuyan bir sorguyu ya da eşzamanlı bir yazıcıyı bozabilir; Delta bu yüzden varsayılan olarak bunu reddeder.

Gözlenen horizon doğruluğu garanti eder ve depolamayı riske atar. İlan edilen horizon depolamayı garanti eder ve doğruluğu, sözün tutulmasına bağlar. Bölüm 5'teki ikilem burada mimari bir karar olarak yeniden ortaya çıkar.

## 7. Uzun okuma kısa sürer, hasarı uzun sürer

Horizon problemlerinin en yanıltıcı yanı, sebebin geçici ve hasarın kalıcı olmasıdır.

Mehmet pazartesi sabahı bilgisayarını açıp transaction'ı kapattığında horizon bir anda üç gün ileri sıçrar. Bir sonraki vacuum geçişi biriken ölü sürümleri temizler. Ama PostgreSQL'de vacuum yeri **dosyadan** geri almaz; yalnızca sayfaların içinde yeniden kullanılabilir olarak işaretler. Tablo 210 GB'ta kalır. İçi büyük ölçüde boştur, ama diskte kapladığı yer aynıdır; sıralı taramalar boş sayfaları okumaya devam eder, indeksler şişmiş hâlde kalır. Dosyayı gerçekten küçültmek `VACUUM FULL` ya da `pg_repack` gibi tabloyu yeniden yazan ağır bir işlem gerektirir.

Hasar yalnızca depolama da değildir:

- **İndeksler** ölü sürümlere işaret eden girdilerle dolar; geçerli bir satıra ulaşmak için daha fazla sayfa okunur.
- **HOT güncellemeler** azalır; sayfalarda yer açılamadığı için güncellemeler indeksleri de yeniden yazmak zorunda kalır, bu da şişmeyi hızlandırır.
- **Dondurma** (freeze) da aynı horizon'a bağlıdır. Horizon yeterince uzun süre geride kalırsa transaction ID'lerin tükenmesine (wraparound) karşı koruma devreye girer ve en kötü durumda veritabanı yeni yazmaları reddeder.

Bu yüzden horizon'u izlemek, uzun süren sorguları izlemekle aynı şey değildir. Uzun sorgu bittiğinde alarm susar; ama faturası haftalarca ödenmeye devam eder.

## 8. Teşhis: horizon'u kim tutuyor?

PostgreSQL'de "vacuum çalışıyor ama tablo küçülmüyor" şikâyetinin ilk sorusu her zaman aynıdır: horizon nerede ve onu kim tutuyor? `VACUUM (VERBOSE)` çıktısı bunun ilk ipucunu verir:

```
tuples: 0 removed, 1204117 remain, 1198320 are dead but not yet removable
removable cutoff: 88213410, which was 4120331 XIDs old when operation ended
```

"Dead but not yet removable" satırı, işin yapıldığını ama iznin olmadığını söyler. Ardından okuyucu sayılan her kaynağa tek tek bakılır:

```sql
-- 1. Açık transaction'lar
SELECT pid, usename, state, xact_start, age(backend_xmin) AS xmin_age
FROM pg_stat_activity
WHERE backend_xmin IS NOT NULL
ORDER BY age(backend_xmin) DESC;

-- 2. Replication slot'lar (kullanılmayanlar dahil)
SELECT slot_name, active, xmin, catalog_xmin
FROM pg_replication_slots;

-- 3. Unutulmuş hazırlanmış transaction'lar
SELECT gid, prepared, owner FROM pg_prepared_xacts;

-- 4. Feedback gönderen standby'lar
SELECT application_name, backend_xmin FROM pg_stat_replication;
```

Dört sorgunun dördü de aynı soruyu farklı bir okuyucu türü için sorar. Bölüm 4'teki tablonun üçüncü sütunu, burada bir kontrol listesine dönüşür.

InnoDB'de karşılığı `SHOW ENGINE INNODB STATUS` çıktısındaki *History list length* değeridir. Sürekli yükselen bir değer, purge'ün geride kaldığını, yani bir read view'ın horizon'u tuttuğunu gösterir.

## 9. Önlem: okuyucuya süre vermek

Gözlenen horizon kullanan bir sistemde yapılabilecek en etkili şey, okuyucuyu sınırlamaktır. Yani gözlenen horizon'u, okuyucu tarafında bir süre ilan ederek sınırlı hâle getirmek.

- `idle_in_transaction_session_timeout`: Mehmet'in senaryosunu doğrudan önler. Transaction açık bırakılmış ve boşta bekleyen oturumu belirli bir süre sonra kapatır.
- `transaction_timeout` (PostgreSQL 17 ile geldi): boşta olsun olmasın, bir transaction'ın toplam süresini sınırlar.
- `statement_timeout`: tek bir sorgunun süresini sınırlar; ama açık bırakılmış bir transaction'ı yakalamaz.
- Kullanılmayan replication slot'ların izlenmesi ve silinmesi. Bir slot'un tüketicisi kapatıldığında slot kendiliğinden gitmez.
- Analitik okumalar için bölüm 5'teki ikilemin bilinçli seçimi: ya standby'da iptal edilen sorgular ya da primary'de şişme.

Bu ayarların hepsi aynı şeyi yapar: okuyucuya bölüm 5'teki bedelin bir kısmını ödetir. Horizon'u ilerletmenin bedava bir yolu yoktur; yalnızca bedeli kimin ödeyeceğine önceden karar vermenin bir yolu vardır.

## 10. İtirazlar ve sınırlar

1. **"Uzun okumalar meşrudur."** Doğrudur. Ay sonu raporları, yedeklemeler, mantıksal replikasyonun ilk kopyası saatler sürebilir. Buradaki argüman uzun okumanın yanlış olduğu değil, bedelinin görünmez olduğudur. Bilinçli olarak ödenen bir bedel problem değildir.
2. **Sistemler arası karşılaştırma kabadır.** RCU'nun grace period'u mikrosaniyeler, Cassandra'nın gc grace süresi günler mertebesindedir; birinin okuyucusu bir CPU, diğerininki bir düğümdür. Tablo bir eşdeğerlik değil, aynı yapının farklı ölçeklerdeki tekrarıdır.
3. **Sayılar sürüme bağlıdır.** Varsayılan değerler ve hata mesajları sürümden sürüme değişir; buradakiler yazının yazıldığı tarihteki belgelere dayanır.
4. **Bu yazı bir çözüm önermiyor.** Okuyucuyu izlemeden horizon'u ilerletmenin, ya da depolama ödemeden okuyucuyu korumanın bir yolu olduğunu iddia etmiyorum. Bölüm 5'teki üçgen bir mühendislik kusuru değil, MVCC'nin kendisinin bir sonucudur.

## 11. Sonuç

Çok sürümlü bir sistemde silmek iki adımdır. Ölüm, yazanın kararıdır ve anında olur. Gömülme, okuyucuların iznine bağlıdır ve ancak ölümden önce başlamış son okuyucu gittiğinde mümkündür. Vacuum horizon bu iki adım arasındaki çizgidir.

Çizgi bir minimum olduğu için en yavaş okuyucunun hızında ilerler. Onu tutan biri olduğunda bedeli birisi öder: okuyucu, yazıcı ya da depolama. Hangisinin ödeyeceği bir sistem tercihidir, ve tercih yapılmamışsa varsayılan seçilmiş demektir.

Pazartesi sabahki 210 GB'lık tablo bir veritabanı hatası değildi. Veritabanı tam olarak kendisinden isteneni yaptı: kimsenin görmediği, ama birinin görebileceği bir veriyi korudu. Temizliği en eski okuyucu belirler; ve en eski okuyucu bazen kapağı kapatılmış bir dizüstü bilgisayardır.

---

## Kaynakça

### Çok sürümlü eşzamanlılık

1. Reed, D. P. (1978). *Naming and Synchronization in a Decentralized Computer System*. Doktora tezi, MIT.
2. Bernstein, P. A. & Goodman, N. (1983). *Multiversion Concurrency Control — Theory and Algorithms*. ACM TODS 8(4).
3. Stonebraker, M. (1987). *The Design of the POSTGRES Storage System*. VLDB '87. Üzerine yazmayan (no-overwrite) depolama ve eski kayıtları arşive taşıyan "vacuum cleaner" süreci.
4. Wu, Y., Arulraj, J., Lin, J., Xian, R. & Pavlo, A. (2017). *An Empirical Evaluation of In-Memory Multi-Version Concurrency Control*. PVLDB 10(7). Çöp toplama stratejilerinin karşılaştırması.

### Bellek geri kazanımı

5. McKenney, P. E. & Slingwine, J. D. (1998). *Read-Copy Update: Using Execution History to Solve Concurrency Problems*. PDCS '98.
6. Michael, M. M. (2004). *Hazard Pointers: Safe Memory Reclamation for Lock-Free Objects*. IEEE TPDS 15(6).
7. Fraser, K. (2004). *Practical Lock-Freedom*. Doktora tezi, University of Cambridge. Epoch tabanlı geri kazanım.

### Ürün belgeleri

8. PostgreSQL belgeleri, *Routine Vacuuming*; `idle_in_transaction_session_timeout`, `transaction_timeout`, `hot_standby_feedback`.
9. MySQL belgeleri, *InnoDB Multi-Versioning* ve *Purge Configuration*.
10. Oracle belgeleri, *Managing Undo*; `UNDO_RETENTION`, `RETENTION GUARANTEE`, ORA-01555.
11. Apache Cassandra belgeleri, *Compaction / Tombstones*; `gc_grace_seconds`.
12. TiDB belgeleri, *GC Overview*; `tidb_gc_life_time`.
13. CockroachDB belgeleri, *Configure Replication Zones*; `gc.ttlseconds`, protected timestamps.
14. Delta Lake belgeleri, *Remove files no longer referenced by a Delta table* (`VACUUM`).

<!-- Not: bağlantılar ve sürüm numaraları yayından önce eklenecek / doğrulanacak. -->
