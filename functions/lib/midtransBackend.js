"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMidtransTransaction = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger")); // logger diimpor karena digunakan di sini
const functions = __importStar(require("firebase-functions")); // Diperlukan untuk functions.config()
// Dapatkan server key dari konfigurasi lingkungan Firebase
// Pastikan Anda telah menjalankan: firebase functions:config:set midtrans.server_key="SB-Mid-server-Rf6ncE_a1qU_rEF30D1s2u8G" --project titipgo-28f84
const MIDTRANS_SERVER_KEY = (_a = functions.config().midtrans) === null || _a === void 0 ? void 0 : _a.server_key;
if (!MIDTRANS_SERVER_KEY) {
    logger.error("MIDTRANS_SERVER_KEY not set in Firebase environment config!");
    // Dalam skenario nyata, Anda mungkin ingin melempar error atau menangani ini dengan lebih baik saat deployment.
}
/**
 * Fungsi HTTPS Callable untuk membuat transaksi Midtrans.
 * Dipanggil dari sisi klien untuk memulai alur pembayaran.
 */
exports.createMidtransTransaction = (0, https_1.onCall)(async (request) => {
    logger.info("createMidtransTransaction called", request.data);
    // Pastikan pengguna terautentikasi
    if (!request.auth) {
        logger.warn("Unauthenticated request to createMidtransTransaction");
        throw new https_1.HttpsError('unauthenticated', 'Pengguna harus login untuk membuat transaksi.');
    }
    // Pastikan server key tersedia
    if (!MIDTRANS_SERVER_KEY) {
        logger.error("Midtrans Server Key is missing for transaction creation.");
        throw new https_1.HttpsError('internal', 'Konfigurasi server pembayaran tidak lengkap.');
    }
    const { products, total, namaPenerima, teleponPenerima, alamatLengkap, emailPengguna, } = request.data;
    // Validasi data input dasar
    if (!products || products.length === 0 || !total || !namaPenerima ||
        !teleponPenerima || !alamatLengkap) {
        logger.warn("Invalid input data for transaction", request.data);
        throw new https_1.HttpsError('invalid-argument', 'Data transaksi tidak lengkap.');
    }
    // Buat parameter transaksi untuk Midtrans
    const parameter = {
        transaction_details: {
            order_id: `ORDER-${Date.now()}-${request.auth.uid.substring(0, 5)}`, // Contoh order ID unik
            gross_amount: total,
        },
        credit_card: {
            secure: true,
        },
        customer_details: {
            first_name: namaPenerima,
            email: emailPengguna || "no-email@example.com", // Fallback jika email tidak tersedia
            phone: teleponPenerima,
            billing_address: {
                first_name: namaPenerima,
                email: emailPengguna || "no-email@example.com",
                phone: teleponPenerima,
                address: alamatLengkap,
                city: "Jakarta", // Sesuaikan dengan kota yang relevan atau ambil dari input
                postal_code: "10220", // Sesuaikan atau ambil dari input
                country_code: "IDN",
            },
            shipping_address: {
                first_name: namaPenerima,
                email: emailPengguna || "no-email@example.com",
                phone: teleponPenerima,
                address: alamatLengkap,
                city: "Jakarta", // Sesuaikan dengan kota yang relevan atau ambil dari input
                postal_code: "10220", // Sesuaikan atau ambil dari input
                country_code: "IDN",
            },
        },
        item_details: products.map((item) => ({
            id: item.name.replace(/\s/g, '-').toLowerCase().substring(0, 20), // Contoh ID item, batasi panjang
            price: item.price,
            quantity: item.quantity,
            name: item.name.substring(0, 50), // Batasi panjang nama item
        })),
    };
    try {
        // Panggil API Midtrans untuk mendapatkan Snap Token
        // Menggunakan fetch bawaan Node.js (pastikan runtime Node.js di Functions adalah 18 atau lebih baru)
        // URL untuk sandbox: https://app.sandbox.midtrans.com/snap/v1/transactions
        // URL untuk produksi: https://app.midtrans.com/snap/v1/transactions
        const midtransApiUrl = "https://app.sandbox.midtrans.com/snap/v1/transactions"; // Ganti ke URL produksi jika sudah siap
        const response = await fetch(midtransApiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": "Basic " + Buffer.from(MIDTRANS_SERVER_KEY + ":").toString("base64"),
            },
            body: JSON.stringify(parameter),
        });
        const snapResponse = await response.json();
        if (response.ok) {
            logger.info("Snap Token received successfully", { orderId: parameter.transaction_details.order_id, snapToken: snapResponse.token });
            return { snapToken: snapResponse.token, orderId: parameter.transaction_details.order_id };
        }
        else {
            logger.error("Midtrans API Error response", { status: response.status, body: snapResponse });
            throw new https_1.HttpsError('internal', 'Gagal membuat transaksi Midtrans. Detail: ' +
                (snapResponse.status_message || JSON.stringify(snapResponse)));
        }
    }
    catch (error) {
        logger.error("Error creating Midtrans transaction:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'Terjadi kesalahan saat memproses pembayaran.', error.message);
    }
});
//# sourceMappingURL=midtransBackend.js.map