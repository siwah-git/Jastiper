import { HttpsError, onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger"; // logger diimpor karena digunakan di sini
import * as functions from "firebase-functions"; // Diperlukan untuk functions.config()

// Dapatkan server key dari konfigurasi lingkungan Firebase
// Pastikan Anda telah menjalankan: firebase functions:config:set midtrans.server_key="SB-Mid-server-Rf6ncE_a1qU_rEF30D1s2u8G" --project titipgo-28f84
const MIDTRANS_SERVER_KEY = functions.config().midtrans?.server_key;

if (!MIDTRANS_SERVER_KEY) {
  logger.error("MIDTRANS_SERVER_KEY not set in Firebase environment config!");
  // Dalam skenario nyata, Anda mungkin ingin melempar error atau menangani ini dengan lebih baik saat deployment.
}

/**
 * Fungsi HTTPS Callable untuk membuat transaksi Midtrans.
 * Dipanggil dari sisi klien untuk memulai alur pembayaran.
 */
export const createMidtransTransaction = onCall(async (request) => {
  logger.info("createMidtransTransaction called", request.data);

  // Pastikan pengguna terautentikasi
  if (!request.auth) {
    logger.warn("Unauthenticated request to createMidtransTransaction");
    throw new HttpsError("unauthenticated", "Pengguna harus login untuk membuat transaksi.");
  }

  // Pastikan server key tersedia
  if (!MIDTRANS_SERVER_KEY) {
    logger.error("Midtrans Server Key is missing for transaction creation.");
    throw new HttpsError("internal", "Konfigurasi server pembayaran tidak lengkap.");
  }

  const {
    products,
    total,
    namaPenerima,
    teleponPenerima,
    alamatLengkap,
    emailPengguna,
  } = request.data;

  // Validasi data input dasar
  if (!products || products.length === 0 || !total || !namaPenerima ||
        !teleponPenerima || !alamatLengkap) {
    logger.warn("Invalid input data for transaction", request.data);
    throw new HttpsError("invalid-argument", "Data transaksi tidak lengkap.");
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
    item_details: products.map((item: any) => ({ // Menggunakan any untuk fleksibilitas tipe
      id: item.name.replace(/\s/g, "-").toLowerCase().substring(0, 20), // Contoh ID item, batasi panjang
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
      logger.info("Snap Token received successfully",
        { orderId: parameter.transaction_details.order_id, snapToken: snapResponse.token });
      return { snapToken: snapResponse.token, orderId: parameter.transaction_details.order_id };
    } else {
      logger.error("Midtrans API Error response", { status: response.status, body: snapResponse });
      throw new HttpsError("internal",
        "Gagal membuat transaksi Midtrans. Detail: " +
                (snapResponse.status_message || JSON.stringify(snapResponse)));
    }
  } catch (error: any) {
    logger.error("Error creating Midtrans transaction:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Terjadi kesalahan saat memproses pembayaran.", error.message);
  }
});
