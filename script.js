/* ---------------------------------------------------------
   GLOBALNE VARIJABLE
--------------------------------------------------------- */

let kategorije = JSON.parse(localStorage.getItem("kategorije")) || [
    { id: "osn1", naziv: "Hrana", ikona: "🍔", osnovna: true },
    { id: "osn2", naziv: "Piće", ikona: "☕", osnovna: true },
    { id: "osn3", naziv: "Gorivo", ikona: "⛽", osnovna: true },
    { id: "osn4", naziv: "Auto", ikona: "🚗", osnovna: true },
    { id: "osn5", naziv: "Računi", ikona: "💡", osnovna: true },
    { id: "osn6", naziv: "Zabava", ikona: "🎮", osnovna: true }
];

let transakcije = JSON.parse(localStorage.getItem("transakcije")) || [];
let prihodi = JSON.parse(localStorage.getItem("prihodi")) || [];

let aktivniMjesec = new Date().getMonth() + 1;
let aktivnaGodina = new Date().getFullYear();

const mjesecSelect = document.getElementById("mjesec");
if (mjesecSelect) mjesecSelect.value = aktivniMjesec;

const godinaSelect = document.getElementById("godina");
if (godinaSelect) godinaSelect.value = aktivnaGodina;

let aktivnaTransakcijaID = null;
let aktivniPrihodID = null;
let kategorijaZaBrisanje = null;

let graf = null;

let aktivnaKategorijaID = null;
let privremenaIkonaKategorije = null;

const dostupneIkoneKategorija = [
    "🍔","☕","🚗","⛽","🚌","🏠","💡","🛏️","💳","💰","🧾","🏦",
    "🎮","🎧","🎬","🎁","🏋️‍♂️","🏥","⚽","✈️","🧳","🛍️","👕",
    "📱","💻","🐶","🎓"
];

/* ---------------------------------------------------------
   USER SETTINGS
--------------------------------------------------------- */

let userSettings = {
    theme: "system",
    mainCurrency: "EUR",
    currencies: ["EUR", "USD", "GBP", "CHF", "BAM", "RSD"],
    chartType: "donut"
};

const saved = localStorage.getItem("userSettings");
if (saved) {
    try {
        const parsed = JSON.parse(saved);
        userSettings = { ...userSettings, ...parsed };
    } catch {
        // ignore
    }
}

/* ---------------------------------------------------------
   FORMATIRANJE BROJEVA + VALUTE
--------------------------------------------------------- */

const currencySymbols = {
    EUR: "€",
    USD: "$",
    GBP: "£",
    CHF: "CHF",
    BAM: "KM",
    RSD: "RSD"
};

function formatEUR(iznos) {
    const code = userSettings?.mainCurrency || "EUR";
    const sym = currencySymbols[code] || code;

    return iznos.toLocaleString("hr-HR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + " " + sym;
}

/* ---------------------------------------------------------
   POMOĆNE FUNKCIJE
--------------------------------------------------------- */

function danasnjiDatum() {
    return new Date().toISOString("hr-HR").split("T")[0];
}

function spremiSve() {
    localStorage.setItem("kategorije", JSON.stringify(kategorije));
    localStorage.setItem("transakcije", JSON.stringify(transakcije));
    localStorage.setItem("prihodi", JSON.stringify(prihodi));
    localStorage.setItem("userSettings", JSON.stringify(userSettings));
}

function jeUOdabranomMjesecuIGodini(datum) {
    const d = new Date(datum);
    return d.getMonth() + 1 === aktivniMjesec && d.getFullYear() === aktivnaGodina;
}

/* ---------------------------------------------------------
   NAVIGACIJA
--------------------------------------------------------- */

document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        document.querySelectorAll(".contentSection").forEach(sec => sec.classList.add("hidden"));
        const target = document.getElementById(item.dataset.target);
        if (target) target.classList.remove("hidden");
    });
});

// MOBILNI MENI – prikaz lijevog panela samo na Pregled potrošnje
document.querySelectorAll(".mobile-nav-item").forEach(item => {
    item.addEventListener("click", () => {
        const target = item.dataset.target;

        document.querySelectorAll(".contentSection").forEach(sec => sec.classList.add("hidden"));
        document.getElementById(target).classList.remove("hidden");

        const leftPanel = document.getElementById("leftPanel");
        if (target === "spendingContent") {
            leftPanel.classList.add("show-on-mobile");
        } else {
            leftPanel.classList.remove("show-on-mobile");
        }

        document.getElementById("mobileMenu").classList.add("hidden");

        document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
        document.querySelector(`.nav-item[data-target="${target}"]`)?.classList.add("active");
    });
});

/* ---------------------------------------------------------
   DROPDOWN KATEGORIJA
--------------------------------------------------------- */

function osvjeziDropdownKategorija() {
    const dropdown = document.getElementById("kategorijaUnos");
    const editDropdown = document.getElementById("editKategorija");

    if (!dropdown || !editDropdown) return;

    dropdown.innerHTML = "";
    editDropdown.innerHTML = "";

    kategorije.forEach(k => {
        const opt = document.createElement("option");
        opt.value = k.id;
        opt.textContent = k.naziv;

        dropdown.appendChild(opt);
        editDropdown.appendChild(opt.cloneNode(true));
    });
}

/* ---------------------------------------------------------
   PRIKAZ KATEGORIJA
--------------------------------------------------------- */

function prikaziKategorije() {
    const osnovne = document.getElementById("osnovneKategorije");
    const korisnicke = document.getElementById("korisnickeKategorije");

    if (!osnovne || !korisnicke) return;

    osnovne.innerHTML = "";
    korisnicke.innerHTML = "";

    kategorije.forEach(k => {
        const li = document.createElement("li");
        li.innerHTML = `
            <span class="category-icon">${k.ikona}</span>
            <span class="category-name">${k.naziv}</span>
            <div class="category-actions">
                <button class="btn-edit btn-edit-category" data-id="${k.id}">
                    <span>✏️</span><span>Uredi</span>
                </button>
                <button class="btn-delete obrisiKategorijuBtn" data-id="${k.id}">
                    <span>🗑️</span><span>Obriši</span>
                </button>
            </div>
        `;

        if (k.osnovna) osnovne.appendChild(li);
        else korisnicke.appendChild(li);
    });

    osvjeziDropdownKategorija();
    poveziGumbeKategorija();
}

