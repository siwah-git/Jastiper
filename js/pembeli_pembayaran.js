// pembeli_pembayaran.js

// Import semua yang diperlukan dari firebase-config.js
import {
    db,
    auth,
    onAuthStateChanged,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp // Penting untuk update timestamp jika diperlukan
} from './firebase-config.js';

// --- DOM Elements ---
let totalPembayaranEl;
let bayarDalamEl;
let bankNameDisplayEl;
let bankLogoDisplayEl; // BARU: Untuk logo bank (img)
let virtualAccountDisplayEl;
let copyButton;
let ownerNameDisplayEl;
// Removed paymentInstructionsEl as it's now handled by individual details blocks
let detailsElements; // BARU: Untuk semua elemen <details>

// Custom Confirmation/Alert Modal elements
let customConfirmModal;
let customConfirmTitle;
let customConfirmMessage;
let customCancelBtn;
let customConfirmBtn;
let customConfirmCallback = null;

// Global Variables
let currentOrderId = null;
let currentOrderData = null;
let countdownInterval;

// --- Utility Functions ---

function showCustomConfirm(message, callback, isConfirmation = false, title = "Informasi") {
    // Inisialisasi ulang elemen modal setiap kali agar lebih robust (jika elemen di-render ulang)
    // Cek keberadaan elemen setiap kali untuk memastikan tidak null
    customConfirmModal = document.getElementById('custom-confirm-modal');
    customConfirmTitle = document.getElementById('custom-confirm-title');
    customConfirmMessage = document.getElementById('custom-confirm-message');
    customCancelBtn = document.getElementById('custom-cancel-btn');
    customConfirmBtn = document.getElementById('custom-confirm-btn');

    if (!customConfirmModal || !customConfirmTitle || !customConfirmMessage || !customConfirmBtn) {
        console.error("Custom modal elements not found in HTML. Falling back to native alert.");
        alert(`${title}: ${message}`); // Fallback
        return;
    }

    customConfirmMessage.textContent = message;
    customConfirmCallback = callback;
    customConfirmTitle.textContent = title;

    customConfirmBtn.classList.remove('btn-confirm');
    customConfirmBtn.classList.add('btn-primary');

    // Kelola visibilitas tombol batal
    if (isConfirmation) {
        customConfirmBtn.textContent = "Ya";
        customCancelBtn.classList.remove('hidden');
        customCancelBtn.style.display = ''; // Ensure display is not 'none'
    } else {
        customConfirmBtn.textContent = "OK";
        customCancelBtn.classList.add('hidden');
        customCancelBtn.style.display = 'none'; // Ensure it's hidden properly
    }
    customConfirmModal.classList.remove('hidden'); // Show the modal
    customConfirmModal.classList.add('flex'); // Add flex for centering
}

function formatRupiah(number) {
    if (typeof number !== 'number') {
        console.warn("Input for formatRupiah is not a number:", number);
        return "Rp. 0";
    }
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
}

// --- Main Payment Logic ---

