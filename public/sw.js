self.addEventListener("fetch", (event) => {
    if (event.request.destination === "document") return;
  
    console.log("📥 Intercepting Download:", event.request.url);
  
    event.respondWith(
      (async () => {
        const response = await fetch(event.request);
        const clonedResponse = response.clone();
        const fileBlob = await clonedResponse.blob();
  
        console.log("✅ File Downloaded:", event.request.url);
  
        const dbRequest = indexedDB.open("FileDB", 1);
        dbRequest.onupgradeneeded = (event) => {
          console.log("📂 Creating IndexedDB Store...");
          const db = event.target.result;
          if (!db.objectStoreNames.contains("files")) {
            db.createObjectStore("files", { autoIncrement: true });
          }
        };
  
        dbRequest.onsuccess = (event) => {
          console.log("💾 Saving file in IndexedDB...");
          const db = event.target.result;
          const tx = db.transaction("files", "readwrite");
          const store = tx.objectStore("files");
          store.add({ fileBlob, url: event.request.url });
  
          console.log("✅ File Saved in IndexedDB:", event.request.url);
        };
  
        return response;
      })()
    );
  });
  