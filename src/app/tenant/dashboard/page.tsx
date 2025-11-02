"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/authProvider";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

// --- Tipe Data (Wajib untuk TypeScript) ---

interface Product {
  id: number;
  name: string;
  price: number;
  tenant_id: number;
}

interface Transaction {
  id: number;
  amount: number;
  type: "income" | "expense";
  description: string;
  transaction_date: string;
  tenant_id: number;
}

interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  netCash: number;
  totalSalesCount: number;
}

// --- Komponen Sidebar (TIDAK BERUBAH) ---
interface TenantSidebarProps {
  active: string;
  setActive: (value: string) => void;
  profileName: string;
  signOut: () => void;
}

const TenantSidebar: React.FC<TenantSidebarProps> = ({
  active,
  setActive,
  profileName,
  signOut,
}) => {
  const navItems = [
    { name: "Dashboard", icon: "🏠", path: "dashboard" },
    { name: "Tenant", icon: "🏢", path: "tenant" },
    { name: "Laporan", icon: "📊", path: "laporan" },
  ];

  return (
    <aside className="bg-gray-800 text-white w-64 p-4 min-h-screen flex flex-col justify-between">
      <div>
        <h2 className="text-xl font-bold mb-6">🏠 Tenant Portal</h2>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActive(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                active === item.path ? "bg-gray-700" : "hover:bg-gray-700"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6 border-t border-gray-700 pt-4">
        <p className="text-sm text-gray-300 mb-2">{profileName ?? "Tenant"}</p>
        <button
          onClick={signOut}
          className="w-full bg-red-600 hover:bg-red-700 py-2 rounded-lg text-sm font-semibold"
        >
          Keluar
        </button>
      </div>
    </aside>
  );
};

// --- 1. KOMPONEN DASHBOARD UTAMA (MODIFIKASI) ---
const DashboardContent = ({
  summary,
  loading,
}: {
  summary: DashboardSummary;
  loading: boolean;
}) => {
  if (loading) {
    // Tampilkan loading skeleton/indicator
    const loadingItems = [1, 2, 3, 4];
    return (
      <div className="p-8 w-full">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Ringkasan Cashflow Anda
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loadingItems.map((i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-xl shadow-lg animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-300 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3 mt-3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Data real-time
  const stats = [
    { label: "Pemasukan Hari Ini", value: summary.totalIncome, color: "green" },
    {
      label: "Pengeluaran Hari Ini",
      value: summary.totalExpense,
      color: "red",
    },
    { label: "Saldo Bersih", value: summary.netCash, color: "blue" },
    {
      label: "Total Transaksi",
      value: summary.totalSalesCount,
      color: "yellow",
      isCurrency: false,
    },
  ];

  const formatValue = (value: number, isCurrency: boolean = true) => {
    if (isCurrency) {
      return `Rp ${value.toLocaleString("id-ID")}`;
    }
    return value.toLocaleString("id-ID");
  };

  return (
    <div className="p-8 w-full">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Ringkasan Cashflow Hari Ini 📅
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`bg-white p-6 rounded-xl shadow-lg border-l-4 border-${stat.color}-500 transition-shadow hover:shadow-xl`}
          >
            <p className="text-sm font-semibold text-gray-500 uppercase">
              {stat.label}
            </p>
            <p className={`text-3xl font-extrabold mt-1 text-gray-700`}>
              {formatValue(stat.value, stat.isCurrency)}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Data dihitung dari transaksi hari ini.
            </p>
          </div>
        ))}
      </div>

      <h2 className="text-2xl font-semibold mt-10 mb-4 text-gray-800">
        Aktivitas Cepat
      </h2>
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <p className="text-gray-600">
          Gunakan tab "Jual Cepat" untuk mencatat penjualan produk.
        </p>
      </div>
    </div>
  );
};

// --- 2. KOMPONEN KELOLA PRODUK (CRUD) (TIDAK BERUBAH) ---
const ProductManagement = ({
  products,
  fetchProducts,
  userId,
  tenantId,
}: {
  products: Product[];
  fetchProducts: () => void;
  userId: string | undefined;
  tenantId: number | undefined;
}) => {
  // ... (Kode ProductManagement tetap sama) ...
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) {
      setMessage("Error: ID Tenant tidak ditemukan. Mohon refresh.");
      return;
    }
    setLoading(true);
    setMessage("");

    const newProduct = {
      name,
      price: parseFloat(price),
      tenant_id: tenantId, // ID Tenant (angka)
    };

    let error = null;

    if (editingProduct) {
      const { error: updateError } = await supabase
        .from("products")
        .update(newProduct)
        .eq("id", editingProduct.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("products")
        .insert([newProduct]);
      error = insertError;
    }

    setLoading(false);

    if (error) {
      setMessage(`Gagal menyimpan produk: ${error.message}`);
    } else {
      setMessage(
        `Produk berhasil ${editingProduct ? "diperbarui" : "ditambahkan"}!`
      );
      setName("");
      setPrice("");
      setEditingProduct(null);
      fetchProducts();
    }
  };

  const startEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(String(product.price));
    setMessage("");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus produk ini?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      setMessage(`Gagal menghapus produk: ${error.message}`);
    } else {
      setMessage("Produk berhasil dihapus!");
      fetchProducts();
    }
  };

  if (!tenantId && !loading)
    return <div className="p-8 text-red-600">Gagal memuat Tenant ID.</div>;

  return (
    <div className="p-8 w-full">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Kelola Produk ({products.length})
      </h1>
      {message && (
        <div
          className={`p-3 rounded mb-4 text-white ${
            message.includes("gagal") ? "bg-red-500" : "bg-green-500"
          }`}
        >
          {message}
        </div>
      )}

      {/* Form Tambah/Edit Produk */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
        </h2>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col md:flex-row gap-4 items-end"
        >
          <input
            type="text"
            placeholder="Nama Produk (contoh: Nasi Goreng)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1 p-2 border border-gray-300 rounded-md"
          />
          <input
            type="number"
            placeholder="Harga (Rp)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full md:w-1/4 p-2 border border-gray-300 rounded-md"
          />
          <div className="flex space-x-2 w-full md:w-auto">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto p-2 rounded-md text-white font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
            >
              {editingProduct ? "Update Produk" : "Simpan Produk"}
            </button>
            {editingProduct && (
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setName("");
                  setPrice("");
                }}
                className="w-full md:w-auto p-2 rounded-md text-gray-700 font-semibold bg-gray-200 hover:bg-gray-300"
              >
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Daftar Produk */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Daftar Produk Anda</h2>
        {products.length === 0 ? (
          <p className="text-gray-500">
            Belum ada produk. Silakan tambahkan satu di atas.
          </p>
        ) : (
          <ul className="space-y-3">
            {products.map((product) => (
              <li
                key={product.id}
                className="flex justify-between items-center p-3 border-b last:border-b-0 hover:bg-gray-50 rounded-md"
              >
                <div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-sm text-gray-500">
                    Rp {product.price.toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => startEdit(product)}
                    className="text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// --- 3. KOMPONEN PENCATATAN PENJUALAN CEPAT (INCOME) (MODIFIKASI: Tambah Callback) ---
const QuickCashflowEntry = ({
  products,
  tenantId,
  onSaleRecorded,
}: {
  products: Product[];
  tenantId: number | undefined;
  onSaleRecorded: () => void;
}) => {
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleCheckout = async () => {
    if (cart.length === 0 || !tenantId) {
      setMessage("Keranjang belanja kosong atau ID Tenant tidak ditemukan.");
      return;
    }
    setLoading(true);
    setMessage("");

    const totalAmount = calculateTotal();

    // 1. Catat Transaksi Penjualan ke tabel 'sales'
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert({
        tenant_id: tenantId,
        total_amount: totalAmount,
        transaction_date: new Date().toISOString(),
        notes: `Penjualan cepat: ${cart
          .map((item) => item.product.name)
          .join(", ")}`,
      })
      .select("id")
      .single();

    if (saleError || !saleData) {
      setLoading(false);
      setMessage(`Gagal mencatat penjualan (Sales): ${saleError?.message}`);
      return;
    }

    const saleId = saleData.id;

    // 2. Catat Detail Item ke tabel 'sale_items'
    const itemsToInsert = cart.map((item) => ({
      sale_id: saleId,
      product_id: item.product.id,
      quantity: item.quantity,
      price_per_unit: item.product.price,
      subtotal: item.product.price * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(itemsToInsert);

    // 3. Catat Pemasukan ke tabel 'transactions' (Cashflow)
    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        tenant_id: tenantId,
        amount: totalAmount,
        type: "income",
        sale_id: saleId,
        description: `Pemasukan dari Penjualan #${saleId} (${cart.length} item)`,
        transaction_date: new Date().toISOString(),
      });

    setLoading(false);
    if (itemsError || transactionError) {
      setMessage(
        `Penjualan tercatat, tapi gagal mencatat detail/cashflow: ${
          itemsError?.message || transactionError?.message
        }`
      );
    } else {
      setMessage(
        "Penjualan **BERHASIL** dicatat! Pemasukan telah ditambahkan ke laporan."
      );
      setCart([]);
      onSaleRecorded(); // Panggil callback untuk memicu refresh data dashboard/laporan
    }
  };

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.product.id === product.id
      );
      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  const calculateTotal = () => {
    return cart.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  };

  return (
    <div className="p-8 w-full">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Jual Cepat (Quick Sale) ⚡
      </h1>
      {message && (
        <div
          className={`p-3 rounded mb-4 text-white ${
            message.includes("BERHASIL") ? "bg-green-500" : "bg-red-500"
          }`}
          dangerouslySetInnerHTML={{ __html: message }}
        ></div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Bagian Kiri: Daftar Produk (Product Grid) */}
        <div className="lg:w-2/3 bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Pilih Produk (Tap untuk tambah)
          </h2>
          {products.length === 0 ? (
            <p className="text-gray-500 p-4 bg-yellow-50 rounded">
              ⚠️ Belum ada produk. Silakan tambahkan di tab "Kelola Produk"
              terlebih dahulu.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[70vh] overflow-y-auto">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="p-4 bg-gray-100 rounded-lg shadow hover:bg-green-100 transition-colors border-t-2 border-green-500"
                >
                  <p className="font-bold truncate">{product.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Rp {product.price.toLocaleString("id-ID")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Bagian Kanan: Keranjang/Checkout */}
        <div className="lg:w-1/3 bg-white p-6 rounded-xl shadow-lg border-2 border-blue-500 sticky top-4 h-fit">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Keranjang Belanja ({cart.length} item)
          </h2>

          {cart.length === 0 ? (
            <p className="text-gray-500 italic">
              Keranjang kosong. Tambahkan produk!
            </p>
          ) : (
            <ul className="space-y-3 mb-6 max-h-60 overflow-y-auto">
              {cart.map((item) => (
                <li
                  key={item.product.id}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <div className="flex-1 mr-2">
                    <p className="font-semibold">{item.product.name}</p>
                    <p className="text-xs text-gray-500">
                      Rp{" "}
                      {(item.product.price * item.quantity).toLocaleString(
                        "id-ID"
                      )}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => {
                        const newQuantity = parseInt(e.target.value);
                        if (newQuantity <= 0) {
                          setCart((prev) =>
                            prev.filter((i) => i.product.id !== item.product.id)
                          );
                        } else {
                          setCart((prev) =>
                            prev.map((i) =>
                              i.product.id === item.product.id
                                ? { ...i, quantity: newQuantity }
                                : i
                            )
                          );
                        }
                      }}
                      min="1"
                      className="w-12 text-center p-1 border rounded-md"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t pt-4">
            <p className="flex justify-between text-xl font-bold text-gray-800">
              <span>TOTAL:</span>
              <span>Rp {calculateTotal().toLocaleString("id-ID")}</span>
            </p>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || loading}
              className="w-full mt-4 p-3 rounded-md text-white font-extrabold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
              {loading ? "Memproses Transaksi..." : "SUBMIT & CATAT PEMASUKAN"}
            </button>

            <button
              onClick={() => setCart([])}
              disabled={cart.length === 0 || loading}
              className="w-full mt-2 p-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 transition-colors"
            >
              Bersihkan Keranjang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 4. KOMPONEN PENCATATAN BIAYA (EXPENSE) (MODIFIKASI: Tambah Callback) ---
const ExpenseEntryWithCallback = ({
  tenantId,
  onExpenseRecorded,
}: {
  tenantId: number | undefined;
  onExpenseRecorded: () => void;
}) => {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || parseFloat(amount) <= 0) {
      setMessage(
        "Error: ID Tenant tidak ditemukan atau jumlah biaya tidak valid."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("transactions").insert({
      tenant_id: tenantId,
      amount: parseFloat(amount),
      type: "expense",
      description: description || "Biaya tidak teridentifikasi",
      transaction_date: new Date().toISOString(),
    });

    setLoading(false);

    if (error) {
      setMessage(`Gagal mencatat biaya: ${error.message}`);
    } else {
      setMessage("Biaya **BERHASIL** dicatat! Pengeluaran telah ditambahkan.");
      setAmount("");
      setDescription("");
      onExpenseRecorded(); // Panggil callback untuk memicu refresh data laporan/dashboard
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <h2 className="text-xl font-semibold mb-4 border-b pb-2">
        Catat Biaya (Pengeluaran) 💸
      </h2>
      {message && (
        <div
          className={`p-3 rounded mb-4 text-white ${
            message.includes("BERHASIL") ? "bg-green-500" : "bg-red-500"
          }`}
          dangerouslySetInnerHTML={{ __html: message }}
        ></div>
      )}
      <form onSubmit={handleExpenseSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Deskripsi Biaya
          </label>
          <input
            type="text"
            placeholder="Contoh: Beli bahan baku, Bayar listrik"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded-md mt-1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Jumlah Biaya (Rp)
          </label>
          <input
            type="number"
            placeholder="150000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1"
            className="w-full p-2 border border-gray-300 rounded-md mt-1"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !tenantId}
          className="w-full p-3 rounded-md text-white font-semibold bg-red-600 hover:bg-red-700 disabled:bg-red-300 transition-colors"
        >
          {loading ? "Menyimpan Biaya..." : "Catat Pengeluaran"}
        </button>
      </form>
    </div>
  );
};

// --- 5. KOMPONEN LAPORAN & CASHFLOW UTAMA (MODIFIKASI) ---
// --- 5. KOMPONEN LAPORAN & CASHFLOW UTAMA (DENGAN PAGINATION) ---

const ReportsContent = ({
  tenantId,
  onReportUpdate,
}: {
  tenantId: number | undefined;
  onReportUpdate: () => void;
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // State untuk Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const transactionsPerPage = 4; // Jumlah transaksi per halaman

  // --- UTILITY: Fetch Ringkasan Global (tidak terpengaruh pagination) ---
  const fetchGlobalSummary = async (currentTenantId: number) => {
    // Ambil semua transaksi (tanpa filter limit/offset) untuk menghitung total summary
    const { data, error } = await supabase
      .from("transactions")
      .select("amount, type")
      .eq("tenant_id", currentTenantId);

    if (error) {
      console.error("Error fetching global summary:", error);
      return { income: 0, expense: 0, net: 0 };
    }

    const totalIncome = data
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = data
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income: totalIncome,
      expense: totalExpense,
      net: totalIncome - totalExpense,
    };
  };

  // --- FUNGSI FETCH TRANSAKSI (DENGAN PAGINATION) ---
  const fetchTransactionsWithPagination = async () => {
    if (!tenantId) return;
    setLoading(true);

    const start = (currentPage - 1) * transactionsPerPage;
    const end = start + transactionsPerPage - 1;

    // 1. Ambil Total Count untuk menghitung jumlah halaman
    const { count, error: countError } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

    if (countError) {
      setError(`Gagal menghitung total transaksi: ${countError.message}`);
      setLoading(false);
      return;
    }

    const totalCount = count || 0;
    setTotalPages(Math.ceil(totalCount / transactionsPerPage));

    // 2. Ambil Transaksi untuk halaman saat ini
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("transaction_date", { ascending: false })
      .range(start, end); // Menggunakan range untuk pagination

    if (error) {
      console.error("Error fetching paged transactions:", error);
      setError(`Gagal memuat riwayat transaksi: ${error.message}`);
    } else {
      setTransactions(data as Transaction[]);
      setError("");
    }

    setLoading(false);
    onReportUpdate(); // Panggil callback ke dashboard
  };

  const [summary, setSummary] = useState({ income: 0, expense: 0, net: 0 });

  // Efek untuk memuat data: summary dan paged transactions
  useEffect(() => {
    if (tenantId) {
      fetchGlobalSummary(tenantId).then(setSummary); // Muat ringkasan total
      fetchTransactionsWithPagination(); // Muat transaksi halaman
    }
  }, [tenantId, refreshKey, currentPage]); // Muat ulang saat tenantId, refreshKey, atau currentPage berubah

  const handleExpenseRecorded = () => {
    setRefreshKey((prev) => prev + 1); // Memaksa refresh summary dan paged data
  };

  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (!tenantId)
    return <div className="p-8 text-red-600">Gagal memuat Tenant ID.</div>;
  // Loading indicator tetap diperlukan, terutama saat pindah halaman
  // if (loading) return <div className="p-8">Memuat Laporan Cashflow...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8 w-full">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Laporan Cashflow 📊
      </h1>

      {/* Bagian Catat Biaya (Expense) */}
      <div className="mb-8">
        <ExpenseEntryWithCallback
          tenantId={tenantId}
          onExpenseRecorded={handleExpenseRecorded}
        />
      </div>

      {/* Ringkasan Cashflow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-green-100 p-6 rounded-xl shadow border-l-4 border-green-500">
          <p className="text-sm font-semibold text-green-700">
            Total Pemasukan (Global)
          </p>
          <p className="text-2xl font-bold mt-1">
            Rp {summary.income.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="bg-red-100 p-6 rounded-xl shadow border-l-4 border-red-500">
          <p className="text-sm font-semibold text-red-700">
            Total Pengeluaran (Global)
          </p>
          <p className="text-2xl font-bold mt-1">
            Rp {summary.expense.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="bg-blue-100 p-6 rounded-xl shadow border-l-4 border-blue-500">
          <p className="text-sm font-semibold text-blue-700">
            Saldo Bersih (Net Cash)
          </p>
          <p className="text-2xl font-bold mt-1">
            Rp {summary.net.toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      {/* Daftar Transaksi dengan Pagination */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">
          Riwayat Transaksi Terakhir (Halaman {currentPage} dari {totalPages})
        </h2>

        {loading ? (
          <div className="text-center p-10 text-gray-500">
            Memuat riwayat transaksi...
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-gray-500">Belum ada transaksi yang tercatat.</p>
        ) : (
          <>
            <div className="max-h-[50vh] overflow-y-auto mb-4">
              <ul className="space-y-3">
                {transactions.map((t) => (
                  <li
                    key={t.id}
                    className="flex justify-between items-center p-3 border-b last:border-b-0 hover:bg-gray-50 rounded-md"
                  >
                    <div>
                      <p className="font-semibold">{t.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(t.transaction_date).toLocaleDateString(
                          "id-ID",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                    <p
                      className={`font-bold ${
                        t.type === "income" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {t.type === "income" ? "+" : "-"} Rp{" "}
                      {t.amount.toLocaleString("id-ID")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Kontrol Pagination */}
            <div className="flex justify-center items-center space-x-2 pt-4 border-t">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Sebelumnya
              </button>

              <span className="text-sm font-semibold">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Berikutnya
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Catatan: Komponen lain (DashboardContent, QuickCashflowEntry, ExpenseEntryWithCallback)
// dan struktur TenantDashboardPage tidak perlu diubah karena sudah menggunakan callback (handleDataRefresh)
// yang akan memicu ReportsContent untuk me-refresh data.

// --- KOMPONEN UTAMA TENANT DASHBOARD (MODIFIKASI UTAMA) ---
export default function TenantDashboardPage() {
  const { user, role, profile, loading: authLoading, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [tenantId, setTenantId] = useState<number | undefined>(undefined);
  const [dashboardData, setDashboardData] = useState<DashboardSummary>({
    totalIncome: 0,
    totalExpense: 0,
    netCash: 0,
    totalSalesCount: 0,
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Kunci untuk memicu refresh data
  const router = useRouter();

  const userId = user?.id;
  const tenantName = profile?.name || user?.email;

  // --- UTILITY: Fetch Data Dashboard Harian ---
  const fetchDashboardData = async (currentTenantId: number) => {
    setDashboardLoading(true);
    const today = new Date().toISOString().split("T")[0]; // Format YYYY-MM-DD
    const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1))
      .toISOString()
      .split("T")[0];

    // 1. Ambil data Transaksi Harian (Income & Expense)
    const { data: txData, error: txError } = await supabase
      .from("transactions")
      .select("amount, type")
      .eq("tenant_id", currentTenantId)
      .gte("transaction_date", today) // Lebih besar dari atau sama dengan hari ini (00:00:00)
      .lt("transaction_date", tomorrow); // Lebih kecil dari besok (00:00:00)

    // 2. Ambil data Sales Count Harian
    const { count: salesCount, error: salesError } = await supabase
      .from("sales")
      .select("id", { count: "exact" })
      .eq("tenant_id", currentTenantId)
      .gte("transaction_date", today)
      .lt("transaction_date", tomorrow);

    if (txError || salesError) {
      console.error("Gagal memuat data dashboard:", txError || salesError);
      setDashboardLoading(false);
      return;
    }

    let totalIncome = 0;
    let totalExpense = 0;

    txData?.forEach((tx) => {
      if (tx.type === "income") {
        totalIncome += tx.amount;
      } else if (tx.type === "expense") {
        totalExpense += tx.amount;
      }
    });

    setDashboardData({
      totalIncome,
      totalExpense,
      netCash: totalIncome - totalExpense,
      totalSalesCount: salesCount || 0,
    });
    setDashboardLoading(false);
  };
  // ------------------------------------------

  // Callback untuk memicu refresh data dashboard saat ada transaksi baru
  const handleDataRefresh = () => {
    if (tenantId) {
      fetchDashboardData(tenantId);
    }
    setRefreshKey((prev) => prev + 1); // Memastikan data produk dan laporan juga di-refresh
  };

  // ... (LOGIC PROTEKSI RUTE tetap sama) ...
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (role !== "tenant") {
        router.push("/admin/dashboard");
      }
    }
  }, [user, role, authLoading, router]);

  // --- Fungsi Jaminan Row Tenant di Tabel 'tenants' ---
  const ensureTenantRowExists = async (
    authUserId: string,
    storeName: string
  ) => {
    const { data } = await supabase
      .from("tenants")
      .select("id")
      .eq("user_id", authUserId)
      .single();
    if (data) return data.id as number;

    const { data: newRowData, error: insertError } = await supabase
      .from("tenants")
      .insert({ user_id: authUserId, store_name: storeName })
      .select("id")
      .single();

    if (insertError) {
      console.error("Gagal membuat row Tenant:", insertError);
      return undefined;
    }
    return newRowData?.id as number;
  };

  // --- Fungsi Fetch Produk ---
  const fetchProducts = async (currentTenantId: number) => {
    setDataLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("tenant_id", currentTenantId);
    if (error) {
      console.error("Error fetching products:", error);
    } else {
      setProducts(data as Product[]);
    }
    setDataLoading(false);
  };

  // --- Efek Utama: Memuat Tenant ID dan Data Awal ---
  useEffect(() => {
    if (userId && role === "tenant" && tenantName) {
      const loadInitialData = async () => {
        const currentTenantId = await ensureTenantRowExists(userId, tenantName);
        setTenantId(currentTenantId);

        if (currentTenantId) {
          await fetchProducts(currentTenantId);
          await fetchDashboardData(currentTenantId); // Load data dashboard pertama kali
        } else {
          setDataLoading(false);
          setDashboardLoading(false);
        }
      };
      loadInitialData();
    }
  }, [userId, role, tenantName, refreshKey]); // Tambahkan refreshKey di sini

  if (authLoading || (user && role !== "tenant")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        Memverifikasi Izin...
      </div>
    );
  }

  // Tampilkan loading data umum
  if (dataLoading && ["products", "quick_sale"].includes(activeTab)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        Memuat Data...
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        // Passing data ringkasan dan status loading ke DashboardContent
        return (
          <DashboardContent
            summary={dashboardData}
            loading={dashboardLoading}
          />
        );
      case "products":
        return (
          <ProductManagement
            products={products}
            fetchProducts={() => fetchProducts(tenantId!)}
            userId={userId}
            tenantId={tenantId}
          />
        );
      case "quick_sale":
        // Tambahkan prop onSaleRecorded
        return (
          <QuickCashflowEntry
            products={products}
            tenantId={tenantId}
            onSaleRecorded={handleDataRefresh} // Panggil refresh data saat penjualan selesai
          />
        );
      case "reports":
        // Tambahkan prop onReportUpdate
        return (
          <ReportsContent
            tenantId={tenantId}
            onReportUpdate={handleDataRefresh}
          />
        );
      default:
        return (
          <DashboardContent
            summary={dashboardData}
            loading={dashboardLoading}
          />
        );
    }
  };

  return (
    <div className="flex bg-gray-100 min-h-screen">
      {/* Sidebar */}
      <TenantSidebar
        active={activeTab}
        setActive={setActiveTab}
        profileName={tenantName ?? "Tenant"}
        signOut={signOut}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">{renderContent()}</div>
    </div>
  );
}
