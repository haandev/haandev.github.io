---
title: "Silmek iki adımdır"
date: "2026-11-??"
description: "Depolama sistemlerinde silme işlemi iki ayrı olaydan oluşur: kaydın geçersiz ilan edilmesi ve kapladığı alanın geri kazanılması. Dosya sistemlerinde ikinci olay çoğunlukla kimseyi beklemez; çok sürümlü veritabanlarında ise en eski aktif okuyucuya bağlıdır. Bu sınırın adı vacuum horizon'dur."
ogDescription: "Silme iki olaydır: geçersiz ilan etme ve geri kazanım. İkincisinin ne zaman mümkün olduğunu en eski aktif okuyucu belirler."
bodyClass: "s-vh"
dek: "Silme iki olaydır: <span class=\"a\">geçersiz ilan etme ve geri kazanım</span>. Birincisine silen karar verir; <span class=\"g\">ikincisine en eski aktif okuyucu</span>."
tags:
  - "depolama"
  - "dosya sistemi"
  - "veritabanı"
  - "mvcc"
  - "çöp toplama"
  - "sistem tasarımı"
---

<!--
TASLAK v3: yarı akademik dil. Benzetme yok; terimler ilk geçtikleri yerde tanımlanıyor.
Şekil yerleri [Şekil: ...] olarak işaretli.
-->

<div class="oz">
<span class="lbl">Öz</span>

Depolama sistemlerinde silme, tek bir işlem gibi görünse de iki ayrı olaydan oluşur: kaydın *geçersiz ilan edilmesi* ve kapladığı alanın *geri kazanılması*. Dosya sistemlerinde (FAT32, NTFS) iki olay arasındaki aralık herhangi bir okuyucuya bağlı değildir; alan anında serbest kalır, verinin fiziksel olarak ortadan kalkması üzerine yeni veri yazılmasına bağlıdır. Çok sürümlü veritabanlarında ise geri kazanım, hâlâ kullanımda olan en eski anlık görüntüye (snapshot) bağlıdır. Bu sınıra *vacuum horizon* denir. Aynı sınır farklı sistemlerde farklı adlarla bulunur; bir okuyucu onu geride tuttuğunda maliyet yazıcıya, depolamaya ya da okuyucuya yüklenir; sınır ise ya aktif okuyucular gözlenerek ya da bir saklama süresi ilan edilerek belirlenir. Kavram yeni değildir; çok sürümlü eşzamanlılık denetimi (Reed, 1978; Bernstein ve Goodman, 1983) ve bellek geri kazanımı (McKenney ve Slingwine, 1998) literatürünün ortak bir yapısıdır; dosya sistemlerinden dağıtık veritabanlarına kadar aynı biçimde tekrarlanır. Bu tekrar, [*Veri dillerinin anatomisi*](/posts/anatomy-of-data-languages-bytes-names-and-spectrum.html) yazısında savunulan bir tezin silme tarafındaki karşılığıdır: dosya sistemi ile veritabanı arasındaki fark bir tür farkı değil, baytlara verilen isimlerin derinliği ve o isimlere verilen vaadin gücü bakımından bir derece farkıdır.

</div>

## 1. Silme ve geri kazanım

Bir depolama sisteminde silme işlemi iki olaydan oluşur:

1. **Geçersiz ilan etme.** Sistem, kaydın artık geçerli olmadığını kendi meta verisine işler. Bu bir yazma işlemidir, anında gerçekleşir ve maliyeti düşüktür.
2. **Geri kazanım.** Kaydın kapladığı alan yeniden kullanıma açılır ve zamanla üzerine yeni veri yazılır. Bu olay ilkinden sonra, kimi zaman çok daha sonra gerçekleşir.

İki olay arasındaki aralıkta kayıt, sistemin mantıksal görünümünde yoktur ama fiziksel olarak hâlâ mevcuttur. Bu ayrım, [*Veri dillerinin anatomisi*](/posts/anatomy-of-data-languages-bytes-names-and-spectrum.html) yazısındaki temel ayrımın doğrudan bir sonucudur: diskte yalnızca baytlar vardır; dosya, satır, document ve mesaj, o baytlara bakan programların verdiği isimlerdir. Bu çerçevede geçersiz ilan etme, baytlara verilmiş bir ismin geri çekilmesidir; geri kazanım ise baytların kendisiyle ilgilidir. İsim anında geri çekilebilir, baytların ne zaman serbest kalacağını ise isimlendiren programın okuyucularına verdiği vaat belirler. Bu aralığın ne kadar süreceğini belirleyen kural sistemden sisteme değişir.

[Şekil: İkiOlay — bir kaydın zaman çizgisi: yazıldı → geçersiz ilan edildi → alan serbest bırakıldı → üzerine yeni veri yazıldı. Geçersiz ilan etme ile fiziksel yok oluş arasındaki aralık taralı.]

## 2. Dosya sistemlerinde silme

FAT32'de bir dizin, içerdiği dosyaların kayıtlarını tutan bir tablodur. Bir dosya silindiğinde dosya sistemi iki değişiklik yapar: dizin kaydının ilk baytını `0xE5` değeriyle işaretler (Microsoft, 2000) ve dosyanın küme zincirindeki girdileri FAT tablosunda sıfırlayarak serbest bırakır. `0xE5` işareti spesifikasyonda tanımlıdır; zincirin sıfırlanması ise Microsoft'un uygulamasının davranışıdır (Carrier, 2005). Dosyanın içeriği değiştirilmez.

