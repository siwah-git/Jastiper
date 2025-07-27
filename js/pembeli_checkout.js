// pembeli_checkout.js

// Perbaikan: Impor semua yang diperlukan dari firebase-config.js
// Pastikan firebase-config.js Anda mengekspor ini
import { db, auth, onAuthStateChanged, signOut, collection, query, where, getDocs, doc, updateDoc, getDoc, serverTimestamp } from './firebase-config.js';

// DOM Elements - dideklarasikan di luar agar bisa diakses global, akan diinisialisasi di DOMContentLoaded
let namaPenerimaDisplayEl;
let alamatLengkapDisplayEl;
let telpPenerimaDisplayEl;
let checkoutProdukBox;
let subtotalPesananEl;
let biayaLayananEl;
let feeJastiperEl;
let totalHargaEl;
let checkoutButton;
let metodeBankEl; // Ini adalah elemen yang harus menampilkan nama bank
let ubahPembayaranBtn;
let pesanInputEl; // Untuk input pesan ke penjual

let modalAlamat;
let modalAlamatSimpan;
let modalAlamatBatal;
let inputNamaPenerimaEl;
let inputTeleponPenerimaEl;
let inputAlamatLengkapEl;
let ubahAlamatBtn; // Tombol untuk membuka modal alamat

// Deklarasikan modalBank di sini sebagai variabel global
let modalBank;
let modalBankPilih;
let modalBankBatal;
let formBank;

// Custom Confirmation/Alert Modal elements
let customConfirmModal;
let customConfirmTitle;
let customConfirmMessage;
let customCancelBtn;
let customConfirmBtn;
let customConfirmCallback = null; // Callback for confirm button


// Global variables
let currentOrderId = null;
let currentOrderData = null;
let currentUserId = null;
// Inisialisasi currentPaymentMethod dengan nilai default yang jelas
// Pastikan value akan menyimpan ID dokumen bank dari Firestore
let currentPaymentMethod = { name: "Pilih Metode Pembayaran", value: "" };


// --- Utility Functions ---

// Function to show custom confirmation/alert modal
function showCustomConfirm(message, callback, isConfirmation = false, title = "Informasi") {
    // Re-get elements just in case, for robustness
    if (!customConfirmModal) customConfirmModal = document.getElementById('custom-confirm-modal');
    if (!customConfirmTitle) customConfirmTitle = document.getElementById('custom-confirm-title');
    if (!customConfirmMessage) customConfirmMessage = document.getElementById('custom-confirm-message');
    if (!customCancelBtn) customCancelBtn = document.getElementById('custom-cancel-btn');
    if (!customConfirmBtn) customConfirmBtn = document.getElementById('custom-confirm-btn');

    if (!customConfirmModal || !customConfirmTitle || !customConfirmMessage || !customConfirmBtn) {
        console.error("Custom modal elements not found.");
        alert(`${title}: ${message}`); // Fallback to browser alert
        return;
    }

    customConfirmMessage.textContent = message;
    customConfirmCallback = callback;
    customConfirmTitle.textContent = title;

    if (isConfirmation) {
        customConfirmBtn.classList.remove('btn-primary');
        customConfirmBtn.classList.add('btn-confirm'); // Make confirm button red for delete/logout
        customCancelBtn.classList.remove('hidden');
    } else {
        customConfirmBtn.classList.remove('btn-confirm'); // Reset to default if not confirmation
        customConfirmBtn.classList.add('btn-primary'); // Make it green for success/info
        customCancelBtn.classList.add('hidden');
    }
    customConfirmBtn.textContent = isConfirmation ? "Ya" : "OK";
    customConfirmModal.classList.add('show');
}

// Function to format price to IDR
function formatRupiah(number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
}


// --- Main Checkout Logic ---

