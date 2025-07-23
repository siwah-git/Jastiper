import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as midtransClient from "midtrans-client";
import * as corsLib from "cors";

const cors = corsLib({ origin: true });

admin.initializeApp();

exports.createMidtransTransaction = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Pengguna harus terautentikasi."
      );
    }

    return cors(context.req, context.res, async () => {
      if (
        !data.products ||
        !Array.isArray(data.products) ||
        data.products.length === 0 ||
        !data.total ||
        !data.namaPenerima ||
        !data.teleponPenerima ||
        !data.alamatLengkap
      ) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Data transaksi tidak lengkap."
        );
      }

      try {
        const MIDTRANS_SERVER_KEY = functions.config().midtrans.server_key;
        const MIDTRANS_CLIENT_KEY = functions.config().midtrans.client_key;

        if (!MIDTRANS_SERVER_KEY) {
          throw new Error(
            "Server Key Midtrans tidak ditemukan dalam konfigurasi Firebase."
          );
        }

        const snap = new midtransClient.Snap({
          isProduction: false,
          serverKey: MIDTRANS_SERVER_KEY,
          clientKey: MIDTRANS_CLIENT_KEY,
        });

        const orderId = `ORDER-${Date.now()}-${Math.floor(
          Math.random() * 10000
        )}`;

        const itemDetails = data.products.map((product) => ({
          id: product.name.replace(/\s/g, "-").toLowerCase().substring(0, 50),
          name: product.name,
          price: product.price,
          quantity: product.quantity,
        }));

        if (data.shipping && data.shipping > 0) {
          itemDetails.push({
            id: "shipping-fee",
            name: "Biaya Pengiriman",
            price: data.shipping,
            quantity: 1,
          });
        }

        if (data.service && data.service > 0) {
          itemDetails.push({
            id: "service-fee",
            name: "Biaya Layanan",
            price: data.service,
            quantity: 1,
          });
        }

        if (data.jastiper && data.jastiper > 0) {
          itemDetails.push({
            id: "jastiper-fee",
            name: "Fee Jastiper",
            price: data.jastiper,
            quantity: 1,
          });
        }

        const transactionDetails = {
          transaction_details: {
            order_id: orderId,
            gross_amount: data.total,
          },
          credit_card: {
            secure: true,
          },
          customer_details: {
            first_name: data.namaPenerima,
            email: data.emailPengguna || "no-email@example.com",
            phone: data.teleponPenerima,
            billing_address: {
              first_name: data.namaPenerima,
              email: data.emailPengguna || "no-email@example.com",
              phone: data.teleponPenerima,
              address: data.alamatLengkap,
              country_code: "IDN",
            },
            shipping_address: {
              first_name: data.namaPenerima,
              email: data.emailPengguna || "no-email@example.com",
              phone: data.teleponPenerima,
              address: data.alamatLengkap,
              country_code: "IDN",
            },
          },
          item_details: itemDetails,
        };

        const snapToken = await snap.createTransactionToken(
          transactionDetails
        );

        return { snapToken, orderId };
      } catch (error: any) {
        console.error("Error creating Midtrans transaction:", error);
        throw new functions.https.HttpsError(
          "internal",
          `Gagal membuat transaksi Midtrans: ${error.message}`
        );
      }
    });
  }
);
