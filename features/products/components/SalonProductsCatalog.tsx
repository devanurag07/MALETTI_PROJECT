"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, X } from "lucide-react";
import axiosClient from "@/core/network/axios-client";
import { SALON_PRODUCTS_URL, SALON_SERVICES_URL } from "@/core/constants/url-constants";
import TopRow from "@/design-system/components/common/top-row";
import { useRouter } from "next/navigation";
import { isProductPricingEnabled } from "@/core/utils/salon-storage";

export interface SalonCatalogProduct {
  id: number;
  name: string;
  brand: string;
  description: string;
  image: string | null;
  price: number;
  currency: string;
  product_type: "hair" | "skin";
  is_active?: boolean;
  category_name?: string;
  subcategory_name?: string;
  category?: string | { name?: string };
  sub_category?: string | { name?: string };
}

export interface SalonService {
  id: number;
  name: string;
  description: string;
  image: string | null;
  price?: number;
  currency?: string;
  service_type?: "hair" | "skin";
  is_active?: boolean;
}

type ProductTab = "hair" | "skin" | "services";
type PriceSort = "" | "price-asc" | "price-desc";
type OpenFilter = "brand" | "category" | "subcategory" | "sort" | null;

function currencySymbol(currency: string) {
  if (currency === "INR") return "₹";
  if (currency === "USD") return "$";
  if (currency === "KWD") return "KD";
  return "€";
}

function nestedName(value: string | { name?: string } | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return value.name?.trim() ?? "";
}

function productCategory(product: SalonCatalogProduct): string {
  return product.category_name?.trim() || nestedName(product.category);
}

function productSubcategory(product: SalonCatalogProduct): string {
  return product.subcategory_name?.trim() || nestedName(product.sub_category);
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function normalizeProducts(payload: unknown): SalonCatalogProduct[] {
  if (Array.isArray(payload)) {
    return payload as SalonCatalogProduct[];
  }
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    return (payload as { data: SalonCatalogProduct[] }).data;
  }
  return [];
}

