// pembeli_keranjang.js

// Perbaikan: Impor semua yang diperlukan dari firebase-config.js
import { db, auth, onAuthStateChanged, signOut, collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc, addDoc, writeBatch, serverTimestamp } from './firebase-config.js';

let currentUserId = null;
let cartDataFromFirebase = []; // Array to hold fetched cart items

// Custom Confirmation/Alert Modal elements
const customConfirmModal = document.getElementById('custom-confirm-modal');
const customConfirmTitle = document.getElementById('custom-confirm-title');
const customConfirmMessage = document.getElementById('custom-confirm-message');
const customCancelBtn = document.getElementById('custom-cancel-btn');
const customConfirmBtn = document.getElementById('custom-confirm-btn');
let customConfirmCallback = null;

// Function to show custom confirmation/alert modal
function showCustomConfirm(message, callback, isConfirmation = false) {
    customConfirmMessage.textContent = message;
    customConfirmCallback = callback;
    customConfirmTitle.textContent = isConfirmation ? "Konfirmasi" : "Peringatan!";
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
    if (customConfirmModal) customConfirmModal.classList.add('show'); // Safety check
}

if (customCancelBtn) {
    customCancelBtn.addEventListener('click', () => {
        if (customConfirmModal) customConfirmModal.classList.remove('show');
        customConfirmCallback = null;
    });
}

