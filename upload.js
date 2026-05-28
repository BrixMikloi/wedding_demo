const MEMORY_UPLOAD_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbyPvf78QhlRltx4o8jlGZvaLqHfmhraK71Cu9qTpMLojK3hi7AomQc34Cd43FlhOsNd/exec";
const MAX_FILES = 8;
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|heic|heif|webp|mp4|mov|webm)$/i;

const uploadForm = document.querySelector("#memoryUploadForm");
const fileInput = document.querySelector("#memoryFiles");
const fileList = document.querySelector("#memoryFileList");
const uploadStatus = document.querySelector("#memoryUploadStatus");
const progressWrap = document.querySelector(".upload-progress");
const progressBar = document.querySelector("#uploadProgressBar");
const successState = document.querySelector("#uploadSuccess");
const uploadAgain = document.querySelector("#uploadAgain");

const formatBytes = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const isGoogleAppsScriptEndpoint = /^https:\/\/script\.google\.com\/macros\/s\//.test(
  MEMORY_UPLOAD_ENDPOINT
);

const setStatus = (message, color = "#776a5c") => {
  uploadStatus.textContent = message;
  uploadStatus.style.color = color;
};

const renderFiles = () => {
  const files = Array.from(fileInput.files || []);
  fileList.innerHTML = "";

  files.forEach((file) => {
    const row = document.createElement("div");
    row.innerHTML = `<span>${file.name}</span><small>${formatBytes(file.size)}</small>`;
    fileList.append(row);
  });
};

const validateFiles = (files) => {
  if (!files.length) return "Please choose at least one photo or video.";
  if (files.length > MAX_FILES) return `Please upload ${MAX_FILES} files or fewer at a time.`;

  const oversized = files.find((file) => file.size > MAX_FILE_SIZE);
  if (oversized) return `${oversized.name} is larger than 20 MB.`;

  const unsupported = files.find(
    (file) => !ACCEPTED_TYPES.has(file.type) && !ACCEPTED_EXTENSIONS.test(file.name)
  );
  if (unsupported) return `${unsupported.name} is not a supported photo or video format.`;

  return "";
};

const fileToPayload = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const [, base64] = String(reader.result).split(",");
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64,
      });
    };

    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });

const animateProgressUntilSettled = () => {
  let percent = 8;
  progressBar.style.width = `${percent}%`;
  setStatus("Uploading... 8%");

  return window.setInterval(() => {
    percent = Math.min(percent + Math.ceil((92 - percent) * 0.12), 92);
    progressBar.style.width = `${percent}%`;
    setStatus(`Uploading... ${percent}%`);
  }, 420);
};

const postToAppsScript = async (payload) => {
  const progressTimer = animateProgressUntilSettled();

  try {
    await fetch(MEMORY_UPLOAD_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    return { status: "success" };
  } finally {
    window.clearInterval(progressTimer);
  }
};

const postWithProgress = (payload) =>
  new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();

    request.open("POST", MEMORY_UPLOAD_ENDPOINT);
    request.setRequestHeader("Content-Type", "text/plain;charset=utf-8");

    request.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      progressBar.style.width = `${percent}%`;
      setStatus(`Uploading... ${percent}%`);
    });

    request.onload = () => {
      try {
        const result = JSON.parse(request.responseText || "{}");
        if (request.status >= 200 && request.status < 300 && result.status !== "error") {
          resolve(result);
        } else {
          reject(new Error(result.message || "Upload failed."));
        }
      } catch {
        reject(new Error("The upload response could not be read."));
      }
    };

    request.onerror = () => reject(new Error("Upload failed. Please check your connection."));
    request.send(JSON.stringify(payload));
  });

fileInput?.addEventListener("change", () => {
  renderFiles();
  setStatus("");
});

const closeSuccessModal = () => {
  successState.classList.remove("is-visible");
  successState.setAttribute("aria-hidden", "true");
  uploadForm.reset();
  fileList.innerHTML = "";
  progressBar.style.width = "0%";
  progressWrap.setAttribute("aria-hidden", "true");
  setStatus("");
};

uploadAgain?.addEventListener("click", closeSuccessModal);

successState?.addEventListener("click", (event) => {
  if (event.target === successState) closeSuccessModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && successState?.classList.contains("is-visible")) {
    closeSuccessModal();
  }
});

uploadForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const files = Array.from(fileInput.files || []);
  const validationMessage = validateFiles(files);

  if (validationMessage) {
    setStatus(validationMessage, "#9a5d4c");
    return;
  }

  if (MEMORY_UPLOAD_ENDPOINT.includes("PASTE_YOUR")) {
    setStatus("Add your Google Apps Script web app URL in upload.js before uploading.", "#9a5d4c");
    return;
  }

  const submitButton = uploadForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  progressWrap.setAttribute("aria-hidden", "false");
  progressBar.style.width = "4%";
  setStatus("Preparing your memories...");

  try {
    const formData = new FormData(uploadForm);
    const payload = {
      action: "memoryUpload",
      guestName: String(formData.get("guestName") || "").trim(),
      message: String(formData.get("message") || "").trim(),
      uploadedAt: new Date().toISOString(),
      files: await Promise.all(files.map(fileToPayload)),
    };

    if (isGoogleAppsScriptEndpoint) {
      await postToAppsScript(payload);
    } else {
      await postWithProgress(payload);
    }

    progressBar.style.width = "100%";
    successState.classList.add("is-visible");
    successState.setAttribute("aria-hidden", "false");
    uploadAgain?.focus();
  } catch (error) {
    setStatus(error.message || "Upload failed. Please try again.", "#9a5d4c");
  } finally {
    submitButton.disabled = false;
  }
});
