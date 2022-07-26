const fs = require("fs");
const reader = require("readline-sync");
const path = require("path");
const fetch = require("node-fetch");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const DIPARTIMENTI = [
  "da",
  "beniculturali",
  "chimica",
  "chimica-industriale",
  "dar",
  "fabit",
  "ficlit",
  "dfc",
  "fisica-astronomia",
  "disi",
  "dicam",
  "dei",
  "ingegneriaindustriale",
  "dit",
  "lingue",
  "matematica",
  "dimes",
  "psicologia",
  "scienzeaziendali",
  "bigea",
  "dibinem",
  "edu",
  "distal",
  "dse",
  "dsg",
  "dimec",
  "scienzemedicheveterinarie",
  "scienzequalitavita",
  "dsps",
  "stat",
  // "sde", e' particolare questo
  "disci",
];
const LISTA_DOCENTI_URL =
  "https://{{dip}}.unibo.it/it/dipartimento/persone/docenti-e-ricercatori?pagenumber=1&pagesize=100000000&order=asc&sort=Cognome&";
const TAB_TESI_SUFFIX = "/didattica?tab=tesi";
const FILE_NAME = "tesi.md";
const DIR_NAME = "tesi";

function printWarn(str) {
  console.log(`[!] ${str}`);
}
function printLog(str) {
  console.log(`[-] ${str}`);
}
function printError(str) {
  console.log(`[x] ${str}`);
}

function getTesiURL(base) {
  return base + TAB_TESI_SUFFIX;
}

async function getTesi(docente_url) {
  try {
    let url = getTesiURL(docente_url);
    let res = await fetch(url);
    let source = await res.text();
    const dom = new JSDOM(source).window.document;
    let tesi = [
      { nome: "Tesi proposte", tesi: [] },
      { nome: "Tesi assegnate", tesi: [] },
    ];
    let proposte = dom.querySelector(".inner-text");
    if (proposte) {
      let text = proposte.innerHTML.trim();
      tesi[0].tesi.push({ titolo: "Tutte", tesi: [text] });
    }

    let liste = dom.querySelectorAll(".report-list");
    for (let i = 0; i < liste.length; i++) {
      let titolo = liste[i].querySelector("h4").textContent;
      let tipo = { titolo, tesi: [] };
      let lista_tesi = liste[i].querySelectorAll("li");
      for (let j = 0; j < lista_tesi.length; j++) {
        let _t = lista_tesi[j].textContent.trim();
        tipo.tesi.push(_t);
      }
      tesi[1].tesi.push(tipo);
    }
    return tesi;
  } catch (e) {
    throw e;
  }
}

async function getDocenti(dip) {
  try {
    let res = await fetch(LISTA_DOCENTI_URL.replace("{{dip}}", dip));
    let source = await res.text();
    const dom = new JSDOM(source).window.document;
    let cards_list = dom.querySelector(".picture-cards");
    let cards = cards_list.querySelectorAll(".item");
    let docenti = [];
    for (let i = 0; i < cards.length; i++) {
      let nome = cards[i].querySelector("a").textContent.trim();
      let url = cards[i].querySelector("a").href;
      let ruolo = cards[i].querySelector("p").textContent.trim();
      let tesi = await getTesi(url);
      let docente = { nome, url, ruolo, tesi };
      docenti.push(docente);
    }
    return docenti;
  } catch (e) {
    throw e;
  }
}

async function generateMarkDown(docenti) {
  let s = "## Tesi DISI\n";
  for (let i = 0; i < docenti.length; i++) {
    s += `#### ${docenti[i].nome}\n###### ${docenti[i].ruolo}\n[Sito Web](${docenti[i].url})\n`;
    for (let j = 0; j < docenti[i].tesi.length; j++) {
      s += ` * ${docenti[i].tesi[j].nome}\n`;
      let tesi = docenti[i].tesi[j].tesi;
      for (let k = 0; k < tesi.length; k++) {
        s += `   - ${tesi[k].titolo}\n`;
        for (let l = 0; l < tesi[k].tesi.length; l++) {
          tesi[k].tesi[l] = tesi[k].tesi[l].replace(/\n/gm, "");
          s += `     + ${tesi[k].tesi[l]}\n`;
        }
      }
    }
    s += "\n";
  }
  return s;
}

async function saveMarkDown(dip, md) {
  let p = path.join(__dirname, path.join(DIR_NAME, `${dip}_${FILE_NAME}`));
  fs.writeFileSync(p, md);
  return p;
}

async function test() {
  for (let i = 0; i < DIPARTIMENTI.length; i++) {
    let dip = DIPARTIMENTI[i];
    printLog("Raccolgo docenti e tesi");
    let docenti = await getDocenti(dip);
    printLog("Genero il file markdown");
    let md = await generateMarkDown(docenti);
    let p = await saveMarkDown(dip, md);
    printLog(`File generato in \n\t${p}`);
  }
}

async function main() {
  try {
    printLog(
      "Per info sulle sigle guardare qua -> \n\thttps://www.unibo.it/it/ateneo/sedi-e-strutture/dipartimenti"
    );
    printWarn(
      "Guardare il dominio del dipartimanto non il codice\n\tEsempio.\n\t\tDIFA -> fisica-astronomia\n\t\tCHIMIND -> chimica-industriale"
    );

    let dip = reader.question("[?] Sigla dipartimento : ");
    printLog("Raccolgo docenti e tesi");
    let docenti = await getDocenti(dip);
    printLog("Genero il file markdown");
    let md = await generateMarkDown(docenti);
    let p = await saveMarkDown(dip, md);
    printLog(`File generato in \n\t${p}`);
  } catch (e) {
    printError("Qualcosa e' andato storto :(");
  }
}

// main();
test();
