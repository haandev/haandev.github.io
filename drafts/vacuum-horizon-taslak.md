---
title: "Silmek iki adımdır"
date: "2026-11-??"
description: "Bilgisayarda neredeyse hiçbir şey silindiği anda yok olmaz. Önce ölür, sonra gömülür. FAT32'den NTFS'e, Linux'tan veritabanlarına kadar her sistem bu iki adımı ayırır; aradaki boşluğu kimin uzattığı ve bunun bedelini kimin ödediği, depolamanın en az konuşulan konularından biridir."
ogDescription: "Silmek iki adımdır: ölüm ve gömülme. Ölüme silen karar verir, gömülmeye en eski okuyucu."
bodyClass: "s-vh"
dek: "Silmek iki adımdır: <span class=\"a\">ölüm ve gömülme</span>. Ölüme silen karar verir; <span class=\"g\">gömülmeye en eski okuyucu</span>."
tags:
  - "depolama"
  - "dosya sistemi"
  - "veritabanı"
  - "çöp toplama"
  - "sistem tasarımı"
---

<!--
TASLAK v2: herkesin anlayacağı dil. Teknik ayrıntılar "Teknik not" kutularında;
okur onları atlasa da yazıyı takip edebilmeli.
Şekil yerleri [Şekil: ...] olarak işaretli.
-->

## 1. Silinen fotoğraf neden geri gelir?

Herkesin başına gelmiştir: bir USB belleği yanlışlıkla biçimlendirirsiniz ya da bir klasörü çöp kutusunu atlayarak silersiniz. Birisi size bir "veri kurtarma" programı önerir, programı çalıştırırsınız ve fotoğrafların çoğu geri gelir.

Bu küçük mucize, bilgisayarların silmeyi nasıl yaptığı hakkında önemli bir şey söyler: **silmek, yok etmek değildir.** Dosyayı sildiğiniz anda olan şey, diskteki verinin kaybolması değil, dosya sisteminin o veriyi *unutmaya karar vermesidir*. Veri, üzerine başka bir şey yazılana kadar orada durur.

Yani silmek iki ayrı olaydır:

1. **Ölüm.** Sistem "bu artık yok" diye not alır. Anında olur ve neredeyse hiç maliyeti yoktur.
2. **Gömülme.** Verinin kapladığı yer gerçekten geri alınır ve üzerine başka bir şey yazılır. Bu daha sonra, bazen çok daha sonra olur.

Bu yazının konusu, iki olay arasındaki o boşluk: neden var, kim uzatıyor ve uzadığında bedeli kim ödüyor.

[Şekil: ÖlümVeGömülme — bir dosyanın zaman çizgisi: yazıldı → silindi (ölüm) → yeri boş işaretlendi → üzerine yeni veri yazıldı (gömülme). Ölüm ile gömülme arasındaki aralık taralı ve "kurtarılabilir" etiketli.]

## 2. Dosya sistemleri nasıl siler?

FAT32 en basit örnektir. Bir klasör, içindeki dosyaların listesini tutan bir tablodur. Bir dosyayı sildiğinizde FAT32 iki küçük şey yapar: listede dosya adının ilk harfinin yerine özel bir işaret koyar ve dosyanın diskte kapladığı alanları "boş" olarak işaretler. Hepsi bu. Dosyanın içeriğine dokunulmaz.

NTFS de aynısını daha düzenli yapar. Diskteki her dosyanın bir kimlik kartı vardır (MFT kaydı). Silme işlemi, bu kartın üzerine "kullanılmıyor" yazar ve dosyanın yerini boş alan haritasında serbest bırakır. Yine, içerik yerinde durur.

Kurtarma programları bu yüzden çalışır: ölüm kaydını bulur, "kullanılmıyor" işaretini görmezden gelir ve hâlâ yerinde duran veriyi okurlar. Ta ki yeni bir dosya gelip o alana yazılana kadar. Gömülme o anda olur.