async function loadPaymentData() {
    currentOrderId = localStorage.getItem('currentOrderId');
    console.log("DEBUG: currentOrderId from localStorage:", currentOrderId);

    if (!currentOrderId) {
        showCustomConfirm("Data pembayaran tidak ditemukan. Silakan kembali ke halaman checkout.", () => {
            window.location.href = 'pembeli_checkout.html';
        }, false, "Peringatan");
        return;
    }

    // Set loading states
    if (totalPembayaranEl) totalPembayaranEl.textContent = "Memuat...";
    if (bayarDalamEl) bayarDalamEl.textContent = "Memuat...";
    if (bankNameDisplayEl) bankNameDisplayEl.textContent = "Memuat informasi bank...";
    // if (bankLogoDisplayEl) bankLogoDisplayEl.src = ''; // Clear existing logo (handled in displayBankInfo)
    if (virtualAccountDisplayEl) virtualAccountDisplayEl.textContent = "Memuat...";
    if (ownerNameDisplayEl) ownerNameDisplayEl.textContent = "Memuat...";

    // Clear content of all instruction details sections
    detailsElements.forEach(detail => {
        const contentDiv = detail.querySelector('div');
        if (contentDiv) {
            contentDiv.innerHTML = "<p>Memuat instruksi pembayaran...</p>";
        }
    });


    try {
        const orderRef = doc(db, "orders", currentOrderId);
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
            currentOrderData = { id: orderSnap.id, ...orderSnap.data() };
            console.log("DEBUG: Order data loaded:", currentOrderData);

            if (totalPembayaranEl) {
                totalPembayaranEl.textContent = formatRupiah(currentOrderData.totalAmount || 0);
            }

            if (currentOrderData.selectedBankId) {
                // Memanggil displayBankInfo untuk mengisi nama bank, logo, dan mengambil account number/holder dari bank collection
                const bankData = await displayBankInfo(currentOrderData.selectedBankId); // Tangkap bankData yang dikembalikan

                // Prioritaskan virtualAccount dan accountOwner dari orderData
                // Jika tidak ada di orderData, gunakan dari bankData (jika ada)
                const finalVirtualAccount = currentOrderData.virtualAccount || (bankData ? bankData.accountNumber : 'N/A');
                const finalAccountOwner = currentOrderData.accountOwner || (bankData ? bankData.accountHolder : 'N/A'); // Gunakan 'accountHolder' dari Firebase

                if (virtualAccountDisplayEl) {
                    virtualAccountDisplayEl.textContent = finalVirtualAccount;
                } else {
                    console.warn("Element virtualAccountDisplayEl not found.");
                }

                if (ownerNameDisplayEl) {
                    ownerNameDisplayEl.textContent = finalAccountOwner;
                } else {
                    console.warn("Element ownerNameDisplayEl not found.");
                }

                // Tampilkan instruksi pembayaran setelah VA dan owner terisi
                const bankNameForInstructions = bankData ? bankData.name : currentOrderData.selectedBankName;
                displayPaymentInstructions(bankNameForInstructions, finalVirtualAccount, finalAccountOwner, bankData); // Teruskan bankData ke instruksi
            } else {
                if (bankNameDisplayEl) bankNameDisplayEl.textContent = 'Metode pembayaran bank belum dipilih atau tidak valid.';
                if (bankLogoDisplayEl) bankLogoDisplayEl.src = '';
                if (virtualAccountDisplayEl) virtualAccountDisplayEl.textContent = 'N/A';
                if (ownerNameDisplayEl) ownerNameDisplayEl.textContent = 'N/A';
                displayPaymentInstructions(null, 'N/A', 'N/A', {}); // Tampilkan instruksi default jika bank tidak valid
            }

            // Mulai countdown pembayaran
            if (currentOrderData.createdAt) {
                startCountdown(currentOrderData.createdAt);
            } else {
                console.warn("WARN: 'createdAt' field is missing in order document. Countdown cannot start.");
                if (bayarDalamEl) bayarDalamEl.textContent = "Waktu tidak tersedia (error data)";
            }

        } else {
            showCustomConfirm("Pesanan tidak ditemukan di database. Silakan kembali ke halaman checkout.", () => {
                window.location.href = 'pembeli_checkout.html';
            }, false, "Error");
        }
    } catch (error) {
        console.error("Error loading payment data:", error);
        showCustomConfirm("Terjadi kesalahan saat memuat data pembayaran: " + error.message + ". Pastikan Anda memiliki izin akses.", null, false, "Error");
        // Clear loading states
        if (totalPembayaranEl) totalPembayaranEl.textContent = "Gagal memuat";
        if (bayarDalamEl) bayarDalamEl.textContent = "Gagal memuat";
        if (bankNameDisplayEl) bankNameDisplayEl.textContent = 'Gagal memuat info bank.';
        if (bankLogoDisplayEl) bankLogoDisplayEl.src = '';
        if (virtualAccountDisplayEl) virtualAccountDisplayEl.textContent = "Error";
        if (ownerNameDisplayEl) ownerNameDisplayEl.textContent = "Error";

        detailsElements.forEach(detail => {
            const contentDiv = detail.querySelector('div');
            if (contentDiv) {
                contentDiv.innerHTML = '<p class="text-red-500">Gagal memuat instruksi.</p>';
            }
        });
    }
}