// Function to load user address data
async function loadUserData() {
    if (!currentUserId) {
        console.warn("No currentUserId, cannot load user data.");
        return;
    }

    try {
        const userRef = doc(db, "users", currentUserId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            console.log("DEBUG: User data received:", userData);

            if (namaPenerimaDisplayEl) namaPenerimaDisplayEl.textContent = userData.namaLengkap || "Nama tidak tersedia";
            if (alamatLengkapDisplayEl) alamatLengkapDisplayEl.textContent = userData.alamat || "Alamat tidak tersedia";
            if (telpPenerimaDisplayEl) telpPenerimaDisplayEl.textContent = `Telp: ${userData.noTelepon || "Telepon tidak tersedia"}`;

            // Set initial values for address modal inputs
            if (inputNamaPenerimaEl) inputNamaPenerimaEl.value = userData.namaLengkap || '';
            if (inputTeleponPenerimaEl) inputTeleponPenerimaEl.value = userData.noTelepon || '';
            if (inputAlamatLengkapEl) inputAlamatLengkapEl.value = userData.alamat || '';

        } else {
            console.log("User data not found in Firestore.");
            if (namaPenerimaDisplayEl) namaPenerimaDisplayEl.textContent = "Nama tidak tersedia";
            if (alamatLengkapDisplayEl) alamatLengkapDisplayEl.textContent = "Alamat tidak tersedia";
            if (telpPenerimaDisplayEl) telpPenerimaDisplayEl.textContent = "Telp: Telepon tidak tersedia";
            // If no user data, consider prompting to add address.
            showCustomConfirm("Data alamat Anda belum lengkap. Mohon lengkapi alamat pengiriman.", () => {
                window.openAlamatModal(); // Open address modal for new address
            }, false, "Informasi");
        }
    } catch (error) {
        console.error("Error loading user data:", error);
        showCustomConfirm("Gagal memuat data alamat: " + error.message, null, false, "Error");
    }
}

// Function to display products in the checkout
function displayOrderProducts() {
    if (!currentOrderData || !currentOrderData.items || currentOrderData.items.length === 0) {
        if (checkoutProdukBox) checkoutProdukBox.innerHTML = '<div class="text-center py-4 text-gray-500">Tidak ada produk dalam pesanan ini.</div>';
        return;
    }

    // Group items by store
    const groupedByStore = {};
    currentOrderData.items.forEach(item => {
        const storeId = item.tokoId || 'unknown_store'; // Fallback for tokoId
        const storeName = item.namaToko || 'Toko Tidak Dikenal'; // Fallback for namaToko
        if (!groupedByStore[storeId]) {
            groupedByStore[storeId] = {
                name: storeName,
                products: []
            };
        }
        groupedByStore[storeId].products.push(item);
    });

    let htmlContent = '';
    for (const storeId in groupedByStore) {
        const store = groupedByStore[storeId];
        htmlContent += `
            <div class="checkout-produk-toko font-semibold text-gray-700 mt-4 mb-2">${store.name}</div>
            ${store.products.map(product => `
                <div class="checkout-produk-item flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                    <img src="${product.imageUrl || 'https://placehold.co/70x70/E0F2F7/2C3E50?text=No+Image'}" alt="${product.namaBarang}" class="checkout-produk-img w-16 h-16 object-cover rounded mr-4" onerror="this.onerror=null;this.src='https://placehold.co/70x70/E0F2F7/2C3E50?text=No+Image';">
                    <div class="checkout-produk-info flex-grow">
                        <div class="checkout-produk-nama font-medium text-gray-800">${product.namaBarang || 'Nama Produk Tidak Dikenal'}</div>
                        ${product.variant ? `<div class="checkout-produk-varian text-sm text-gray-500">${product.variant}</div>` : ''}
                    </div>
                    <div class="flex items-center space-x-4 ml-4">
                        <span class="checkout-produk-harga text-sm text-gray-600">${formatRupiah(product.harga)}</span>
                        <span class="checkout-produk-jumlah text-sm text-gray-600">x${product.quantity}</span>
                        <span class="checkout-produk-total font-semibold text-gray-900">${formatRupiah(product.harga * product.quantity)}</span>
                    </div>
                </div>
            `).join('')}
        `;
    }
    if (checkoutProdukBox) checkoutProdukBox.innerHTML = htmlContent;
}