> **Teknik not.** FAT32'de silinen dosyanın dizin kaydının ilk baytı `0xE5` olur ve dosyanın küme zinciri FAT tablosunda sıfırlanır. NTFS'te MFT kaydındaki "in use" bayrağı kalkar, kümeler `$Bitmap`'te boş işaretlenir. SSD'lerde işin son kısmı diske devredilir: işletim sistemi TRIM komutuyla "bu bloklar artık boş" der, diskin kendi denetleyicisi onları uygun bir anda gerçekten temizler. TRIM'den sonra kurtarma genellikle imkânsızdır.

Dosya sistemlerinde ölüm ile gömülme arasındaki boşluk aslında kimseyi beklemez. Yer, silindiği anda kullanılabilir olur; gerçek yok oluş yalnızca *tesadüfe* bağlıdır, yani yeni bir verinin o alana ne zaman denk geleceğine.

Ama bir istisna var. Ve bütün hikâye o istisnada.

## 3. Biri hâlâ okuyorsa

Linux'ta, bir program bir dosyayı açıkken o dosyayı silebilirsiniz. `rm` komutu hata vermez, dosya klasörden kaybolur, `ls` artık onu göstermez. Ama disk dolu kalır.

Çünkü dosyayı okuyan program hâlâ okumaya devam ediyordur ve Linux ona söz vermiştir: "açtığın dosya, sen kapatana kadar senindir." Dosya ölmüştür, ama gömülemez. Son okuyucu dosyayı kapattığı anda yer geri gelir.

Sistem yöneticilerinin klasik kâbusu budur: disk yüzde yüz dolu, ama klasörlerdeki dosyaların toplamı yarısını bile tutmuyor. Sebep, aylar önce silinmiş ama hâlâ çalışan bir programın açık tuttuğu dev bir log dosyasıdır.

Windows aynı durumda başka bir yol seçer: dosya açıksa silmenize izin vermez. "Bu dosya başka bir program tarafından kullanıldığı için işlem tamamlanamıyor" mesajı, aynı sorunun öbür cevabıdır.

> **Teknik not.** Linux'ta silinmiş ama açık tutulan dosyalar `lsof +L1` ile listelenir. Dosyanın kimlik kartı (inode), bağlantı sayısı sıfıra düştüğünde *ve* onu açık tutan son süreç kapattığında serbest kalır.

Burada ilk kez yeni bir şey ortaya çıkıyor: **gömülme artık tesadüfe değil, okuyucuya bağlı.** Silinmiş bir şey, onu hâlâ okuyan biri olduğu sürece gömülemez.

## 4. Veritabanları: okuyucu her zaman vardır

Dosya sistemlerinde bu durum istisnadır. Veritabanlarında ise kuraldır.

Modern veritabanlarının çoğu, okuyanla yazanı birbirine bekletmemek için şöyle bir yöntem kullanır: bir sorgu başladığında, veritabanının o anki hâlinin bir **fotoğrafını** çeker ve bütün işini o fotoğraf üzerinde yapar. Bu sırada başka biri bir kaydı değiştirirse veritabanı eski kaydın üstüne yazmaz; yeni bir sürüm yazar ve eskisini yerinde bırakır. Çünkü fotoğrafı daha önce çekilmiş bir sorgu, o kaydı hâlâ eski hâliyle görmek zorundadır.

> **Teknik not.** Bu yöntemin adı çok sürümlü eşzamanlılık denetimidir (MVCC). "Fotoğraf"ın teknik adı *snapshot*'tır. PostgreSQL, MySQL'in InnoDB motoru, Oracle, SQL Server'ın snapshot modu ve dağıtık veritabanlarının çoğu bu yöntemi kullanır.

Sonuç: veritabanında her güncelleme ve her silme, ölü ama henüz gömülemeyen bir kayıt bırakır. Bu kayıtları temizleyen bir süreç vardır; PostgreSQL ona doğrudan **vacuum** (elektrik süpürgesi) der. Ama süpürge her kaydı süpüremez. Yalnızca hiçbir fotoğrafın artık göremeyeceği kayıtları süpürebilir.