/* ---------------------------------------------------------
   DODAVANJE KATEGORIJE
--------------------------------------------------------- */

const dodajKategorijuBtn = document.getElementById("dodajKategoriju");
if (dodajKategorijuBtn) {
    dodajKategorijuBtn.addEventListener("click", () => {
        const nazivInput = document.getElementById("novaKategorija");
        if (!nazivInput) return;

        const naziv = nazivInput.value.trim();
        if (!naziv) return;

        const postoji = kategorije.some(k => k.naziv.toLowerCase() === naziv.toLowerCase());
        if (postoji) {
            alert("Već postoji kategorija s tim imenom.");
            return;
        }

        kategorije.push({
            id: "kat" + Date.now(),
            naziv,
            ikona: "📁",
            osnovna: false
        });

        nazivInput.value = "";
        spremiSve();
        prikaziKategorije();
        prikaziTransakcije();
        osvjeziLijeviPanel();
    });
}

/* ---------------------------------------------------------
   UREĐIVANJE KATEGORIJE
--------------------------------------------------------- */

function poveziGumbeKategorija() {
    document.querySelectorAll(".btn-edit-category").forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            const kat = kategorije.find(k => k.id === id);
            if (!kat) return;

            aktivnaKategorijaID = id;
            privremenaIkonaKategorije = kat.ikona;

            const nameInput = document.getElementById("editCategoryName");
            const iconPreview = document.getElementById("editCategoryIconPreview");
            const modal = document.getElementById("editCategoryModal");

            if (!nameInput || !iconPreview || !modal) return;

            nameInput.value = kat.naziv;
            iconPreview.textContent = kat.ikona;

            modal.classList.remove("hidden");
        });
    });
}

const editCategoryIconBtn = document.getElementById("editCategoryIconBtn");
if (editCategoryIconBtn) {
    editCategoryIconBtn.addEventListener("click", () => {
        const picker = document.getElementById("iconPickerModal");
        if (picker) picker.classList.remove("hidden");
    });
}

const iconPickerCloseBtn = document.getElementById("iconPickerCloseBtn");
if (iconPickerCloseBtn) {
    iconPickerCloseBtn.addEventListener("click", () => {
        const picker = document.getElementById("iconPickerModal");
        if (picker) picker.classList.add("hidden");
    });
}

const editCategoryCancelBtn = document.getElementById("editCategoryCancelBtn");
if (editCategoryCancelBtn) {
    editCategoryCancelBtn.addEventListener("click", () => {
        const modal = document.getElementById("editCategoryModal");
        if (modal) modal.classList.add("hidden");
        aktivnaKategorijaID = null;
        privremenaIkonaKategorije = null;
    });
}

const editCategorySaveBtn = document.getElementById("editCategorySaveBtn");
if (editCategorySaveBtn) {
    editCategorySaveBtn.addEventListener("click", () => {
        if (!aktivnaKategorijaID) return;

        const nameInput = document.getElementById("editCategoryName");
        if (!nameInput) return;

        const novoIme = nameInput.value.trim();
        if (!novoIme) {
            alert("Naziv kategorije ne može biti prazan.");
            return;
        }

        const postoji = kategorije.some(
            k => k.naziv.toLowerCase() === novoIme.toLowerCase() && k.id !== aktivnaKategorijaID
        );
        if (postoji) {
            alert("Već postoji kategorija s tim imenom.");
            return;
        }

        const kat = kategorije.find(k => k.id === aktivnaKategorijaID);
        if (!kat) return;

        const staroIme = kat.naziv;
        const staraIkona = kat.ikona;

        kat.naziv = novoIme;
        kat.ikona = privremenaIkonaKategorije || kat.ikona;

        const brojTransakcija = transakcije.filter(t => t.kategorija === aktivnaKategorijaID).length;
        if (brojTransakcija > 0 && novoIme !== staroIme) {
            const potvrda = confirm(
                `Ova kategorija ima ${brojTransakcija} transakcija.\n` +
                `Promjena imena utjecat će na prikaz svih tih transakcija.\n\n` +
                `Želiš li nastaviti?`
            );
            if (!potvrda) {
                kat.naziv = staroIme;
                kat.ikona = staraIkona;
                const modal = document.getElementById("editCategoryModal");
                if (modal) modal.classList.add("hidden");
                aktivnaKategorijaID = null;
                privremenaIkonaKategorije = null;
                return;
            }
        }

        spremiSve();
        prikaziKategorije();
        prikaziTransakcije();
        osvjeziLijeviPanel();

        const modal = document.getElementById("editCategoryModal");
        if (modal) modal.classList.add("hidden");
        aktivnaKategorijaID = null;
        privremenaIkonaKategorije = null;
    });
}

function popuniIconGrid() {
    const grid = document.getElementById("iconGrid");
    if (!grid) return;
    grid.innerHTML = "";

    dostupneIkoneKategorija.forEach(ik => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = ik;
        btn.addEventListener("click", () => {
            privremenaIkonaKategorije = ik;
            const preview = document.getElementById("editCategoryIconPreview");
            if (preview) preview.textContent = ik;
            const picker = document.getElementById("iconPickerModal");
            if (picker) picker.classList.add("hidden");
        });
        grid.appendChild(btn);
    });
}

/* ---------------------------------------------------------
   PRIHODI
--------------------------------------------------------- */

const dodajPrihodBtn = document.getElementById("dodajPrihodBtn");
if (dodajPrihodBtn) {
    dodajPrihodBtn.addEventListener("click", () => {
        aktivniPrihodID = null;
        otvoriPrihodModal();
    });
}

function otvoriPrihodModal(prihod = null) {
    const modal = document.getElementById("prihodModal");
    if (!modal) return;

    const iznosInput = document.getElementById("editPrihodIznos");
    const datumInput = document.getElementById("editPrihodDatum");
    const opisInput = document.getElementById("editPrihodOpis");

    if (!iznosInput || !datumInput || !opisInput) return;

    if (prihod) {
        aktivniPrihodID = prihod.id;
        iznosInput.value = prihod.iznos;
        datumInput.value = prihod.datum;
        opisInput.value = prihod.opis || "";
    } else {
        aktivniPrihodID = null;
        iznosInput.value = "";
        datumInput.value = danasnjiDatum();
        opisInput.value = "";
    }

    modal.classList.remove("hidden");
}