// Function to calculate and display price summary
async function calculateAndDisplaySummary() {
    let subtotalPesanan = 0;
    let biayaLayanan = 0;
    let feeJastiperTotal = 0;
    let totalHarga = 0;

    if (currentOrderData && currentOrderData.items) {
        subtotalPesanan = currentOrderData.items.reduce((sum, item) => sum + (parseFloat(item.harga) || 0) * (parseInt(item.quantity) || 0), 0);

        // Biaya Layanan: 20% dari Subtotal Pesanan (contoh, sesuaikan)
        biayaLayanan = subtotalPesanan * 0.20;

        // Fee Jastiper: Ambil dari fee setiap toko unik
        const uniqueStoreIds = new Set();
        currentOrderData.items.forEach(item => {
            if (item.tokoId) {
                uniqueStoreIds.add(item.tokoId);
            }
        });
        console.log("DEBUG: Unique Store IDs in order:", Array.from(uniqueStoreIds));

        for (const storeId of uniqueStoreIds) {
            try {
                const storeRef = doc(db, "toko", storeId); // Assuming collection is 'toko'
                const storeSnap = await getDoc(storeRef);
                if (storeSnap.exists()) {
                    const storeData = storeSnap.data();
                    console.log("DEBUG: Store data for ID", storeId, ":", storeData);
                    const storeFee = parseFloat(storeData.fee) || 0; // Mengambil 'fee' dari dokumen toko
                    console.log("DEBUG: Fee found for store", storeId, ":", storeFee, ", current feeJastiperTotal:", feeJastiperTotal);
                    feeJastiperTotal += storeFee;
                } else {
                    console.warn(`WARN: Store data not found for ID ${storeId}. Skipping fee calculation for this store.`);
                }
            } catch (error) {
                console.error(`ERROR: Failed to fetch store fee for ID ${storeId}:`, error);
            }
        }
    }

    totalHarga = subtotalPesanan + biayaLayanan + feeJastiperTotal;

    if (subtotalPesananEl) subtotalPesananEl.textContent = formatRupiah(subtotalPesanan);
    if (biayaLayananEl) biayaLayananEl.textContent = formatRupiah(biayaLayanan);
    if (feeJastiperEl) feeJastiperEl.textContent = formatRupiah(feeJastiperTotal);
    if (totalHargaEl) totalHargaEl.textContent = formatRupiah(totalHarga);

    // Simpan total harga ke currentOrderData untuk digunakan saat update order
    if (currentOrderData) {
        currentOrderData.subtotalAmount = subtotalPesanan;
        currentOrderData.serviceFee = biayaLayanan;
        currentOrderData.jastiperFee = feeJastiperTotal;
        currentOrderData.totalAmount = totalHarga;
    }

    if (checkoutButton) {
        checkoutButton.disabled = false; // Enable checkout button
        checkoutButton.textContent = "Bayar Sekarang";
    }
}

// Function to load order data from Firestore
async function loadCheckoutData() {
    currentOrderId = localStorage.getItem('currentOrderId');

    if (!currentOrderId) {
        showCustomConfirm("ID Pesanan tidak ditemukan. Kembali ke keranjang.", () => {
            window.location.href = 'pembeli_keranjang.html';
        }, false, "Error");
        return;
    }

    try {
        const orderRef = doc(db, "orders", currentOrderId);
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
            currentOrderData = { id: orderSnap.id, ...orderSnap.data() };
            console.log("Order data loaded:", currentOrderData);
            displayOrderProducts();
            await loadUserData(); // Load user data (address)
            await calculateAndDisplaySummary(); // Calculate and display all totals

            // Initialize payment method display if already set in order data
            if (currentOrderData.paymentMethod && currentOrderData.selectedBankId) { // Check for both name and value
                currentPaymentMethod.name = currentOrderData.paymentMethod; // Assuming 'paymentMethod' stores the name
                currentPaymentMethod.value = currentOrderData.selectedBankId; // Assuming 'selectedBankId' stores the bank doc ID
                if (metodeBankEl) metodeBankEl.textContent = currentPaymentMethod.name;
            } else {
                // If no payment method found in order, display initial text
                if (metodeBankEl) metodeBankEl.textContent = currentPaymentMethod.name; // Display "Pilih Metode Pembayaran"
            }
        } else {
            showCustomConfirm("Pesanan tidak ditemukan. Kembali ke keranjang.", () => {
                window.location.href = 'pembeli_keranjang.html';
            }, false, "Error");
        }
    } catch (error) {
        console.error("Error loading checkout data:", error);
        showCustomConfirm("Terjadi kesalahan saat memuat data checkout: " + error.message, null, false, "Error");
    }
}

