import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* إعدادات Supabase */
const SUPABASE_URL = "https://ufdpkzedwfmsozpyeine.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_qipmFlj5bW521ysMX7yc7A_eYDx7YUK";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BUCKET = "journal-photos";

const starterSections = [
  "البَوْح",
  "مُدارسة الأفكار",
  "مواضع الدهشة",
  "خزائن المعرفة",
  "مقاصد وخُطى",
  "أثر الأيام",
  "رفوف الأدب",
  "شذرات",
  "رسائل مؤجلة",
  "بين دفّتي كتاب",
  "أسئلة معلّقة",
  "آفاق جديدة",
  "هوامش",
  "أوراق مبعثرة"
];

const $ = (id) => document.getElementById(id);

const authScreen = $("auth");
const journalScreen = $("journal");
const coverScreen = $("cover");
const deskScreen = $("desk");

const emailInput = $("email");
const passwordInput = $("password");
const authMessage = $("authMessage");

const loginBtn = $("loginBtn");
const signupBtn = $("signupBtn");
const logoutBtn = $("logoutBtn");
const openJournalBtn = $("openJournalBtn");
const backCoverBtn = $("backCoverBtn");

const sectionSelect = $("sectionSelect");
const addSectionBtn = $("addSectionBtn");
const editSectionBtn = $("editSectionBtn");
const deleteSectionBtn = $("deleteSectionBtn");

const sectionDialog = $("sectionDialog");
const sectionForm = $("sectionForm");
const sectionDialogTitle = $("sectionDialogTitle");
const sectionNameInput = $("sectionName");
const cancelSectionBtn = $("cancelSectionBtn");

const newEntryBtn = $("newEntryBtn");
const entryTitleInput = $("entryTitle");
const entryDateInput = $("entryDate");
const saveBtn = $("saveBtn");
const photoInput = $("photoInput");

const saveStatus = $("saveStatus");
const pageCounter = $("pageCounter");
const entryList = $("entryList");

const prevBtn = $("prevBtn");
const nextBtn = $("nextBtn");

const leftWritingArea = $("leftWritingArea");
const rightWritingArea = $("rightWritingArea");

const leftDate = $("leftDate");
const rightDate = $("rightDate");

const leftNumber = $("leftNumber");
const rightNumber = $("rightNumber");

const leftPhotoLayer = $("leftPhotoLayer");
const rightPhotoLayer = $("rightPhotoLayer");

let currentUser = null;
let sections = [];
let entries = [];

let currentEntryIndex = -1;
let currentEntry = null;
let editingSectionId = null;

let photoLayout = {
  left: [],
  right: []
};

let signedUrlCache = new Map();
let dragState = null;
let isDirty = false;

/* أدوات عامة */

function today() {
  return new Date().toISOString().slice(0, 10);
}

function setStatus(message, isError = false) {
  saveStatus.textContent = message || "";
  saveStatus.style.color = isError ? "#9b514b" : "";
}

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message || "";
  authMessage.style.color = isError ? "#9b514b" : "";
}

function showAuth() {
  authScreen.classList.remove("hidden");
  journalScreen.classList.add("hidden");
}

function showJournal() {
  authScreen.classList.add("hidden");
  journalScreen.classList.remove("hidden");
  coverScreen.classList.remove("hidden");
  deskScreen.classList.add("hidden");
}

function openDesk() {
  coverScreen.classList.add("hidden");
  deskScreen.classList.remove("hidden");
  renderCurrentEntry();
}

function showCover() {
  deskScreen.classList.add("hidden");
  coverScreen.classList.remove("hidden");
}

function markDirty() {
  isDirty = true;
  setStatus("توجد تغييرات غير محفوظة");
}

function getCurrentSectionId() {
  return sectionSelect.value || null;
}

function clearPage() {
  leftWritingArea.innerHTML = "";
  rightWritingArea.innerHTML = "";

  leftPhotoLayer.innerHTML = "";
  rightPhotoLayer.innerHTML = "";

  photoLayout = {
    left: [],
    right: []
  };
}

/* تسجيل الدخول */

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    setAuthMessage("اكتبي البريد الإلكتروني وكلمة المرور أولًا.", true);
    return;
  }

  loginBtn.disabled = true;
  setAuthMessage("جارٍ تسجيل الدخول...");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  loginBtn.disabled = false;

  if (error) {
    setAuthMessage(error.message, true);
    return;
  }

  setAuthMessage("");
});