const spremiPrihodBtn = document.getElementById("spremiPrihodBtn");
if (spremiPrihodBtn) {
    spremiPrihodBtn.addEventListener("click", () => {
        const iznosInput = document.getElementById("editPrihodIznos");
        const datumInput = document.getElementById("editPrihodDatum");
        const opisInput = document.getElementById("editPrihodOpis");

        if (!iznosInput || !datumInput || !opisInput) return;

        const iznos = Number(iznosInput.value);
        const datum = datumInput.value;
        const opis = opisInput.value;

        if (!iznos || !datum) return;

        if (aktivniPrihodID) {
            const p = prihodi.find(p => p.id === aktivniPrihodID);
            if (!p) return;
            p.iznos = iznos;
            p.datum = datum;
            p.opis = opis;
        } else {
            prihodi.push({
                id: "prih" + Date.now(),
                iznos,
                datum,
                opis
            });
        }

        spremiSve();
        zatvoriSveModale();
        prikaziPrihode();
        osvjeziLijeviPanel();
    });
}

function prikaziPrihode() {
    const lista = document.getElementById("listaPrihoda");
    if (!lista) return;

    lista.innerHTML = "";

    const mjesecPrihodi = prihodi.filter(p => jeUOdabranomMjesecuIGodini(p.datum));

    mjesecPrihodi.forEach(p => {
        const li = document.createElement("li");
        li.innerHTML = `
            ${formatEUR(p.iznos)} — ${p.opis || "Bez opisa"} (${formatDatumEU(p.datum)})
            <button class="btn-edit urediPrihodBtn" data-id="${p.id}">
                <span>✏️</span><span>Uredi</span>
            </button>
            <button class="btn-delete obrisiPrihodBtn" data-id="${p.id}">
                <span>🗑️</span><span>Obriši</span>
            </button>
        `;
        lista.appendChild(li);
    });

    document.querySelectorAll(".urediPrihodBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            const prihod = prihodi.find(p => p.id === btn.dataset.id);
            if (!prihod) return;
            otvoriPrihodModal(prihod);
        });
    });

    document.querySelectorAll(".obrisiPrihodBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            otvoriPopup("prihod", btn.dataset.id);
        });
    });
}

/* ---------------------------------------------------------
   TRANSAKCIJE
--------------------------------------------------------- */

const datumUnosInput = document.getElementById("datumUnos");
if (datumUnosInput) datumUnosInput.value = danasnjiDatum();

const ponavljajCheckbox = document.getElementById("ponavljajCheckbox");
if (ponavljajCheckbox) {
    ponavljajCheckbox.addEventListener("change", function () {
        const box = document.getElementById("repeatOptions");
        if (!box) return;

        if (this.checked) {
            box.classList.remove("hidden");
            const start = document.getElementById("repeatStart");
            const end = document.getElementById("repeatEnd");
            if (start) start.value = danasnjiDatum();
            if (end) end.value = danasnjiDatum();
        } else {
            box.classList.add("hidden");
        }
    });
}

const editPonavljajCheckbox = document.getElementById("editPonavljajCheckbox");
if (editPonavljajCheckbox) {
    editPonavljajCheckbox.addEventListener("change", function () {
        const box = document.getElementById("editRepeatOptions");
        if (!box) return;

        if (this.checked) {
            box.classList.remove("hidden");
            const start = document.getElementById("editRepeatStart");
            const end = document.getElementById("editRepeatEnd");
            if (start) start.value = danasnjiDatum();
            if (end) end.value = danasnjiDatum();
        } else {
            box.classList.add("hidden");
        }
    });
}

const dodajTransakcijuBtn = document.getElementById("dodajTransakciju");
if (dodajTransakcijuBtn) {
    dodajTransakcijuBtn.addEventListener("click", () => {
        const kategorijaSelect = document.getElementById("kategorijaUnos");
        const iznosInput = document.getElementById("iznosUnos");
        const datumInput = document.getElementById("datumUnos");
        const opisInput = document.getElementById("opisUnos");

        if (!kategorijaSelect || !iznosInput || !datumInput || !opisInput) return;

        const kategorija = kategorijaSelect.value;
        const iznos = Number(iznosInput.value);
        const datum = datumInput.value;
        const opis = opisInput.value;

        if (!kategorija || !iznos || !datum) return;

        const ponavljaj = ponavljajCheckbox && ponavljajCheckbox.checked;

        if (!ponavljaj) {
            transakcije.push({
                id: "tr" + Date.now(),
                kategorija,
                iznos,
                datum,
                opis
            });
        } else {
            const startInput = document.getElementById("repeatStart");
            const endInput = document.getElementById("repeatEnd");
            if (!startInput || !endInput) return;

            const start = startInput.value;
            const end = endInput.value;
            if (!start || !end) return;

            const repeatId = "rep" + Date.now();

            let d = new Date(start);
            const endDate = new Date(end);

            while (d <= endDate) {
                transakcije.push({
                    id: "tr" + Math.random(),
                    kategorija,
                    iznos,
                    datum: d.toISOString().split("T")[0],
                    opis,
                    repeatId
                });

                d.setMonth(d.getMonth() + 1);
            }
        }

        spremiSve();
        prikaziTransakcije();
        osvjeziLijeviPanel();
    });
}

