"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { useLanguage } from "@/hooks/use-language";
import { getLocaleFromLanguage } from "@/lib/i18n";
import {
  getLocalizedCategoryLabel,
  toCanonicalCategoryName,
} from "@/lib/i18n/category-labels";
import { scanReceipt } from "@/services/receipt-api";
import { formatCurrency, formatDate } from "@/utils/format";

const MAX_CAPTURE_WIDTH = 1280;
const CAPTURE_QUALITY = 0.85;

function canUseCamera() {
  return typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia;
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function ScanScreen() {
  const { language, t } = useLanguage();
  const locale = getLocaleFromLanguage(language);
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [scanError, setScanError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editCategoryName, setEditCategoryName] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const transaction = result?.transaction;
    if (!transaction) return;
    setEditAmount(String(transaction.amount ?? ""));
    setEditCategoryName(
      transaction.category?.name
        ? getLocalizedCategoryLabel(transaction.category.name, language)
        : ""
    );
    setEditError("");
  }, [result, language]);

  async function loadCategories() {
    setIsLoadingCategories(true);
    try {
      const response = await fetch("/api/categories", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || t.scan.loadCategoriesFailed);
      }
      setCategories(payload.data || []);
    } catch {
      setEditError(t.scan.loadCategoriesFailed);
    } finally {
      setIsLoadingCategories(false);
    }
  }

  async function startCamera() {
    setCameraError("");
    setScanError("");
    setResult(null);

    if (!canUseCamera()) {
      setCameraError(t.scan.noCamera);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraOn(true);
    } catch (error) {
      const message =
        error?.name === "NotAllowedError"
          ? t.scan.permissionDenied
          : t.scan.noCamera;
      setCameraError(message);
      setIsCameraOn(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  }

  function capturePhoto() {
    setScanError("");
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) return;

    const scale = Math.min(1, MAX_CAPTURE_WIDTH / width);
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
    const dataUrl = canvas.toDataURL("image/jpeg", CAPTURE_QUALITY);
    setCapturedImage(dataUrl);
    stopCamera();
  }

  async function downscaleDataUrl(dataUrl) {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return dataUrl;
      const img = await loadImageFromDataUrl(dataUrl);
      const scale = Math.min(1, MAX_CAPTURE_WIDTH / img.width);
      const targetWidth = Math.round(img.width * scale);
      const targetHeight = Math.round(img.height * scale);
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return dataUrl;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      return canvas.toDataURL("image/jpeg", CAPTURE_QUALITY);
    } catch (error) {
      return dataUrl;
    }
  }

  function handleUploadClick() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setScanError(t.scan.invalidImage);
      return;
    }
    setCameraError("");
    setScanError("");
    setResult(null);
    stopCamera();

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl) {
        setScanError(t.scan.uploadFailed);
        return;
      }
      const scaled = await downscaleDataUrl(dataUrl);
      setCapturedImage(scaled);
    };
    reader.onerror = () => {
      setScanError(t.scan.uploadFailed);
    };
    reader.readAsDataURL(file);
  }

  async function handleScan() {
    if (!capturedImage || isProcessing) return;
    setIsProcessing(true);
    setScanError("");
    try {
      const data = await scanReceipt(capturedImage);
      setResult(data);
      window.dispatchEvent(new Event("neo:transactions-updated"));
      window.dispatchEvent(new Event("neo:receipts-updated"));
    } catch {
      setScanError(t.scan.uploadFailed);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSaveAndOpenGallery() {
    const transaction = result?.transaction;
    if (!transaction || isSavingEdit) return;
    setIsSavingEdit(true);
    setEditError("");
    try {
      const parsedAmount = Number(editAmount);
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        throw new Error(t.scan.invalidAmount);
      }
      const manualCategory = String(editCategoryName || "").trim();
      if (!manualCategory) {
        throw new Error(t.scan.invalidCategory);
      }
      const normalizedCategory = toCanonicalCategoryName(manualCategory);
      const payload = {
        amount: parsedAmount,
        categoryName: normalizedCategory,
      };
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || t.scan.updateFailed);
      }
      setResult((prev) =>
        prev ? { ...prev, transaction: data.data || transaction } : prev
      );
      window.dispatchEvent(new Event("neo:transactions-updated"));
      router.push("/gallery");
      router.refresh();
    } catch {
      setEditError(t.scan.updateFailed);
    } finally {
      setIsSavingEdit(false);
    }
  }

  function resetCapture() {
    setCapturedImage("");
    setResult(null);
    setScanError("");
  }

  const transaction = result?.transaction;
  const receipt = result?.receipt;
  const expenseCategories = categories.filter((item) => item.type === "expense");
  const expenseCategoryNames = expenseCategories
    .map((item) => String(item.name || "").trim())
    .filter(Boolean);
  const expenseCategoryOptions = expenseCategoryNames.map((rawName) => ({
    rawName,
    label: getLocalizedCategoryLabel(rawName, language),
  }));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff5d6_0%,#fff9e8_35%,#e8f3ff_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <BackButton fallbackHref="/" preferFallback />

        <section className="relative overflow-hidden rounded-3xl border-2 border-slate-900 bg-gradient-to-br from-amber-200 via-yellow-100 to-sky-100 p-6 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.45)]">
          <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/40" />
          <span className="pointer-events-none absolute -left-6 -bottom-8 h-20 w-20 rounded-full bg-cyan-200/40" />
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {t.pages.scan || t.scan.title}
          </h1>
          <p className="mt-3 text-sm font-medium text-slate-700">
            {t.scan.description || t.pages.scanDesc}
          </p>
        </section>

        <section className="rounded-3xl border-2 border-slate-900 bg-white/95 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.45)]">
          <div className="space-y-4">
            <div className="h-[24rem] w-full overflow-hidden rounded-2xl border-2 border-slate-900 bg-slate-100 sm:h-[30rem] lg:h-[34rem]">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt={t.scan.receiptPreview}
                  className="h-full w-full bg-white object-contain p-1"
                />
              ) : (
                <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              )}
            </div>

            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-slate-600">
              {t.scan.cameraHint}
            </p>

            <div className="flex flex-wrap gap-3">
              {!capturedImage && !isCameraOn ? (
                <>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="rounded-2xl border-2 border-slate-900 bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-3 text-sm font-bold text-white transition hover:brightness-105"
                  >
                    {t.scan.startCamera}
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="rounded-2xl border-2 border-slate-900 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-amber-100"
                  >
                    {t.scan.uploadPhoto}
                  </button>
                </>
              ) : null}

              {!capturedImage && isCameraOn ? (
                <>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="rounded-2xl border-2 border-slate-900 bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-bold text-white transition hover:brightness-105"
                  >
                    {t.scan.capture}
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="rounded-2xl border-2 border-slate-900 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-amber-100"
                  >
                    {t.scan.stopCamera}
                  </button>
                </>
              ) : null}

              {capturedImage ? (
                <>
                  <button
                    type="button"
                    onClick={resetCapture}
                    className="rounded-2xl border-2 border-slate-900 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-amber-100"
                  >
                    {t.scan.retake}
                  </button>
                  <button
                    type="button"
                    onClick={handleScan}
                    disabled={isProcessing}
                    className="rounded-2xl border-2 border-slate-900 bg-amber-300 px-5 py-3 text-sm font-extrabold text-slate-900 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isProcessing ? t.scan.processing : t.scan.scanReceipt}
                  </button>
                </>
              ) : null}
            </div>

            {cameraError ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {cameraError}
              </p>
            ) : null}

            {scanError ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {scanError}
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border-2 border-slate-900 bg-white p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.45)]">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            {t.scan.resultTitle}
          </h2>

          {transaction ? (
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-amber-50 to-white p-4">
                  <p className="text-xs font-semibold text-slate-500">{t.scan.merchant}</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {receipt?.merchant || transaction.title || "-"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-50 to-white p-4">
                  <p className="text-xs font-semibold text-slate-500">{t.scan.date}</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDate(transaction.transactionDate, locale)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-cyan-50 to-white p-4 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-500">
                    {t.scan.amount}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmount}
                    onChange={(event) => setEditAmount(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {formatCurrency(transaction.amount, transaction.account?.currency || "RM")}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-rose-50 to-white p-4 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-500">
                    {t.scan.category}
                  </label>
                  <input
                    type="text"
                    value={editCategoryName}
                    onChange={(event) => setEditCategoryName(event.target.value)}
                    placeholder={t.scan.categoryPlaceholder}
                    disabled={isLoadingCategories}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 disabled:opacity-60"
                  />
                  {expenseCategoryOptions.length > 0 ? (
                    <div className="mt-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                      {expenseCategoryOptions.map((item) => {
                        const active =
                          toCanonicalCategoryName(editCategoryName).toLowerCase() ===
                          toCanonicalCategoryName(item.rawName).toLowerCase();
                        return (
                          <button
                            key={item.rawName}
                            type="button"
                            onClick={() => setEditCategoryName(item.label)}
                            className={
                              active
                                ? "rounded-full border-2 border-slate-900 bg-amber-300 px-3 py-1 text-xs font-bold text-slate-900"
                                : "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-900"
                            }
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-500">
                    {t.scan.categoryHint}
                  </p>
                </div>
              </div>

              <p className="text-sm text-emerald-700">
                {t.scan.saved}
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveAndOpenGallery}
                  disabled={isSavingEdit}
                  className="rounded-2xl border-2 border-slate-900 bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingEdit ? t.scan.saving : t.scan.saveOpenGallery}
                </button>
              </div>

              {editError ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {editError}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              {t.scan.resultPlaceholder}
            </p>
          )}
        </section>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </main>
  );
}