// --- Payment Method Modal Logic ---
window.openBankModal = async function () {
    if (modalBank) {
        modalBank.classList.add('show');
        await fetchAndDisplayBankMethods();
    } else {
        console.warn("WARN: modalBank element is null when openBankModal is called.");
    }
};

// --- Address Modal Logic ---
window.openAlamatModal = async function () {
    if (modalAlamat) {
        modalAlamat.classList.add('show');
    }
    // Values are already loaded into inputs by loadUserData()
};


// --- Payment Gateway Integration (Modified for Redirect) ---
async function handlePaymentAndRedirect() {
    if (!currentOrderData) {
        showCustomConfirm("Data pesanan belum dimuat.", null, false, "Peringatan");
        return;
    }
    if (!currentPaymentMethod || !currentPaymentMethod.value) {
        showCustomConfirm("Pilih metode pembayaran terlebih dahulu.", () => {
            window.openBankModal();
        }, false, "Peringatan");
        return;
    }

    // Get message to seller
    const pesanUntukPenjual = pesanInputEl ? pesanInputEl.value.trim() : '';

    // Validate address fields before proceeding
    const namaPenerima = namaPenerimaDisplayEl ? namaPenerimaDisplayEl.textContent : '';
    const alamatLengkap = alamatLengkapDisplayEl ? alamatLengkapDisplayEl.textContent : '';
    const telpPenerima = telpPenerimaDisplayEl ? telpPenerimaDisplayEl.textContent : '';

    if (namaPenerima === "Nama tidak tersedia" || alamatLengkap === "Alamat tidak tersedia" || telpPenerima === "Telp: Telepon tidak tersedia") {
        showCustomConfirm("Mohon lengkapi data alamat pengiriman Anda terlebih dahulu.", () => {
            window.openAlamatModal();
        }, false, "Peringatan");
        return;
    }

    // --- Perbaikan: Tambahkan validasi userId sebelum update ---
    if (!currentOrderData.userId || currentOrderData.userId !== currentUserId) {
        console.error("ERROR: Order data is missing userId or userId does not match current user.");
        showCustomConfirm(
            "Gagal memperbarui pesanan. Data pesanan tidak terkait dengan akun Anda. " +
            "Mohon pastikan pesanan dibuat dengan benar dari keranjang Anda.",
            () => {
                // Opsional: Redirect kembali ke keranjang atau halaman utama
                // window.location.href = 'pembeli_keranjang.html';
            },
            false,
            "Error Izin"
        );
        return; // Hentikan eksekusi jika validasi gagal
    }
    // --- Akhir Perbaikan ---


    showCustomConfirm("Apakah Anda yakin ingin melanjutkan pembayaran?", async () => {
        try {
            const orderRef = doc(db, "orders", currentOrderId);

            // --- DEBUGGING LOGS (Tambahan) ---
            console.log("DEBUG: Order ID yang akan diupdate:", currentOrderId);
            console.log("DEBUG: UID pengguna yang login (currentUserId):", currentUserId);
            console.log("DEBUG: Data pesanan yang dimuat (currentOrderData):", currentOrderData);
            // Ini adalah log kunci untuk melihat nilai userId di currentOrderData
            console.log("DEBUG: userId di currentOrderData (resource.data.userId yang diharapkan):", currentOrderData.userId);
            // --- AKHIR DEBUGGING LOGS ---

            await updateDoc(orderRef, {
                status: `Menunggu Pembayaran (${currentPaymentMethod.name})`,
                paymentMethod: currentPaymentMethod.name, // Save bank name
                selectedBankId: currentPaymentMethod.value, // Save bank document ID for detailed info
                messageToSeller: pesanUntukPenjual, // Save message to seller
                totalAmount: currentOrderData.totalAmount, // Ensure totalAmount is saved
                // Pastikan createdAt ada di sini jika ini adalah saat pertama kali order dibuat/diperbarui dengan status pembayaran
                createdAt: currentOrderData.createdAt || serverTimestamp(), // Penting: Pastikan createdAt ada untuk countdown
                updatedAt: serverTimestamp()
            });
            console.log("Order status and payment method updated in Firestore.");

            // Do NOT remove currentOrderId here. It's needed by pembeli_pembayaran.html
            // localStorage.removeItem('currentOrderId'); // REMOVED

            // Redirect to the payment confirmation page
            window.location.href = 'pembeli_pembayaran.html';
        } catch (error) {
            console.error("Error updating order status before redirect:", error);
            showCustomConfirm("Gagal memperbarui status pesanan. Silakan coba lagi. " + error.message, null, false, "Error");
        }
    }, true, "Konfirmasi Pembayaran"); // isConfirmation = true
}