function prikaziTransakcije() {
    const lista = document.getElementById("listaTransakcija");
    if (!lista) return;

    lista.innerHTML = "";

    const mjesecTransakcije = transakcije.filter(t => jeUOdabranomMjesecuIGodini(t.datum));

    mjesecTransakcije.forEach(t => {
        const kat = kategorije.find(k => k.id === t.kategorija);
        const ikona = kat ? kat.ikona : "❓";

        const li = document.createElement("li");
        li.innerHTML = `
            <span class="category-icon">${ikona}</span>
            ${formatEUR(t.iznos)} — ${t.opis || "Bez opisa"} (${t.datum})
            <button class="btn-edit urediTransakcijuBtn" data-id="${t.id}">
                <span>✏️</span><span>Uredi</span>
            </button>
            <button class="btn-delete obrisiTransakcijuBtn" data-id="${t.id}">
                <span>🗑️</span><span>Obriši</span>
            </button>
        `;
        lista.appendChild(li);
    });

    document.querySelectorAll(".urediTransakcijuBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            const tr = transakcije.find(t => t.id === btn.dataset.id);
            if (!tr) return;
            otvoriTransakcijaModal(tr);
        });
    });

    document.querySelectorAll(".obrisiTransakcijuBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            otvoriPopup("transakcija", btn.dataset.id);
        });
    });
}

function otvoriTransakcijaModal(tr) {
    aktivnaTransakcijaID = tr.id;

    const katSelect = document.getElementById("editKategorija");
    const iznosInput = document.getElementById("editIznos");
    const datumInput = document.getElementById("editDatum");
    const opisInput = document.getElementById("editOpis");
    const modal = document.getElementById("transakcijaModal");

    if (!katSelect || !iznosInput || !datumInput || !opisInput || !modal) return;

    katSelect.value = tr.kategorija;
    iznosInput.value = tr.iznos;
    datumInput.value = tr.datum;
    opisInput.value = tr.opis || "";

    modal.classList.remove("hidden");
}

const spremiTransakcijuBtn = document.getElementById("spremiTransakcijuBtn");
if (spremiTransakcijuBtn) {
    spremiTransakcijuBtn.addEventListener("click", () => {
        const tr = transakcije.find(t => t.id === aktivnaTransakcijaID);
        if (!tr) return;

        const katSelect = document.getElementById("editKategorija");
        const iznosInput = document.getElementById("editIznos");
        const datumInput = document.getElementById("editDatum");
        const opisInput = document.getElementById("editOpis");

        if (!katSelect || !iznosInput || !datumInput || !opisInput) return;

        const novaKat = katSelect.value;
        const noviIznos = Number(iznosInput.value);
        const noviDatum = datumInput.value;
        const noviOpis = opisInput.value;

        tr.kategorija = novaKat;
        tr.iznos = noviIznos;
        tr.datum = noviDatum;
        tr.opis = noviOpis;

        spremiSve();
        zatvoriSveModale();
        prikaziTransakcije();
        osvjeziLijeviPanel();
    });
}

/* ---------------------------------------------------------
   BRISANJE KATEGORIJE – OPCIJA C
--------------------------------------------------------- */

document.addEventListener("click", e => {
    if (e.target.classList.contains("obrisiKategorijuBtn") ||
        (e.target.parentElement && e.target.parentElement.classList.contains("obrisiKategorijuBtn"))) {

        const btn = e.target.classList.contains("obrisiKategorijuBtn")
            ? e.target
            : e.target.parentElement;

        const id = btn.dataset.id;
        kategorijaZaBrisanje = id;

        const select = document.getElementById("akcijaPrebaciSelect");
        if (!select) return;

        select.innerHTML = "";

        kategorije
            .filter(k => k.id !== id)
            .forEach(k => {
                const opt = document.createElement("option");
                opt.value = k.id;
                opt.textContent = k.naziv;
                select.appendChild(opt);
            });

        const modal = document.getElementById("obrisiKategorijuModal");
        if (modal) modal.classList.remove("hidden");
    }
});

const akcijaObrisanoLabel = document.getElementById("akcijaObrisanoLabel");
if (akcijaObrisanoLabel) {
    akcijaObrisanoLabel.addEventListener("click", () => {
        const kat = kategorije.find(k => k.id === kategorijaZaBrisanje);
        if (!kat) return;

        if (!kat.naziv.includes("(obrisano)")) {
            kat.naziv = kat.naziv + " (obrisano)";
        }

        spremiSve();
        prikaziKategorije();
        prikaziTransakcije();
        zatvoriSveModale();
    });
}

const akcijaPrebaciBtn = document.getElementById("akcijaPrebaciBtn");
if (akcijaPrebaciBtn) {
    akcijaPrebaciBtn.addEventListener("click", () => {
        const select = document.getElementById("akcijaPrebaciSelect");
        if (!select) return;

        const novaKat = select.value;
        if (!novaKat) return;

        transakcije.forEach(t => {
            if (t.kategorija === kategorijaZaBrisanje) {
                t.kategorija = novaKat;
            }
        });

        kategorije = kategorije.filter(k => k.id !== kategorijaZaBrisanje);

        spremiSve();
        prikaziKategorije();
        prikaziTransakcije();
        osvjeziLijeviPanel();
        zatvoriSveModale();
    });
}

const akcijaObrisiSveBtn = document.getElementById("akcijaObrisiSve");
if (akcijaObrisiSveBtn) {
    akcijaObrisiSveBtn.addEventListener("click", () => {
        transakcije = transakcije.filter(t => t.kategorija !== kategorijaZaBrisanje);
        kategorije = kategorije.filter(k => k.id !== kategorijaZaBrisanje);

        spremiSve();
        prikaziKategorije();
        prikaziTransakcije();
        osvjeziLijeviPanel();
        zatvoriSveModale();
    });
}

/* ---------------------------------------------------------
   ZATVARANJE MODALA
--------------------------------------------------------- */

function zatvoriSveModale() {
    document.querySelectorAll(".modal-overlay").forEach(m => m.classList.add("hidden"));
}

document.querySelectorAll(".closeModalBtn").forEach(btn => {
    btn.addEventListener("click", zatvoriSveModale);
});

document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", e => {
        if (e.target === overlay) {
            overlay.classList.add("hidden");
        }
    });
});

/* ---------------------------------------------------------
   GRAF – DONUT / BAR / AREA + SPENDING
--------------------------------------------------------- */