O sınırın adı **vacuum horizon**'dur: "bu çizgiden eskisini artık kimse görmüyor ve görmeyecek" noktası. Çizginin gerisindeki her şey güvenle temizlenebilir; ilerisindeki hiçbir şey temizlenemez.

## 5. Kütüphanedeki en geç okur

Horizon'u anlamanın en kolay yolu bir kütüphane düşünmek.

Kütüphane, eski baskısı çıkan bir kitabı koleksiyondan çıkarmaya karar veriyor. Kitap katalogdan siliniyor; artık kimse onu ödünç alamaz. Bu ölüm. Ama kitabın dört kopyası okurlarda. Kütüphane, rafı boşaltıp yeni kitaplara yer açmak için bütün kopyaların geri dönmesini beklemek zorunda. Bu gömülme.

Üç okur kitabı ertesi gün getiriyor. Dördüncüsü getirmiyor. Rafa yer açılması, o dördüncü okurun ne zaman geleceğine bağlı.

Horizon'un en önemli özelliği budur: **bir ortalama değil, bir minimumdur.** Bin okurun dokuz yüz doksan dokuzu kitabı zamanında getirse bile, rafı belirleyen, getirmeyen tek kişidir. Diğerlerinin ne kadar dakik olduğunun hiçbir önemi yoktur.

Yani temizlik, en yavaş okuyucunun hızında ilerler.

[Şekil: MinimumÇizgisi — yatay zaman ekseninde onlarca kısa okuyucu çubuğu ve bir tane çok uzun çubuk. Horizon çizgisi uzun çubuğun başına yapışmış; sağında biriken ölü kayıtlar.]

## 6. Bir dizüstü bilgisayarın kapağı

Bunun gerçek hayattaki karşılığı şöyle bir şeydir.

Cuma akşamı Mehmet bir rapor için veritabanına bağlanır, bir sorgu çalıştırır, sonucu kopyalar ve bilgisayarının kapağını kapatıp eve gider. Ama kullandığı program, sorgunun açtığı işlemi kapatmamıştır. Bağlantı açık kalır ve Mehmet'in cuma 18:40'ta çektiği fotoğraf hâlâ "kullanımda" sayılır.

Hafta sonu boyunca sistem her zamanki gibi çalışır: siparişler gelir, kayıtlar güncellenir, her güncelleme eski bir sürüm bırakır. Süpürge düzenli olarak çalışır ve her seferinde aynı kararı verir: **temizleyemem, biri hâlâ görüyor olabilir.**

Kimse görmüyordu. Ama veritabanı bunu bilemez. Bildiği tek şey, cuma 18:40'tan beri açık bir fotoğrafın var olduğudur.

Pazartesi sabahı tablo 30 GB'tan 210 GB'a çıkmıştır. Satır sayısı neredeyse aynıdır. Kimse veri eklememiştir. Tabloyu şişiren şey, gömülmeyi bekleyen ölülerdir.

## 7. Aynı fikir, başka isimler

Bu kavram yalnızca PostgreSQL'e ait değildir. Silinen bir şeyin, onu hâlâ görebilecek biri olduğu sürece yaşaması gereken her sistemde aynı çizgi vardır. Sadece adı değişir:

| Nerede | Adı | "Okuyucu" kim? |
|---|---|---|
| Linux dosya sistemi | açık dosya tanıtıcısı | Dosyayı hâlâ açık tutan programlar |
| PostgreSQL | xmin horizon | Açık işlemler, replikalar, replikasyon slot'ları |
| MySQL (InnoDB) | purge | Açık okuma görünümleri |
| Oracle | undo retention | Uzun süren sorgular |
| TiDB, CockroachDB | GC safe point, GC TTL | Belirli bir süreden genç işlemler, yedeklemeler |
| Cassandra | tombstone, `gc_grace_seconds` | Silme haberini henüz almamış sunucular |
| Delta Lake, Iceberg | `VACUUM`, snapshot expiry | Geçmiş sürümleri okuyan sorgular |
| Linux çekirdeği | RCU grace period | Paylaşılan bir veriyi hâlâ okuyan işlemciler |

