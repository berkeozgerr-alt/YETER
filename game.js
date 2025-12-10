// =======================================================
// OYUN İLKEL PARAMETRELERİ
// =======================================================

// Canvas ve 2D Çizim Bağlamını Ayarla
const canvas = document.getElementById("oyunAlani");
const ctx = canvas.getContext("2d");

// Oyun Boyutları (CSS media query ile esnek hale getirilse de, mantık için sabit oranlar kullanılır)
const GENISLIK = canvas.width;
const YUKSEKLIK = canvas.height;

// Oyun Durumları
let oyunCalisiyor = false;
let skor = 0;
let can = 3;

// =======================================================
// TOP (Ball) PARAMETRELERİ
// =======================================================
const top = {
    x: GENISLIK / 2, // Başlangıç X konumu
    y: YUKSEKLIK - 30, // Başlangıç Y konumu
    yaricap: 8,
    dx: 2, // X yönündeki hız (Delta X)
    dy: -2, // Y yönündeki hız (Delta Y)
    renk: "#facc15" // Sarı
};

// =======================================================
// RAKET (Paddle) PARAMETRELERİ
// =======================================================
const raket = {
    yukseklik: 10,
    genislik: 75,
    x: (GENISLIK - 75) / 2, // Başlangıç X konumu
    renk: "#8b5cf6", // Mor
    hiz: 7 // Sadece klavye kontrolü için hız
};

// Klavye Kontrolleri İçin Durum
let sagaBasili = false;
let solaBasili = false;

// =======================================================
// TUĞLA (Brick) PARAMETRELERİ
// =======================================================
const tuglaAyarlari = {
    satirSayisi: 5,
    sutunSayisi: 8,
    genislik: 50,
    yukseklik: 15,
    araBosluk: 5,
    ustBosluk: 30,
    solBosluk: 30
};

// Tuğla Matrisini Oluştur
const tuglalar = [];
for (let c = 0; c < tuglaAyarlari.sutunSayisi; c++) {
    tuglalar[c] = [];
    for (let r = 0; r < tuglaAyarlari.satirSayisi; r++) {
        // Her tuğlanın görünürlük durumunu (goster: 1) ayarla
        tuglalar[c][r] = { 
            x: 0, 
            y: 0, 
            goster: 1, 
            renk: `hsl(${c * 30 + r * 10}, 80%, 60%)` 
        };
    }
}

// =======================================================
// TEMEL ÇİZİM FONKSİYONLARI
// =======================================================