NTFS'te her dosyanın Master File Table (MFT) içinde bir kaydı vardır. Silme işlemi bu kaydın "kullanımda" bayrağını kaldırır ve dosyanın kümelerini `$Bitmap` içinde serbest olarak işaretler. İçerik yine diskte kalır.

Adli bilişimde silinen dosyaların kurtarılabilmesi bu ayrıma dayanır: kurtarma araçları geçersiz ilan edilmiş meta veri kayıtlarını okur ve henüz üzerine yazılmamış kümelerden içeriği yeniden oluşturur (Carrier, 2005). İçeriğin fiziksel olarak ortadan kalkması, ilgili kümelere yeni veri yazılmasıyla gerçekleşir. Önceki yazıda veri kurtarma için yapılan gözlem burada da geçerlidir: "dosya silindi" ifadesi, bayt düzeyinde "isimlendirme programı bu baytlara artık bir isim vermiyor" anlamına gelir; baytlar yerinde durur.

SSD'lerde süreç bir katman daha içerir. İşletim sistemi TRIM komutuyla serbest kalan blokları depolama birimine bildirir; birimin denetleyicisi bu blokları kendi çöp toplama süreciyle silinmiş duruma getirir. TRIM uygulanmış bloklardan veri kurtarmak, denetleyiciye ve zamanlamaya bağlı olarak çoğunlukla imkânsız ya da çok sınırlıdır; on altı sürücü üzerinde yapılan bir ölçümde TRIM etkinken kurtarılabilen blok oranı sürücüye göre yüzde 0 ile yüzde 27 arasında değişmiştir (King ve Vidas, 2011).

Bu sistemlerin ortak özelliği şudur: **alan, geçersiz ilan edildiği anda yeniden kullanılabilir hâle gelir.** Geri kazanım hiçbir okuyucuyu beklemez. Verinin ne zaman fiziksel olarak ortadan kalkacağı, yalnızca o alana ne zaman yeni veri yazılacağına bağlıdır.

## 3. Okuyucuya bağlı geri kazanım

Bu kuralın dosya sistemlerinde de bir istisnası vardır. POSIX semantiğinde bir dosyanın silinmesi (`unlink`), dizin girdisini kaldırır ve dosyanın bağlantı sayısını azaltır. Dosyanın inode'u ve veri blokları ise ancak bağlantı sayısı sıfıra düştüğünde **ve** dosyayı açık tutan son süreç tanıtıcıyı kapattığında serbest bırakılır.

Sonuç olarak Linux'ta açık bir dosya silindiğinde dosya dizinden kaybolur, ancak kapladığı alan serbest kalmaz. Bu durum sistem yönetiminde bilinen bir tutarsızlığa yol açar: `df` diski dolu gösterirken `du` ile hesaplanan toplam çok daha düşüktür. Aradaki fark, silinmiş ama hâlâ bir süreç tarafından açık tutulan dosyalardır ve `lsof +L1` ile listelenebilir.

Windows aynı durumda farklı bir kural uygular: dosyayı açık tutan tanıtıcılardan herhangi biri `FILE_SHARE_DELETE` izni vermemişse silme işlemi paylaşım ihlali (`ERROR_SHARING_VIOLATION`) ile reddedilir. Bütün tanıtıcılar bu izni vermişse silme kabul edilir, ancak dosya yalnızca "silinmeyi bekliyor" olarak işaretlenir ve son tanıtıcı kapandığında kaldırılır.

Linux silme işlemini kabul eder ve geri kazanımı okuyucunun bitmesine erteler; Windows ise silme işlemini okuyucu bitene kadar engeller. Her iki durumda da **geri kazanım artık bir okuyucuya bağlıdır.** Dosya sistemlerinde istisna olan bu durum, çok sürümlü veritabanlarında genel kuraldır. Önceki yazıdaki spektrum açısından bu fark beklenen bir sonuçtur: dosya sistemi okuyucularına zayıf bir tutarlılık vaadi verir ve bu nedenle onları beklemek zorunda değildir; veritabanı ise her okuyucuya tutarlı bir görüntü vaat eder ve bu vaadin bedeli, geri kazanımın okuyucuya bağlanmasıdır.

## 4. Çok sürümlü eşzamanlılık denetimi

Çok sürümlü eşzamanlılık denetimi (MVCC), okuma ve yazma işlemlerinin birbirini kilitlemeden çalışmasını sağlayan bir yöntemdir (Reed, 1978; Bernstein ve Goodman, 1983). Bir transaction başladığında veritabanının o anki tutarlı durumunun bir **anlık görüntüsünü** (snapshot) alır ve bütün okumalarını bu görüntü üzerinden yapar. Bir kayıt güncellendiğinde ya da silindiğinde veritabanı mevcut sürümün üzerine yazmaz; yeni bir sürüm oluşturur ve eski sürümü korur. Güncellemeden önce alınmış bir anlık görüntü, kaydı eski hâliyle görmeye devam etmek zorundadır.