Literatürde de aynı şeye *low watermark*, *GC safe point* ya da *oldest active snapshot* denir.

Tablonun en önemli sütunu sonuncusudur. Her sistemde soru aynıdır: "en eski okuyucu nerede?" Değişen, **neyin okuyucu sayıldığıdır.** Sorunların çoğu da ekibin okuyucu olduğunu bilmediği bir şeyden çıkar: aylar önce kapatılmış bir sistemin unutulmuş replikasyon bağlantısı, yarıda kalmış bir işlem, bir yedekleme aracı.

Cassandra satırı ayrıca ilginçtir. Orada silinmiş kaydı bekleten bir okuyucu değil, silme haberini henüz almamış bir **sunucudur**. Kayıt erken gömülürse, haberi almamış sunucu eski kopyayı hâlâ taşıdığı için bir sonraki eşitlemede silinmiş veri geri gelir. Buna literatürde "zombi veri" denir. Yapı yine aynıdır: ölü, ölümü görmemiş son taraf ölümü görene kadar gömülemez.

## 8. Biri beklettiğinde bedeli kim öder?

Gömülmeyi bekleten bir okuyucu olduğunda sistemin önünde üç seçenek vardır ve her biri birilerine fatura keser.

**Silmek isteyeni durdurmak.** Windows'un yolu: okunan dosya silinemez. Okuyucu güvendedir, disk şişmez; bedeli **silmek isteyen** öder.

**Okuyucuyu beklemek.** Linux'un ve PostgreSQL'in yolu: silme kabul edilir, ama yer okuyucu bitene kadar geri alınmaz. Okuyucu güvendedir, silen engellenmez; bedeli **disk** öder. Pazartesi sabahki 210 GB bu seçimin faturasıdır.

**Okuyucuyu feda etmek.** Oracle'ın varsayılan yolu: eski sürümler için ayrılan alan dolduğunda en eskiler silinir ve onlara ihtiyaç duyan uzun sorgu yarıda hata alır. Oracle kullanıcılarının iyi bildiği `ORA-01555: snapshot too old` ("fotoğraf çok eski") hatası tam olarak budur. Disk korunur; bedeli **okuyucu** öder.

[Şekil: ÜçBedel — üçgen: köşelerde silen, disk, okuyucu. Her köşenin yanında o bedeli seçen sistem: Windows (silen öder), Linux ve PostgreSQL (disk öder), Oracle (okuyucu öder).]

Bu seçeneklerin hiçbiri yanlış değildir. Yanlış olan, hangisinin seçildiğini bilmemektir. Okuyucu, silen ya da disk: üçünden biri mutlaka öder.

Aynı ikilem, sorunu başka bir makineye taşıyarak çözmeye çalıştığımızda da karşımıza çıkar. Uzun raporları ana veritabanının bir kopyasına (replika) yönlendirmek yaygın bir öneridir. Ama replika ya ana sunucudan gelen temizliği uygulamak için uzun sorguyu iptal eder (okuyucu öder), ya da ana sunucuya "bekle, burada hâlâ okuyan var" der ve ana sunucunun diski şişer (disk öder). **Okuyucuyu başka bir makineye taşımak, sorunu taşımaz.**

## 9. Söz vermek: "otuz gün saklıyoruz"

Bazı sistemler okuyucuları tek tek izlemek yerine bir süre ilan eder.

Telefonunuzdaki "Son Silinenler" klasörü, Gmail'in çöp kutusu ve birçok bulut servisinin "30 gün boyunca geri alabilirsiniz" vaadi bunun gündelik hâlidir. Veri öldükten sonra otuz gün yaşar, sonra okuyan olsun olmasın gömülür.