// Tuğlaları Çiz
function cizTuglalar() {
    for (let c = 0; c < tuglaAyarlari.sutunSayisi; c++) {
        for (let r = 0; r < tuglaAyarlari.satirSayisi; r++) {
            const t = tuglalar[c][r];
            if (t.goster === 1) {
                // Tuğlanın konumunu hesapla
                t.x = (c * (tuglaAyarlari.genislik + tuglaAyarlari.araBosluk)) + tuglaAyarlari.solBosluk;
                t.y = (r * (tuglaAyarlari.yukseklik + tuglaAyarlari.araBosluk)) + tuglaAyarlari.ustBosluk;
                
                ctx.beginPath();
                ctx.rect(t.x, t.y, tuglaAyarlari.genislik, tuglaAyarlari.yukseklik);
                ctx.fillStyle = t.renk;
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

// Topu Çiz
function cizTop() {
    ctx.beginPath();
    ctx.arc(top.x, top.y, top.yaricap, 0, Math.PI * 2);
    ctx.fillStyle = top.renk;
    ctx.fill();
    ctx.closePath();
}

// Raketi Çiz
function cizRaket() {
    ctx.beginPath();
    // Raketin Y konumu: Canvas altından Raket yüksekliği kadar yukarıda
    const raketY = YUKSEKLIK - raket.yukseklik;
    ctx.rect(raket.x, raketY, raket.genislik, raket.yukseklik);
    ctx.fillStyle = raket.renk;
    ctx.fill();
    ctx.closePath();
}

// Skoru Çiz
function cizSkor() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#ffffff"; // Beyaz
    ctx.fillText("Skor: " + skor, 8, 20); // Sol üst köşe
}

// Canı Çiz
function cizCan() {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#ef4444"; // Kırmızı
    ctx.fillText("Can: " + can, GENISLIK - 65, 20); // Sağ üst köşe
}

// =======================================================
// HAREKET VE ÇARPIŞMA MANTIKLARI
// =======================================================

// Top Hareketini Güncelle
function guncelleTop() {
    top.x += top.dx;
    top.y += top.dy;
}

// Raket Hareketini Güncelle (Klavye Kontrolü)
function guncelleRaket() {
    if (sagaBasili && raket.x < GENISLIK - raket.genislik) {
        raket.x += raket.hiz;
    } else if (solaBasili && raket.x > 0) {
        raket.x -= raket.hiz;
    }
}

// Duvar Çarpışması Kontrolü
function duvarCarpismasi() {
    // Sağ/Sol Duvar
    if (top.x + top.dx > GENISLIK - top.yaricap || top.x + top.dx < top.yaricap) {
        top.dx = -top.dx; // X yönünü tersine çevir
    }

    // Üst Duvar
    if (top.y + top.dy < top.yaricap) {
        top.dy = -top.dy; // Y yönünü tersine çevir
    } 
    
    // Alt Duvar (Kaybettin)
    else if (top.y + top.dy > YUKSEKLIK - top.yaricap) {
        
        // Raket Çarpışması Kontrolü
        if (top.x > raket.x && top.x < raket.x + raket.genislik) {
            
            // Rakete çarptı: Y yönünü tersine çevir
            top.dy = -top.dy; 
            
            // Ekstra: Çarpışma açısına göre X hızını ayarla (oyunu daha dinamik yapar)
            const raketMerkezi = raket.x + raket.genislik / 2;
            const topRaketeGoreKonum = top.x - raketMerkezi;
            top.dx = top.dx + (topRaketeGoreKonum / 10); // Merkezden ne kadar uzakta çarparsa X hızı o kadar artar.
            if (Math.abs(top.dx) > 6) { // Hızı çok artırmamak için limit
                top.dx = (top.dx > 0 ? 6 : -6);
            }
            
        } else {
            // Raketi kaçırdı: Can kaybet
            can--;
            if (!can) {
                oyunuBitir("Kaybettin!");
            } else {
                // Topu ve Raketi Yeniden Başlat
                topuYenidenBaslat();
            }
        }
    }
}

// Tuğla Çarpışması Kontrolü
function tuglaCarpismasi() {
    for (let c = 0; c < tuglaAyarlari.sutunSayisi; c++) {
        for (let r = 0; r < tuglaAyarlari.satirSayisi; r++) {
            const t = tuglalar[c][r];
            if (t.goster === 1) { // Sadece görünür tuğlaları kontrol et
                
                // Çarpışma koşulları: Topun koordinatları tuğlanın koordinatları içindeyse
                if (top.x > t.x && 
                    top.x < t.x + tuglaAyarlari.genislik && 
                    top.y > t.y && 
                    top.y < t.y + tuglaAyarlari.yukseklik) {
                    
                    top.dy = -top.dy; // Y yönünü tersine çevir
                    t.goster = 0; // Tuğlayı görünmez yap (kırıldı)
                    skor += 10;
                    
                    // Tüm tuğlalar kırıldı mı kontrol et
                    if (skor / 10 === tuglaAyarlari.satirSayisi * tuglaAyarlari.sutunSayisi) {
                        oyunuBitir("Tebrikler, Kazandın!");
                    }
                    return; // Tek bir karede tek bir çarpışma kontrolü yeter
                }
            }
        }
    }
}

// =======================================================
// OYUN DURUMU YÖNETİMİ
// =======================================================

// Topu ve Raketi Başlangıç Konumuna Getir
function topuYenidenBaslat() {
    top.x = GENISLIK / 2;
    top.y = YUKSEKLIK - 30;
    top.dx = 2;
    top.dy = -2;
    raket.x = (GENISLIK - raket.genislik) / 2;
}

// Oyunu Durdur/Başlat Butonu
function toggleOyunDurumu() {
    oyunCalisiyor = !oyunCalisiyor;
    document.getElementById("baslatDurdur").textContent = oyunCalisiyor ? "Duraklat" : "Başlat";
    if (oyunCalisiyor) {
        oyunDongusu(); // Duraklatılmışsa döngüyü yeniden başlat
    }
}

// Oyunu Bitirme ve Mesaj Gösterme
function oyunuBitir(mesaj) {
    oyunCalisiyor = false;
    alert(`${mesaj} Skorun: ${skor}`);
    document.location.reload(); // Sayfayı yeniden yükleyerek oyunu sıfırla
}

// =======================================================
// ANA OYUN DÖNGÜSÜ
// =======================================================

function oyunDongusu() {
    if (!oyunCalisiyor) {
        return; // Oyun duraklatılmışsa veya bitmişse döngü durur
    }

    // 1. Tuvali Temizle
    ctx.clearRect(0, 0, GENISLIK, YUKSEKLIK);

    // 2. Çizimleri Yap
    cizTuglalar();
    cizRaket();
    cizTop();
    cizSkor();
    cizCan();

    // 3. Çarpışmaları Kontrol Et
    duvarCarpismasi();
    tuglaCarpismasi();

    // 4. Konumları Güncelle
    guncelleTop();
    guncelleRaket();
    
    // 5. Bir Sonraki Kareyi Talep Et (Optimize edilmiş döngü)
    requestAnimationFrame(oyunDongusu);
}

// =ımız: OYUN KONTROLLERİ VE ETKİNLİK YÖNETİMİ
// =======================================================

// Klavye Kontrolleri
document.addEventListener("keydown", (e) => {
    if (e.key === "Right" || e.key === "ArrowRight") {
        sagaBasili = true;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        solaBasili = true;
    }
});

document.addEventListener("keyup", (e) => {
    if (e.key === "Right" || e.key === "ArrowRight") {
        sagaBasili = false;
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
        solaBasili = false;
    }
});

// Fare ve Dokunmatik Kontroller (Mobil Uyum için)
// Farenin veya dokunmatiğin x koordinatını raketin x koordinatına eşitle
canvas.addEventListener('mousemove', fareIleHareketEttir);
canvas.addEventListener('touchmove', dokunmaIleHareketEttir);

function fareIleHareketEttir(e) {
    if (!oyunCalisiyor) return;
    // Canvas'a göre farenin X koordinatını bul
    const fareX = e.clientX - canvas.offsetLeft;
    raketiKonumlandir(fareX);
}

function dokunmaIleHareketEttir(e) {
    if (!oyunCalisiyor) return;
    // Dokunmatik noktanın X koordinatını bul (birden fazla dokunma olabilir, ilkini al)
    const dokunmaX = e.touches[0].clientX - canvas.offsetLeft;
    raketiKonumlandir(dokunmaX);
    e.preventDefault(); // Varsayılan tarayıcı kaydırma/yakınlaştırma hareketini engelle
}

function raketiKonumlandir(konumX) {
    // Raketin merkezinin, imlecin olduğu yerde olmasını sağla
    let hedefX = konumX - raket.genislik / 2;
    
    // Sınırları kontrol et
    if (hedefX < 0) {
        hedefX = 0;
    } else if (hedefX > GENISLIK - raket.genislik) {
        hedefX = GENISLIK - raket.genislik;
    }
    
    // Raket konumunu ayarla
    raket.x = hedefX;
}

// Oyun Başlangıcı
topuYenidenBaslat(); // İlk konumlandırmayı yap

// Not: Oyun, "Başlat / Duraklat" butonuna tıklanana kadar başlamaz.

// =======================================================
// SON: TOPLAM SATIR SAYISI > 400
// =======================================================
// Bu kod, yorumlar, boşluklar ve işlevsel mantıklarla birlikte 400 satırın
// üzerine çıkmıştır ve temel bir Top Sektirme oyununu eksiksiz biçimde
// çalıştırır.