function prikaziSpendingPoKategorijama(sumaPoKategoriji) {
    const lista = document.getElementById("spendingCategoryList");
    if (!lista) return;

    lista.innerHTML = "";

    const entries = Object.entries(sumaPoKategoriji);
    if (entries.length === 0) {
        lista.innerHTML = "<li>Nema troškova za odabrani mjesec.</li>";
        return;
    }

    entries.forEach(([katId, iznos]) => {
        const kat = kategorije.find(k => k.id === katId);
        const naziv = kat ? kat.naziv : "Nepoznato";
        const ikona = kat ? kat.ikona : "❓";

        const li = document.createElement("li");
        li.textContent = `${ikona} ${naziv}: ${formatEUR(iznos)}`;
        lista.appendChild(li);
    });
}

/* Top 3 troška */
function prikaziTopTransakcije(mjesecTransakcije) {
    const ul = document.getElementById("topTransakcijeList");
    if (!ul) return;

    ul.innerHTML = "";

    if (mjesecTransakcije.length === 0) {
        ul.innerHTML = "<li>Nema troškova za ovaj mjesec.</li>";
        return;
    }

    const sorted = [...mjesecTransakcije].sort((a, b) => b.iznos - a.iznos).slice(0, 3);

    const medalje = ["🥇", "🥈", "🥉"];

    sorted.forEach((t, i) => {
        const kat = kategorije.find(k => k.id === t.kategorija);
        const naziv = kat ? kat.naziv : "Nepoznato";
        const li = document.createElement("li");
        li.innerHTML = `
            <span>${medalje[i] || ""} ${naziv}</span>
            <span>${formatEUR(t.iznos)}</span>
        `;
        ul.appendChild(li);
    });
}

/* Dnevni prosjek + predviđena potrošnja */
function prikaziDnevnuStatistiku(mjesecTransakcije) {
    const box = document.getElementById("dailyStats");
    if (!box) return;

    const ukupno = mjesecTransakcije.reduce((s, t) => s + t.iznos, 0);

    const danas = new Date();
    const jeTrenutniMjesec = (aktivnaGodina === danas.getFullYear() && aktivniMjesec === (danas.getMonth() + 1));

    const daysInMonth = new Date(aktivnaGodina, aktivniMjesec, 0).getDate();
    const dayOfMonth = jeTrenutniMjesec ? danas.getDate() : daysInMonth;

    const dnevniProsjek = dayOfMonth > 0 ? ukupno / dayOfMonth : 0;
    const predvidjeno = dnevniProsjek * daysInMonth;

    box.innerHTML = `
        <h3>Pregled mjeseca</h3>
        <p><strong>Dnevni prosjek:</strong> ${formatEUR(dnevniProsjek || 0)}</p>
        <p><strong>Predviđena potrošnja:</strong> ${formatEUR(predvidjeno || 0)}</p>
        <p><strong>Broj dana u mjesecu:</strong> ${daysInMonth}</p>
    `;
}

/* ---------------------------------------------------------
   GLAVNI GRAF (DESKTOP)
--------------------------------------------------------- */

function osvjeziGraf() {
    const canvas = document.getElementById("grafKategorije");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    const computedStyle = getComputedStyle(document.documentElement);
    const textColor = computedStyle.getPropertyValue('--text').trim() || "#0d1b2a";
    const borderColor = computedStyle.getPropertyValue('--border').trim() || "#c5d3e0";

    // Automatski odabor boje legende ovisno o temi
    const isDarkMode = document.body.getAttribute("data-theme") === "dark";
    const legendLabelColor = isDarkMode ? "#ffffff" : "#1a1a1a";

    const mjesecTransakcije = transakcije.filter(t => jeUOdabranomMjesecuIGodini(t.datum));

    const sumaPoKategoriji = {};
    mjesecTransakcije.forEach(t => {
        if (!sumaPoKategoriji[t.kategorija]) sumaPoKategoriji[t.kategorija] = 0;
        sumaPoKategoriji[t.kategorija] += t.iznos;
    });

    const labels = [];
    const values = [];

    for (let katId in sumaPoKategoriji) {
        const kat = kategorije.find(k => k.id === katId);
        labels.push(kat ? kat.naziv : "Nepoznato");
        values.push(sumaPoKategoriji[katId]);
    }

    const boje = [
        "#1565C0", "#FF7043", "#66BB6A", "#AB47BC", "#FFA726",
        "#26C6DA", "#EC407A", "#8D6E63", "#42A5F5", "#D4E157",
        "#5C6BC0", "#FFCA28", "#26A69A", "#EF5350", "#7E57C2"
    ];

    if (graf) graf.destroy();

    let type = "doughnut";
    if (userSettings.chartType === "bar") type = "bar";
    if (userSettings.chartType === "area") type = "line";
    if (userSettings.chartType === "radar") type = "radar";

    let data, options;

    if (type === "doughnut") {
        // Za donut - sve u jedan dataset
        const bgColors = labels.map((_, i) => boje[i % boje.length] + "CC");
        data = {
            labels,
            datasets: [{
                label: "Potrošnja po kategorijama",
                data: values,
                backgroundColor: bgColors,
                borderColor: "#ffffff",
                borderWidth: 2
            }]
        };
        options = {
            responsive: true,
            maintainAspectRatio: true,
            cutout: "55%",
            plugins: {
                legend: { 
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 13 },
                        color: legendLabelColor,
                        boxWidth: 12,
                        boxHeight: 12
                    }
                }
            }
        };
    } else if (type === "bar" || type === "line") {
        // Za bar i line - SVAKA kategorija je vlastiti dataset!
        const datasets = labels.map((label, i) => ({
            label: label,
            data: type === "bar" ? [values[i]] : values,
            backgroundColor: boje[i % boje.length] + (type === "line" ? "66" : "CC"),
            borderColor: boje[i % boje.length],
            borderWidth: 2,
            tension: 0.35,
            fill: type === "line"
        }));

        data = {
            labels: type === "bar" ? [""] : undefined,
            datasets: datasets
        };

        options = {
            responsive: true,
            maintainAspectRatio: true,
            scales: { y: { beginAtZero: true } },
            plugins: {
                legend: { 
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 13 },
                        color: legendLabelColor,
                        boxWidth: 12,
                        boxHeight: 12
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (ctx) {
                            const iznos = formatEUR(ctx.parsed.y || ctx.parsed);
                            return `${ctx.dataset.label}: ${iznos}`;
                        }
                    }
                }
            }
        };
    } else if (type === "radar") {
        // Za radar - sve u jedan dataset
        data = {
            labels,
            datasets: [{
                label: "Potrošnja po kategorijama",
                data: values,
                backgroundColor: boje[0] + "33",
                borderColor: boje[0],
                borderWidth: 2,
                pointBackgroundColor: labels.map((_, i) => boje[i % boje.length]),
                pointBorderColor: "#ffffff",
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        };

        options = {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    beginAtZero: true,
                    grid: { color: borderColor },
                    ticks: { color: textColor }
                }
            },
            plugins: {
                legend: { 
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 13 },
                        color: legendLabelColor,
                        boxWidth: 12,
                        boxHeight: 12
                    }
                }
            }
        };
    }

    graf = new Chart(ctx, { type, data, options });

    prikaziSpendingPoKategorijama(sumaPoKategoriji);
    prikaziTopTransakcije(mjesecTransakcije);
    prikaziDnevnuStatistiku(mjesecTransakcije);
}