Veritabanları da aynısını yapar. Cassandra silinmiş kayıtları varsayılan olarak on gün saklar. Delta Lake, silinen dosyaları yedi gün boyunca diskte tutar. TiDB, on dakikadan eski sürümleri temizler.

İki yaklaşım arasındaki fark şudur:

- **Okuyucuyu izlemek** güvenlidir ama sınırsızdır. Kimse erken gömülmez; ama tek bir unutkan okuyucu diski süresiz şişirebilir.
- **Süre ilan etmek** sınırlıdır ama bir sözdür. Disk ne kadar büyüyeceği önceden bellidir; ama süreyi aşan okuyucu yarı yolda kalır. On günden uzun süre kapalı kalan bir Cassandra sunucusu geri döndüğünde, silinmiş veriyi geri getirebilir.

Birincisi doğruluğu garanti eder, diski riske atar. İkincisi diski garanti eder, doğruluğu sözün tutulmasına bağlar.

## 10. Sebep geçicidir, hasar kalıcıdır

Pazartesi sabahı Mehmet bilgisayarını açar, programı kapatır ve fotoğraf serbest kalır. Süpürge bir sonraki turunda üç günlük ölüyü temizler.

Ama tablo küçülmez.

PostgreSQL'de süpürge, temizlediği yeri diske geri vermez; yalnızca tablonun içinde "burası yeniden kullanılabilir" diye işaretler. Boşaltılmış bir dolap gibi: içi boştur, ama duvardan sökülmemiştir ve odada aynı yeri kaplar. Tablo 210 GB'ta kalır; tablonun tamamını okuyan sorgular boş rafları da okumaya devam eder. Yeri gerçekten geri almak, tabloyu baştan yazan ağır bir işlem gerektirir.

> **Teknik not.** PostgreSQL'de tabloyu küçültmek için `VACUUM FULL` (tabloyu kilitler) ya da `pg_repack` gibi bir araç gerekir. Şişme yalnızca tabloyla sınırlı kalmaz: indeksler de ölü kayıtlara işaret eden girdilerle dolar. Horizon yeterince uzun süre geride kalırsa, işlem numaralarının tükenmesine karşı koruma (wraparound) devreye girer ve en kötü durumda veritabanı yeni yazmaları reddeder.

Bu yüzden horizon problemleri yanıltıcıdır. Uzun okuma bittiğinde alarm susar; ama faturası haftalarca ödenmeye devam eder.

## 11. Ne yapılabilir?

Okuyucuyu izleyen bir sistemde yapılabilecek en etkili şey, okuyucuya süre vermektir. Yani bölüm 9'daki "söz verme" fikrini okuyucu tarafına uygulamak.

> **Teknik not (PostgreSQL).**
> - `idle_in_transaction_session_timeout`: açık bırakılıp boşta bekleyen oturumları belirli bir süre sonra kapatır. Mehmet'in senaryosunu doğrudan önler.
> - `transaction_timeout` (PostgreSQL 17+): bir işlemin toplam süresini sınırlar.
> - Kullanılmayan replikasyon slot'larını izlemek ve silmek. Bir replikanın sahibi gittiğinde slot kendiliğinden gitmez.
> - Horizon'u kimin tuttuğunu bulmak için `VACUUM (VERBOSE)` çıktısındaki "dead but not yet removable" satırı ve `pg_stat_activity`, `pg_replication_slots`, `pg_prepared_xacts` görünümleri.
>
> MySQL'de karşılığı, `SHOW ENGINE INNODB STATUS` çıktısındaki *History list length* değeridir. Sürekli yükseliyorsa biri temizliği bekletiyordur.

Bu önlemlerin hepsi aynı şeyi yapar: bedelin bir kısmını diskten alıp okuyucuya yükler. Temizliği bedavaya ilerletmenin bir yolu yoktur. Yalnızca bedeli kimin ödeyeceğine önceden karar vermenin bir yolu vardır.

## 12. İtirazlar ve sınırlar