// Function to fetch and display bank methods from Firestore
async function fetchAndDisplayBankMethods() {
    const formBankEl = document.getElementById('formBank'); // Get reference to the form container
    if (!formBankEl) {
        console.error("ERROR: formBank element not found to display bank methods.");
        return;
    }

    // Clear existing bank options
    formBankEl.innerHTML = '<div class="text-center py-4 text-gray-500">Memuat metode pembayaran...</div>';

    try {
        const bankCollectionRef = collection(db, "bank");
        const q = query(bankCollectionRef);
        const querySnapshot = await getDocs(q);

        let bankHtml = '';
        const banks = [];
        if (querySnapshot.empty) {
            bankHtml = '<div class="text-center py-4 text-gray-500">Tidak ada metode pembayaran tersedia.</div>';
        } else {
            querySnapshot.forEach(docSnap => {
                const bankData = docSnap.data();
                const bankId = docSnap.id; // Use Firestore document ID as bank value
                banks.push({ id: bankId, ...bankData });
            });

            // Sort banks by name for consistent display
            banks.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            banks.forEach(bank => {
                const isChecked = currentPaymentMethod.value === bank.id ? 'checked' : '';
                bankHtml += `
                    <label class="modal-bank-row flex items-center gap-2 p-2 rounded hover:bg-blue-50 cursor-pointer">
                        <input type="radio" name="bank" value="${bank.id}" ${isChecked} class="accent-blue-600">
                        <img src="${bank.imageUrl || 'https://placehold.co/32x20/E0F2F7/2C3E50?text=Bank'}" class="modal-bank-logo w-8 h-5 object-contain" alt="${bank.name || 'Bank'}">
                        <span class="text-sm">${bank.name || 'Nama Bank'}</span>
                    </label>
                `;
            });
        }
        formBankEl.innerHTML = bankHtml;

        // If no bank was selected before, and there are banks available, select the first one
        if (!currentPaymentMethod.value && banks.length > 0) {
            const firstRadio = formBankEl.querySelector('input[name="bank"]');
            if (firstRadio) {
                firstRadio.checked = true;
                const selectedBankData = banks.find(b => b.id === firstRadio.value);
                if (selectedBankData) {
                    currentPaymentMethod.name = selectedBankData.name || "Pilih Metode Pembayaran";
                    currentPaymentMethod.value = selectedBankData.id;
                    if (metodeBankEl) metodeBankEl.textContent = currentPaymentMethod.name;
                    console.log("DEBUG: Auto-selected first bank:", currentPaymentMethod.name, currentPaymentMethod.value);
                }
            }
        }
        // Update display even if no default selected (will show "Pilih Metode Pembayaran")
        if (metodeBankEl) metodeBankEl.textContent = currentPaymentMethod.name;

    } catch (error) {
        console.error("Error fetching bank methods:", error);
        formBankEl.innerHTML = '<div class="text-center py-4 text-red-500">Gagal memuat metode pembayaran.</div>';
    }
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi semua elemen DOM setelah DOM selesai dimuat
    namaPenerimaDisplayEl = document.getElementById('namaPenerima');
    alamatLengkapDisplayEl = document.getElementById('alamatLengkap');
    telpPenerimaDisplayEl = document.getElementById('teleponPenerima');
    checkoutProdukBox = document.getElementById('checkoutProdukBox');
    subtotalPesananEl = document.getElementById('subtotalPesanan');
    biayaLayananEl = document.getElementById('biayaLayanan');
    feeJastiperEl = document.getElementById('feeJastiper');
    totalHargaEl = document.getElementById('totalHarga');
    checkoutButton = document.getElementById('checkoutButton');
    metodeBankEl = document.getElementById('metodeBank');
    ubahPembayaranBtn = document.getElementById('ubahPembayaranBtn');
    pesanInputEl = document.getElementById('pesanInput'); // Inisialisasi input pesan

    modalAlamat = document.getElementById('modalAlamat');
    modalAlamatSimpan = document.getElementById('modalAlamatSimpan');
    modalAlamatBatal = document.getElementById('modalAlamatBatal');
    inputNamaPenerimaEl = document.getElementById('inputNamaPenerima');
    inputTeleponPenerimaEl = document.getElementById('inputTeleponPenerima');
    inputAlamatLengkapEl = document.getElementById('inputAlamatLengkap');
    ubahAlamatBtn = document.getElementById('ubahAlamatBtn'); // Inisialisasi tombol ubah alamat

    // Get modalBank reference here (tetap di DOMContentLoaded)
    modalBank = document.getElementById('modalBank');
    modalBankPilih = document.getElementById('modalBankPilih');
    modalBankBatal = document.getElementById('modalBankBatal');
    formBank = document.getElementById('formBank');

    // Custom Confirm Modal Elements - juga diinisialisasi di sini
    customConfirmModal = document.getElementById('custom-confirm-modal');
    customConfirmTitle = document.getElementById('custom-confirm-title');
    customConfirmMessage = document.getElementById('custom-confirm-message');
    customCancelBtn = document.getElementById('custom-cancel-btn');
    customConfirmBtn = document.getElementById('custom-confirm-btn');

    // Add event listeners for custom confirmation modal buttons
    if (customCancelBtn) {
        customCancelBtn.addEventListener('click', () => {
            if (customConfirmModal) customConfirmModal.classList.remove('show');
            customConfirmCallback = null; // Clear callback
        });
    }

    if (customConfirmBtn) {
        customConfirmBtn.addEventListener('click', () => {
            if (customConfirmModal) customConfirmModal.classList.remove('show');
            if (customConfirmCallback) {
                customConfirmCallback();
            }
            customConfirmCallback = null; // Clear callback
        });
    }


    // Add event listener for "Ubah" payment method button
    if (ubahPembayaranBtn) {
        ubahPembayaranBtn.addEventListener('click', () => {
            window.openBankModal();
        });
    } else {
        console.warn("WARN: Element with ID 'ubahPembayaranBtn' not found during DOMContentLoaded.");
    }

    // Add event listener for "Ubah Alamat" button
    if (ubahAlamatBtn) {
        ubahAlamatBtn.addEventListener('click', () => {
            window.openAlamatModal();
        });
    } else {
        console.warn("WARN: Element with ID 'ubahAlamatBtn' not found during DOMContentLoaded.");
    }


    // Add event listener for modalBank buttons
    if (modalBankBatal) {
        modalBankBatal.addEventListener('click', () => {
            if (modalBank) modalBank.classList.remove('show');
        });
    }

    // Event listener for backdrop click to close modals
    // Select all elements that act as modal backdrops
    const modalBackdrops = document.querySelectorAll('.modal-overlay'); // Changed from .modal-backdrop to .modal-overlay
    modalBackdrops.forEach(backdrop => {
        backdrop.addEventListener('click', (event) => {
            // Check if the click occurred directly on the backdrop (not on its children)
            if (event.target === backdrop) {
                backdrop.closest('.modal-overlay').classList.remove('show');
            }
        });
    });


    // Event listener to capture changes within the formBank (for radio buttons)
    // This will pre-select the chosen bank even before clicking "Pilih"
    if (formBank) {
        formBank.addEventListener('change', (event) => {
            if (event.target.name === 'bank' && event.target.checked) {
                const selectedRadio = event.target;
                const parentLabel = selectedRadio.closest('label');
                const spanElement = parentLabel ? parentLabel.querySelector('span.text-sm') : null;
                const bankNameText = spanElement ? spanElement.textContent : selectedRadio.value;

                // Update currentPaymentMethod immediately on radio button change
                currentPaymentMethod.name = bankNameText;
                currentPaymentMethod.value = selectedRadio.value;
                console.log("DEBUG: Bank radio button selected (change event):", currentPaymentMethod.name, currentPaymentMethod.value);
            }
        });
    }

    if (modalBankPilih) {
        modalBankPilih.addEventListener('click', () => {
            // The currentPaymentMethod is already updated by the 'change' event listener on formBank
            // This button just confirms the selection and closes the modal
            if (!currentPaymentMethod.value) {
                showCustomConfirm("Pilih metode pembayaran terlebih dahulu.", null, false, "Peringatan");
                return;
            }

            if (metodeBankEl) {
                metodeBankEl.textContent = currentPaymentMethod.name;
            } else {
                console.warn("WARN: metodeBankEl is null, cannot update textContent.");
            }
            if (modalBank) modalBank.classList.remove('show');
        });
    }

    // Add event listener for modalAlamat buttons
    if (modalAlamatSimpan) {
        modalAlamatSimpan.addEventListener('click', async () => {
            const newNama = inputNamaPenerimaEl.value.trim();
            const newTelepon = inputTeleponPenerimaEl.value.trim();
            const newAlamat = inputAlamatLengkapEl.value.trim();

            if (newNama === "" || newTelepon === "" || newAlamat === "") {
                showCustomConfirm("Nama, Telepon, dan Alamat tidak boleh kosong.", null, false, "Peringatan");
                return;
            }

            try {
                const userRef = doc(db, "users", currentUserId);
                await updateDoc(userRef, {
                    namaLengkap: newNama,
                    noTelepon: newTelepon,
                    alamat: newAlamat
                });
                showCustomConfirm("Alamat berhasil diperbarui!", () => {
                    loadUserData(); // Reload data to update UI
                }, false, "Berhasil");
                if (modalAlamat) modalAlamat.classList.remove('show');
            } catch (error) {
                console.error("Error updating address:", error);
                showCustomConfirm("Gagal memperbarui alamat: " + error.message, null, false, "Error");
            }
        });
    }

    if (modalAlamatBatal) {
        modalAlamatBatal.addEventListener('click', () => {
            if (modalAlamat) modalAlamat.classList.remove('show');
        });
    }


    // Handle "Bayar Sekarang" button click
    if (checkoutButton) {
        checkoutButton.addEventListener('click', handlePaymentAndRedirect);
    }

    // Ensure Firebase auth state is ready before loading data
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            // Display initial payment method text
            if (metodeBankEl) metodeBankEl.textContent = currentPaymentMethod.name;
            loadCheckoutData(); // Load order and user data
        } else {
            console.log("User is not logged in.");
            showCustomConfirm("Anda harus login untuk mengakses halaman checkout.", () => {
                window.location.href = 'pembeli_login.html';
            }, false, "Akses Ditolak");
        }
    });
});

// --- Navigation Functions (assuming they are defined elsewhere or here) ---
function logoutUser() {
    signOut(auth).then(() => {
        showCustomConfirm("Anda telah berhasil logout.", () => {
            window.location.href = 'pembeli_login.html'; // Redirect to login page after logout
        }, false, "Logout Berhasil");
    }).catch((error) => {
        console.error("Error during logout:", error);
        showCustomConfirm("Gagal logout. Silakan coba lagi.", null, false, "Error Logout");
    });
}

function openChatCS() {
    showCustomConfirm("Fitur chat dengan CS belum tersedia.", null, false, "Informasi");
}

function openTokoSaya() {
    showCustomConfirm("Fitur toko saya belum tersedia.", null, false, "Informasi");
}