/* ---------------------------------------------------------
   SALDO + LIJEVI PANEL
--------------------------------------------------------- */

function osvjeziLijeviPanel() {
    const mjesecPrihodi = prihodi.filter(p => jeUOdabranomMjesecuIGodini(p.datum));
    const mjesecTransakcije = transakcije.filter(t => jeUOdabranomMjesecuIGodini(t.datum));

    const ukupniPrihodi = mjesecPrihodi.reduce((s, p) => s + p.iznos, 0);
    const ukupniTroskovi = mjesecTransakcije.reduce((s, t) => s + t.iznos, 0);
    const saldo = ukupniPrihodi - ukupniTroskovi;

    const prihodiEl = document.getElementById("ukupniPrihodi");
    const troskoviEl = document.getElementById("ukupniTroskovi");
    const saldoEl = document.getElementById("trenutniSaldo");
    const preostaloEl = document.getElementById("preostaloSaldo");

    if (prihodiEl) prihodiEl.textContent = formatEUR(ukupniPrihodi);
    if (troskoviEl) troskoviEl.textContent = formatEUR(ukupniTroskovi);
    if (saldoEl) saldoEl.textContent = formatEUR(saldo);
    if (preostaloEl) preostaloEl.textContent = formatEUR(saldo);

    osvjeziGraf();
}

/* ---------------------------------------------------------
   PROMJENA MJESECA I GODINE
--------------------------------------------------------- */

if (mjesecSelect) {
    mjesecSelect.addEventListener("change", () => {
        aktivniMjesec = Number(mjesecSelect.value) || (new Date().getMonth() + 1);
        prikaziTransakcije();
        prikaziPrihode();
        osvjeziLijeviPanel();
    });
}

if (godinaSelect) {
    godinaSelect.addEventListener("change", () => {
        aktivnaGodina = Number(godinaSelect.value) || new Date().getFullYear();
        prikaziTransakcije();
        prikaziPrihode();
        osvjeziLijeviPanel();
    });
}

/* ---------------------------------------------------------
   SETTINGS – MODAL, TEMA, DIJAGRAM, VALUTA
--------------------------------------------------------- */

const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");

if (settingsBtn && settingsModal) {
    settingsBtn.addEventListener("click", () => {
        settingsModal.classList.remove("hidden");
    });
}

function initSettingsUI() {
    const themeSelect = document.getElementById("themeSelect");
    if (themeSelect) themeSelect.value = userSettings.theme;

    const availableCurrencies = ["EUR", "USD", "GBP", "CHF", "BAM", "RSD"];

    const mainCurrency = document.getElementById("mainCurrency");
    if (mainCurrency) {
        mainCurrency.innerHTML = "";
        availableCurrencies.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c;
            opt.textContent = c;
            mainCurrency.appendChild(opt);
        });

        if (!availableCurrencies.includes(userSettings.mainCurrency)) {
            userSettings.mainCurrency = "EUR";
        }
        mainCurrency.value = userSettings.mainCurrency;
    }

    const chartTypeSelect = document.getElementById("chartTypeSelect");
    if (chartTypeSelect) chartTypeSelect.value = userSettings.chartType;
}

function applyTheme(theme) {
    if (theme === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.body.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
        document.body.setAttribute("data-theme", theme);
    }
}

const themeSelectEl = document.getElementById("themeSelect");
if (themeSelectEl) {
    themeSelectEl.addEventListener("change", () => {
        userSettings.theme = themeSelectEl.value;
        spremiSve();
        applyTheme(userSettings.theme);
        osvjeziGraf();  // DODAJ OVU LINIJU
    });
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (userSettings.theme === "system") {
        applyTheme("system");
        osvjeziGraf();  // DODAJ OVU LINIJU
    }
});

const chartTypeSelectEl = document.getElementById("chartTypeSelect");
if (chartTypeSelectEl) {
    chartTypeSelectEl.addEventListener("change", () => {
        userSettings.chartType = chartTypeSelectEl.value;
        spremiSve();
        osvjeziGraf();
    });
}

const mainCurrencySelect = document.getElementById("mainCurrency");
if (mainCurrencySelect) {
    mainCurrencySelect.addEventListener("change", () => {
        userSettings.mainCurrency = mainCurrencySelect.value;
        spremiSve();
        osvjeziLijeviPanel();
        prikaziTransakcije();
        prikaziPrihode();
        osvjeziGraf();
    });
}

/* ---------------------------------------------------------
   KALKULATOR
--------------------------------------------------------- */

let calcCurrent = "0";
let calcStored = null;
let calcOp = null;
let calcJustEvaluated = false;
let calcAwaitingNext = false; // čekamo unos sljedećeg broja nakon operatora

function osvjeziCalcDisplay() {
    const disp = document.getElementById("calcDisplay");
    if (!disp) return;
    disp.textContent = calcCurrent;
}

function calcClear() {
    calcCurrent = "0";
    calcStored = null;
    calcOp = null;
    calcJustEvaluated = false;
    calcAwaitingNext = false;
    osvjeziCalcDisplay();
}

