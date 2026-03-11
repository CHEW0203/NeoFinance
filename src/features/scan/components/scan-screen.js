"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { useLanguage } from "@/hooks/use-language";
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
  const { t } = useLanguage();
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
  const [editCategoryId, setEditCategoryId] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const transaction = result?.transaction;
    if (!transaction) return;
    setEditAmount(String(transaction.amount ?? ""));
    setEditCategoryId(transaction.categoryId || transaction.category?.id || "");
    setEditError("");
  }, [result]);

  async function loadCategories() {
    setIsLoadingCategories(true);
    try {
      const response = await fetch("/api/categories", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || t.transactions?.loadCategoriesFailed || "Failed to load categories.");
      }
      setCategories(payload.data || []);
    } catch (error) {
      setEditError(error?.message || "Failed to load categories.");
    } finally {
      setIsLoadingCategories(false);
    }
  }

  async function startCamera() {
    setCameraError("");
    setScanError("");
    setResult(null);

    if (!canUseCamera()) {
      setCameraError(t.scan?.noCamera || "Unable to access the camera.");
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
          ? t.scan?.permissionDenied || "Camera permission was denied."
          : t.scan?.noCamera || "Unable to access the camera.";
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
      setScanError(t.scan?.invalidImage || "Unsupported image format.");
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
        setScanError(t.scan?.uploadFailed || "Failed to load the image.");
        return;
      }
      const scaled = await downscaleDataUrl(dataUrl);
      setCapturedImage(scaled);
    };
    reader.onerror = () => {
      setScanError(t.scan?.uploadFailed || "Failed to load the image.");
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
    } catch (error) {
      setScanError(error?.message || t.scan?.uploadFailed || "Failed to scan receipt.");
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
        throw new Error(t.scan?.invalidAmount || "Please enter a valid amount.");
      }
      if (!editCategoryId) {
        throw new Error(t.transactions?.selectCategory || "Please select a category.");
      }
      const payload = {
        amount: parsedAmount,
        categoryId: editCategoryId,
      };
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update transaction.");
      }
      setResult((prev) =>
        prev ? { ...prev, transaction: data.data || transaction } : prev
      );
      window.dispatchEvent(new Event("neo:transactions-updated"));
      router.push("/gallery");
      router.refresh();
    } catch (error) {
      setEditError(error?.message || "Failed to update transaction.");
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#eef2ff_35%,#e2e8f0_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <BackButton fallbackHref="/" />

        <section className="rounded-3xl border border-slate-300 bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-900">
            {t.pages?.scan || t.scan?.title || "Scan"}
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            {t.scan?.description || t.pages?.scanDesc || "Capture a receipt and extract expense details."}
          </p>
        </section>

        <section className="rounded-3xl border-2 border-slate-900 bg-white p-5">
          <div className="space-y-4">
            <div className="aspect-video w-full overflow-hidden rounded-2xl border border-slate-300 bg-slate-100">
              {capturedImage ? (
                <img src={capturedImage} alt="Receipt preview" className="h-full w-full object-cover" />
              ) : (
                <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              )}
            </div>

            <p className="text-sm text-slate-600">
              {t.scan?.cameraHint || "Align the receipt within the frame and keep the lighting bright."}
            </p>

            <div className="flex flex-wrap gap-3">
              {!capturedImage && !isCameraOn ? (
                <>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400"
                  >
                    {t.scan?.startCamera || "Start camera"}
                  </button>
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
                  >
                    {t.scan?.uploadPhoto || "Upload photo"}
                  </button>
                </>
              ) : null}

              {!capturedImage && isCameraOn ? (
                <>
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
                  >
                    {t.scan?.capture || "Capture"}
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
                  >
                    {t.scan?.stopCamera || "Stop camera"}
                  </button>
                </>
              ) : null}

              {capturedImage ? (
                <>
                  <button
                    type="button"
                    onClick={resetCapture}
                    className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700"
                  >
                    {t.scan?.retake || "Retake"}
                  </button>
                  <button
                    type="button"
                    onClick={handleScan}
                    disabled={isProcessing}
                    className="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isProcessing ? t.scan?.processing || "Processing..." : t.scan?.scanReceipt || "Scan receipt"}
                  </button>
                </>
              ) : null}
            </div>

            {cameraError ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {cameraError}
              </p>
            ) : null}

            {scanError ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {scanError}
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border-2 border-slate-900 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">
            {t.scan?.resultTitle || "Scan result"}
          </h2>

          {transaction ? (
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">{t.scan?.merchant || "Merchant"}</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {receipt?.merchant || transaction.title || "-"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="text-xs font-semibold text-slate-500">
                    {t.scan?.amount || "Amount"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editAmount}
                    onChange={(event) => setEditAmount(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-800"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {formatCurrency(transaction.amount, transaction.account?.currency || "RM")}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="text-xs font-semibold text-slate-500">
                    {t.scan?.category || "Category"}
                  </label>
                  <select
                    value={editCategoryId}
                    onChange={(event) => setEditCategoryId(event.target.value)}
                    disabled={isLoadingCategories || expenseCategories.length === 0}
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-slate-800 disabled:opacity-60"
                  >
                    {expenseCategories.length === 0 ? (
                      <option value="">{t.transactions?.categoryNotFound || "Category not found."}</option>
                    ) : null}
                    {expenseCategories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    {transaction.category?.name || "-"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">{t.scan?.date || "Date"}</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDate(transaction.transactionDate)}
                  </p>
                </div>
              </div>

              <p className="text-sm text-emerald-700">
                {t.scan?.saved || "Expense recorded and photo saved to the gallery."}
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveAndOpenGallery}
                  disabled={isSavingEdit}
                  className="rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingEdit
                    ? t.scan?.saving || "Saving..."
                    : t.scan?.saveOpenGallery || "Save and open gallery"}
                </button>
              </div>

              {editError ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {editError}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              {t.scan?.resultPlaceholder || "Scan a receipt to see the extracted details here."}
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
