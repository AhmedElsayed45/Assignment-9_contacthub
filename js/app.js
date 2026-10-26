(function () {
  const vaultName = "contacts";
  const lettersOnly = /^[a-zA-Z\u0600-\u06FF\s]{2,50}$/;
  const egyptPhone = /^(\+20|0020|20)?0?1[0125][0-9]{8}$/;
  const mailShape = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  const chipTone = {
    family: "background:#dbeafe;color:#1d4ed8",
    friends: "background:#dcfce7;color:#15803d",
    work: "background:#f3e8ff;color:#7e22ce",
    school: "background:#fef3c7;color:#b45309",
    other: "background:#f3f4f6;color:#374151",
  };
  const facePalette = [
    ["#3b82f6", "#2563eb"],
    ["#8b5cf6", "#9333ea"],
    ["#10b981", "#0d9488"],
    ["#f43f5e", "#db2777"],
    ["#f59e0b", "#ea580c"],
    ["#06b6d4", "#2563eb"],
    ["#6366f1", "#7c3aed"],
    ["#d946ef", "#db2777"],
  ];

  const ui = {
    grid: document.getElementById("contactsGrid"),
    summary: document.getElementById("contactsSummary"),
    search: document.getElementById("searchInput"),
    total: document.getElementById("totalCount"),
    stars: document.getElementById("favoritesCount"),
    urgent: document.getElementById("emergencyCount"),
    starBox: document.getElementById("favoritesList"),
    starBoxSm: document.getElementById("favoritesListMobile"),
    alertBox: document.getElementById("emergencyList"),
    alertBoxSm: document.getElementById("emergencyListMobile"),
    sheet: document.getElementById("contactModal"),
    sheetBody: document.getElementById("modalPanel"),
    sheetTitle: document.getElementById("modalTitle"),
    form: document.getElementById("contactForm"),
    hiddenId: document.getElementById("contactId"),
    fullName: document.getElementById("contactName"),
    phone: document.getElementById("contactPhone"),
    mail: document.getElementById("contactEmail"),
    place: document.getElementById("contactAddress"),
    group: document.getElementById("contactGroup"),
    notes: document.getElementById("contactNotes"),
    starFlag: document.getElementById("contactFavorite"),
    alertFlag: document.getElementById("contactEmergency"),
    photo: document.getElementById("avatarInput"),
    face: document.getElementById("avatarPreview"),
    nameHint: document.getElementById("contactNameError"),
    phoneHint: document.getElementById("contactPhoneError"),
    mailHint: document.getElementById("contactEmailError"),
  };

  let book = [];
  let activeId = null;
  let faceData = "";

  function byId(id) {
    return document.getElementById(id);
  }

  function safe(text) {
    return String(text ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function shortName(label) {
    const bits = String(label || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!bits.length) return "?";
    if (bits.length === 1) return bits[0][0].toUpperCase();
    return (bits[0][0] + bits[bits.length - 1][0]).toUpperCase();
  }

  function freshId() {
    return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function digitsOf(phone) {
    let n = String(phone).replace(/\D/g, "");
    if (n.startsWith("0020")) n = n.slice(4);
    else if (n.startsWith("20") && n.length > 10) n = n.slice(2);
    if (n.startsWith("0")) n = n.slice(1);
    return n;
  }

  function pullBook() {
    try {
      const raw = localStorage.getItem(vaultName);
      const parsed = raw ? JSON.parse(raw) : [];
      book = Array.isArray(parsed) ? parsed : [];
    } catch {
      book = [];
    }
  }

  function pushBook() {
    try {
      localStorage.setItem(vaultName, JSON.stringify(book));
      return true;
    } catch {
      Swal.fire({
        icon: "error",
        title: "Could not save",
        text: "Browser storage is full. Try a smaller photo or delete a contact.",
      });
      return false;
    }
  }

  function personById(id) {
    return book.find((row) => row.id === id) || null;
  }

  function markField(input, hint, ok) {
    hint.classList.toggle("hidden", ok);
    input.classList.toggle("border-red-500", !ok);
    input.classList.toggle("border-gray-200", ok);
  }

  function checkName(alertOn) {
    const value = ui.fullName.value.trim();
    if (!value) {
      markField(ui.fullName, ui.nameHint, true);
      if (alertOn) {
        Swal.fire({
          icon: "error",
          title: "Missing Name",
          text: "Please enter a name for the contact!",
        });
        ui.fullName.focus();
      }
      return null;
    }
    if (!lettersOnly.test(value)) {
      markField(ui.fullName, ui.nameHint, false);
      if (alertOn) {
        Swal.fire({
          icon: "error",
          title: "Invalid Name",
          text: "Name should contain only letters and spaces (2-50 characters)",
        });
        ui.fullName.focus();
      }
      return null;
    }
    markField(ui.fullName, ui.nameHint, true);
    return value;
  }

  function checkPhone(alertOn) {
    const value = ui.phone.value.trim();
    if (!value) {
      markField(ui.phone, ui.phoneHint, true);
      if (alertOn) {
        Swal.fire({
          icon: "error",
          title: "Missing Phone",
          text: "Please enter a phone number!",
        });
        ui.phone.focus();
      }
      return null;
    }
    if (!egyptPhone.test(value)) {
      ui.phoneHint.textContent = "Please enter a valid Egyptian phone number";
      markField(ui.phone, ui.phoneHint, false);
      if (alertOn) {
        Swal.fire({
          icon: "error",
          title: "Invalid Phone",
          text: "Please enter a valid Egyptian phone number (e.g., 01012345678 or +201012345678)",
        });
        ui.phone.focus();
      }
      return null;
    }
    const twin = book.find(
      (row) => row.id !== activeId && digitsOf(row.phone) === digitsOf(value)
    );
    if (twin) {
      markField(ui.phone, ui.phoneHint, false);
      ui.phoneHint.textContent = `This number is already saved for ${twin.name}`;
      if (alertOn) {
        Swal.fire({
          icon: "error",
          title: "Duplicate Phone Number",
          text: `A contact with this phone number already exists: ${twin.name}`,
        });
        ui.phone.focus();
      }
      return null;
    }
    ui.phoneHint.textContent = "Please enter a valid Egyptian phone number";
    markField(ui.phone, ui.phoneHint, true);
    return value;
  }

  function checkMail(alertOn) {
    const value = ui.mail.value.trim();
    if (!value) {
      markField(ui.mail, ui.mailHint, true);
      return "";
    }
    if (!mailShape.test(value)) {
      markField(ui.mail, ui.mailHint, false);
      if (alertOn) {
        Swal.fire({
          icon: "error",
          title: "Invalid Email",
          text: "Please enter a valid email address",
        });
        ui.mail.focus();
      }
      return null;
    }
    markField(ui.mail, ui.mailHint, true);
    return value;
  }

  function faceBlock(row, size) {
    const box = size === "lg" ? "w-14 h-14 text-lg rounded-xl" : "w-10 h-10 text-sm rounded-lg";
    if (typeof row.avatar === "string" && row.avatar.startsWith("data:image/")) {
      return `<img src="${row.avatar}" alt="${safe(row.name)}" class="${box} object-cover" />`;
    }
    const pair = facePalette[row.name.length % facePalette.length];
    return `<div class="${box} flex items-center justify-center text-white font-semibold shadow-sm" style="background-image:linear-gradient(to bottom right, ${pair[0]}, ${pair[1]})">${safe(shortName(row.name))}</div>`;
  }

  function cardHtml(row) {
    const starOn = row.isFavorite
      ? "text-amber-400 bg-amber-50 hover:bg-amber-100"
      : "text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-amber-400";
    const alertOn = row.isEmergency
      ? "text-rose-500 bg-rose-50 hover:bg-rose-100"
      : "text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-rose-500";
    const starIcon = row.isFavorite
      ? '<i class="fa-solid fa-star"></i>'
      : '<i class="fa-regular fa-star"></i>';
    const alertIcon = row.isEmergency
      ? '<i class="fa-solid fa-heart-pulse"></i>'
      : '<i class="fa-regular fa-heart"></i>';
    const starDot = row.isFavorite
      ? `<div class="absolute -top-0.5 -right-0.5 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center ring-2 ring-white"><i class="fa-solid fa-star text-white text-[8px]"></i></div>`
      : "";
    const alertDot = row.isEmergency
      ? `<div class="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center ring-2 ring-white"><i class="fa-solid fa-heart-pulse text-white text-[8px]"></i></div>`
      : "";
    const mailLine = row.email
      ? `<div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
            <i class="fa-solid fa-envelope text-violet-600 text-[10px]"></i>
          </div>
          <span class="text-gray-600 text-sm truncate">${safe(row.email)}</span>
        </div>`
      : "";
    const placeLine = row.address
      ? `<div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <i class="fa-solid fa-location-dot text-emerald-600 text-[10px]"></i>
          </div>
          <span class="text-gray-600 text-sm truncate">${safe(row.address)}</span>
        </div>`
      : "";
    const groupChip = row.group
      ? `<span class="inline-flex items-center px-2 py-1 text-[11px] font-medium rounded-md capitalize" style="${chipTone[row.group] || chipTone.other}">${safe(row.group)}</span>`
      : "";
    const urgentChip = row.isEmergency
      ? `<span class="inline-flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 text-[11px] font-medium rounded-md"><i class="fa-solid fa-heart-pulse text-[10px]"></i>Emergency</span>`
      : "";
    const chips =
      groupChip || urgentChip
        ? `<div class="flex flex-wrap gap-1.5 mt-3">${groupChip}${urgentChip}</div>`
        : "";
    const mailBtn = row.email
      ? `<a href="mailto:${safe(row.email)}" class="w-9 h-9 text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-all flex items-center justify-center" title="Email" aria-label="Email ${safe(row.name)}">
          <i class="fa-solid fa-envelope text-sm"></i>
        </a>`
      : "";

    return `
      <article class="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all duration-200 overflow-hidden h-full flex flex-col">
        <div class="p-4 pb-3 flex-1">
          <div class="flex items-start gap-3.5">
            <div class="relative shrink-0">
              ${faceBlock(row, "lg")}
              ${alertDot}
              ${starDot}
            </div>
            <div class="flex-1 min-w-0 pt-1">
              <h3 class="font-semibold text-gray-900 text-base truncate">${safe(row.name)}</h3>
              <div class="flex items-center gap-2 mt-1">
                <div class="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                  <i class="fa-solid fa-phone text-blue-600 text-[9px]"></i>
                </div>
                <span class="text-gray-500 text-sm truncate">${safe(row.phone)}</span>
              </div>
            </div>
          </div>
          <div class="mt-3 space-y-2">
            ${mailLine}
            ${placeLine}
          </div>
          ${chips}
        </div>
        <div class="border-t border-gray-100 bg-gray-50/80 px-4 py-2.5 flex items-center justify-between mt-auto">
          <div class="flex items-center gap-1.5">
            <a href="tel:${safe(row.phone)}" class="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all flex items-center justify-center" title="Call" aria-label="Call ${safe(row.name)}">
              <i class="fa-solid fa-phone text-sm"></i>
            </a>
            ${mailBtn}
          </div>
          <div class="flex items-center gap-1.5">
            <button type="button" data-job="star" data-key="${row.id}" class="w-9 h-9 ${starOn} rounded-lg transition-all flex items-center justify-center cursor-pointer" title="Favorite" aria-label="Toggle favorite">
              ${starIcon}
            </button>
            <button type="button" data-job="alert" data-key="${row.id}" class="w-9 h-9 ${alertOn} rounded-lg transition-all flex items-center justify-center cursor-pointer" title="Emergency" aria-label="Toggle emergency">
              ${alertIcon}
            </button>
            <button type="button" data-job="edit" data-key="${row.id}" class="w-9 h-9 bg-gray-50 text-gray-500 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center cursor-pointer" title="Edit" aria-label="Edit contact">
              <i class="fa-solid fa-pen text-sm"></i>
            </button>
            <button type="button" data-job="drop" data-key="${row.id}" class="w-9 h-9 bg-gray-50 text-gray-500 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center cursor-pointer" title="Delete" aria-label="Delete contact">
              <i class="fa-solid fa-trash text-sm"></i>
            </button>
          </div>
        </div>
      </article>`;
  }

  function railHtml(row, kind) {
    const hover = kind === "alert" ? "hover:bg-rose-50" : "hover:bg-amber-50";
    const btn =
      kind === "alert"
        ? "bg-rose-100 group-hover:bg-rose-500 text-rose-600 group-hover:text-white"
        : "bg-emerald-100 group-hover:bg-emerald-500 text-emerald-600 group-hover:text-white";
    return `
      <div class="flex items-center gap-3 p-2.5 bg-gray-50 ${hover} rounded-xl transition-all group">
        <div class="shrink-0">${faceBlock(row, "sm")}</div>
        <div class="flex-1 min-w-0">
          <h4 class="font-medium text-gray-900 text-sm truncate">${safe(row.name)}</h4>
          <p class="text-xs text-gray-500 truncate">${safe(row.phone)}</p>
        </div>
        <a href="tel:${safe(row.phone)}" class="shrink-0 w-8 h-8 ${btn} rounded-lg transition-all flex items-center justify-center" title="Call" aria-label="Call ${safe(row.name)}">
          <i class="fa-solid fa-phone text-xs"></i>
        </a>
      </div>`;
  }

  function railHtmlSm(row, kind) {
    const hover =
      kind === "alert"
        ? "hover:border-rose-200 hover:bg-rose-50"
        : "hover:border-amber-200 hover:bg-amber-50";
    const btn = kind === "alert" ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600";
    return `
      <a href="tel:${safe(row.phone)}" class="flex items-center gap-2 p-2 bg-white border border-gray-100 ${hover} rounded-xl transition-all">
        <div class="shrink-0">${faceBlock(row, "sm")}</div>
        <div class="min-w-0 flex-1">
          <h4 class="font-medium text-gray-900 text-[11px] truncate leading-tight">${safe(row.name)}</h4>
          <p class="text-[10px] text-gray-400 truncate">${safe(row.phone)}</p>
        </div>
        <div class="w-6 h-6 ${btn} rounded-md flex items-center justify-center shrink-0">
          <i class="fa-solid fa-phone text-[8px]"></i>
        </div>
      </a>`;
  }

  function blankNote(text) {
    return `<div class="col-span-2 text-center py-8"><p class="text-gray-400 text-sm">${text}</p></div>`;
  }

  function paintGrid(rows) {
    const q = ui.search.value.trim();
    if (!rows.length) {
      const hint = q
        ? "Try another name, phone, or email"
        : 'Click "Add Contact" to get started';
      ui.grid.innerHTML = `
        <div class="col-span-full text-center py-20">
          <div class="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
            <i class="fa-solid fa-address-book text-3xl text-gray-300"></i>
          </div>
          <p class="text-gray-500 font-medium">No contacts found</p>
          <p class="text-gray-400 text-sm mt-1">${hint}</p>
        </div>`;
      return;
    }
    ui.grid.innerHTML = rows.map(cardHtml).join("");
  }

  function paintRail(desk, mobile, rows, empty, kind) {
    desk.innerHTML = rows.length ? rows.map((row) => railHtml(row, kind)).join("") : blankNote(empty);
    mobile.innerHTML = rows.length
      ? rows.map((row) => railHtmlSm(row, kind)).join("")
      : blankNote(empty);
  }

  function paintAll() {
    const q = ui.search.value.trim().toLowerCase();
    const shown = book.filter((row) => {
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q) ||
        (row.email || "").toLowerCase().includes(q)
      );
    });
    const starred = book.filter((row) => row.isFavorite);
    const urgent = book.filter((row) => row.isEmergency);
    paintGrid(shown);
    paintRail(ui.starBox, ui.starBoxSm, starred, "No favorites yet", "star");
    paintRail(ui.alertBox, ui.alertBoxSm, urgent, "No emergency contacts", "alert");
    ui.total.textContent = String(book.length);
    ui.stars.textContent = String(starred.length);
    ui.urgent.textContent = String(urgent.length);
    ui.summary.textContent = `Manage and organize your ${book.length} contacts`;
  }

  function showFace(src, label) {
    if (src && src.startsWith("data:image/")) {
      ui.face.className = "w-24 h-24 rounded-full overflow-hidden";
      ui.face.innerHTML = `<img src="${src}" alt="Contact photo" class="w-full h-full object-cover" />`;
      return;
    }
    ui.face.className =
      "w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold";
    ui.face.innerHTML = label ? safe(shortName(label)) : '<i class="fa-solid fa-user"></i>';
  }

  function clearHints() {
    markField(ui.fullName, ui.nameHint, true);
    markField(ui.phone, ui.phoneHint, true);
    markField(ui.mail, ui.mailHint, true);
    ui.phoneHint.textContent = "Please enter a valid Egyptian phone number";
  }

  function openCreate() {
    activeId = null;
    faceData = "";
    ui.form.reset();
    ui.hiddenId.value = "";
    clearHints();
    ui.sheetTitle.textContent = "Add New Contact";
    showFace("");
    ui.sheetBody.scrollTop = 0;
    ui.sheet.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
    ui.fullName.focus();
  }

  function openEdit(id) {
    const row = personById(id);
    if (!row) return;
    activeId = row.id;
    faceData = row.avatar || "";
    clearHints();
    ui.sheetTitle.textContent = "Edit Contact";
    ui.hiddenId.value = row.id;
    ui.fullName.value = row.name;
    ui.phone.value = row.phone;
    ui.mail.value = row.email || "";
    ui.place.value = row.address || "";
    ui.group.value = row.group || "";
    ui.notes.value = row.notes || "";
    ui.starFlag.checked = Boolean(row.isFavorite);
    ui.alertFlag.checked = Boolean(row.isEmergency);
    showFace(faceData, row.name);
    ui.sheetBody.scrollTop = 0;
    ui.sheet.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
    ui.fullName.focus();
  }

  function hideSheet() {
    ui.sheet.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
    ui.form.reset();
    activeId = null;
    faceData = "";
    clearHints();
  }

  function grabForm() {
    const name = checkName(true);
    if (name === null) return null;
    const phone = checkPhone(true);
    if (phone === null) return null;
    const email = checkMail(true);
    if (email === null) return null;
    return {
      name,
      phone,
      email,
      address: ui.place.value.trim(),
      notes: ui.notes.value.trim(),
      group: ui.group.value,
      avatar: faceData,
      isFavorite: ui.starFlag.checked,
      isEmergency: ui.alertFlag.checked,
    };
  }

  function stashPerson(ev) {
    ev.preventDefault();
    const data = grabForm();
    if (!data) return;
    if (activeId) {
      const idx = book.findIndex((row) => row.id === activeId);
      if (idx === -1) return;
      const before = book[idx];
      book[idx] = Object.assign({}, before, data);
      if (!pushBook()) {
        book[idx] = before;
        return;
      }
      Swal.fire({
        icon: "success",
        title: "Updated!",
        text: "Contact has been updated successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      book.push({
        id: freshId(),
        createdAt: new Date().toISOString(),
        ...data,
      });
      if (!pushBook()) {
        book.pop();
        return;
      }
      Swal.fire({
        icon: "success",
        title: "Added!",
        text: "Contact has been added successfully.",
        timer: 1500,
        showConfirmButton: false,
      });
    }
    hideSheet();
    paintAll();
  }

  function flipStar(id) {
    const row = personById(id);
    if (!row) return;
    row.isFavorite = !row.isFavorite;
    if (!pushBook()) {
      row.isFavorite = !row.isFavorite;
      return;
    }
    paintAll();
  }

  function flipAlert(id) {
    const row = personById(id);
    if (!row) return;
    row.isEmergency = !row.isEmergency;
    if (!pushBook()) {
      row.isEmergency = !row.isEmergency;
      return;
    }
    paintAll();
  }

  function dropPerson(id) {
    const row = personById(id);
    if (!row) return;
    Swal.fire({
      title: "Delete Contact?",
      text: `Are you sure you want to delete ${row.name}? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((res) => {
      if (!res.isConfirmed) return;
      const snapshot = book.slice();
      book = book.filter((item) => item.id !== id);
      if (!pushBook()) {
        book = snapshot;
        return;
      }
      paintAll();
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Contact has been deleted.",
        timer: 1500,
        showConfirmButton: false,
      });
    });
  }

  function onPhoto(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      Swal.fire({
        icon: "error",
        title: "Invalid photo",
        text: "Please choose an image file.",
      });
      ui.photo.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: "error",
        title: "Photo too large",
        text: "Please choose an image smaller than 2 MB.",
      });
      ui.photo.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      faceData = String(reader.result || "");
      showFace(faceData);
    };
    reader.readAsDataURL(file);
  }

  function onGrid(ev) {
    const btn = ev.target.closest("[data-job]");
    if (!btn || !ui.grid.contains(btn)) return;
    const job = btn.dataset.job;
    const key = btn.dataset.key;
    if (job === "star") flipStar(key);
    if (job === "alert") flipAlert(key);
    if (job === "edit") openEdit(key);
    if (job === "drop") dropPerson(key);
  }

  function bindUi() {
    byId("addContactBtn").addEventListener("click", openCreate);
    byId("closeModalBtn").addEventListener("click", hideSheet);
    byId("cancelModalBtn").addEventListener("click", hideSheet);
    byId("modalBackdrop").addEventListener("click", hideSheet);
    ui.form.addEventListener("submit", stashPerson);
    ui.photo.addEventListener("change", onPhoto);
    ui.search.addEventListener("input", paintAll);
    ui.grid.addEventListener("click", onGrid);
    ui.fullName.addEventListener("input", () => checkName(false));
    ui.phone.addEventListener("input", () => checkPhone(false));
    ui.mail.addEventListener("input", () => checkMail(false));
    document.addEventListener("keydown", (ev) => {
      if (ev.key !== "Escape" || ui.sheet.classList.contains("hidden")) return;
      if (window.Swal && Swal.isVisible()) return;
      hideSheet();
    });
  }

  pullBook();
  bindUi();
  paintAll();
})();