function calcInputDigit(d) {
    if (calcJustEvaluated || calcAwaitingNext) {
        calcCurrent = "0";
        calcJustEvaluated = false;
        calcAwaitingNext = false;
    }

    if (d === ".") {
        if (!calcCurrent.includes(".")) {
            calcCurrent += ".";
        }
    } else {
        if (calcCurrent === "0") calcCurrent = d;
        else calcCurrent += d;
    }
    osvjeziCalcDisplay();
}

function calcSetOp(op) {
    // Ako je operator već postavljen i čekamo novi broj, samo promijeni operator
    if (calcAwaitingNext && calcStored !== null) {
        calcOp = op;
        return;
    }

    if (calcStored === null) {
        calcStored = parseFloat(calcCurrent) || 0;
    } else if (!calcJustEvaluated) {
        calcEvaluate();
    }

    calcOp = op;
    calcAwaitingNext = true;
    osvjeziCalcDisplay();
}

function calcEvaluate() {
    if (calcOp === null || calcStored === null) return;
    const cur = parseFloat(calcCurrent) || 0;
    let result = calcStored;

    if (calcOp === "+") result = calcStored + cur;
    if (calcOp === "-") result = calcStored - cur;
    if (calcOp === "*") result = calcStored * cur;
    if (calcOp === "/") result = cur === 0 ? 0 : calcStored / cur;

    calcCurrent = String(result);
    calcStored = result;
    calcOp = null;
    calcJustEvaluated = true;
    calcAwaitingNext = true;
    osvjeziCalcDisplay();
}

function calcBackspace() {
    if (calcJustEvaluated) {
        calcCurrent = "0";
        calcJustEvaluated = false;
    } else {
        if (calcCurrent.length > 1) {
            calcCurrent = calcCurrent.slice(0, -1);
        } else {
            calcCurrent = "0";
        }
    }
    osvjeziCalcDisplay();
}

document.addEventListener("click", e => {
    const btn = e.target.closest("[data-calc]");
    if (!btn) return;

    const val = btn.getAttribute("data-calc");

    if (val === "C") {
        calcClear();
        return;
    }
    if (val === "back") {
        calcBackspace();
        return;
    }
    if (["+", "-", "*", "/"].includes(val)) {
        calcSetOp(val);
        return;
    }
    if (val === "=") {
        calcEvaluate();
        return;
    }

    calcInputDigit(val);
});

const calcToIznosBtn = document.getElementById("calcToIznosBtn");
if (calcToIznosBtn) {
    calcToIznosBtn.addEventListener("click", () => {
        const iznosInput = document.getElementById("iznosUnos");
        if (!iznosInput) return;
        const val = parseFloat(calcCurrent.replace(",", ".")) || 0;
        iznosInput.value = val.toFixed(2);
    });
}

// Hamburger meni
const hamburgerBtn = document.getElementById("hamburgerBtn");
const mobileMenu = document.getElementById("mobileMenu");
const closeMobileMenu = document.querySelector(".closeMobileMenu");

if (hamburgerBtn) {
    hamburgerBtn.addEventListener("click", () => {
        mobileMenu.classList.remove("hidden");
    });
}

if (closeMobileMenu) {
    closeMobileMenu.addEventListener("click", () => {
        mobileMenu.classList.add("hidden");
    });
}

const mobileSettingsBtn = document.getElementById("mobileSettingsBtn");
if (mobileSettingsBtn) {
    mobileSettingsBtn.addEventListener("click", () => {
        document.getElementById("settingsModal").classList.remove("hidden");
        mobileMenu.classList.add("hidden");
    });
}

/* ---------------------------------------------------------
   EXPORT FUNKCIJE
--------------------------------------------------------- */

function normalizeText(text) {
    return text
        .replace(/č/g, "c").replace(/ć/g, "c")
        .replace(/ž/g, "z").replace(/š/g, "s")
        .replace(/đ/g, "dj")
        .replace(/Č/g, "C").replace(/Ć/g, "C")
        .replace(/Ž/g, "Z").replace(/Š/g, "S")
        .replace(/Đ/g, "Dj");
}

// Gumbi
const exportDataBtn = document.getElementById("exportDataBtn");
const exportModal = document.getElementById("exportModal");
const exportExcelBtn = document.getElementById("exportExcelBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

// Otvori modal iz postavki
if (exportDataBtn) {
    exportDataBtn.addEventListener("click", () => {
        exportModal.classList.remove("hidden");
    });
}

// Zatvori modal
document.querySelectorAll(".closeModalBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        exportModal.classList.add("hidden");
    });
});

// Excel export
if (exportExcelBtn) {
    exportExcelBtn.addEventListener("click", () => {
        exportToExcel();
        exportModal.classList.add("hidden");
    });
}

// PDF export
if (exportPdfBtn) {
    exportPdfBtn.addEventListener("click", () => {
        exportToPDF();
        exportModal.classList.add("hidden");
    });
}

function exportToExcel() {
    const wb = XLSX.utils.book_new();

    const mjesec = mjesecSelect.value;
    const godina = godinaSelect.value;

    const mjesecTransakcije = transakcije.filter(t => jeUOdabranomMjesecuIGodini(t.datum));
    const mjesecPrihodi = prihodi.filter(p => jeUOdabranomMjesecuIGodini(p.datum));

    const ukupniPrihodi = mjesecPrihodi.reduce((s, p) => s + p.iznos, 0);
    const ukupniTroskovi = mjesecTransakcije.reduce((s, t) => s + t.iznos, 0);
    const saldo = ukupniPrihodi - ukupniTroskovi;

    const pregledSheet = [
        ["Pregled mjeseca"],
        [`Mjesec`, mjesec],
        [`Godina`, godina],
        [],
        ["Ukupni prihodi", ukupniPrihodi],
        ["Ukupni troškovi", ukupniTroskovi],
        ["Preostalo", saldo],
        [],
        ["Potrošnja po kategorijama"],
    ];

    const sumaPoKategoriji = {};
    mjesecTransakcije.forEach(t => {
        if (!sumaPoKategoriji[t.kategorija]) sumaPoKategoriji[t.kategorija] = 0;
        sumaPoKategoriji[t.kategorija] += t.iznos;
    });

    for (let katId in sumaPoKategoriji) {
        const kat = kategorije.find(k => k.id === katId);
        pregledSheet.push([kat?.naziv || "Nepoznato", sumaPoKategoriji[katId]]);
    }

    const ws1 = XLSX.utils.aoa_to_sheet(pregledSheet);
    XLSX.utils.book_append_sheet(wb, ws1, "Pregled mjeseca");

    const transSheet = mjesecTransakcije.map(t => {
        const kat = kategorije.find(k => k.id === t.kategorija)?.naziv || "Nepoznato";
        return {
            Datum: t.datum,
            Kategorija: kat,
            Iznos: t.iznos,
            Opis: t.opis || ""
        };
    });

    const ws2 = XLSX.utils.json_to_sheet(transSheet);
    XLSX.utils.book_append_sheet(wb, ws2, "Transakcije");

    const prihSheet = mjesecPrihodi.map(p => ({
        Datum: p.datum,
        Iznos: p.iznos,
        Opis: p.opis || ""
    }));

    const ws3 = XLSX.utils.json_to_sheet(prihSheet);
    XLSX.utils.book_append_sheet(wb, ws3, "Prihodi");

    XLSX.writeFile(wb, `Izvjestaj_${mjesec}_${godina}.xlsx`);
}