Bu nedenle MVCC kullanan bir veritabanında her güncelleme ve silme, geçersiz ilan edilmiş ancak henüz geri kazanılamayan bir sürüm bırakır. PostgreSQL bu sürümlere *dead tuple*, InnoDB *undo kaydı*, Cassandra *tombstone* der. Bu sürümleri temizleyen süreç PostgreSQL'de **vacuum** olarak adlandırılır.

Terimin kökeni Stonebraker'ın (1987) POSTGRES depolama sistemi tasarımına uzanır. Bu tasarımda kayıtların üzerine yazılmıyor, eski sürümler "vacuum cleaner" adlı bir süreç tarafından arşiv depolamaya taşınıyordu. Amaç geçmişi silmek değil, geçmiş sürümler üzerinde sorgulama (*time travel*) yapabilmekti. PostgreSQL 6.2 (1997) ile bu özellik performans ve depolama maliyeti gerekçesiyle kaldırıldı ve vacuum, eski sürümleri arşive taşımak yerine alanlarını geri kazanan bir sürece dönüştü.

Aynı ayrım, önceki yazıda özyinelemeli yorum yığınının örneği olarak kullanılan SQLite'ta iki katmanda birden görülür. SQLite veritabanı, dosya sisteminin gözünden tek bir dosyadır; içeriden bakıldığında ise tablolar ve satırlar içerir. SQLite'ta bir satır silindiğinde satırın baytları dosyadan kaldırılmaz; ilgili alan sayfa içinde boş olarak işaretlenir, tamamen boşalan sayfalar ise dosya içindeki serbest sayfa listesine (freelist) eklenir. Yapı, FAT32'nin dizin kaydını işaretleyip kümeleri serbest bırakmasıyla aynıdır; yalnızca bir katman yukarıda, bir dosyanın içinde gerçekleşir. `PRAGMA secure_delete` etkinleştirilmedikçe silinen içerik dosyada kalır ve dosya boyutu ancak SQLite'ın kendi `VACUUM` komutu dosyayı yeniden yazdığında küçülür.

## 5. Vacuum horizon

Vacuum her ölü sürümü temizleyemez; yalnızca hiçbir aktif anlık görüntünün artık göremeyeceği sürümleri temizleyebilir. Bu sınıra **vacuum horizon** denir. Tanım iki bileşenden oluşur:

- **Vacuum**, ölü sürümleri bulup alanlarını geri kazanan *işlemdir*.
- **Horizon**, bu işlemin hangi noktaya kadar yapılabileceğini belirleyen *sınırdır*: bu çizgiden daha eski sürümleri hiçbir aktif okuyucu göremez ve göremeyecektir.

İki bileşenin ayrılması pratik açıdan önemlidir. Vacuum'un yetersiz çalışması bir yapılandırma sorunudur; çalışma sıklığı, işçi sayısı ve maliyet sınırlarıyla ilgilidir. Horizon'un ilerlememesi ise bir yapılandırma sorunu değildir: vacuum ne kadar sık çalışırsa çalışsın, horizon'un ilerisindeki hiçbir sürümü temizleyemez.

Horizon biçimsel olarak şöyle tanımlanabilir:

```
horizon = min { s : s aktif bir okuyucunun anlık görüntüsü }
```

Tanımın belirleyici unsuru `min` işlecidir. Horizon, okuyucuların bir ortalaması değil, minimumudur. Dolayısıyla tek bir uzun süreli okuyucu, diğer okuyucuların süresinden bağımsız olarak horizon'u belirler. Sistemdeki okuyucuların büyük çoğunluğunun milisaniyeler içinde tamamlanması, bu sonucu değiştirmez.

[Şekil: MinimumÇizgisi — yatay zaman ekseninde çok sayıda kısa okuyucu aralığı ve bir uzun aralık. Horizon çizgisi uzun aralığın başlangıcında; sağında geri kazanılamayan sürümler.]

## 6. Örnek: boşta bekleyen bir transaction

Bir analist cuma günü saat 18:40'ta bir rapor için veritabanına bağlanır, bir transaction başlatır, tek bir `SELECT` sorgusu çalıştırır ve istemciyi kapatmadan çalışmayı bırakır. Oturum PostgreSQL'de `idle in transaction` durumunda kalır. Transaction herhangi bir kilit tutmaz, yazma yapmaz ve kaynak tüketmez; ancak anlık görüntüsü aktif olduğu için horizon'u 18:40'ta sabitler.

Hafta sonu boyunca `orders` tablosundaki her güncelleme yeni bir sürüm oluşturur ve eski sürümü bırakır. Autovacuum düzenli olarak çalışır, ancak bu sürümlerin hiçbirini temizleyemez; çünkü 18:40'ta alınmış bir anlık görüntü onları teorik olarak hâlâ görebilir. Pazartesi sabahı tablo 30 GB'tan 210 GB'a çıkmıştır; satır sayısı ise neredeyse değişmemiştir.

`VACUUM (VERBOSE)` çıktısı (PostgreSQL 15 ve sonrası) bu durumu doğrudan gösterir:

```
tuples: 0 removed, 1204117 remain, 1198320 are dead but not yet removable
removable cutoff: 88213410, which was 4120331 XIDs old when operation ended
```

"Dead but not yet removable" ifadesi, temizlenecek sürümlerin tespit edildiğini ancak horizon nedeniyle temizlenemediğini belirtir.