/* إنشاء حساب */

signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    setAuthMessage("اكتبي البريد الإلكتروني وكلمة المرور أولًا.", true);
    return;
  }

  if (password.length < 6) {
    setAuthMessage("اجعلي كلمة المرور 6 أحرف على الأقل.", true);
    return;
  }

  signupBtn.disabled = true;
  setAuthMessage("جارٍ إنشاء الحساب...");

  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  signupBtn.disabled = false;

  if (error) {
    setAuthMessage(error.message, true);
    return;
  }

  if (data.session) {
    setAuthMessage("");
  } else {
    setAuthMessage(
      "تم إنشاء الحساب. تحققي من بريدك الإلكتروني لتأكيده، ثم سجّلي الدخول."
    );
  }
});

/* تسجيل الخروج */

logoutBtn.addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    alert(error.message);
    return;
  }

  currentUser = null;
  sections = [];
  entries = [];
  currentEntry = null;
  currentEntryIndex = -1;

  showAuth();
});

/* مراقبة جلسة المستخدم */

supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    currentUser = session.user;
    showJournal();
    loadJournalData();
  } else {
    currentUser = null;
    showAuth();
  }
});

openJournalBtn.addEventListener("click", openDesk);
backCoverBtn.addEventListener("click", showCover);
/* تحميل الأقسام والصفحات */