async function displayBankInfo(bankId) {
    if (!bankId) {
        if (bankNameDisplayEl) bankNameDisplayEl.textContent = 'Metode pembayaran bank belum dipilih atau tidak valid.';
        if (bankLogoDisplayEl) bankLogoDisplayEl.src = '';
        return null; // Mengembalikan null jika bankId tidak valid
    }

    try {
        const bankRef = doc(db, "bank", bankId);
        const bankSnap = await getDoc(bankRef);

        if (bankSnap.exists()) {
            const bankData = bankSnap.data();
            console.log("DEBUG: Bank data loaded:", bankData);

            if (bankNameDisplayEl) {
                bankNameDisplayEl.textContent = bankData.name || 'Bank Tidak Dikenal';
            }
            // Tambahkan elemen image logo di HTML Anda: <img id="bankLogoDisplay" src="" alt="Bank Logo" class="h-6 ml-2">
            if (bankLogoDisplayEl) {
                bankLogoDisplayEl.src = bankData.imageUrl || 'https://via.placeholder.com/40x25?text=Bank'; // Default placeholder jika tidak ada gambar
                bankLogoDisplayEl.alt = bankData.name ? `${bankData.name} Logo` : 'Bank Logo';
            }
            return bankData; // Mengembalikan data bank yang diambil
        } else {
            if (bankNameDisplayEl) bankNameDisplayEl.textContent = 'Informasi bank tidak ditemukan untuk ID: ' + bankId;
            if (bankLogoDisplayEl) bankLogoDisplayEl.src = '';
            console.warn("WARN: Bank document not found for ID:", bankId);
            return null;
        }
    } catch (error) {
        console.error("Error fetching bank info:", error);
        if (bankNameDisplayEl) bankNameDisplayEl.textContent = 'Gagal memuat informasi bank. ' + error.message;
        if (bankLogoDisplayEl) bankLogoDisplayEl.src = '';
        return null;
    }
}

function startCountdown(createdAtTimestamp) {
    if (!createdAtTimestamp || typeof createdAtTimestamp.toDate !== 'function') {
        console.error("Invalid createdAtTimestamp provided for countdown. Type:", typeof createdAtTimestamp);
        if (bayarDalamEl) bayarDalamEl.textContent = "Waktu tidak tersedia";
        return;
    }

    const orderCreationTime = createdAtTimestamp.toDate().getTime();
    const expiryDurationMs = 24 * 60 * 60 * 1000; // 24 jam dalam milidetik
    const expiryTime = orderCreationTime + expiryDurationMs;

    if (countdownInterval) {
        clearInterval(countdownInterval);
    }

    countdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = expiryTime - now;

        if (distance < 0) {
            clearInterval(countdownInterval);
            if (bayarDalamEl) bayarDalamEl.textContent = "Waktu pembayaran habis!";
            updateOrderStatus(currentOrderId, "Expired");
            showCustomConfirm("Waktu pembayaran telah habis. Pesanan ini dibatalkan.", () => {
                window.location.href = 'pembeli_keranjang.html';
            }, false, "Peringatan");
            return;
        }

        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');

        if (bayarDalamEl) {
            bayarDalamEl.textContent = `${formattedHours} Jam ${formattedMinutes} Menit ${formattedSeconds} Detik`;
        }
    }, 1000);
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, {
            status: newStatus,
            updatedAt: serverTimestamp()
        });
        console.log(`Order ${orderId} status updated to ${newStatus}.`);
    } catch (error) {
        console.error("Error updating order status:", error);
    }
}