export default function SalonProductsCatalog() {
  const t = useTranslations("salonProducts");
  const router = useRouter();
  const [showPricing, setShowPricing] = useState(true);
  const [activeTab, setActiveTab] = useState<ProductTab>("hair");
  const [products, setProducts] = useState<SalonCatalogProduct[]>([]);
  const [services, setServices] = useState<SalonService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandFilter, setBrandFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState("");
  const [priceSort, setPriceSort] = useState<PriceSort>("");
  const [openFilter, setOpenFilter] = useState<OpenFilter>(null);

  useEffect(() => {
    setShowPricing(isProductPricingEnabled());
  }, []);

  const resetFilters = () => {
    setBrandFilter("");
    setCategoryFilter("");
    setSubcategoryFilter("");
    setPriceSort("");
    setOpenFilter(null);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [productsRes, servicesRes] = await Promise.all([
          axiosClient.get(SALON_PRODUCTS_URL),
          axiosClient.get(SALON_SERVICES_URL).catch(() => ({ data: [] })),
        ]);
        if (!cancelled) {
          setProducts(
            normalizeProducts(productsRes.data).filter((p) => p.is_active !== false),
          );
          const svcData = Array.isArray(servicesRes.data)
            ? servicesRes.data
            : servicesRes.data?.data ?? [];
          setServices(svcData.filter((s: SalonService) => s.is_active !== false));
        }
      } catch {
        if (!cancelled) {
          setError(t("loadError"));
          setProducts([]);
          setServices([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const tabProducts = useMemo(
    () => products.filter((p) => p.product_type === activeTab),
    [products, activeTab],
  );

  const brandOptions = useMemo(
    () => uniqueSorted(tabProducts.map((p) => p.brand?.trim() ?? "")),
    [tabProducts],
  );

  // Each dropdown only offers values that still have products under the
  // filters above it (brand -> category -> subcategory).
  const brandProducts = useMemo(
    () =>
      brandFilter
        ? tabProducts.filter((p) => (p.brand?.trim() ?? "") === brandFilter)
        : tabProducts,
    [tabProducts, brandFilter],
  );

  const categoryProducts = useMemo(
    () =>
      categoryFilter
        ? brandProducts.filter((p) => productCategory(p) === categoryFilter)
        : brandProducts,
    [brandProducts, categoryFilter],
  );

  const categoryOptions = useMemo(
    () => uniqueSorted(brandProducts.map(productCategory)),
    [brandProducts],
  );

  const subcategoryOptions = useMemo(
    () => uniqueSorted(categoryProducts.map(productSubcategory)),
    [categoryProducts],
  );

  // Drop selections that no longer have products after an upstream change.
  useEffect(() => {
    if (categoryFilter && !categoryOptions.includes(categoryFilter)) {
      setCategoryFilter("");
    }
  }, [categoryFilter, categoryOptions]);

  useEffect(() => {
    if (subcategoryFilter && !subcategoryOptions.includes(subcategoryFilter)) {
      setSubcategoryFilter("");
    }
  }, [subcategoryFilter, subcategoryOptions]);

  const filteredProducts = useMemo(() => {
    let next = categoryProducts;
    if (subcategoryFilter) {
      next = next.filter((p) => productSubcategory(p) === subcategoryFilter);
    }
    if (showPricing && priceSort === "price-asc") {
      next = [...next].sort((a, b) => a.price - b.price);
    } else if (showPricing && priceSort === "price-desc") {
      next = [...next].sort((a, b) => b.price - a.price);
    }
    return next;
  }, [categoryProducts, subcategoryFilter, priceSort, showPricing]);

  const hasActiveFilters = Boolean(
    brandFilter || categoryFilter || subcategoryFilter || (showPricing && priceSort),
  );

  const sortLabel =
    priceSort === "price-asc"
      ? t("filters.priceLowHigh")
      : priceSort === "price-desc"
        ? t("filters.priceHighLow")
        : t("filters.sortDefault");

  const tabs: { id: ProductTab; label: string }[] = [
    { id: "hair", label: t("tabs.hair") },
    { id: "skin", label: t("tabs.skin") },
    { id: "services", label: "Services" },
  ];

  const toggleFilter = (id: OpenFilter) => {
    setOpenFilter((prev) => (prev === id ? null : id));
  };

  return (
    <div className="flex h-full flex-col bg-black text-white">
      <div className="px-8">
        <TopRow onBack={() => router.push("/")} title={t("title")} />
      </div>

      <div className="mx-8 mt-6 flex gap-4 rounded-full border-2 border-white bg-[#222222] p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              resetFilters();
            }}
            className={`flex-1 rounded-full py-4 text-4xl font-semibold transition-colors ${
              activeTab === tab.id
                ? "bg-white text-black"
                : "bg-transparent text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab !== "services" && <div className="relative z-20 mx-8 mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FilterDropdown
            label={t("filters.brand")}
            value={brandFilter || t("filters.all")}
            isPlaceholder={!brandFilter}
            options={[
              { value: "", label: t("filters.all") },
              ...brandOptions.map((brand) => ({ value: brand, label: brand })),
            ]}
            isOpen={openFilter === "brand"}
            onToggle={() => toggleFilter("brand")}
            onChange={setBrandFilter}
          />
          <FilterDropdown
            label={t("filters.category")}
            value={categoryFilter || t("filters.all")}
            isPlaceholder={!categoryFilter}
            options={[
              { value: "", label: t("filters.all") },
              ...categoryOptions.map((category) => ({
                value: category,
                label: category,
              })),
            ]}
            isOpen={openFilter === "category"}
            onToggle={() => toggleFilter("category")}
            onChange={(value) => {
              setCategoryFilter(value);
              setSubcategoryFilter("");
            }}
          />
          <FilterDropdown
            label={t("filters.subcategory")}
            value={subcategoryFilter || t("filters.all")}
            isPlaceholder={!subcategoryFilter}
            options={[
              { value: "", label: t("filters.all") },
              ...subcategoryOptions.map((subcategory) => ({
                value: subcategory,
                label: subcategory,
              })),
            ]}
            isOpen={openFilter === "subcategory"}
            onToggle={() => toggleFilter("subcategory")}
            onChange={setSubcategoryFilter}
            disabled={subcategoryOptions.length === 0}
          />
          {showPricing ? (
            <FilterDropdown
              label={t("filters.sort")}
              value={sortLabel}
              isPlaceholder={!priceSort}
              options={[
                { value: "", label: t("filters.sortDefault") },
                { value: "price-asc", label: t("filters.priceLowHigh") },
                { value: "price-desc", label: t("filters.priceHighLow") },
              ]}
              isOpen={openFilter === "sort"}
              onToggle={() => toggleFilter("sort")}
              onChange={(value) => setPriceSort(value as PriceSort)}
            />
          ) : null}
        </div>

        {hasActiveFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-white/25 bg-white/[0.04] py-4 text-2xl font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={28} />
            {t("filters.clearFilters")}
          </button>
        ) : null}
      </div>}

      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-8">
        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-white border-t-transparent" />
          </div>
        ) : error ? (
          <p className="py-20 text-center text-3xl text-gray-400">{error}</p>
        ) : activeTab === "services" ? (
          services.length === 0 ? (
            <p className="py-20 text-center text-3xl text-gray-400">
              No services available
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-6">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex h-full flex-col rounded-2xl bg-white p-4 text-black"
                >
                  <div className="mb-3 flex h-48 items-center justify-center">
                    {service.image ? (
                      <Image
                        src={service.image}
                        alt={service.name}
                        width={200}
                        height={200}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="h-full w-full rounded-xl bg-gray-100" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p className="text-2xl font-bold leading-tight">{service.name}</p>
                    {service.description ? (
                      <p className="mt-2 line-clamp-3 text-xl leading-snug text-gray-600">
                        {service.description}
                      </p>
                    ) : null}
                    {showPricing && service.price != null && service.currency ? (
                      <p className="mt-3 text-2xl font-semibold leading-none">
                        {currencySymbol(service.currency)} {service.price}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tabProducts.length === 0 ? (
          <p className="py-20 text-center text-3xl text-gray-400">
            {t("empty", { type: activeTab })}
          </p>
        ) : filteredProducts.length === 0 ? (
          <p className="py-20 text-center text-3xl text-gray-400">
            {t("emptyFiltered")}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="flex h-full flex-col rounded-2xl bg-white p-4 text-black"
              >
                <div className="mb-3 flex h-48 items-center justify-center">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={200}
                      height={200}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="h-full w-full rounded-xl bg-gray-100" />
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <p className="text-2xl font-bold leading-tight">{product.brand}</p>
                  <p className="mt-1 min-h-[3.5rem] line-clamp-2 text-xl leading-snug">
                    {product.name}
                  </p>
                  {showPricing ? (
                    <p className="mt-3 text-2xl font-semibold leading-none">
                      {currencySymbol(product.currency)} {product.price}
                    </p>
                  ) : null}
                  {product.description ? (
                    <p className="mt-3 line-clamp-3 text-lg leading-snug text-gray-600">
                      {product.description}
                    </p>
                  ) : (
                    <div className="mt-3 min-h-[4.5rem]" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface FilterOption {
  value: string;
  label: string;
}

function FilterDropdown({
  label,
  value,
  isPlaceholder,
  options,
  isOpen,
  onToggle,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  isPlaceholder?: boolean;
  options: FilterOption[];
  isOpen: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`relative ${isOpen ? "z-40" : "z-10"}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className={`flex w-full items-center justify-between gap-3 rounded-3xl border px-6 py-5 text-left transition-colors ${
          isOpen
            ? "border-white bg-white/10"
            : "border-white/20 bg-white/[0.06]"
        } ${disabled ? "cursor-not-allowed opacity-40" : "hover:bg-white/10"}`}
      >
        <span className="min-w-0">
          <span className="block text-lg font-semibold uppercase tracking-[0.18em] text-white/45">
            {label}
          </span>
          <span
            className={`mt-1 block truncate text-2xl font-semibold ${
              isPlaceholder ? "text-white/55" : "text-white"
            }`}
          >
            {value}
          </span>
        </span>
        <ChevronDown
          size={32}
          className={`shrink-0 text-white/50 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && !disabled ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-80 overflow-y-auto rounded-3xl border border-white/15 bg-[#141414] p-3 shadow-2xl">
          {options.map((option) => {
            const selected = option.label === value;
            return (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  onToggle();
                }}
                className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-5 py-4 text-left text-2xl last:mb-0 ${
                  selected
                    ? "bg-white text-black"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {selected ? (
                  <Check size={24} className="shrink-0" />
                ) : (
                  <span className="w-6 shrink-0" />
                )}
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
