// utils/mobileFTPUploader.ts - UPDATE dengan ZIP Upload
import { CustomerPhoto, KompetitorPhoto, PPIPhoto } from "@/api/interface";
import apiClient from "../api/axiosConfig";
import * as SecureStore from "expo-secure-store";

export const MobileFTPUploader = {
  // ✅ UPLOAD SINGLE PHOTO sebagai ZIP (Universal)
  async uploadSinglePhoto(
    fileUri: string,
    kode_cabang: string,
    entityType: string,
    entityId: string,
    photoType: string,
    metadata: any = {}
  ): Promise<string> {
    const formData = new FormData();

    formData.append("file", {
      uri: fileUri,
      type: "image/jpeg",
      name: `${photoType}.jpg`,
    } as any);

    formData.append("kode_cabang", kode_cabang);
    formData.append("entity_type", entityType);
    formData.append("entity_id", entityId);
    formData.append("photo_type", photoType);

    // Tambahkan metadata jika ada
    Object.keys(metadata).forEach((key) => {
      if (metadata[key]) {
        formData.append(key, metadata[key]);
      }
    });

    const response = await fetch(
      `${apiClient.defaults.baseURL}/ftp/upload-photo`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await SecureStore.getItemAsync(
            "auth_token"
          )}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      }
    );

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Upload failed");
    }

    return result.filePath;
  },

  // ✅ UPLOAD MULTIPLE PHOTOS sebagai ZIP (Khusus Customer)
  async uploadCustomerPhotosAsZip(
    photos: CustomerPhoto[],
    kode_cust: string,
    kode_cabang: string,
    customerName: string,
    salesName: string,
    location: {
      latitude: number;
      longitude: number;
      accuracy: number;
    } | null = null
  ): Promise<string> {
    try {
      console.log(`📦 Preparing ${photos.length} photos for ZIP upload...`);
      console.log(`📦 kode_cabang`, kode_cabang);
      console.log(`📦 kode_cust`, kode_cust);
      console.log(`📦 customerName`, customerName);
      // ✅ PREPARE PHOTOS DATA DENGAN WATERMARK INFO
      const photosData = {
        photos: photos.map((photo) => ({
          type: photo.type,
          base64: photo.base64,
          filename: photo.filename, // || `${photo.type}.jpg`,
          timestamp: photo.timestamp,
          location: photo.location,
          // ✅ INCLUDE WATERMARK DATA dari camera
          watermarkData: photo.watermarkData || {
            customerName,
            salesName,
            locationText: location
              ? `📍 ${location.latitude.toFixed(
                  6
                )}, ${location.longitude.toFixed(6)}`
              : "Lokasi tidak tersedia",
            accuracyText: location?.accuracy
              ? `Akurasi: ${location.accuracy.toFixed(1)}m`
              : "Akurasi tidak tersedia",
            checkType: "NOO_CUSTOMER",
          },
        })),
        metadata: {
          customerName,
          salesName,
          location: location
            ? `Lat: ${location.latitude.toFixed(
                6
              )}, Long: ${location.longitude.toFixed(6)}`
            : "",
          accuracy: location?.accuracy
            ? `${location.accuracy.toFixed(1)}m`
            : "",
        },
      };

      const formData = new FormData();
      formData.append("photos_data", JSON.stringify(photosData));
      formData.append("kode_cabang", kode_cabang);
      formData.append("entity_type", "NOO");
      formData.append("entity_id", kode_cust);
      formData.append("customerName", customerName);
      formData.append("salesName", salesName);

      if (location) {
        formData.append(
          "location",
          `Lat: ${location.latitude.toFixed(
            6
          )}, Long: ${location.longitude.toFixed(6)}`
        );
        formData.append("accuracy", `${location.accuracy.toFixed(1)}m`);
      }

      console.log("📤 Sending ZIP upload request with watermark data...", {
        photosData,
        kode_cabang,
        kode_cust,
        photoCount: photos.length,
        customerName,
        photosWithWatermark: photos.filter((p) => p.watermarkData).length,
      });

      console.log("apiClient.defaults.baseURL ", apiClient.defaults.baseURL);
      const response = await fetch(
        `${apiClient.defaults.baseURL}/ftp/upload-photos-zip`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await SecureStore.getItemAsync(
              "auth_token"
            )}`,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "ZIP upload failed");
      }

      console.log(
        "✅ uploadCustomerPhotosAsZip ZIP upload successful with watermark:",
        result.zipPath
      );
      return result.zipPath;
    } catch (error: any) {
      console.error("❌ uploadCustomerPhotosAsZip ZIP upload failed:", error);
      throw new Error(
        `uploadCustomerPhotosAsZip ZIP upload failed: ${error.message}`
      );
    }
  },

  // utils/mobileFTPUploader.ts - UPDATED PPI METHOD
  async uploadPPIPhotosAsZip(
    photos: PPIPhoto[],
    kodeCust: string,
    kodeCabang: string,
    zipFileName: string
  ): Promise<string> {
    try {
      // console.log(`📦 Preparing ${photos.length} PPI photos for ZIP upload...`);
      // console.log(`📦 kode_cabang:`, kodeCabang);
      // console.log(`📦 kode_cust:`, kodeCust);
      // console.log(`📦 zipFileName:`, zipFileName);

      const photosWithBase64 = photos.filter((photo) => photo.base64);
      const photosWithoutBase64 = photos.length - photosWithBase64.length;

      if (photosWithoutBase64 > 0) {
        console.warn(
          `⚠️ ${photosWithoutBase64} photos without base64, cannot include in ZIP`
        );
      }
      // ✅ PREPARE PHOTOS DATA UNTUK PPI (TANPA GPS/WATERMARK)
      const photosData = {
        photos: photosWithBase64.map((photo) => ({
          type: "bukti_pembayaran", // Semua foto PPI adalah bukti pembayaran
          base64: photo.base64,
          filename: photo.filename || `bukti_pembayaran_${Date.now()}.jpg`,
          timestamp: photo.timestamp,
          // ❌ TIDAK PERLU location untuk PPI
          // ❌ TIDAK PERLU watermarkData untuk PPI
        })),
        metadata: {
          entityType: "PPI", // ✅ Entity type untuk PPI
          kodeCust: kodeCust,
          kodeCabang: kodeCabang,
          uploadTime: new Date().toISOString(),
          photoCount: photos.length,
          skippedCount: photosWithoutBase64,
        },
      };

      const formData = new FormData();
      formData.append("photos_data", JSON.stringify(photosData));
      formData.append("kode_cabang", kodeCabang);
      formData.append("entity_type", "PPI"); // ✅ Entity type PPI
      formData.append("entity_id", kodeCust);
      formData.append("zip_file_name", zipFileName);

      // console.log("📤 Sending PPI ZIP upload request...", {
      //   kode_cabang: kodeCabang,
      //   kode_cust: kodeCust,
      //   photoCount: photos.length,
      //   entityType: "PPI",
      //   zipFileName: zipFileName,
      // });

      console.log("apiClient.defaults.baseURL ", apiClient.defaults.baseURL);

      const response = await fetch(
        `${apiClient.defaults.baseURL}/ftp/upload-photos-zip`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await SecureStore.getItemAsync(
              "auth_token"
            )}`,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "PPI ZIP upload failed");
      }

      console.log(
        "✅ uploadPPIPhotosAsZip PPI ZIP upload successful:",
        result.zipPath
      );
      return result.zipPath;
    } catch (error: any) {
      console.error("❌ uploadPPIPhotosAsZip PPI ZIP upload failed:", error);
      throw new Error(`PPI ZIP upload failed: ${error.message}`);
    }
  },

  // Di FE_utilsMobileFtpUploader.txt - uploadKompetitorPhotosAsZip
  async uploadKompetitorPhotosAsZip(
    photos: KompetitorPhoto[],
    kodeCust: string,
    kodeCabang: string,
    zipFileName: string,
    productPhotoFilenames?: { [productIndex: number]: string[] }
  ): Promise<string> {
    try {
      // ✅ DEBUG DETAILED
      console.log(
        "🔄 uploadKompetitorPhotosAsZip - Received photos:",
        photos.map((p) => ({
          filename: p.filename,
          hasBase64: !!p.base64,
          productId: p.productId,
          timestamp: p.timestamp,
        }))
      );

      const photosWithBase64 = photos.filter((photo) => photo.base64);
      console.log(
        `📊 Filtered photos with base64: ${photosWithBase64.length}/${photos.length}`
      );

      const photosData = {
        photos: photosWithBase64.map((photo, index) => ({
          type: "data_kompetitor",
          base64: photo.base64,
          filename: photo.filename, // ✅ GUNAKAN FILENAME DARI PHOTO
          productId: photo.productId,
          timestamp: photo.timestamp,
        })),
        metadata: {
          entityType: "KOMPETITOR",
          kodeCust: kodeCust,
          kodeCabang: kodeCabang,
          uploadTime: new Date().toISOString(),
          photoCount: photos.length,
          ...(productPhotoFilenames && {
            product_photo_filenames: productPhotoFilenames,
          }),
        },
      };

      console.log("📤 Sending to backend:", {
        photoCount: photosData.photos.length,
        filenames: photosData.photos.map((p) => p.filename),
        hasMapping: !!productPhotoFilenames,
      });

      const formData = new FormData();
      formData.append("photos_data", JSON.stringify(photosData));
      formData.append("kode_cabang", kodeCabang);
      formData.append("entity_type", "KOMPETITOR");
      formData.append("entity_id", kodeCust);
      formData.append("zip_file_name", zipFileName);

      if (productPhotoFilenames) {
        formData.append(
          "photo_product_mapping",
          JSON.stringify(productPhotoFilenames)
        );
      }

      // console.log("LLLL MASUKKK");

      const response = await fetch(
        `${apiClient.defaults.baseURL}/ftp/upload-kompetitor-photos-zip`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await SecureStore.getItemAsync(
              "auth_token"
            )}`,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        }
      );

      const result = await response.json();
      console.log("📥 Backend response:", result);

      if (!result.success) {
        throw new Error(result.error || "DATA KOMPETITOR ZIP upload failed");
      }

      return result.zipPath;
    } catch (error: any) {
      console.error("❌ Kompetitor ZIP upload failed:", error);
      throw new Error(`Kompetitor ZIP upload failed: ${error.message}`);
    }
  },

  // ✅ SMART UPLOAD - Auto pilih metode berdasarkan jumlah photos
  async uploadCustomerPhotos(
    photos: CustomerPhoto[],
    kode_cust: string,
    kode_cabang: string,
    customerName: string,
    salesName: string,
    location: {
      latitude: number;
      longitude: number;
      accuracy: number;
    } | null = null
  ): Promise<string> {
    // Selalu gunakan ZIP upload untuk konsistensi
    console.log("🎯 Using ZIP upload for customer photos");
    return await this.uploadCustomerPhotosAsZip(
      photos,
      kode_cust,
      kode_cabang,
      customerName,
      salesName,
      location
    );
  },

  // ✅ UPLOAD RKS PHOTO sebagai ZIP
  async uploadRKSPhoto(
    photo: CustomerPhoto,
    kode_rks: string,
    kode_cabang: string,
    checkType: "checkin" | "checkout",
    customerName: string,
    salesName: string,
    location: {
      latitude: number;
      longitude: number;
      accuracy: number;
    } | null = null
  ): Promise<string> {
    try {
      console.log(`📦 Preparing RKS ${checkType} photo for ZIP upload...`);

      const locationText = location
        ? `Lat: ${location.latitude.toFixed(
            6
          )}, Long: ${location.longitude.toFixed(6)}`
        : "";
      const accuracyText = location?.accuracy
        ? `${location.accuracy.toFixed(1)}m`
        : "";

      const photosData = {
        photos: [
          {
            type: checkType,
            base64: photo.base64,
            filename: `${checkType}.jpg`,
            timestamp: photo.timestamp,
            location: photo.location,
          },
        ],
        metadata: {
          customerName,
          salesName,
          location: locationText,
          accuracy: accuracyText,
        },
      };

      const formData = new FormData();
      formData.append("photos_data", JSON.stringify(photosData));
      formData.append("kode_cabang", kode_cabang);
      formData.append("entity_type", "rks");
      formData.append("entity_id", kode_rks);
      formData.append("customerName", customerName);
      formData.append("salesName", salesName);
      formData.append("photo_type", checkType);

      if (locationText) formData.append("location", locationText);
      if (accuracyText) formData.append("accuracy", accuracyText);

      console.log("📤 Sending RKS ZIP upload request...", {
        kode_cabang,
        kode_rks,
        checkType,
        customerName,
      });

      const response = await fetch(
        `${apiClient.defaults.baseURL}/ftp/upload-photos-zip`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await SecureStore.getItemAsync(
              "auth_token"
            )}`,
            "Content-Type": "multipart/form-data",
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "RKS ZIP upload failed");
      }

      console.log("✅ RKS ZIP upload successful:", result.zipPath);
      return result.zipPath;
    } catch (error: any) {
      console.error("❌ uploadCustomerPhotos RKS ZIP upload failed:", error);
      throw new Error(
        `uploadCustomerPhotos RKS photo upload failed: ${error.message}`
      );
    }
  },
};