// Fungsi displayPaymentInstructions yang lebih fleksibel
function displayPaymentInstructions(bankNameForInstructions, virtualAccount, accountHolder, bankData = {}) {
    // Dapatkan elemen-elemen untuk setiap metode pembayaran
    const mbankingContentEl = document.getElementById('mbankingInstructionsContent');
    const atmContentEl = document.getElementById('atmInstructionsContent');
    const ibankingContentEl = document.getElementById('ibankingInstructionsContent');

    const bankNameLower = bankNameForInstructions ? bankNameForInstructions.toLowerCase() : '';

    // Reset konten instruksi sebelum mengisi yang baru
    if (mbankingContentEl) mbankingContentEl.innerHTML = '';
    if (atmContentEl) atmContentEl.innerHTML = '';
    if (ibankingContentEl) ibankingContentEl.innerHTML = '';

    // --- Isi Instruksi m-Banking ---
    if (mbankingContentEl) {
        let mbankingHtml = '';
        if (bankData && bankData.instructions_mbanking) {
            mbankingHtml += `<p><strong>Langkah-langkah Transfer ${bankData.name || 'Bank'} via Mobile Banking:</strong></p>`;
            const mbankingSteps = Array.isArray(bankData.instructions_mbanking) ? bankData.instructions_mbanking : bankData.instructions_mbanking.split('\n');
            mbankingHtml += `<ol class="list-decimal list-inside ml-4 mt-2">`;
            mbankingSteps.forEach(step => {
                let formattedStep = step.replace(/NOMOR_VA/g, `<span class="font-bold">${virtualAccount}</span>`)
                    .replace(/NAMA_PEMILIK/g, `<span class="font-bold">${accountHolder}</span>`);
                mbankingHtml += `<li>${formattedStep}</li>`;
            });
            mbankingHtml += `</ol>`;
        } else if (bankNameLower.includes("bca")) {
            mbankingHtml = `
                <p><strong>Langkah-langkah Transfer BCA via m-Banking:</strong></p>
                <ol class="list-decimal list-inside ml-4 mt-2">
                    <li>Pilih Transfer m-Banking > Bank Virtual Account.</li>
                    <li>Masukkan nomor Virtual Account <span class="font-bold">${virtualAccount}</span> dan pilih Kirim/Lanjutkan.</li>
                    <li>Periksa informasi yang tertera di layar. Total tagihan sudah benar dan username kamu <span class="font-bold">${accountHolder}</span>. Jika benar pilih Ya.</li>
                    <li>Masukkan PIN m-BCA Anda dan pilih OK.</li>
                    <li>Ikuti petunjuk selanjutnya hingga transaksi selesai.</li>
                </ol>
            `;
        } else if (bankNameLower.includes("mandiri")) {
            mbankingHtml = `
                <p><strong>Langkah-langkah Transfer Mandiri via m-Banking (Livin' by Mandiri):</strong></p>
                <ol class="list-decimal list-inside ml-4 mt-2">
                    <li>Pilih menu "Bayar" > "Multipayment".</li>
                    <li>Pilih penyedia jasa atau masukkan kode perusahaan (jika ada).</li>
                    <li>Masukkan nomor Virtual Account Mandiri Anda (<span class="font-bold">${virtualAccount}</span>).</li>
                    <li>Ikuti instruksi selanjutnya di layar.</li>
                </ol>
            `;
        } else if (bankNameLower.includes("bri")) {
            mbankingHtml = `
                <p><strong>Langkah-langkah Transfer BRI via m-Banking (BRImo):</strong></p>
                <ol class="list-decimal list-inside ml-4 mt-2">
                    <li>Pilih menu "Pembayaran" > "BRIVA".</li>
                    <li>Masukkan Nomor Virtual Account BRI Anda (<span class="font-bold">${virtualAccount}</span>).</li>
                    <li>Verifikasi detail pembayaran dan konfirmasi.</li>
                    <li>Masukkan PIN Mobile Banking BRI Anda.</li>
                    <li>Pembayaran selesai.</li>
                </ol>
            `;
        } else {
            mbankingHtml = `<p class="text-gray-700">Instruksi m-Banking untuk bank ini belum tersedia.</p>`;
        }
        mbankingContentEl.innerHTML = mbankingHtml;
    } else {
        console.warn("Element mbankingInstructionsContent not found.");
    }

    // --- Isi Instruksi ATM ---
    if (atmContentEl) {
        let atmHtml = '';
        if (bankData && bankData.instructions_atm) {
            atmHtml += `<p><strong>Langkah-langkah Transfer ${bankData.name || 'Bank'} via ATM:</strong></p>`;
            const atmSteps = Array.isArray(bankData.instructions_atm) ? bankData.instructions_atm : bankData.instructions_atm.split('\n');
            atmHtml += `<ol class="list-decimal list-inside ml-4 mt-2">`;
            atmSteps.forEach(step => {
                let formattedStep = step.replace(/NOMOR_VA/g, `<span class="font-bold">${virtualAccount}</span>`)
                    .replace(/NAMA_PEMILIK/g, `<span class="font-bold">${accountHolder}</span>`);
                atmHtml += `<li>${formattedStep}</li>`;
            });
            atmHtml += `</ol>`;
        } else if (bankNameLower.includes("bca")) {
            atmHtml = `
                <p><strong>Langkah-langkah Transfer BCA via ATM:</strong></p>
                <ol class="list-decimal list-inside ml-4 mt-2">
                    <li>Pilih "Transaksi Lainnya" > "Transfer" > "Ke Rek BCA Virtual Account".</li>
                    <li>Masukkan nomor Virtual Account <span class="font-bold">${virtualAccount}</span>.</li>
                    <li>Periksa informasi yang tertera di layar. Pastikan username kamu <span class="font-bold">${accountHolder}</span>.</li>
                    <li>Konfirmasi pembayaran.</li>
                </ol>
            `;
        } else if (bankNameLower.includes("mandiri")) {
            atmHtml = `
                <p><strong>Langkah-langkah Transfer Mandiri via ATM:</strong></p>
                <ol class="list-decimal list-inside ml-4 mt-2">
                    <li>Pilih "Bayar/Beli" > "Multipayment".</li>
                    <li>Masukkan kode perusahaan (jika ada) atau pilih dari daftar.</li>
                    <li>Masukkan nomor Virtual Account Mandiri Anda (<span class="font-bold">${virtualAccount}</span>).</li>
                    <li>Konfirmasi pembayaran.</li>
                </ol>
            `;
        } else if (bankNameLower.includes("bri")) {
            atmHtml = `
                <p><strong>Langkah-langkah Transfer BRI via ATM:</strong></p>
                <ol class="list-decimal list-inside ml-4 mt-2">
                    <li>Pilih "Transaksi Lainnya" > "Pembayaran" > "BRIVA".</li>
                    <li>Masukkan Nomor Virtual Account BRI Anda (<span class="font-bold">${virtualAccount}</span>).</li>
                    <li>Verifikasi detail pembayaran dan konfirmasi.</li>
                    <li>Pembayaran selesai.</li>
                </ol>
            `;
        } else {
            atmHtml = `<p class="text-gray-700">Instruksi ATM untuk bank ini belum tersedia.</p>`;
        }
        atmContentEl.innerHTML = atmHtml;
    } else {
        console.warn("Element atmInstructionsContent not found.");
    }

    // --- Isi Instruksi i-Banking ---
    if (ibankingContentEl) {
        let ibankingHtml = '';
        if (bankData && bankData.instructions_ibanking) {
            ibankingHtml += `<p><strong>Langkah-langkah Transfer ${bankData.name || 'Bank'} via Internet Banking:</strong></p>`;
            const ibankingSteps = Array.isArray(bankData.instructions_ibanking) ? bankData.instructions_ibanking : bankData.instructions_ibanking.split('\n');
            ibankingHtml += `<ol class="list-decimal list-inside ml-4 mt-2">`;
            ibankingSteps.forEach(step => {
                let formattedStep = step.replace(/NOMOR_VA/g, `<span class="font-bold">${virtualAccount}</span>`)
                    .replace(/NAMA_PEMILIK/g, `<span class="font-bold">${accountHolder}</span>`);
                ibankingHtml += `<li>${formattedStep}</li>`;
            });
            ibankingHtml += `</ol>`;
        } else if (bankNameLower.includes("bca")) {
            ibankingHtml = `
                <p><strong>Langkah-langkah Transfer BCA via Internet Banking (KlikBCA):</strong></p>
                <ol class="list-decimal list-inside ml-4 mt-2">
                    <li>Login ke KlikBCA Individual.</li>
                    <li>Pilih "Transfer Dana" > "Transfer ke BCA Virtual Account".</li>
                    <li>Masukkan nomor Virtual Account <span class="font-bold">${virtualAccount}</span>.</li>
                    <li>Lanjutkan dan ikuti instruksi.</li>
                </ol>
            `;
        } else if (bankNameLower.includes("mandiri")) {
            ibankingHtml = `
                <p><strong>Langkah-langkah Transfer Mandiri via Internet Banking (Mandiri Online):</strong></p>
                <ol class="list-decimal list-inside ml-4 mt-2">
                    <li>Login ke Mandiri Online.</li>
                    <li>Pilih "Pembayaran" > "Multipayment".</li>
                    <li>Pilih penyedia jasa atau masukkan kode perusahaan (jika ada).</li>
                    <li>Masukkan nomor Virtual Account Mandiri Anda (<span class="font-bold">${virtualAccount}</span>).</li>
                    <li>Lanjutkan dan ikuti instruksi.</li>
                </ol>
            `;
        } else if (bankNameLower.includes("bri")) {
            ibankingHtml = `
                <p><strong>Langkah-langkah Transfer BRI via Internet Banking (IB BRI):</strong></p>
                <ol class="list-decimal list-inside ml-4 mt-2">
                    <li>Login ke IB BRI.</li>
                    <li>Pilih "Pembayaran" > "BRIVA".</li>
                    <li>Masukkan Nomor Virtual Account BRI Anda (<span class="font-bold">${virtualAccount}</span>).</li>
                    <li>Verifikasi detail pembayaran dan konfirmasi.</li>
                    <li>Pembayaran selesai.</li>
                </ol>
            `;
        } else {
            ibankingHtml = `<p class="text-gray-700">Instruksi Internet Banking untuk bank ini belum tersedia.</p>`;
        }
        ibankingContentEl.innerHTML = ibankingHtml;
    } else {
        console.warn("Element ibankingInstructionsContent not found.");
    }
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded for pembeli_pembayaran.js");

    // --- Inisialisasi DOM Elements ---
    totalPembayaranEl = document.getElementById('totalPembayaranDisplay');
    bayarDalamEl = document.getElementById('countdownDisplay');
    bankNameDisplayEl = document.getElementById('bankNameDisplay');
    bankLogoDisplayEl = document.getElementById('bankLogoDisplay'); // Inisialisasi elemen logo
    virtualAccountDisplayEl = document.getElementById('accountNumberDisplay');
    copyButton = document.getElementById('copyAccountBtn');
    ownerNameDisplayEl = document.getElementById('accountHolderDisplay');

    // Inisialisasi semua elemen <details>
    detailsElements = document.querySelectorAll('details');

    // Inisialisasi Custom Confirm Modal Elements
    customConfirmModal = document.getElementById('custom-confirm-modal');
    customConfirmTitle = document.getElementById('custom-confirm-title');
    customConfirmMessage = document.getElementById('custom-confirm-message');
    customCancelBtn = document.getElementById('custom-cancel-btn');
    customConfirmBtn = document.getElementById('custom-confirm-btn');

    // Add event listeners for custom confirmation modal buttons
    if (customCancelBtn) {
        customCancelBtn.addEventListener('click', () => {
            if (customConfirmModal) customConfirmModal.classList.add('hidden'); // Hide modal
            customConfirmCallback = null;
        });
    }
    if (customConfirmBtn) {
        customConfirmBtn.addEventListener('click', () => {
            if (customConfirmModal) customConfirmModal.classList.add('hidden'); // Hide modal
            if (customConfirmCallback) {
                customConfirmCallback();
            }
            customConfirmCallback = null;
        });
    }

    // Event listener for modal backdrop click to close custom confirm modal
    if (customConfirmModal) {
        customConfirmModal.addEventListener('click', (event) => {
            if (event.target === customConfirmModal) {
                customConfirmModal.classList.add('hidden'); // Hide modal
                customConfirmCallback = null;
            }
        });
    }

    // --- Event listener untuk tombol Salin Virtual Account ---
    if (copyButton && virtualAccountDisplayEl) {
        copyButton.addEventListener('click', () => {
            if (virtualAccountDisplayEl.textContent && virtualAccountDisplayEl.textContent !== "Memuat..." && virtualAccountDisplayEl.textContent !== "N/A") {
                navigator.clipboard.writeText(virtualAccountDisplayEl.textContent)
                    .then(() => {
                        showCustomConfirm("Nomor Virtual Account disalin: " + virtualAccountDisplayEl.textContent, null, false, "Berhasil");
                    })
                    .catch(err => {
                        console.error("Failed to copy text: ", err);
                        showCustomConfirm("Gagal menyalin. Browser Anda mungkin tidak mendukung fitur ini atau ada masalah izin. Silakan salin secara manual.", null, false, "Error");
                    });
            } else {
                showCustomConfirm("Nomor Virtual Account belum tersedia untuk disalin.", null, false, "Informasi");
            }
        });
    } else {
        console.warn("Tombol salin atau elemen tampilan VA tidak ditemukan. Fungsi salin VA tidak aktif.");
    }

    // --- Event listener untuk tombol "Saya Sudah Bayar"
    const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', () => {
            showCustomConfirm("Apakah Anda yakin sudah melakukan pembayaran? Pesanan akan diperbarui menjadi 'Menunggu Verifikasi'.", async () => {
                if (currentOrderId) {
                    await updateOrderStatus(currentOrderId, "Menunggu Verifikasi");
                    showCustomConfirm("Pembayaran Anda sedang dalam proses verifikasi. Silakan cek status pesanan Anda di riwayat pembelian.", () => {
                        window.location.href = 'pembeli_pesanan_saya.html';
                    }, false, "Konfirmasi Pembayaran");
                } else {
                    showCustomConfirm("Tidak dapat mengkonfirmasi pembayaran. Data pesanan tidak ditemukan.", null, false, "Error");
                }
            }, true, "Konfirmasi Pembayaran");
        });
    }

    // --- Event listener untuk tombol "Batalkan Pesanan"
    const cancelOrderBtn = document.getElementById('cancelOrderBtn');
    if (cancelOrderBtn) {
        cancelOrderBtn.addEventListener('click', () => {
            showCustomConfirm("Apakah Anda yakin ingin membatalkan pesanan ini? Aksi ini tidak dapat dibatalkan.", async () => {
                if (currentOrderId) {
                    await updateOrderStatus(currentOrderId, "Dibatalkan");
                    showCustomConfirm("Pesanan Anda telah dibatalkan.", () => {
                        window.location.href = 'pembeli_keranjang.html';
                    }, false, "Pembatalan Pesanan");
                } else {
                    showCustomConfirm("Tidak dapat membatalkan pesanan. Data pesanan tidak ditemukan.", null, false, "Error");
                }
            }, true, "Pembatalan Pesanan");
        });
    }

    // --- AKORDEON LOGIC for <details> elements ---
    detailsElements.forEach(details => {
        const summaryIcon = details.querySelector('svg');

        // Pastikan ikon SVG ada sebelum menambahkan listener
        if (summaryIcon) {
            details.addEventListener('toggle', () => {
                if (details.open) {
                    // Tutup semua 'details' lainnya saat satu dibuka
                    detailsElements.forEach(otherDetails => {
                        if (otherDetails !== details && otherDetails.open) {
                            otherDetails.open = false;
                            // Pastikan ikon panah yang ditutup juga kembali ke posisi awal
                            const otherSummaryIcon = otherDetails.querySelector('svg');
                            if (otherSummaryIcon) {
                                otherSummaryIcon.classList.remove('rotate-180');
                            }
                        }
                    });
                    summaryIcon.classList.add('rotate-180'); // Rotasikan ikon panah saat dibuka
                } else {
                    summaryIcon.classList.remove('rotate-180'); // Kembalikan ikon panah saat ditutup
                }
            });
        }
    });

    // Pastikan Firebase auth state sudah siap sebelum memuat data
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("User logged in, proceeding to load payment data.");
            loadPaymentData();
        } else {
            console.log("User is not logged in. Redirecting to login page.");
            showCustomConfirm("Anda harus login untuk melihat detail pembayaran.", () => {
                window.location.href = 'pembeli_login.html';
            }, false, "Akses Ditolak");
        }
    });
});

// Fungsi navigasi (jika dibutuhkan)
function logoutUser() {
    // Implementasi logout Firebase di sini (misalnya signOut(auth))
    console.log("Logout function called.");
    // Example: signOut(auth).then(() => { window.location.href = 'pembeli_login.html'; });
}

function openChatCS() {
    showCustomConfirm("Fitur chat dengan CS belum tersedia.", null, false, "Informasi");
}