async function loadJournalData() {
  if (!currentUser) return;

  setStatus("جارٍ تحميل الدفتر...");

  const { data: sectionRows, error: sectionError } = await supabase
    .from("journal_sections")
    .select("*")
    .order("position", { ascending: true });

  if (sectionError) {
    setStatus("تعذر تحميل الأقسام: " + sectionError.message, true);
    return;
  }

  sections = sectionRows || [];

  if (sections.length === 0) {
    const rows = starterSections.map((name, position) => ({
      user_id: currentUser.id,
      name,
      position
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("journal_sections")
      .insert(rows)
      .select("*")
      .order("position", { ascending: true });

    if (insertError) {
      setStatus("تعذر إنشاء الأقسام: " + insertError.message, true);
      return;
    }

    sections = inserted || [];
  }

  renderSections();

  const { data: entryRows, error: entryError } = await supabase
    .from("journal_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (entryError) {
    setStatus("تعذر تحميل الصفحات: " + entryError.message, true);
    return;
  }

  entries = entryRows || [];

  const firstSectionId = getCurrentSectionId();

  const sectionEntries = entries.filter(
    entry => String(entry.section_id) === String(firstSectionId)
  );

  if (sectionEntries.length) {
    openEntry(sectionEntries[0].id);
  } else {
    startNewEntry();
  }

  renderEntryList();
  setStatus("");
}

/* عرض الأقسام */

function renderSections() {
  const previousValue = sectionSelect.value;

  sectionSelect.innerHTML = "";

  sections.forEach(section => {
    const option = document.createElement("option");

    option.value = section.id;
    option.textContent = section.name;

    sectionSelect.appendChild(option);
  });

  if (sections.some(section => String(section.id) === previousValue)) {
    sectionSelect.value = previousValue;
  } else if (sections.length) {
    sectionSelect.value = sections[0].id;
  }
}

/* تغيير القسم */

sectionSelect.addEventListener("change", () => {
  currentEntry = null;
  currentEntryIndex = -1;

  const sectionEntries = getSectionEntries();

  if (sectionEntries.length) {
    openEntry(sectionEntries[0].id);
  } else {
    startNewEntry();
  }

  renderEntryList();
});

/* صفحات القسم الحالي */

function getSectionEntries() {
  const sectionId = getCurrentSectionId();

  return entries
    .filter(entry => String(entry.section_id) === String(sectionId))
    .sort((a, b) => {
      const dateCompare = String(b.entry_date || "")
        .localeCompare(String(a.entry_date || ""));

      if (dateCompare !== 0) return dateCompare;

      return String(b.created_at || "")
        .localeCompare(String(a.created_at || ""));
    });
}

/* قائمة الصفحات */

function renderEntryList() {
  const sectionEntries = getSectionEntries();

  entryList.innerHTML = "";

  if (!sectionEntries.length) {
    pageCounter.textContent = "لا توجد صفحات بعد";
    return;
  }

  pageCounter.textContent = `عدد الصفحات: ${sectionEntries.length}`;

  sectionEntries.forEach(entry => {
    const chip = document.createElement("button");

    chip.type = "button";
    chip.className = "entry-chip";

    if (
      currentEntry &&
      String(currentEntry.id) === String(entry.id)
    ) {
      chip.classList.add("active");
    }

    chip.textContent =
      `${entry.title || "بلا عنوان"} · ${entry.entry_date || ""}`;

    chip.addEventListener("click", () => {
      openEntry(entry.id);
    });

    entryList.appendChild(chip);
  });
}

/* إنشاء صفحة جديدة */

function startNewEntry() {
  currentEntry = null;
  currentEntryIndex = -1;

  entryTitleInput.value = "";
  entryDateInput.value = today();

  clearPage();

  leftDate.textContent = today();
  rightDate.textContent = today();

  leftNumber.textContent = "";
  rightNumber.textContent = "";

  isDirty = false;

  renderEntryList();

  setStatus("صفحة جديدة");
}

/* فتح صفحة محفوظة */

function openEntry(entryId) {
  const entry = entries.find(
    item => String(item.id) === String(entryId)
  );

  if (!entry) return;

  currentEntry = entry;

  const sectionEntries = getSectionEntries();

  currentEntryIndex = sectionEntries.findIndex(
    item => String(item.id) === String(entry.id)
  );

  entryTitleInput.value = entry.title || "";
  entryDateInput.value = entry.entry_date || today();

  leftWritingArea.innerHTML = entry.left_body || "";
  rightWritingArea.innerHTML = entry.body || "";

  const dateText = entry.entry_date || "";

  leftDate.textContent = dateText;
  rightDate.textContent = dateText;

  photoLayout =
    entry.photo_layout && typeof entry.photo_layout === "object"
      ? {
          left: Array.isArray(entry.photo_layout.left)
            ? entry.photo_layout.left
            : [],

          right: Array.isArray(entry.photo_layout.right)
            ? entry.photo_layout.right
            : []
        }
      : {
          left: [],
          right: []
        };

  renderPhotos();

  updatePageNumbers();

  isDirty = false;

  renderEntryList();

  setStatus("");
}

/* أرقام الصفحات */

function updatePageNumbers() {
  const count = getSectionEntries().length;

  const number =
    currentEntryIndex >= 0
      ? count - currentEntryIndex
      : count + 1;

  leftNumber.textContent = number ? ` ${number} ` : "";
  rightNumber.textContent = number ? ` ${number} ` : "";
}

/* تحديث الصفحة الحالية */

function renderCurrentEntry() {
  if (currentEntry) {
    openEntry(currentEntry.id);
  } else {
    startNewEntry();
  }
}
// ==============================
// 3) حفظ الصفحات وإدارة الأقسام
// ==============================

async function saveEntry() {
  if (!currentUser) return;

  const sectionId = getCurrentSectionId();

  if (!sectionId) {
    setStatus("اختاري قسمًا أولًا.");
    return;
  }

  const title = entryTitle.value.trim() || "صفحة بلا عنوان";
  const dateValue = entryDate.value || today();

  const payload = {
    user_id: currentUser.id,
    section_id: sectionId,
    title,
    entry_date: dateValue,
    body: rightWritingArea.innerHTML,
    left_body: leftWritingArea.innerHTML
  };

  setStatus("جارٍ الحفظ...");

  try {
    let result;

    if (currentEntry && currentEntry.id) {
      result = await supabase
        .from("journal_entries")
        .update(payload)
        .eq("id", currentEntry.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("journal_entries")
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) throw result.error;

    currentEntry = result.data;
    isDirty = false;

    await loadJournalData();
    openEntry(currentEntry.id);

    setStatus("تم حفظ الصفحة بنجاح.");
  } catch (error) {
    console.error(error);
    setStatus("تعذر الحفظ: " + error.message);
  }
}

saveBtn?.addEventListener("click", saveEntry);

newEntryBtn?.addEventListener("click", () => {
  startNewEntry();
});

entryTitle?.addEventListener("input", markDirty);
entryDateInput?.addEventListener("change", markDirty);
entryDate?.addEventListener("change", markDirty);
rightWritingArea?.addEventListener("input", markDirty);
leftWritingArea?.addEventListener("input", markDirty);

// ------------------------------
// إدارة الأقسام
// ------------------------------

function openSectionDialog(mode, section = null) {
  if (!sectionDialog || !sectionForm) return;

  sectionForm.dataset.mode = mode;
  sectionForm.dataset.sectionId = section?.id || "";

  if (mode === "edit" && section) {
    sectionDialogTitle.textContent = "تعديل القسم";
    sectionName.value = section.name;
  } else {
    sectionDialogTitle.textContent = "إضافة قسم جديد";
    sectionName.value = "";
  }

  sectionDialog.showModal();
  sectionName.focus();
}

addSectionBtn?.addEventListener("click", () => {
  openSectionDialog("add");
});

editSectionBtn?.addEventListener("click", () => {
  const section = sections.find(
    item => item.id === sectionSelect.value
  );

  if (!section) {
    setStatus("اختاري قسمًا لتعديله.");
    return;
  }

  openSectionDialog("edit", section);
});

cancelSectionBtn?.addEventListener("click", () => {
  sectionDialog.close();
});

sectionForm?.addEventListener("submit", async event => {
  event.preventDefault();

  const name = sectionName.value.trim();

  if (!name) {
    sectionName.focus();
    return;
  }

  const mode = sectionForm.dataset.mode;
  const sectionId = sectionForm.dataset.sectionId;

  try {
    let result;

    if (mode === "edit") {
      result = await supabase
        .from("journal_sections")
        .update({ name })
        .eq("id", sectionId);
    } else {
      result = await supabase
        .from("journal_sections")
        .insert({
          name,
          user_id: currentUser.id
        });
    }

    if (result.error) throw result.error;

    sectionDialog.close();
    await loadJournalData();

    setStatus(
      mode === "edit"
        ? "تم تعديل القسم."
        : "تمت إضافة القسم."
    );
  } catch (error) {
    console.error(error);
    setStatus("تعذر حفظ القسم: " + error.message);
  }
});

deleteSectionBtn?.addEventListener("click", async () => {
  const sectionId = sectionSelect.value;

  if (!sectionId) {
    setStatus("اختاري قسمًا لحذفه.");
    return;
  }

  const section = sections.find(item => item.id === sectionId);

  if (!section) return;

  const confirmed = confirm(
    `هل أنتِ متأكدة من حذف قسم "${section.name}"؟`
  );

  if (!confirmed) return;

  try {
    const result = await supabase
      .from("journal_sections")
      .delete()
      .eq("id", sectionId);

    if (result.error) throw result.error;

    currentEntry = null;
    await loadJournalData();

    setStatus("تم حذف القسم.");
  } catch (error) {
    console.error(error);
    setStatus("تعذر حذف القسم: " + error.message);
  }
});
// ==============================
// 4) إضافة الصور وإدارتها
// ==============================

async function uploadPhoto(file) {
  if (!currentUser || !file) return null;

  const extension = file.name.split(".").pop();
  const fileName =
    `${currentUser.id}/${Date.now()}-${Math.random()
      .toString(36).slice(2)}.${extension}`;

  const { data, error } = await supabase.storage
    .from("journal-photos")
    .upload(fileName, file);

  if (error) throw error;

  return data.path;
}

async function getPhotoUrl(path) {
  const { data, error } = await supabase.storage
    .from("journal-photos")
    .createSignedUrl(path, 3600);

  if (error) throw error;

  return data.signedUrl;
}

async function renderPhotos() {
  if (!currentEntry) return;

  leftPhotoLayer.innerHTML = "";
  rightPhotoLayer.innerHTML = "";

  const paths = currentEntry.photo_paths || [];

  for (const path of paths) {
    try {
      const url = await getPhotoUrl(path);

      const image = document.createElement("img");
      image.src = url;
      image.alt = "صورة من الجورنال";
      image.className = "journal-photo";

      const target =
        paths.indexOf(path) % 2 === 0
          ? rightPhotoLayer
          : leftPhotoLayer;

      target.appendChild(image);
    } catch (error) {
      console.error("تعذر عرض الصورة:", error);
    }
  }
}

photoInput?.addEventListener("change", async event => {
  const files = Array.from(event.target.files || []);

  if (!files.length) return;

  if (!currentEntry) {
    setStatus("احفظي الصفحة أولًا قبل إضافة الصور.");
    photoInput.value = "";
    return;
  }

  setStatus("جارٍ رفع الصور...");

  try {
    const uploadedPaths = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;

      const path = await uploadPhoto(file);
      if (path) uploadedPaths.push(path);
    }

    const oldPaths = currentEntry.photo_paths || [];
    const allPaths = [...oldPaths, ...uploadedPaths];

    const { data, error } = await supabase
      .from("journal_entries")
      .update({ photo_paths: allPaths })
      .eq("id", currentEntry.id)
      .select()
      .single();

    if (error) throw error;

    currentEntry = data;

    await renderPhotos();

    setStatus("تمت إضافة الصور.");
  } catch (error) {
    console.error(error);
    setStatus("تعذر رفع الصور: " + error.message);
  }

  photoInput.value = "";
});
// ==============================
// 5) التنقل بين الصفحات والأقسام
// ==============================

function moveEntry(direction) {
  const sectionEntries = getSectionEntries();

  if (!sectionEntries.length) return;

  const currentIndex = sectionEntries.findIndex(
    entry => entry.id === currentEntry?.id
  );

  let nextIndex;

  if (currentIndex === -1) {
    nextIndex = 0;
  } else {
    nextIndex = currentIndex + direction;
  }

  if (nextIndex < 0 || nextIndex >= sectionEntries.length) {
    return;
  }

  openEntry(sectionEntries[nextIndex].id);
}

prevBtn?.addEventListener("click", () => {
  moveEntry(1);
});

nextBtn?.addEventListener("click", () => {
  moveEntry(-1);
});

// ==============================
// أزرار شرائط الأوامر
// ==============================

function setupCommandBars() {
  const panel = document.querySelector(".controls-panel");

  if (!panel || document.querySelector(".command-buttons")) {
    return;
  }

  const buttons = document.createElement("div");
  buttons.className = "command-buttons";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "command-toggle";
  editButton.textContent = "تعديل الصفحة";

  const sectionsButton = document.createElement("button");
  sectionsButton.type = "button";
  sectionsButton.className = "command-toggle";
  sectionsButton.textContent = "الأقسام";

  buttons.append(editButton, sectionsButton);

  const editDrawer = document.createElement("div");
  editDrawer.className = "command-drawer";
  editDrawer.hidden = true;

  const sectionsDrawer = document.createElement("div");
  sectionsDrawer.className = "command-drawer";
  sectionsDrawer.hidden = true;

  // عناصر تعديل الصفحة
  const entryControls = panel.querySelector(".entry-controls");
  const statusRow = panel.querySelector(".status-row");

  if (entryControls) {
    editDrawer.appendChild(entryControls);
  }

  if (statusRow) {
    editDrawer.appendChild(statusRow);
  }

  // عناصر الأقسام
  const sectionControls = panel.querySelector(
    ".control-row:not(.entry-controls)"
  );

  const entryListElement = panel.querySelector(".entry-list");

  if (sectionControls) {
    sectionsDrawer.appendChild(sectionControls);
  }

  if (entryListElement) {
    sectionsDrawer.appendChild(entryListElement);
  }

  // وضع الأزرار والأشرطة داخل لوحة التحكم
  panel.prepend(buttons);
  buttons.after(editDrawer);
  editDrawer.after(sectionsDrawer);

  // فتح وإغلاق شريط تعديل الصفحة
  editButton.addEventListener("click", () => {
    editDrawer.hidden = !editDrawer.hidden;
    sectionsDrawer.hidden = true;
  });

  // فتح وإغلاق شريط الأقسام
  sectionsButton.addEventListener("click", () => {
    sectionsDrawer.hidden = !sectionsDrawer.hidden;
    editDrawer.hidden = true;
  });
}
// ==============================
// تشغيل الجورنال
// ==============================

setupCommandBars();

async function initializeJournal() {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (data.session) {
      currentUser = data.session.user;
      showJournal();
      await loadJournalData();
    } else {
      showAuth();
    }
  } catch (error) {
    console.error(error);
    showAuth();
    setAuthMessage("تعذر الاتصال. حاولي مرة أخرى.");
  }
}

initializeJournal();