## 7. Farklı sistemlerde aynı sınır

Aynı yapı, bir kaydın birden fazla sürümünü aynı anda tutan ya da paylaşılan bir veriyi okuyucular varken serbest bırakmak zorunda olan her sistemde bulunur. Sistemlere ve çalışmalara göre farklı adlar alır: PostgreSQL'de *xmin horizon*, TiDB'de *GC safe point*, Hekaton'da en eski aktif transaction'a göre yürütülen çöp toplama (Diaconu ve ark., 2013); bellek içi MVCC sistemleri üzerine çalışmalarda ise çoğunlukla *low watermark* (Böttcher ve ark., 2019).

| Sistem | Terim | Okuyucu olarak sayılanlar |
|---|---|---|
| Linux (POSIX) | açık dosya tanıtıcısı | Dosyayı açık tutan süreçler |
| SQLite (WAL kipi) | checkpoint | WAL dosyasındaki kayıtlara ihtiyaç duyan açık okuma transaction'ları |
| Kafka | log retention (`retention.ms`) | Hiçbiri: süre dolduğunda segment, tüketicilerin konumundan bağımsız olarak silinir |
| PostgreSQL | xmin horizon, *removable cutoff* | Açık transaction'lar, `hot_standby_feedback` gönderen standby'lar, replication slot'lar, hazırlanmış transaction'lar |
| MySQL InnoDB | purge, *read view* | Açık read view'lar |
| Oracle | undo retention | Uzun süreli sorgular |
| TiDB | GC safe point | 6.1'den itibaren açık transaction'lar, en fazla `tidb_gc_max_wait_time` süresince; öncesinde yalnızca `tidb_gc_life_time` süresi |
| CockroachDB | GC threshold, `gc.ttlseconds` | TTL süresi içindeki zaman damgaları; yedekleme ve changefeed'ler için *protected timestamp* |
| Cassandra | tombstone, `gc_grace_seconds` | Silme işlemini henüz almamış replikalar |
| Delta Lake, Iceberg | `VACUUM`, snapshot expiry | Geçmiş sürümleri okuyan sorgular ve eşzamanlı yazıcılar |
| Linux çekirdeği (RCU) | grace period | Read-side kritik bölgedeki işlemciler |
| Kilitsiz veri yapıları | epoch, hazard pointer | Belleğe referans tutan thread'ler |

Tablodaki sistemler, önceki yazıda dosya sistemi, veritabanı ve mesaj kuyruğu adlarıyla ayrı kategorilere yerleştirilen ama aynı baytlar üzerinde çalışan isimlendirme programlarıdır. Silme kuralları da bu nedenle ayrı ayrı icat edilmiş mekanizmalar değil, aynı sorunun farklı derinliklerdeki çözümleridir. Tüm sistemlerde sorulan soru aynıdır: en eski aktif okuyucu hangisidir? Sistemler arasındaki fark, neyin okuyucu olarak sayıldığındadır. Pratikteki horizon sorunlarının önemli bir kısmı, işletenin okuyucu olarak tanımadığı bileşenlerden kaynaklanır: tüketicisi kaldırılmış bir replication slot, iki aşamalı commit'in ortasında bırakılmış bir `PREPARE TRANSACTION` ya da uzun süreli bir yedekleme işlemi. Bunların hiçbiri `pg_stat_activity` içinde uzun süreli bir sorgu olarak görünmez.

Cassandra'da yapı farklı bir biçim alır. Tombstone'un geri kazanımını geciktiren bir okuyucu değil, silme işlemini henüz almamış bir **replikadır**. Tombstone, bütün replikalar onarım (repair) ile eşitlenmeden kaldırılırsa, silme işlemini almamış replika eski veriyi hâlâ taşıdığı için bir sonraki eşitlemede silinmiş kayıt yeniden görünür hâle gelir. Literatürde bu durum *data resurrection* olarak adlandırılır. Yapı yine aynıdır: geçersiz ilan edilmiş bir kayıt, bu bilgiyi henüz almamış son taraf da onu alana kadar geri kazanılamaz.

## 8. Maliyetin dağılımı

Bir okuyucu horizon'u geride tuttuğunda sistemin üç seçeneği vardır ve her biri maliyeti farklı bir tarafa yükler.

**Silme işlemini engellemek.** Okuyucu bitene kadar silme kabul edilmez. Windows'un açık dosyalara uyguladığı kural budur. Okuyucunun tutarlılığı ve depolama alanı korunur; maliyeti **yazıcı** üstlenir.

**Geri kazanımı ertelemek.** Silme kabul edilir, ancak alan okuyucu bitene kadar geri kazanılmaz. Linux'un açık dosyalara, PostgreSQL ve InnoDB'nin eski sürümlere uyguladığı kural budur. Okuyucu ve yazıcı etkilenmez; maliyeti **depolama** üstlenir.

**Okuyucuyu sonlandırmak.** Belirli bir eşikten sonra eski sürümler okuyucuya rağmen geri kazanılır ve bu sürümlere ihtiyaç duyan okuma hata ile sonlanır. Oracle'da undo alanı yetersiz kaldığında alınan `ORA-01555: snapshot too old` hatası ve TiDB'de GC safe point'in gerisinde kalan bir transaction'ın aldığı `GC life time is shorter than transaction duration` hatası bu kuralın sonucudur. Depolama ve yazıcı korunur; maliyeti **okuyucu** üstlenir.

