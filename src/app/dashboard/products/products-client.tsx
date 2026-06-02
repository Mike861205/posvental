"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Plus, Pencil, Trash2, Search, Package, Tag, DollarSign, Boxes, ShoppingCart, ImagePlus } from "lucide-react";

type ProductCategory = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  imageUrl?: string | null;
  code: string | null;
  categoryId?: string | null;
  category?: ProductCategory | null;
  cost: string | number;
  price: string | number;
  stock: number;
  featured?: boolean;
  active: boolean;
};

type BulkPurchaseRow = {
  productId: string;
  stockDelta: number;
  cost: string;
};

async function uploadProductImage(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload/products", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "No se pudo subir la imagen");
  return data.url as string;
}

export function ProductsClient({
  initialProducts,
  initialCategories,
}: Readonly<{ initialProducts: Product[]; initialCategories: ProductCategory[] }>) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<ProductCategory[]>(initialCategories);
  const [tab, setTab] = useState<"products" | "categories">("products");
  const [openNew, setOpenNew] = useState(false);
  const [edit, setEdit] = useState<Product | null>(null);
  const [purchase, setPurchase] = useState<Product | null>(null);
  const [openBulkPurchase, setOpenBulkPurchase] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkPurchaseRow[]>([{ productId: "", stockDelta: 1, cost: "" }]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(t) ||
        (p.code ?? "").toLowerCase().includes(t)
    );
  }, [products, q]);

  const totalStock = products.reduce((acc, p) => acc + (p.stock ?? 0), 0);
  const totalValue = products.reduce((acc, p) => acc + Number(p.price) * (p.stock ?? 0), 0);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProductFormError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const entries = Object.fromEntries(fd.entries()) as Record<string, FormDataEntryValue>;
    const categoryIdRaw = fd.get("categoryId");
    const categoryId = typeof categoryIdRaw === "string" ? categoryIdRaw : "";
    const imageFile = fd.get("image") as File | null;
    const featured = fd.has("featured");
    delete entries.image;

    let imageUrl: string | null = null;
    if (imageFile && imageFile.size > 0) {
      try {
        imageUrl = await uploadProductImage(imageFile);
      } catch (err) {
        setLoading(false);
        const message = err instanceof Error ? err.message : "No se pudo subir la imagen del producto.";
        setProductFormError(message);
        return;
      }
    }

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...entries,
        categoryId: categoryId || null,
        featured,
        imageUrl,
      }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setProductFormError(data?.error ?? "No se pudo guardar el producto.");
      return;
    }

    const created: Product = data;
    setProducts((p) => [created, ...p]);
    setOpenNew(false);
    router.refresh();
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!edit) return;
    setProductFormError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const entries = Object.fromEntries(fd.entries()) as Record<string, FormDataEntryValue>;
    const categoryIdRaw = fd.get("categoryId");
    const categoryId = typeof categoryIdRaw === "string" ? categoryIdRaw : "";
    const imageFile = fd.get("image") as File | null;
    const clearImage = fd.get("clearImage") === "true";
    const featured = fd.has("featured");
    delete entries.image;

    let imageUrl: string | null = clearImage ? null : (edit.imageUrl ?? null);
    if (imageFile && imageFile.size > 0) {
      try {
        imageUrl = await uploadProductImage(imageFile);
      } catch (err) {
        setLoading(false);
        const message = err instanceof Error ? err.message : "No se pudo subir la imagen del producto.";
        setProductFormError(message);
        return;
      }
    }

    const res = await fetch(`/api/products/${edit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...entries,
        categoryId: categoryId || null,
        featured,
        imageUrl,
      }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setProductFormError(data?.error ?? "No se pudo actualizar el producto.");
      return;
    }

    const updated: Product = data;
    setProducts((p) => p.map((x) => (x.id === updated.id ? updated : x)));
    setEdit(null);
  }

  async function addStock(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!purchase) return;
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const quantity = Number(fd.get("stockDelta"));
    const nextCost = fd.get("cost");
    const res = await fetch(`/api/products/${purchase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stockDelta: quantity,
        cost: nextCost === "" ? undefined : Number(nextCost),
      }),
    });
    setLoading(false);
    if (res.ok) {
      const updated: Product = await res.json();
      setProducts((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setPurchase(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar producto?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) setProducts((p) => p.filter((x) => x.id !== id));
  }

  async function createCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCategoryError(null);
    setCategoryLoading(true);

    const res = await fetch("/api/product-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName }),
    });

    setCategoryLoading(false);
    if (!res.ok) {
      setCategoryError("No se pudo crear la categoría.");
      return;
    }

    const created: ProductCategory = await res.json();
    setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name, "es")));
    setNewCategoryName("");
  }

  async function removeCategory(id: string) {
    if (!confirm("¿Eliminar categoría? Los productos quedarán sin categoría.")) return;
    const res = await fetch(`/api/product-categories/${id}`, { method: "DELETE" });
    if (!res.ok) return;

    setCategories((current) => current.filter((category) => category.id !== id));
    setProducts((current) => current.map((product) => (product.categoryId === id
      ? { ...product, categoryId: null, category: null }
      : product)));
    router.refresh();
  }

  function openBulkModal() {
    setBulkRows([{ productId: "", stockDelta: 1, cost: "" }]);
    setBulkError(null);
    setOpenBulkPurchase(true);
  }

  function addBulkRow() {
    setBulkRows((rows) => [...rows, { productId: "", stockDelta: 1, cost: "" }]);
  }

  function removeBulkRow(index: number) {
    setBulkRows((rows) => rows.filter((_, i) => i !== index));
  }

  function updateBulkRow(index: number, patch: Partial<BulkPurchaseRow>) {
    setBulkRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function saveBulkPurchase(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBulkError(null);

    const cleanRows = bulkRows
      .filter((row) => row.productId && row.stockDelta > 0)
      .map((row) => ({
        productId: row.productId,
        stockDelta: Number(row.stockDelta),
        cost: row.cost === "" ? undefined : Number(row.cost),
      }));

    if (cleanRows.length === 0) {
      setBulkError("Agrega al menos un producto con cantidad válida.");
      return;
    }

    const repeated = new Set<string>();
    for (const row of cleanRows) {
      if (repeated.has(row.productId)) {
        setBulkError("No repitas productos en la misma compra masiva.");
        return;
      }
      repeated.add(row.productId);
    }

    setLoading(true);
    const res = await fetch("/api/products/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purchases: cleanRows }),
    });
    setLoading(false);

    if (!res.ok) {
      setBulkError("No se pudo procesar la compra masiva.");
      return;
    }

    const updatedProducts: Product[] = await res.json();
    setProducts((current) => {
      const updates = new Map(updatedProducts.map((item) => [item.id, item]));
      return current.map((item) => updates.get(item.id) ?? item);
    });
    setOpenBulkPurchase(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Productos</h1>
          <p className="text-slate-500">Inventario para tu Punto de Venta.</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setTab("products")}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition ${tab === "products" ? "bg-white shadow text-violet-700" : "text-slate-600"}`}
            >
              Productos
            </button>
            <button
              onClick={() => setTab("categories")}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition ${tab === "categories" ? "bg-white shadow text-violet-700" : "text-slate-600"}`}
            >
              Categorías
            </button>
          </div>

          {tab === "products" && (
            <>
              <button onClick={openBulkModal} className="btn-ghost flex items-center gap-2 border border-slate-200">
                <ShoppingCart size={16} /> Compra masiva
              </button>
              <button onClick={() => { setProductFormError(null); setOpenNew(true); }} className="btn-primary flex items-center gap-2">
                <Plus size={16} /> Nuevo producto
              </button>
            </>
          )}
        </div>
      </div>

      {tab === "products" && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-violet rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 text-white/80 text-sm"><Package size={16}/> Total productos</div>
          <p className="text-3xl font-bold mt-2">{products.length}</p>
        </div>
        <div className="bg-gradient-blue rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 text-white/80 text-sm"><Boxes size={16}/> Unidades en stock</div>
          <p className="text-3xl font-bold mt-2">{totalStock}</p>
        </div>
        <div className="bg-gradient-emerald rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 text-white/80 text-sm"><DollarSign size={16}/> Valor inventario</div>
          <p className="text-3xl font-bold mt-2">{formatCurrency(totalValue)}</p>
        </div>
      </div>
      )}

      {tab === "products" && (
      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o código…"
            className="input pl-9"
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-left">
              <tr>
                <th className="py-2">Producto</th>
                <th className="py-2">Código</th>
                <th className="py-2 text-right">Costo</th>
                <th className="py-2 text-right">Precio</th>
                <th className="py-2 text-right">Utilidad</th>
                <th className="py-2">Categoría</th>
                <th className="py-2 text-center">Destacado</th>
                <th className="py-2 text-right">Stock</th>
                <th className="py-2 text-center">Compras</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="py-6 text-center text-slate-400">Sin productos.</td></tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shrink-0">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-300">
                            <Package size={16} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{p.name}</div>
                        {!p.active && <span className="text-xs text-slate-400">Inactivo</span>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3"><span className="inline-flex items-center gap-1 text-slate-500"><Tag size={12}/>{p.code || "—"}</span></td>
                  <td className="py-3 text-right">{formatCurrency(Number(p.cost))}</td>
                  <td className="py-3 text-right font-semibold">{formatCurrency(Number(p.price))}</td>
                  <td className="py-3 text-right">
                    <ProductProfit cost={Number(p.cost)} price={Number(p.price)} />
                  </td>
                  <td className="py-3 text-slate-600">{p.category?.name ?? "Sin categoría"}</td>
                  <td className="py-3 text-center">
                    {p.featured
                      ? <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">Sí</span>
                      : <span className="text-xs text-slate-400">No</span>}
                  </td>
                  <td className="py-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.stock > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <button
                      onClick={() => setPurchase(p)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-violet-300 hover:text-violet-700"
                      title="Registrar compra"
                    >
                      <ShoppingCart size={14} />
                      Comprar
                    </button>
                  </td>
                  <td className="py-3 text-right">
                    <button onClick={() => setEdit(p)} className="text-slate-400 hover:text-violet-600 mr-3" title="Editar"><Pencil size={15}/></button>
                    <button onClick={() => remove(p.id)} className="text-slate-400 hover:text-red-600" title="Eliminar"><Trash2 size={15}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {tab === "categories" && (
        <div className="card p-4 space-y-5">
          <div>
            <h2 className="text-lg font-semibold">Categorías de productos</h2>
            <p className="text-sm text-slate-500">Crea categorías para organizar inventario y usar filtros en Punto de Venta.</p>
          </div>

          <form onSubmit={createCategory} className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="w-full sm:max-w-md">
              <label className="label" htmlFor="new-category-name">Nombre de categoría</label>
              <input
                id="new-category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="input"
                placeholder="Ej. Suplementos"
                required
              />
            </div>
            <button disabled={categoryLoading} className="btn-primary h-10">
              {categoryLoading ? "Guardando..." : "Agregar categoría"}
            </button>
          </form>

          {categoryError && <p className="text-sm text-red-600">{categoryError}</p>}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 text-left">
                <tr>
                  <th className="py-2">Categoría</th>
                  <th className="py-2 text-right">Productos</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 && (
                  <tr><td colSpan={3} className="py-6 text-center text-slate-400">Sin categorías registradas.</td></tr>
                )}
                {categories.map((category) => {
                  const count = products.filter((product) => product.categoryId === category.id).length;
                  return (
                    <tr key={category.id} className="border-t border-slate-100">
                      <td className="py-3 font-medium">{category.name}</td>
                      <td className="py-3 text-right text-slate-600">{count}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => removeCategory(category.id)}
                          className="text-red-500 hover:text-red-700"
                          type="button"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {openNew && (
        <ProductDialog
          title="Nuevo producto"
          onClose={() => setOpenNew(false)}
          onSubmit={add}
          loading={loading}
          error={productFormError}
          categories={categories}
        />
      )}

      {edit && (
        <ProductDialog
          title="Editar producto"
          onClose={() => setEdit(null)}
          onSubmit={save}
          loading={loading}
          error={productFormError}
          initial={edit}
          categories={categories}
        />
      )}

      {purchase && (
        <PurchaseDialog
          product={purchase}
          onClose={() => setPurchase(null)}
          onSubmit={addStock}
          loading={loading}
        />
      )}

      {openBulkPurchase && (
        <BulkPurchaseDialog
          products={products}
          rows={bulkRows}
          loading={loading}
          error={bulkError}
          onClose={() => setOpenBulkPurchase(false)}
          onSubmit={saveBulkPurchase}
          onAddRow={addBulkRow}
          onRemoveRow={removeBulkRow}
          onUpdateRow={updateBulkRow}
        />
      )}
    </div>
  );
}

function ProductProfit({ cost, price }: Readonly<{ cost: number; price: number }>) {
  const profitAmount = price - cost;
  const profitPercent = cost > 0 ? (profitAmount / cost) * 100 : 0;
  const isPositive = profitAmount >= 0;

  return (
    <div className="flex flex-col items-end leading-tight">
      <span className={`font-semibold ${isPositive ? "text-emerald-600" : "text-red-600"}`}>
        {formatCurrency(profitAmount)}
      </span>
      <span className="text-xs text-slate-500">{profitPercent.toFixed(1)}%</span>
    </div>
  );
}

function ProductDialog({
  title,
  onClose,
  onSubmit,
  loading,
  error,
  categories,
  initial,
}: Readonly<{
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
  categories: ProductCategory[];
  initial?: Product;
}>) {
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [clearImage, setClearImage] = useState(false);

  useEffect(() => {
    setPreviewUrl(initial?.imageUrl ?? null);
    setClearImage(false);
  }, [initial]);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);
    setClearImage(false);
  }

  function clearPreview() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(null);
    setClearImage(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <form onSubmit={onSubmit} className="grid gap-3">
          <input type="hidden" name="clearImage" value={clearImage ? "true" : "false"} />
          <div>
            <label className="label" htmlFor="p-image">Imagen del producto</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-400 hover:border-violet-500 hover:text-violet-600 transition-colors"
                title="Subir imagen"
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Vista previa" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus size={20} />
                )}
              </button>
              <div className="text-xs text-slate-500 leading-5">
                <p>Sube una imagen para mostrar mejor el producto.</p>
                <p>Formatos: JPG, PNG, WebP, GIF. Max. 4 MB.</p>
                {previewUrl && (
                  <button type="button" onClick={clearPreview} className="text-red-500 hover:text-red-700 mt-1">
                    Quitar imagen
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileRef}
              id="p-image"
              name="image"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              capture="environment"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
          <div>
            <label className="label" htmlFor="p-name">Nombre</label>
            <input id="p-name" required name="name" className="input" defaultValue={initial?.name} placeholder="Proteína Whey 1kg"/>
          </div>
          <div>
            <label className="label" htmlFor="p-code">Código / SKU</label>
            <input id="p-code" name="code" className="input" defaultValue={initial?.code ?? ""} placeholder="WHEY-001"/>
          </div>
          <div>
            <label className="label" htmlFor="p-category">Categoría</label>
            <select id="p-category" name="categoryId" className="input" defaultValue={initial?.categoryId ?? ""}>
              <option value="">Sin categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="p-cost">Costo</label>
              <input id="p-cost" required type="number" step="0.01" name="cost" className="input" defaultValue={initial ? Number(initial.cost) : 0}/>
            </div>
            <div>
              <label className="label" htmlFor="p-price">Precio venta</label>
              <input id="p-price" required type="number" step="0.01" name="price" className="input" defaultValue={initial ? Number(initial.price) : ""}/>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="p-stock">Stock</label>
            <input id="p-stock" required type="number" name="stock" className="input" defaultValue={initial?.stock ?? 0}/>
          </div>
          <label htmlFor="p-featured" className="flex items-center gap-2 text-sm text-slate-700">
            <input id="p-featured" type="checkbox" name="featured" defaultChecked={initial?.featured ?? false} />
            <span>Marcar como producto destacado en POS</span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end mt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button disabled={loading} className="btn-primary">{loading ? "Guardando..." : "Guardar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PurchaseDialog({
  product,
  onClose,
  onSubmit,
  loading,
}: Readonly<{
  product: Product;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
}>) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-1">Registrar compra</h2>
        <p className="text-sm text-slate-500 mb-4">Agrega más stock a {product.name} y actualiza el costo si cambió.</p>
        <form onSubmit={onSubmit} className="grid gap-3">
          <div>
            <label className="label" htmlFor="purchase-stock">Cantidad comprada</label>
            <input id="purchase-stock" required min={1} type="number" name="stockDelta" className="input" defaultValue={1} />
          </div>
          <div>
            <label className="label" htmlFor="purchase-cost">Costo unitario</label>
            <input id="purchase-cost" type="number" step="0.01" min={0} name="cost" className="input" defaultValue={Number(product.cost)} />
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span>Stock actual</span>
              <span className="font-semibold text-slate-900">{product.stock}</span>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button disabled={loading} className="btn-primary">{loading ? "Guardando..." : "Agregar compra"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkPurchaseDialog({
  products,
  rows,
  loading,
  error,
  onClose,
  onSubmit,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
}: Readonly<{
  products: Product[];
  rows: BulkPurchaseRow[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
  onUpdateRow: (index: number, patch: Partial<BulkPurchaseRow>) => void;
}>) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card w-full max-w-4xl p-6">
        <h2 className="text-xl font-bold mb-1">Compra masiva de productos</h2>
        <p className="text-sm text-slate-500 mb-4">Agrega varios productos y sus cantidades para actualizar stock en una sola operación.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="text-left py-2">Producto</th>
                  <th className="text-right py-2">Cantidad</th>
                  <th className="text-right py-2">Costo unitario (opcional)</th>
                  <th className="text-right py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={`${idx}-${row.productId}`} className="border-t border-slate-100">
                    <td className="py-2 pr-3">
                      <select
                        value={row.productId}
                        onChange={(e) => onUpdateRow(idx, { productId: e.target.value })}
                        className="input"
                        required
                      >
                        <option value="">Selecciona producto</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <input
                        type="number"
                        min={1}
                        className="input text-right"
                        value={row.stockDelta}
                        onChange={(e) => onUpdateRow(idx, { stockDelta: Number(e.target.value) || 0 })}
                        required
                      />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="input text-right"
                        value={row.cost}
                        onChange={(e) => onUpdateRow(idx, { cost: e.target.value })}
                        placeholder="Sin cambio"
                      />
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onRemoveRow(idx)}
                        className="btn-ghost text-red-600"
                        disabled={rows.length === 1}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <button type="button" onClick={onAddRow} className="btn-ghost border border-slate-200">+ Agregar fila</button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button disabled={loading} className="btn-primary">{loading ? "Guardando..." : "Aplicar compra masiva"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
