import { useEffect, useState } from "react";

export default function Home() {
  const [dbInitialized, setDbInitialized] = useState(false);

  function initializeDB() {
    console.log("📂 Initializing IndexedDB...");
    const request = indexedDB.open("FileDB", 2);

    request.onupgradeneeded = (event) => {
      console.log("🔄 Upgrading DB...");
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("files")) {
        console.log("✅ Creating 'files' store...");
        db.createObjectStore("files", { autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      console.log("🚀 IndexedDB Ready!");
      setDbInitialized(true);
    };

    request.onerror = (event) => {
      console.error("❌ IndexedDB Initialization Failed:", (event.target as IDBOpenDBRequest).error);
    };
  }

  function downloadSampleFile() {
    if (!dbInitialized) {
      console.warn("⏳ Waiting for IndexedDB initialization...");
      return;
    }

    console.log("📥 Downloading sample file...");

    const fileContent = "Hello, this is a sample file!";
    const blob = new Blob([fileContent], { type: "text/plain" });

    const request = indexedDB.open("FileDB", 2);
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = db.transaction("files", "readwrite");
      const store = tx.objectStore("files");

      store.add({ fileBlob: blob, url: "sample.txt" });

      console.log("✅ Sample file added to IndexedDB!");
    };
  }

  async function fetchAndUploadFile() {
    console.log("📂 Fetching file from IndexedDB...");

    const request = indexedDB.open("FileDB", 2);
    request.onsuccess = async (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("files")) {
        console.error("❌ ERROR: 'files' object store missing.");
        return;
      }

      const tx = db.transaction("files", "readonly");
      const store = tx.objectStore("files");
      const getAllFiles = store.getAll();

      getAllFiles.onsuccess = async () => {
        if (getAllFiles.result.length === 0) {
          console.warn("⚠️ No files found in IndexedDB.");
          return;
        }

        const fileEntry = getAllFiles.result[0];
        const url = URL.createObjectURL(fileEntry.fileBlob);

        // ✅ File Download
        const a = document.createElement("a");
        a.href = url;
        a.download = fileEntry.url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        console.log("✅ File downloaded successfully!");

        // ✅ File AWS pe Upload
        console.log("🚀 Uploading file to AWS...");
        const formData = new FormData();
        formData.append("file", fileEntry.fileBlob, fileEntry.url);

        try {
          const res = await fetch("/api/s3/upload", { 
            method: "POST",
            body: formData,
          });

          if (res.ok) {
            console.log("✅ File uploaded to AWS S3 successfully!");
          } else {
            console.error("❌ AWS Upload Failed!", await res.text());
          }
        } catch (error) {
          console.error("❌ AWS Upload Error:", error);
        }
      };
    };
  }

  useEffect(() => {
    initializeDB();
  }, []);

  return (
    <div>
      <h1>📂 Auto Upload & Download Files</h1>
      <button onClick={downloadSampleFile}>📥 Add & Download Sample File</button>
      <button onClick={fetchAndUploadFile}>📂 Fetch, Download & Upload</button>
    </div>
  );
}