[Şekil: ÜçMaliyet — üç köşeli şema: yazıcı, depolama, okuyucu. Her köşede ilgili kural ve örnek sistem: Windows (yazıcı), Linux, PostgreSQL ve InnoDB (depolama), Oracle varsayılanı ve TiDB (okuyucu).]

Oracle bu seçimi bir yapılandırma parametresi olarak sunar. Undo tablespace'inde `RETENTION GUARANTEE` etkinleştirildiğinde, `UNDO_RETENTION` süresi içindeki undo verisinin üzerine yazılmaz; undo alanı dolduğunda ise yeni DML işlemleri hata almaya başlar (çoğunlukla `ORA-30036`). Böylece maliyet okuyucudan yazıcıya aktarılır. Üç seçenek aynı sistem içinde birbirinin alternatifidir: maliyet ortadan kaldırılamaz, yalnızca bir taraftan diğerine aktarılabilir.

Aynı ikilem, uzun süreli okumaların bir replikaya yönlendirildiği durumda da ortaya çıkar. PostgreSQL'de `hot_standby_feedback` kapalıyken standby, primary'den gelen bir temizlik kaydı hâlâ çalışan bir sorgunun ihtiyaç duyduğu sürümleri kaldıracaksa, `max_standby_streaming_delay` süresi kadar bekler ve süre dolduğunda sorguyu iptal eder (`canceling statement due to conflict with recovery`); maliyeti okuyucu üstlenir. Parametre açıkken standby kendi en eski anlık görüntüsünü primary'ye bildirir ve primary'nin horizon'unu geride tutar; maliyeti primary'nin depolaması üstlenir. Okuyucunun başka bir sunucuya taşınması, horizon'u taşımaz.

## 9. Gözlenen ve ilan edilen horizon

Sistemler, horizon'u belirleme biçimlerine göre de iki gruba ayrılır.

**Gözlenen horizon.** Sistem aktif okuyucuları izler ve horizon'u gerçekte var olan en eski okuyucudan hesaplar. PostgreSQL, InnoDB ve RCU bu gruptadır. Bu yaklaşım doğruluğu garanti eder: hiçbir okuyucu, kendisinden önce geri kazanılmış bir sürümle karşılaşmaz. Buna karşılık depolama üzerinde bir üst sınır yoktur; tek bir okuyucu horizon'u süresiz olarak geride tutabilir.

**İlan edilen horizon.** Sistem okuyucuları izlemez; bunun yerine sabit bir saklama süresi tanımlar. Cassandra'nın `gc_grace_seconds` değeri (varsayılan 864000 saniye, yani 10 gün), Delta Lake'in `VACUUM` için varsayılan 7 günlük saklama süresi (`delta.deletedFileRetentionDuration`), Iceberg'in varsayılan 5 günlük snapshot yaşı (`history.expire.max-snapshot-age-ms`) ve Kafka'nın varsayılan 7 günlük `retention.ms` değeri bu gruptadır. Bu yaklaşım depolama üzerinde öngörülebilir bir üst sınır sağlar, ancak doğruluğu tüm okuyucuların ve replikaların bu süreye uymasına bağlar. `gc_grace_seconds` süresinden uzun süre devre dışı kalan ve onarılmayan bir Cassandra replikası silinmiş verinin yeniden görünmesine yol açabilir. Saklama süresinin altında bir değerle çalıştırılan Delta Lake `VACUUM` işlemi, eski dosyaları okuyan sorguları ya da eşzamanlı yazıcıları bozabilir; Delta Lake bu nedenle varsayılan olarak bu tür bir çalıştırmayı reddeder (`spark.databricks.delta.retentionDurationCheck.enabled`).

**Karma yaklaşım.** Bazı sistemler iki yaklaşımı birleştirir: okuyucuları gözler, ama bekleme süresine bir üst sınır koyar. TiDB 6.1 sürümünden önce açık transaction'lar GC safe point'i hiç etkilemiyordu; horizon yalnızca ilan edilen `tidb_gc_life_time` süresiyle (varsayılan ve en düşük değer 10 dakika) belirleniyordu. 6.1 ile birlikte açık transaction'lar safe point'i geride tutabilir hâle geldi, ancak en fazla `tidb_gc_max_wait_time` süresi kadar; bu süre aşıldığında safe point zorla ilerletilir. Gözlenen horizon üst sınıra kadar doğruluğu, üst sınır ise depolamayı korur. Sınırı aşan okuyucu, ilan edilen horizon'daki gibi maliyeti üstlenir.

Bu ayrım, maliyetin dağılımına ilişkin seçimin mimari düzeydeki karşılığıdır. Gözlenen horizon maliyeti depolamaya, ilan edilen horizon ise sözleşmeye uymayan okuyucuya yükler.

## 10. Üç kutup, üç silme kuralı

[*Veri dillerinin anatomisi*](/posts/anatomy-of-data-languages-bytes-names-and-spectrum.html) yazısı, sistem kategorilerini kesin sınıflar olarak değil, gerçek sistemlerin arasında konumlandığı üç ideal kutup olarak tanımlıyordu: isimlendirmeyi asgaride tutan ideal dosya sistemi, isimlendirmeyi azamiye çıkaran ve katı tutarlılık vaat eden ideal veritabanı ve isimlendirmeyi zamana bağlayan ideal mesaj kuyruğu. Geri kazanım kuralları bu üç kutupla birebir örtüşür.

