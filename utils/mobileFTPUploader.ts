// utils/mobileFTPUploader.ts - UPDATE dengan ZIP Upload
import { CustomerPhoto } from "@/api/interface";
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
          filename: photo.filename || `${photo.type}.jpg`,
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