if (customConfirmBtn) {
    customConfirmBtn.addEventListener('click', () => {
        if (customConfirmModal) customConfirmModal.classList.remove('show');
        if (customConfirmCallback) {
            customConfirmCallback();
        }
        customConfirmCallback = null;
    });
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

// --- Firebase Cart Functions ---
async function fetchCartItems() {
    if (!currentUserId) {
        console.log("User not authenticated, cannot fetch cart items.");
        const content = document.getElementById('keranjangContent');
        const footer = document.getElementById('keranjangFooter');
        const empty = document.getElementById('keranjangKosong');
        if (content) content.innerHTML = '';
        if (footer) footer.style.display = 'none';
        if (empty) empty.style.display = 'flex';
        return;
    }

    try {
        const cartRef = collection(db, "users", currentUserId, "keranjang");
        const q = query(cartRef);
        const querySnapshot = await getDocs(q);

        cartDataFromFirebase = [];
        querySnapshot.forEach(doc => {
            // Initialize 'selected' property for each item, default to true
            cartDataFromFirebase.push({ id: doc.id, ...doc.data(), selected: true });
        });
        console.log("Fetched cart items from Firebase:", cartDataFromFirebase);
        displayCart();
    } catch (error) {
        console.error("Error fetching cart items:", error);
        showCustomConfirm("Gagal memuat keranjang: " + error.message, null);
        const content = document.getElementById('keranjangContent');
        const footer = document.getElementById('keranjangFooter');
        const empty = document.getElementById('keranjangKosong');
        if (content) content.innerHTML = '';
        if (footer) footer.style.display = 'none';
        if (empty) empty.style.display = 'flex';
    }
}

function displayCart() {
    const content = document.getElementById('keranjangContent');
    const footer = document.getElementById('keranjangFooter');
    const empty = document.getElementById('keranjangKosong');

    if (!content || !footer || !empty) {
        console.error("One or more required DOM elements for cart display are missing.");
        return;
    }

    if (cartDataFromFirebase.length === 0) {
        content.innerHTML = '';
        footer.style.display = 'none';
        empty.style.display = 'flex';
        return;
    }

    empty.style.display = 'none';
    footer.style.display = 'block';

    // Group products by store
    const groupedByStore = {};
    cartDataFromFirebase.forEach(item => {
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
        // Determine if all products in this store are selected for the store checkbox
        const isStoreSelected = store.products.every(p => p.selected);

        htmlContent += `
            <div class="keranjang-store-section" data-store-id="${storeId}">
                <div class="keranjang-store-header">
                    <input type="checkbox" class="store-checkbox" ${isStoreSelected ? 'checked' : ''} onchange="toggleStoreSelection('${storeId}')">
                    <span class="keranjang-store-name">${store.name}</span>
                </div>
                ${store.products.map(product => `
                    <div class="keranjang-item" data-cart-item-id="${product.id}">
                        <div class="keranjang-item-checkbox">
                            <input type="checkbox" class="product-checkbox" ${product.selected ? 'checked' : ''} onchange="toggleProductSelection('${product.id}')">
                        </div>
                        <div class="keranjang-item-image">
                            <img src="${product.imageUrl || 'https://placehold.co/60x60/E0F2F7/2C3E50?text=No+Image'}" alt="${product.namaBarang}" onerror="this.onerror=null;this.src='https://placehold.co/60x60/E0F2F7/2C3E50?text=No+Image';">
                        </div>
                        <div class="keranjang-item-info">
                            <div class="keranjang-item-name">${product.namaBarang || 'Nama Produk Tidak Dikenal'}</div>
                            ${product.variant ? `<div class="keranjang-item-variant">${product.variant}</div>` : ''}
                        </div>
                        <div class="keranjang-item-price">${formatRupiah(parseFloat(product.harga) || 0)}</div>
                        <div class="keranjang-item-quantity">
                            <button onclick="decreaseQuantity('${product.id}')">-</button>
                            <span>${product.quantity}</span>
                            <button onclick="increaseQuantity('${product.id}')">+</button>
                        </div>
                        <div class="keranjang-item-total">${formatRupiah((parseFloat(product.harga) || 0) * (parseInt(product.quantity) || 0))}</div>
                        <div class="keranjang-item-actions">
                            <button class="btn-hapus-semua" onclick="hapusItem('${product.id}')">Hapus</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    content.innerHTML = htmlContent;
    updateTotal();
    updateSelectAll();
}

window.toggleStoreSelection = function (storeId) {
    const productsInStore = cartDataFromFirebase.filter(item => item.tokoId === storeId);
    const currentStoreSelection = productsInStore.every(item => item.selected); // Check current state

    productsInStore.forEach(item => {
        item.selected = !currentStoreSelection; // Toggle selection for all products in this store
    });
    displayCart(); // Re-render to update checkboxes and totals
};

window.toggleProductSelection = function (cartItemId) {
    const product = cartDataFromFirebase.find(item => item.id === cartItemId);
    if (product) {
        product.selected = !product.selected;
    }
    displayCart(); // Re-render to update checkboxes and totals
};

window.toggleSelectAll = function () {
    const selectAllCheckbox = document.getElementById('selectAll');
    if (!selectAllCheckbox) return;

    const allSelected = selectAllCheckbox.checked;

    cartDataFromFirebase.forEach(item => {
        item.selected = allSelected;
    });
    displayCart(); // Re-render to update all checkboxes and totals
};

function updateSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const totalProductsInCart = cartDataFromFirebase.length;
    const selectedProductsInCart = cartDataFromFirebase.filter(p => p.selected).length;

    if (selectAllCheckbox) {
        selectAllCheckbox.checked = selectedProductsInCart === totalProductsInCart && totalProductsInCart > 0;
        selectAllCheckbox.indeterminate = selectedProductsInCart > 0 && selectedProductsInCart < totalProductsInCart;
    }

    const totalProductsCountEl = document.getElementById('totalProductsCount');
    if (totalProductsCountEl) totalProductsCountEl.textContent = totalProductsInCart.toString();
}

window.increaseQuantity = async function (cartItemId) {
    const itemRef = doc(db, "users", currentUserId, "keranjang", cartItemId);
    try {
        const itemSnap = await getDoc(itemRef);
        if (itemSnap.exists()) {
            const currentQuantity = itemSnap.data().quantity;
            const productId = itemSnap.data().productId;
            const itemVariant = itemSnap.data().variant; // Get variant name from cart item

            let availableStock = 0;
            const productRef = doc(db, "produk", productId);
            const productSnap = await getDoc(productRef);

            if (productSnap.exists()) {
                const productData = productSnap.data();
                if (productData.variants && productData.variants.length > 0 && itemVariant) {
                    const foundVariant = productData.variants.find(v => v.name === itemVariant);
                    availableStock = foundVariant ? (parseInt(foundVariant.stock) || 0) : (parseInt(productData.stok) || 0);
                } else {
                    availableStock = parseInt(productData.stok) || 0;
                }
            }

            if (currentQuantity < availableStock) {
                await updateDoc(itemRef, { quantity: currentQuantity + 1 });
                await fetchCartItems(); // Re-fetch and re-render
            } else {
                showCustomConfirm("Jumlah maksimum tercapai (Stok tersedia: " + availableStock + ").", null);
            }
        }
    } catch (error) {
        console.error("Error increasing quantity:", error);
        showCustomConfirm("Gagal menambah jumlah: " + error.message, null);
    }
};


window.decreaseQuantity = async function (cartItemId) {
    const itemRef = doc(db, "users", currentUserId, "keranjang", cartItemId);
    try {
        const itemSnap = await getDoc(itemRef);
        if (itemSnap.exists()) {
            const currentQuantity = itemSnap.data().quantity;
            if (currentQuantity > 1) {
                await updateDoc(itemRef, { quantity: currentQuantity - 1 });
                await fetchCartItems(); // Re-fetch and re-render
            } else {
                showCustomConfirm("Jumlah minimum adalah 1.", null);
            }
        }
    } catch (error) {
        console.error("Error decreasing quantity:", error);
        showCustomConfirm("Gagal mengurangi jumlah: " + error.message, null);
    }
};

window.hapusItem = function (cartItemId) {
    showCustomConfirm('Apakah Anda yakin ingin menghapus item ini?', async () => {
        try {
            await deleteDoc(doc(db, "users", currentUserId, "keranjang", cartItemId));
            showCustomConfirm("Item berhasil dihapus!", async () => {
                await fetchCartItems(); // Re-fetch and re-render
            }, false);
        } catch (error) {
            console.error("Error deleting item:", error);
            showCustomConfirm("Gagal menghapus item: " + error.message, null);
        }
    }, true);
};

window.hapusSelected = function () {
    const selectedItemsToDelete = cartDataFromFirebase.filter(item => item.selected);

    if (selectedItemsToDelete.length === 0) {
        showCustomConfirm('Tidak ada item yang dipilih untuk dihapus!', null);
        return;
    }

    showCustomConfirm(`Apakah Anda yakin ingin menghapus ${selectedItemsToDelete.length} item yang dipilih?`, async () => {
        try {
            const batch = writeBatch(db);
            for (const item of selectedItemsToDelete) {
                const itemRef = doc(db, "users", currentUserId, "keranjang", item.id);
                batch.delete(itemRef);
            }
            await batch.commit(); // Commit all deletions in one go

            showCustomConfirm("Item yang dipilih berhasil dihapus!", async () => {
                await fetchCartItems(); // Re-fetch and re-render
            }, false);
        } catch (error) {
            console.error("Error deleting selected items:", error);
            showCustomConfirm("Gagal menghapus item yang dipilih: " + error.message, null);
        }
    }, true);
};

function updateTotal() {
    let totalPrice = 0;
    let selectedCount = 0;

    cartDataFromFirebase.forEach(item => {
        if (item.selected) {
            totalPrice += (parseFloat(item.harga) || 0) * (parseInt(item.quantity) || 0);
            selectedCount++;
        }
    });

    const totalPriceEl = document.getElementById('totalPrice');
    const selectedProductsCountEl = document.getElementById('selectedProductsCount');

    if (totalPriceEl) totalPriceEl.textContent = formatRupiah(totalPrice);
    if (selectedProductsCountEl) selectedProductsCountEl.textContent = selectedCount.toString();
}

window.lanjutkanCheckout = async function () {
    const selectedItemsForCheckout = cartDataFromFirebase.filter(item => item.selected);

    if (selectedItemsForCheckout.length === 0) {
        showCustomConfirm('Pilih minimal satu produk untuk checkout!', null);
        return;
    }

    try {
        // Prepare order data
        const orderItems = selectedItemsForCheckout.map(item => ({
            productId: item.productId,
            namaBarang: item.namaBarang || 'Produk Tidak Dikenal', // Pastikan ada fallback
            imageUrl: item.imageUrl || 'https://placehold.co/70x70/E0F2F7/2C3E50?text=No+Image', // Pastikan ada fallback
            harga: parseFloat(item.harga) || 0, // Pastikan di-parse dan ada fallback
            quantity: parseInt(item.quantity) || 1, // Pastikan di-parse dan ada fallback
            variant: item.variant || null, // Varian bisa null
            tokoId: item.tokoId || 'toko_default', // <<< PENTING: Pastikan tokoId selalu ada!
            namaToko: item.namaToko || 'Toko Default', // <<< PENTING: Pastikan namaToko selalu ada!
            // Add any other relevant product details needed for the order
        }));

        const totalOrderPrice = orderItems.reduce((sum, item) => sum + (item.harga * item.quantity), 0);

        const newOrderData = {
            userId: currentUserId, // <<< PERBAIKAN: Mengubah dari 'pembeliId' menjadi 'userId'
            items: orderItems,
            totalPrice: totalOrderPrice,
            status: 'Menunggu Pembayaran', // Initial status
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            // You might add shipping address, payment method etc. here later
        };

        // Add the new order to the 'orders' collection
        const orderDocRef = await addDoc(collection(db, "orders"), newOrderData);
        const orderId = orderDocRef.id;

        // After successful order creation, remove these items from the user's cart
        const batch = writeBatch(db);
        for (const item of selectedItemsForCheckout) {
            const cartItemRef = doc(db, "users", currentUserId, "keranjang", item.id);
            batch.delete(cartItemRef);
        }
        await batch.commit();

        showCustomConfirm("Pesanan berhasil dibuat! Anda akan diarahkan ke halaman pembayaran.", () => {
            // Pass the orderId to the checkout page instead of the full cart data
            localStorage.setItem('currentOrderId', orderId);
            window.location.href = 'pembeli_checkout.html';
        }, false);

    } catch (error) {
        console.error("Error creating order:", error);
        showCustomConfirm("Gagal membuat pesanan: " + error.message, null);
    }
};

// --- Header Dropdown & Logout Functions (from previous discussions) ---
const userIcon = document.getElementById('userIcon');
const userDropdown = document.getElementById('userDropdown');
const tokoSayaLink = document.getElementById('tokoSayaLink');

if (userIcon) {
    userIcon.addEventListener('click', function (event) {
        event.preventDefault();
        if (userDropdown) userDropdown.classList.toggle('hidden');
    });
}

document.addEventListener('click', function (event) {
    if (userIcon && userDropdown && !userIcon.contains(event.target) && !userDropdown.contains(event.target)) {
        userDropdown.classList.add('hidden');
    }
});

window.logoutUser = async function () {
    showCustomConfirm("Anda yakin ingin logout?", async () => {
        try {
            await signOut(auth);
            showCustomConfirm("Anda telah logout!", () => {
                window.location.href = 'pembeli_login.html'; // Redirect to login page after logout
            }, false);
        } catch (error) {
            console.error("Error during logout:", error);
            showCustomConfirm("Gagal logout. Silakan coba lagi.", null, false);
        }
    }, true); // true for confirmation type modal
};

window.openChatCS = function () {
    // Placeholder function for chat CS
    showCustomConfirm("Fungsi Chat dengan CS belum diimplementasikan.", null, false);
};

window.openTokoSaya = async function () {
    if (!currentUserId) {
        showCustomConfirm("Anda harus login untuk mengakses Toko Saya.", () => {
            window.location.href = 'pembeli_login.html';
        }, false);
        return;
    }

    try {
        const tokoQuery = query(collection(db, "toko"), where("ownerId", "==", currentUserId));
        const tokoSnap = await getDocs(tokoQuery);

        if (!tokoSnap.empty) {
            // User owns a store, redirect to their store dashboard
            const tokoDoc = tokoSnap.docs[0];
            window.location.href = `jastiper_dashboard.html?storeId=${tokoDoc.id}`;
        } else {
            // User does not own a store, offer to create one or go to a generic page
            showCustomConfirm("Anda belum memiliki toko. Apakah Anda ingin membuat toko?", () => {
                // Redirect to store creation page or offer creation flow
                showCustomConfirm("Fungsi pembuatan toko belum diimplementasikan.", null, false);
            }, true);
        }
    } catch (error) {
        console.error("Error checking store ownership:", error);
        showCustomConfirm("Gagal memeriksa status toko Anda. Silakan coba lagi.", null, false);
    }
};


// Initial load
document.addEventListener('DOMContentLoaded', () => {
    // Ensure Firebase auth state is ready before loading data
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log("User is logged in:", currentUserId);
            fetchCartItems(); // Load cart data after user is authenticated
        } else {
            currentUserId = null;
            console.log("User is not logged in.");
            showCustomConfirm("Anda harus login untuk melihat keranjang Anda.", () => {
                window.location.href = 'pembeli_login.html';
            });
        }
    });
});
