import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// Firebase yapılandırması ve uygulama ID'si global değişkenlerden alınır.
// Bu değişkenler Canvas ortamında otomatik olarak sağlanır.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Ana React uygulama bileşeni
function App() {
  // Uygulama durumu değişkenleri
  const [db, setDb] = useState(null); // Firestore veritabanı örneği
  const [auth, setAuth] = useState(null); // Firebase Auth örneği
  const [userId, setUserId] = useState(null); // Kullanıcı ID'si
  const [loading, setLoading] = useState(true); // Yükleme durumu
  const [menuItems, setMenuItems] = useState([]); // Restoran menü öğeleri
  const [cart, setCart] = useState([]); // Sepetteki ürünler
  const [message, setMessage] = useState({ text: '', type: '' }); // Kullanıcıya gösterilecek mesajlar

  // Başlangıç menü öğeleri (Firebase'den çekilecek şekilde tasarlanacak)
  // Şimdilik sabit veri olarak eklenmiştir.
  const initialMenuItems = [
    { id: '1', name: 'Simit', price: 15.00, category: 'Kahvaltılık', imageUrl: 'https://placehold.co/100x100/A020F0/ffffff?text=Simit' },
    { id: '2', name: 'Çay', price: 10.00, category: 'İçecekler', imageUrl: 'https://placehold.co/100x100/FFD700/000000?text=Çay' },
    { id: '3', name: 'Peynir', price: 25.00, category: 'Kahvaltılık', imageUrl: 'https://placehold.co/100x100/4169E1/ffffff?text=Peynir' },
    { id: '4', name: 'Salam', price: 30.00, category: 'Kahvaltılık', imageUrl: 'https://placehold.co/100x100/3CB371/ffffff?text=Salam' },
  ];

  // Firebase başlatma ve kimlik doğrulama işlemleri
  useEffect(() => {
    async function initializeFirebase() {
      try {
        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const firebaseAuth = getAuth(app);

        setDb(firestore);
        setAuth(firebaseAuth);

        // Kimlik doğrulama durumundaki değişiklikleri dinle
        onAuthStateChanged(firebaseAuth, async (user) => {
          if (user) {
            setUserId(user.uid);
            console.log("Kullanıcı giriş yaptı:", user.uid);
          } else {
            console.log("Anonim olarak giriş yapılıyor...");
            if (initialAuthToken) {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
            } else {
              await signInAnonymously(firebaseAuth);
            }
          }
          setLoading(false); // Yükleme tamamlandı
        });
      } catch (error) {
        console.error("Firebase başlatılırken veya kimlik doğrulanırken hata oluştu:", error);
        setMessage({ text: 'Uygulama yüklenirken bir hata oluştu.', type: 'error' });
        setLoading(false);
      }
    }

    initializeFirebase();
  }, []);

  // Menü öğelerini Firestore'dan çekme veya başlangıç verilerini ayarlama
  useEffect(() => {
    if (db) {
      // Eğer Firebase veritabanı hazırsa menü öğelerini çek.
      // Şimdilik sabit menüyü ayarlıyoruz, ancak Firebase'den çekmek için bu kısım genişletilebilir.
      setMenuItems(initialMenuItems);
      // Örnek: Gerçek Firebase entegrasyonu için:
      // const menuCollectionRef = collection(db, `/artifacts/${appId}/menu`);
      // const unsubscribe = onSnapshot(menuCollectionRef, (snapshot) => {
      //   const fetchedMenu = snapshot.docs.map(doc => ({
      //     id: doc.id,
      //     ...doc.data()
      //   }));
      //   setMenuItems(fetchedMenu);
      // });
      // return () => unsubscribe();
    }
  }, [db]); // db değiştiğinde bu efekti yeniden çalıştır

  // Sepete ürün ekleme işlevi
  const addToCart = (item) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        // Ürün zaten sepette varsa miktarını artır
        return prevCart.map((cartItem) =>
          cartItem.id === item.id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
        );
      } else {
        // Ürün sepette yoksa yeni olarak ekle
        return [...prevCart, { ...item, quantity: 1 }];
      }
    });
    setMessage({ text: `${item.name} sepete eklendi.`, type: 'success' });
    setTimeout(() => setMessage({ text: '', type: '' }), 2000); // 2 saniye sonra mesajı gizle
  };

  // Sepetten ürün miktarını azaltma işlevi
  const decreaseQuantity = (itemId) => {
    setCart((prevCart) => {
      return prevCart.map((cartItem) =>
        cartItem.id === itemId
          ? { ...cartItem, quantity: cartItem.quantity - 1 }
          : cartItem
      ).filter(cartItem => cartItem.quantity > 0); // Miktarı sıfıra düşenleri sepetten çıkar
    });
  };

  // Sepetten ürünü tamamen çıkarma işlevi
  const removeFromCart = (itemId) => {
    setCart((prevCart) => prevCart.filter((cartItem) => cartItem.id !== itemId));
    setMessage({ text: 'Ürün sepetten kaldırıldı.', type: 'info' });
    setTimeout(() => setMessage({ text: '', type: '' }), 2000); // 2 saniye sonra mesajı gizle
  };

  // Sepet toplam fiyatını hesapla
  const calculateTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2);
  };

  // Sipariş verme işlevi (şimdilik sadece konsola loglama)
  const placeOrder = async () => {
    if (cart.length === 0) {
      setMessage({ text: 'Sepetiniz boş, lütfen ürün ekleyin.', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return;
    }
    if (!db || !userId) {
      setMessage({ text: 'Sipariş için bağlantı kurulamadı.', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return;
    }

    try {
      // Siparişi Firestore'a kaydet
      await addDoc(collection(db, `/artifacts/${appId}/users/${userId}/orders`), {
        items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
        total: calculateTotalPrice(),
        orderDate: Date.now(),
        status: 'beklemede', // Sipariş durumu
        userId: userId, // Siparişi veren kullanıcının ID'si
      });
      setCart([]); // Sepeti temizle
      setMessage({ text: 'Siparişiniz başarıyla alındı!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      console.log("Sipariş başarıyla gönderildi:", cart);
    } catch (error) {
      console.error("Sipariş gönderilirken hata oluştu:", error);
      setMessage({ text: 'Sipariş gönderilirken bir hata oluştu.', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  // QR kod okuma simülasyonu
  const simulateQrScan = () => {
    // Gerçek QR kod okuyucu entegrasyonu burada yapılabilir.
    // Şimdilik sadece bir mesaj gösteriyoruz.
    setMessage({ text: 'QR Kod okuma simüle edildi. Menü yüklendi.', type: 'info' });
    setTimeout(() => setMessage({ text: '', type: '' }), 2000);
  };

  // Yükleme durumu
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">Uygulama Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 to-orange-200 flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8 font-inter">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <script src="https://cdn.tailwindcss.com"></script>
      {/* Tailwind CSS için Inter fontunu ekle */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          body {
            font-family: 'Inter', sans-serif;
          }
        `}
      </style>

      {/* Mesaj Kutusu */}
      {message.text && (
        <div className={`fixed top-5 z-50 p-4 rounded-lg shadow-lg text-white text-center transition-all duration-300 transform ${
          message.type === 'success' ? 'bg-green-500' : message.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`}>
          {message.text}
        </div>
      )}

      {/* Ana Başlık */}
      <h1 className="text-4xl sm:text-5xl font-extrabold text-red-800 mb-8 text-center drop-shadow-lg">
        QR Menü & Sipariş
      </h1>

      {/* Kullanıcı ID'si gösterimi */}
      <div className="bg-white p-3 rounded-lg shadow-md mb-6 w-full max-w-md text-center text-sm text-gray-600">
        <p>Kullanıcı ID: <span className="font-mono break-all">{userId || 'Misafir'}</span></p>
      </div>

      {/* QR Kod Tarama Alanı */}
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mb-8 text-center">
        <button
          onClick={simulateQrScan}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          QR Kodu Tara
        </button>
        <p className="text-gray-500 text-sm mt-3"> (QR kod okuma simüle edilmiştir)</p>
      </div>

      {/* Menü Bölümü */}
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Menümüz</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md transition duration-200 ease-in-out transform hover:-translate-y-1"
            >
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-20 h-20 rounded-md object-cover mr-4 shadow-sm"
                onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/100x100/CCCCCC/333333?text=Ürün" }}
              />
              <div className="flex-grow">
                <h3 className="text-xl font-semibold text-gray-900">{item.name}</h3>
                <p className="text-gray-700 text-lg mt-1">{item.price.toFixed(2)} TL</p>
              </div>
              <button
                onClick={() => addToCart(item)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                aria-label={`Sepete ${item.name} ekle`}
              >
                + Ekle
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Sepet Bölümü */}
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Sepetim</h2>
        {cart.length === 0 ? (
          <p className="text-center text-gray-600 text-lg">Sepetiniz boş.</p>
        ) : (
          <ul className="space-y-4 mb-6">
            {cart.map((item) => (
              <li key={item.id} className="flex items-center justify-between bg-gray-50 p-4 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-16 h-16 rounded-md object-cover mr-4"
                    onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/100x100/CCCCCC/333333?text=Ürün" }}
                  />
                  <div>
                    <span className="font-semibold text-gray-900 text-lg">{item.name}</span>
                    <span className="text-gray-600 ml-2">({item.price.toFixed(2)} TL/adet)</span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => decreaseQuantity(item.id)}
                    className="bg-red-400 hover:bg-red-500 text-white font-bold py-1 px-3 rounded-full transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                  >
                    -
                  </button>
                  <span className="font-bold text-xl text-gray-800">{item.quantity}</span>
                  <button
                    onClick={() => addToCart(item)}
                    className="bg-green-400 hover:bg-green-500 text-white font-bold py-1 px-3 rounded-full transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label={`${item.name} ürününü sepetten kaldır`}
                  >
                    Kaldır
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg shadow-inner mt-6">
          <span className="text-xl font-bold text-gray-900">Toplam:</span>
          <span className="text-2xl font-extrabold text-green-700">{calculateTotalPrice()} TL</span>
        </div>
        <button
          onClick={placeOrder}
          className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-md shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          Siparişi Tamamla
        </button>
        <p className="text-center text-gray-500 text-sm mt-3"> (Online ödeme entegrasyonu sonraki aşamada eklenecektir)</p>
      </div>
    </div>
  );
}

export default App;