1. **"Uzun okumalar meşrudur."** Doğru. Ay sonu raporları ve yedeklemeler saatler sürebilir. Buradaki argüman uzun okumanın yanlış olduğu değil, bedelinin görünmez olduğudur.
2. **Karşılaştırma kabadır.** Linux çekirdeğinde bekleme mikrosaniyeler, Cassandra'da günler sürer; birinin okuyucusu bir işlemci, ötekininki bir sunucudur. Tablo bir eşitlik değil, aynı fikrin farklı ölçeklerde tekrarıdır.
3. **Dosya sistemi örneği tam örtüşmez.** FAT32 ve NTFS'te silinen yer hemen kullanılabilir hâle gelir; gömülme kimseyi beklemez, yalnızca tesadüfe bağlıdır. Okuyucuyu bekleyen gömülme, dosya sistemlerinde Linux'taki açık dosya gibi istisnai durumlarda ortaya çıkar. Veritabanlarında ise istisna değil, kuraldır.
4. **Sayılar sürüme bağlıdır.** Varsayılan değerler ve hata mesajları sürümden sürüme değişir.

## 13. Sonuç

Bilgisayarda neredeyse hiçbir şey silindiği anda yok olmaz. Silmek iki adımdır: önce ölüm, sonra gömülme. Ölüm, silenin kararıdır ve anında olur. Gömülme ise ya tesadüfe bağlıdır, ya da ölümden önce gelmiş son okuyucunun gitmesine.

O son okuyucunun durduğu çizgi vacuum horizon'dur. Bir minimum olduğu için en yavaş okuyucunun hızında ilerler. Onu tutan biri olduğunda bedeli mutlaka birisi öder: silen, okuyan ya da disk. Hangisinin ödeyeceği bir tercihtir; tercih yapılmamışsa, varsayılan seçilmiş demektir.

Pazartesi sabahki 210 GB'lık tablo bir hata değildi. Veritabanı kendisinden isteneni yaptı: kimsenin görmediği ama birinin görebileceği bir veriyi korudu. Silmek iki adımdır; ve ikinci adımı bazen, kapağı kapatılmış bir dizüstü bilgisayar belirler.

---

## Kaynakça

### Dosya sistemleri

1. Microsoft, *FAT32 File System Specification* (FAT: General Overview of On-Disk Format), 2000.
2. Carrier, B. (2005). *File System Forensic Analysis*. Addison-Wesley. FAT ve NTFS'te silinen dosyaların izleri.
3. Linux `unlink(2)` ve `lsof(8)` kılavuz sayfaları.

### Çok sürümlü veritabanları

4. Reed, D. P. (1978). *Naming and Synchronization in a Decentralized Computer System*. Doktora tezi, MIT.
5. Bernstein, P. A. & Goodman, N. (1983). *Multiversion Concurrency Control — Theory and Algorithms*. ACM TODS 8(4).
6. Stonebraker, M. (1987). *The Design of the POSTGRES Storage System*. VLDB '87. "Vacuum cleaner" sürecinin ilk tarifi.
7. Wu, Y., Arulraj, J., Lin, J., Xian, R. & Pavlo, A. (2017). *An Empirical Evaluation of In-Memory Multi-Version Concurrency Control*. PVLDB 10(7).

### Bellek geri kazanımı

8. McKenney, P. E. & Slingwine, J. D. (1998). *Read-Copy Update: Using Execution History to Solve Concurrency Problems*. PDCS '98.

### Ürün belgeleri

9. PostgreSQL belgeleri, *Routine Vacuuming*.
10. MySQL belgeleri, *InnoDB Multi-Versioning* ve *Purge Configuration*.
11. Oracle belgeleri, *Managing Undo*; ORA-01555.
12. Apache Cassandra belgeleri, *Tombstones*; `gc_grace_seconds`.
13. TiDB belgeleri, *GC Overview*; CockroachDB belgeleri, `gc.ttlseconds`.
14. Delta Lake belgeleri, `VACUUM`.

<!-- Not: bağlantılar ve sürüm numaraları yayından önce eklenecek / doğrulanacak. -->