- **İdeal dosya sistemi okuyucuyu beklemez.** Okuyuculara verilen vaat zayıftır; alan geçersiz ilan edildiği anda serbest kalır. FAT32 ve NTFS bu kutba yakındır.
- **İdeal veritabanı okuyucuyu gözler.** Her okuyucuya tutarlı bir anlık görüntü vaat edildiği için horizon gerçek okuyuculardan hesaplanır. PostgreSQL ve InnoDB bu kutba yakındır.
- **İdeal mesaj kuyruğu süre ilan eder.** Verinin anlamı üretim ile tüketim arasındaki aralıkta bulunduğu için geri kazanım okuyucuya değil zamana bağlanır. Kafka'da `retention.ms` süresi dolan segmentler, tüketiciler onları okumuş olsun olmasın silinir; geride kalan bir tüketici, konumunun artık mevcut olmadığını bildiren bir hatayla (`OFFSET_OUT_OF_RANGE`) karşılaşır ve `auto.offset.reset` ayarına göre en eski ya da en yeni kayıttan devam eder.

Gerçek sistemler bu kutupların arasında durur ve geri kazanım kuralları da konumlarını izler. Linux'un açık dosyalar için okuyucuyu beklemesi, dosya sistemi kutbundan veritabanına doğru bir adımdır. Cassandra ve Delta Lake, veritabanı olarak adlandırılmalarına rağmen geri kazanımda mesaj kuyruğu kutbunun kuralını, yani süre ilan etmeyi uygular. TiDB'nin 6.1 sürümündeki değişikliği, aynı sistemin bu kutuptan veritabanı kutbuna doğru kaydığı bir adım olarak okunabilir. SQLite'ın WAL kipi ise tek bir dosya içinde veritabanı kutbunun kuralını uygular: açık bir okuma transaction'ı checkpoint'in WAL dosyasını sıfırlamasını engeller ve sürekli okuyucuların bulunduğu bir sistemde WAL dosyası sınırsız büyüyebilir.

Önceki yazıda "Bu bir veritabanı mıdır?" sorusunun yerine "baytlara ne derinlikte isim veriyor ve o isimlere ne vaat ediyor?" sorusu önerilmişti. Geri kazanım, bu sorunun ikinci yarısının en somut ölçüsüdür: bir sistemin okuyucularına ne vaat ettiği, silinmiş baytları ne zaman bırakabileceğini belirler.

