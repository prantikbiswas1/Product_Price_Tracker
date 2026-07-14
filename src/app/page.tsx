"use client";

import { useState } from "react";

export default function Home() {
  // Form States
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [pincode, setPincode] = useState("");
  const [secret, setSecret] = useState("");

  // UI States
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Dashboard States
  const [products, setProducts] = useState<any[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  // Add a new product
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, price, pincode, secret })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(`❌ Error: ${data.error}`);
      } else {
        setMessage(`✅ ${data.message}`);
        setUrl(""); setPrice(""); setPincode("");
        // Automatically reload dashboard if they just added a product
        if (products.length > 0) {
          loadDashboard();
        }
      }
    } catch (error) {
      setMessage("❌ Failed to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  // Load the dashboard
  const loadDashboard = async () => {
    if (!secret) {
      setDashboardError("Please enter your Secret Key first.");
      return;
    }

    setDashboardLoading(true);
    setDashboardError("");

    try {
      const res = await fetch(`/api/track?secret=${secret}`);
      const data = await res.json();

      if (!res.ok) {
        setDashboardError(data.error);
        setProducts([]);
      } else {
        setProducts(data);
      }
    } catch (e) {
      setDashboardError("Failed to load dashboard.");
    } finally {
      setDashboardLoading(false);
    }
  };

  // Delete a product
  const deleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to stop tracking this?")) return;

    try {
      const res = await fetch('/api/track', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, secret })
      });

      if (res.ok) {
        // Remove it from the screen immediately
        setProducts(products.filter(p => p.id !== id));
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      alert("Failed to delete product.");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center py-16 px-4">
      <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-emerald-400 text-transparent bg-clip-text text-center">
        Price Tracker
      </h1>
      <p className="text-slate-400 mb-8 text-center max-w-md">
        Track Flipkart prices automatically and get notified on Telegram when they drop.
      </p>

      {/* ADD PRODUCT FORM */}
      <div className="w-full max-w-xl bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-slate-100 border-b border-slate-700 pb-2">Add New Product</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Flipkart Product URL</label>
            <input
              type="url" required placeholder="https://www.flipkart.com/..."
              value={url} onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-1">Target Price (₹)</label>
              <input
                type="number" required placeholder="50000"
                value={price} onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-1">Pincode</label>
              <input
                type="text" required placeholder="110001"
                value={pincode} onChange={(e) => setPincode(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Your Secret Vault Key</label>
            <input
              type="password" required placeholder="Enter password to prove it's you"
              value={secret} onChange={(e) => setSecret(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex gap-4 mt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? "Adding..." : "+ Start Tracking"}
            </button>

            {/* NEW DASHBOARD BUTTON */}
            <button
              type="button"
              onClick={loadDashboard}
              disabled={dashboardLoading}
              className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors border border-slate-600"
            >
              {dashboardLoading ? "Loading..." : "👁️ View Dashboard"}
            </button>
          </div>

          {message && <p className="text-sm text-center mt-2">{message}</p>}
          {dashboardError && <p className="text-red-400 text-sm text-center mt-2">{dashboardError}</p>}
        </form>
      </div>

      {/* MANAGEMENT DASHBOARD */}
      {products.length > 0 && (
        <div className="w-full max-w-3xl">
          <h2 className="text-2xl font-semibold mb-4 text-slate-100">Your Tracked Products</h2>
          <div className="flex flex-col gap-3">
            {products.map(product => (
              <div key={product.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between shadow-md">
                <div className="flex-1 truncate pr-4">
                  <a href={product.url} target="_blank" className="text-blue-400 hover:underline text-sm font-medium truncate block mb-1">
                    {product.url.substring(0, 60)}...
                  </a>
                  <div className="flex gap-4 text-xs text-slate-400">
                    <span className="bg-slate-900 px-2 py-1 rounded">Target: ₹{product.targetPrice}</span>
                    {product.lowestPrice && (
                      <span className="bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded">
                        Lowest: ₹{product.lowestPrice}
                      </span>
                    )}
                    <span className="bg-slate-900 px-2 py-1 rounded">Pin: {product.pincode}</span>
                  </div>
                </div>
                <button
                  onClick={() => deleteProduct(product.id)}
                  className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 border border-red-500/50 transition-colors px-3 py-2 rounded-lg text-sm font-medium"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </main>
  );
}