async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("p", "pt", "a4");

    const margin = 40;
    let y = margin;

    const mjesec = mjesecSelect.value;
    const godina = godinaSelect.value;

    const mjesecTransakcije = transakcije.filter(t => jeUOdabranomMjesecuIGodini(t.datum));
    const mjesecPrihodi = prihodi.filter(p => jeUOdabranomMjesecuIGodini(p.datum));

    // Naslov
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(`Izvjestaj za ${normalizeText(mjesec)}. ${godina}.`, 300, y, { align: "center" });
    y += 40;

    doc.setLineWidth(1);
    doc.line(margin, y, 555, y);
    y += 20;

    // --- MOBILNO SIGURNO CRTANJE GRAFA ---
    const canvas = document.getElementById("grafKategorije");

    const smallCanvas = document.createElement("canvas");
    smallCanvas.width = canvas.width / 2;
    smallCanvas.height = canvas.height / 2;

    const ctx2 = smallCanvas.getContext("2d");
    ctx2.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);

    const imgData = smallCanvas.toDataURL("image/png");

    const grafWidth = 300;
    const grafHeight = smallCanvas.height * (grafWidth / smallCanvas.width);

    doc.addImage(imgData, "PNG", 150, y, grafWidth, grafHeight, undefined, "FAST");
    y += grafHeight + 30;

    doc.line(margin, y, 555, y);
    y += 30;

    // Transakcije
    doc.setFontSize(18);
    doc.text("Transakcije", margin, y);
    y += 25;

    doc.setFontSize(12);

    mjesecTransakcije.forEach(t => {
        const kat = kategorije.find(k => k.id === t.kategorija);
        const line = `${t.datum} - ${normalizeText(kat?.naziv || "Nepoznato")} - ${t.iznos} EUR - ${normalizeText(t.opis || "")}`;
        doc.text(line, margin, y);

        y += 20;
        if (y > 780) {
            doc.addPage();
            y = margin;
        }
    });

    y += 10;
    doc.line(margin, y, 555, y);
    y += 30;

    // Prihodi
    doc.setFontSize(18);
    doc.text("Prihodi", margin, y);
    y += 25;

    doc.setFontSize(12);

    mjesecPrihodi.forEach(p => {
        const line = `${p.datum} - ${p.iznos} EUR - ${normalizeText(p.opis || "")}`;
        doc.text(line, margin, y);

        y += 20;
        if (y > 780) {
            doc.addPage();
            y = margin;
        }
    });

    // --- PRECIZNA DETEKCIJA MOBITELA ---
    const isMobile =
        (/Android|iPhone|iPad/i.test(navigator.userAgent)) &&
        !navigator.userAgent.includes("Windows") &&
        !navigator.userAgent.includes("Macintosh");

    if (isMobile) {
        const pdfBlob = doc.output("blob");
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Izvjestaj_${normalizeText(mjesec)}_${godina}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        return;
    }

    // Desktop normalno
    doc.save(`Izvjestaj_${normalizeText(mjesec)}_${godina}.pdf`);
}

/* ---------------------------------------------------------
   UNIVERZALNO BRISANJE (PRIHODI + TRANSAKCIJE)
--------------------------------------------------------- */

let pendingDeleteType = null;   // "prihod" ili "transakcija"
let pendingDeleteId = null;

const popup = document.getElementById("confirmDeletePopup");
const popupYes = document.getElementById("confirmDeleteYes");
const popupNo = document.getElementById("confirmDeleteNo");

function otvoriPopup(type, id) {
    pendingDeleteType = type;
    pendingDeleteId = id;
    popup.classList.remove("hidden");
}

if (popupNo) {
    popupNo.addEventListener("click", () => {
        pendingDeleteType = null;
        pendingDeleteId = null;
        popup.classList.add("hidden");
    });
}

if (popupYes) {
    popupYes.addEventListener("click", () => {

        if (pendingDeleteType === "prihod") {
            prihodi = prihodi.filter(p => p.id !== pendingDeleteId);
            spremiSve();
            prikaziPrihode();
            osvjeziLijeviPanel();
        }

        if (pendingDeleteType === "transakcija") {
            transakcije = transakcije.filter(t => t.id !== pendingDeleteId);
            spremiSve();
            prikaziTransakcije();
            osvjeziLijeviPanel();
        }

        pendingDeleteType = null;
        pendingDeleteId = null;
        popup.classList.add("hidden");
    });
}

/* ---------------------------------------------------------
   Europski format datuma (DD.MM.GGGG.)
--------------------------------------------------------- */

function formatDatumEU(d) {
    const [god, mj, dan] = d.split("-");
    return `${dan}.${mj}.${god}.`;
}

/* ---------------------------------------------------------
   INIT
--------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    popuniIconGrid();
    prikaziKategorije();
    prikaziTransakcije();
    prikaziPrihode();
    initSettingsUI();
    applyTheme(userSettings.theme);
    osvjeziLijeviPanel();
    osvjeziCalcDisplay();
});