[Şekil: ÜçKutup — önceki yazıdaki üç kutuplu spektrum şeması; köşelerde "beklemez", "gözler", "süre ilan eder"; içeride FAT32, NTFS, Linux, SQLite, PostgreSQL, InnoDB, Cassandra, Delta Lake, TiDB ve Kafka'nın konumları.]

## 11. Geçici neden, kalıcı etki

Horizon'u geride tutan transaction kapandığında horizon ilerler ve bir sonraki vacuum geçişi biriken ölü sürümleri temizler. Ancak bu, tablonun diskte kapladığı alanı azaltmaz.

PostgreSQL'de vacuum, geri kazandığı alanı işletim sistemine iade etmez; yalnızca tablonun sayfaları içinde yeniden kullanılabilir olarak işaretler. Dosya boyutu yalnızca tablonun sonundaki tamamen boş sayfalar için kısalabilir. Önceki örnekteki tablo, ölü sürümler temizlendikten sonra da yaklaşık 210 GB yer kaplamaya devam eder ve sıralı taramalar bu sayfaları okumayı sürdürür. Alanın gerçekten geri alınması `VACUUM FULL` (tabloyu yeniden yazar ve işlem boyunca `ACCESS EXCLUSIVE` kilit tutar) ya da `pg_repack` gibi bir araç gerektirir. `pg_repack` tabloyu çevrim içi yeniden yazar ve özel kilidi yalnızca başta ve sonda kısa süreliğine alır; buna karşılık tablo ve indeks boyutunun yaklaşık iki katı kadar boş disk alanına ihtiyaç duyar.

Etki tabloyla da sınırlı değildir:

- **İndeksler** ölü sürümlere işaret eden girdiler nedeniyle büyür ve aynı sorgu için daha fazla sayfa okunur.
- **HOT (heap-only tuple) güncellemeleri** azalır. Sayfalarda boş alan kalmadığında güncellemeler indeksleri de yeniden yazmak zorunda kalır ve büyüme hızlanır.
- **Dondurma** (freezing) de aynı horizon'a bağlıdır. Horizon yeterince uzun süre ilerlemezse transaction ID'lerin sarmalanmasına (wraparound) karşı koruma mekanizmaları devreye girer. Önce agresif dondurma geçişleri başlar ve uyarılar üretilir; en kötü durumda veritabanı yeni transaction ID gerektiren komutları reddeder. Salt okuma sorguları çalışmaya devam eder, ancak yazma işlemleri durur.

Bu nedenle horizon'un izlenmesi, uzun süreli sorguların izlenmesiyle eşdeğer değildir. Uzun süreli okuma sona erdiğinde nedeni ortadan kalkar, ancak etkisi devam eder.

## 12. Teşhis ve önlem

PostgreSQL'de horizon'u geride tutan bileşeni bulmak için okuyucu olarak sayılan her kaynağın ayrı ayrı incelenmesi gerekir:

```sql
-- Açık transaction'lar
SELECT pid, usename, state, xact_start, age(backend_xmin) AS xmin_age
FROM pg_stat_activity
WHERE backend_xmin IS NOT NULL
ORDER BY age(backend_xmin) DESC;

-- Replication slot'lar (aktif olmayanlar dahil)
SELECT slot_name, active, xmin, catalog_xmin
FROM pg_replication_slots;

-- Hazırlanmış transaction'lar
SELECT gid, prepared, owner FROM pg_prepared_xacts;

-- Feedback gönderen standby'lar
SELECT application_name, backend_xmin FROM pg_stat_replication;
```

InnoDB'de karşılık gelen gösterge, `SHOW ENGINE INNODB STATUS` çıktısındaki *History list length* değeridir. Bu değerin sürekli artması, purge sürecinin bir read view tarafından geride tutulduğunu gösterir.

Gözlenen horizon kullanan bir sistemde temel önlem, okuyucuların süresini sınırlamaktır. Bu, ilan edilen horizon yaklaşımının okuyucu tarafına uygulanmasıdır. PostgreSQL'de ilgili parametreler şunlardır:

- `idle_in_transaction_session_timeout`: boşta bekleyen açık transaction'ları belirli bir süre sonra sonlandırır. Boşta bekleyen bir transaction'ın horizon'u saatlerce sabitlemesini doğrudan önler.
- `transaction_timeout` (PostgreSQL 17 ve sonrası): bir transaction'ın toplam süresini sınırlar.
- `statement_timeout`: tek bir ifadenin süresini sınırlar; boşta bekleyen transaction'ları kapsamaz.

Bunlara ek olarak, tüketicisi kaldırılmış replication slot'ların izlenmesi ve silinmesi gerekir; slot'lar tüketicileriyle birlikte otomatik olarak kaldırılmaz.

Bu önlemlerin tümü, maliyetin bir kısmını depolamadan okuyucuya aktarır. Maliyet burada da ortadan kaldırılamaz, yalnızca hangi tarafın üstleneceği önceden belirlenebilir.

## 13. İtirazlar ve sınırlar

1. **Uzun süreli okumalar meşrudur.** Ay sonu raporları, yedeklemeler ve mantıksal replikasyonun ilk kopyalama aşaması saatler sürebilir. Sorun uzun süreli okumaların kendisi değil, depolama üzerindeki etkilerinin çoğunlukla görünmez kalmasıdır.
2. **Sistemler arası karşılaştırma ölçek farklarını gizler.** RCU'da grace period mikrosaniyeler, Cassandra'da `gc_grace_seconds` günler mertebesindedir; birinde okuyucu bir işlemci, diğerinde bir replikadır. Benzerlik bir eşdeğerlik değil, aynı yapının farklı ölçeklerde tekrarıdır.
3. **Dosya sistemleri yapıya kısmen uyar.** FAT32 ve NTFS'te geri kazanım hiçbir okuyucuya bağlı değildir; verinin fiziksel olarak ortadan kalkması yalnızca üzerine yazılmaya bağlıdır. Okuyucuya bağlı geri kazanım, dosya sistemlerinde POSIX `unlink` semantiği gibi sınırlı durumlarda ortaya çıkar. Dosya sistemleri bu nedenle veritabanlarının bir eşdeğeri değil, iki olay arasındaki ayrımın en yalın örneğidir. Bu kısmi uyum, önceki yazıdaki spektrum çerçevesiyle tutarlıdır: dosya sistemleri, okuyucularına en az vaat eden kutba yakın durdukları için okuyucuya bağlı geri kazanımı en az uygulayan sistemlerdir.
4. **Kutuplarla örtüşme bir türetme değildir.** Geri kazanım kurallarının üç kutupla örtüşmesi, kuralların kutuplardan türetilebileceği anlamına gelmez. Önceki yazının sınırlar bölümünde belirtildiği gibi, isimlendirme çerçevesi performans karakteristiklerini açıklamaz; aynı kutba yakın iki sistem, depolama yapılarına bağlı olarak çok farklı geri kazanım maliyetlerine sahip olabilir.
5. **Varsayılan değerler sürüme bağlıdır.** Parametre adları, varsayılan değerler ve hata mesajları sürümden sürüme değişebilir; verilen değerler Ekim 2026 itibarıyla geçerli belgelere dayanır.

## 14. Sonuç

Depolama sistemlerinde silme, kaydın geçersiz ilan edilmesi ve alanının geri kazanılması olmak üzere iki ayrı olaydan oluşur. Dosya sistemlerinde ikinci olay çoğunlukla hiçbir okuyucuya bağlı değildir. Çok sürümlü veritabanlarında ise hâlâ kullanımda olan en eski anlık görüntüye bağlıdır ve bu sınır vacuum horizon olarak adlandırılır.

Horizon bir minimum olduğu için en uzun süreli okuyucu tarafından belirlenir. Bir okuyucu horizon'u geride tuttuğunda maliyet yazıcıya, depolamaya ya da okuyucuya yüklenir. Hangi tarafın üstleneceği bir tasarım kararıdır; karar açıkça verilmemişse sistemin varsayılanı geçerli olur.

Önceki yazı, diskte yalnızca baytlar bulunduğunu ve dosya, satır ve mesajın o baytlara verilen isimler olduğunu savunuyordu. Silme bu tezin öbür yüzüdür: bir ismi geri çekmek anlıktır; baytları serbest bırakmak ise isimlendiren programın okuyucularına verdiği vaade bağlıdır. Dosya sistemi ile veritabanı arasındaki derece farkı, en açık biçimde bu vaatte görülür.

Silme iki olaydır: birincisine silen karar verir, ikincisine en eski aktif okuyucu.

---

## Kaynakça

### Bu blogda

- [*Veri dillerinin anatomisi: bayt, isim ve spektrum*](/posts/anatomy-of-data-languages-bytes-names-and-spectrum.html), 8 Ağustos 2026.

### Dosya sistemleri

- Microsoft Corporation (2000). *Microsoft Extensible Firmware Initiative FAT32 File System Specification*, sürüm 1.03, 6 Aralık 2000.
- Carrier, B. (2005). *File System Forensic Analysis*. Addison-Wesley. ISBN 978-0-321-26817-4.
- King, C. ve Vidas, T. (2011). *Empirical Analysis of Solid State Disk Data Retention When Used with Contemporary Operating Systems*. Digital Investigation 8, S111–S117. DFRWS 2011.
- IEEE Std 1003.1 (POSIX), `unlink()`; Linux `unlink(2)` ve `lsof(8)` kılavuz sayfaları.

### Çok sürümlü eşzamanlılık denetimi

- Reed, D. P. (1978). *Naming and Synchronization in a Decentralized Computer System*. Doktora tezi, MIT. MIT/LCS/TR-205.
- Bernstein, P. A. ve Goodman, N. (1983). *Multiversion Concurrency Control — Theory and Algorithms*. ACM TODS 8(4), 465–483. [doi:10.1145/319996.319998](https://doi.org/10.1145/319996.319998)
- Stonebraker, M. (1987). *The Design of the POSTGRES Storage System*. VLDB '87, 289–300. [Teknik rapor UCB/ERL M87/6](https://dsf.berkeley.edu/papers/ERL-M87-06.pdf)
- Wu, Y., Arulraj, J., Lin, J., Xian, R. ve Pavlo, A. (2017). *An Empirical Evaluation of In-Memory Multi-Version Concurrency Control*. PVLDB 10(7), 781–792. [doi:10.14778/3067421.3067427](https://doi.org/10.14778/3067421.3067427)
- Diaconu, C. ve ark. (2013). *Hekaton: SQL Server's Memory-Optimized OLTP Engine*. SIGMOD '13. [doi:10.1145/2463676.2463710](https://doi.org/10.1145/2463676.2463710)
- Böttcher, J., Leis, V., Neumann, T. ve Kemper, A. (2019). *Scalable Garbage Collection for In-Memory MVCC Systems*. PVLDB 13(2). [doi:10.14778/3364324.3364328](https://doi.org/10.14778/3364324.3364328)

### Bellek geri kazanımı

- McKenney, P. E. ve Slingwine, J. D. (1998). *Read-Copy Update: Using Execution History to Solve Concurrency Problems*. PDCS '98, 509–518.
- Michael, M. M. (2004). *Hazard Pointers: Safe Memory Reclamation for Lock-Free Objects*. IEEE TPDS 15(6), 491–504. [doi:10.1109/TPDS.2004.8](https://doi.org/10.1109/TPDS.2004.8)
- Fraser, K. (2003). *Practical Lock-Freedom*. Doktora tezi, University of Cambridge. Teknik rapor UCAM-CL-TR-579, Şubat 2004. [doi:10.48456/tr-579](https://doi.org/10.48456/tr-579)

### Ürün belgeleri

- PostgreSQL belgeleri, *Routine Vacuuming*; `hot_standby_feedback`, `idle_in_transaction_session_timeout`, `transaction_timeout`.
- MySQL belgeleri, *InnoDB Multi-Versioning*; *Purge Configuration*.
- Oracle belgeleri, *Managing Undo*; `UNDO_RETENTION`, `RETENTION GUARANTEE`; ORA-01555, ORA-30036.
- Apache Cassandra belgeleri, *Compaction*; *Tombstones*; `gc_grace_seconds`.
- TiDB belgeleri, *GC Overview* ve *GC Configuration*; `tidb_gc_life_time`, `tidb_gc_max_wait_time`.
- CockroachDB belgeleri, *Configure Replication Zones*; `gc.ttlseconds`.
- Delta Lake belgeleri, *Remove files no longer referenced by a Delta table*.
- SQLite belgeleri, *Write-Ahead Logging* (checkpoint starvation); *PRAGMA secure_delete*; *VACUUM*.
- Apache Kafka belgeleri, *Topic Configs*; `retention.ms`. *Consumer Configs*; `auto.offset.reset`.
- Apache Iceberg belgeleri, *Configuration*; `history.expire.max-snapshot-age-ms`.

<!-- Not: iddialar ve künyeler Ekim 2026'da web aramasıyla kontrol edildi; ürün belgelerine doğrudan bağlantılar yayından önce eklenecek. -->
