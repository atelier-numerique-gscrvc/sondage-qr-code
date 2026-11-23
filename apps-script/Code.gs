/* =====================================================================
   SONDAGE — partie "serveur" gratuite (Google Apps Script + Google Sheet)

   Ce script :
   - enregistre chaque réponse dans l'onglet "Réponses" de la feuille ;
   - range les adresses e-mail à part (onglet "E-mails"), sans lien avec les réponses ;
   - calcule les statistiques (page admin du site) ;
   - à la date de clôture, envoie automatiquement :
       * le rapport complet à vous (administrateur),
       * les résultats globaux à chaque personne ayant laissé son adresse,
     puis efface les adresses (RGPD).

   À MODIFIER : uniquement le bloc CONFIG ci-dessous.
   Après une modification : Déployer > Gérer les déploiements > (crayon) >
   Version : "Nouvelle version" > Déployer.
   ===================================================================== */

var CONFIG = {
  TITRE: "Sensibilisation à l'intelligence artificielle",

  // Dates d'ouverture et de fermeture (heure de Paris : +01:00 en hiver, +02:00 en été)
  OUVERTURE: "2026-11-23T08:00:00+01:00",
  FERMETURE: "2026-11-30T18:00:00+01:00",

  // Les commentaires libres sont-ils inclus dans l'e-mail envoyé aux participants ?
  // (ils sont toujours inclus dans votre rapport administrateur)
  COMMENTAIRES_POUR_PARTICIPANTS: false,

  // Effacer les adresses e-mail une fois les résultats envoyés (recommandé, RGPD)
  EFFACER_EMAILS_APRES_ENVOI: true,

  // Nom affiché comme expéditeur des e-mails
  NOM_EXPEDITEUR: "Sondage IA",
};

var ONGLET_REPONSES = "Réponses";
var ONGLET_EMAILS = "E-mails";
var ONGLET_QUESTIONS = "Questions";

/* ---------------------------------------------------------------------
   1) À LANCER UNE SEULE FOIS : menu "Exécuter" > installer
   --------------------------------------------------------------------- */
function installer() {
  var ss = classeur_();
  feuille_(ONGLET_REPONSES, ["Horodatage"]);
  feuille_(ONGLET_EMAILS, ["Horodatage", "E-mail", "Résultats envoyés"]);
  feuille_(ONGLET_QUESTIONS, ["Id", "Type", "Question", "Options", "Ordre"]);
  var defaut = ss.getSheetByName("Feuille 1") || ss.getSheetByName("Sheet1");
  if (defaut && ss.getSheets().length > 1) ss.deleteSheet(defaut);

  // Déclencheur horaire qui surveille la clôture
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "verifierCloture") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("verifierCloture").timeBased().everyHours(1).create();

  // Clé secrète pour la page statistiques
  var props = PropertiesService.getScriptProperties();
  var cle = props.getProperty("CLE_ADMIN");
  if (!cle) {
    cle = Utilities.getUuid().replace(/-/g, "").slice(0, 16);
    props.setProperty("CLE_ADMIN", cle);
  }
  var moi = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail({
    to: moi,
    name: CONFIG.NOM_EXPEDITEUR,
    subject: "[Sondage] Installation terminée — votre clé administrateur",
    body:
      "L'installation du sondage est terminée.\n\n" +
      "Votre clé administrateur (page statistiques) : " + cle + "\n\n" +
      "Tableau des réponses (Google Sheet) : " + ss.getUrl() + "\n\n" +
      "Ouverture : " + CONFIG.OUVERTURE + "\nFermeture : " + CONFIG.FERMETURE + "\n\n" +
      "Les résultats seront envoyés automatiquement dans l'heure qui suit la fermeture.",
  });
  Logger.log("Installation OK. Clé administrateur : " + cle + " (également envoyée à " + moi + ")");
  Logger.log("Tableau des réponses : " + ss.getUrl());
}

/* ---------------------------------------------------------------------
   2) Points d'entrée web (appelés par le site GitHub Pages)
   --------------------------------------------------------------------- */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === "statut") return json_(statut_());
  if (p.action === "stats") {
    var cle = PropertiesService.getScriptProperties().getProperty("CLE_ADMIN");
    if (!cle || p.cle !== cle) return json_({ ok: false, erreur: "cle" });
    var s = statistiques_(true);
    s.ok = true;
    s.statut = statut_();
    s.emails = compterEmails_();
    return json_(s);
  }
  return json_({ ok: true, message: "Sondage en ligne" });
}

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, erreur: "format" });
  }
  if (statut_().etat !== "ouvert") return json_({ ok: false, erreur: "ferme" });
  if (!data || !Array.isArray(data.reponses) || data.reponses.length === 0 || data.reponses.length > 50) {
    return json_({ ok: false, erreur: "format" });
  }

  var verrou = LockService.getScriptLock();
  verrou.waitLock(20000);
  try {
    var maintenant = new Date();
    var fr = feuille_(ONGLET_REPONSES, ["Horodatage"]);
    var entetes = fr.getRange(1, 1, 1, fr.getLastColumn()).getValues()[0];
    var ligne = [];
    ligne[0] = maintenant;

    data.reponses.forEach(function (r, i) {
      var id = propre_(r.id, 40);
      if (!id) return;
      memoriserQuestion_(id, propre_(r.type, 20), propre_(r.question, 500), r.options, i);
      var col = entetes.indexOf(id);
      if (col < 0) {
        col = entetes.length;
        entetes.push(id);
        fr.getRange(1, col + 1).setValue(id);
      }
      ligne[col] = cellule_(propre_(r.valeur, 2000));
    });
    for (var c = 0; c < entetes.length; c++) if (ligne[c] === undefined) ligne[c] = "";
    fr.appendRow(ligne);

    var email = propre_(data.email, 200).toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      var fe = feuille_(ONGLET_EMAILS, ["Horodatage", "E-mail", "Résultats envoyés"]);
      var existants = fe.getLastRow() > 1 ? fe.getRange(2, 2, fe.getLastRow() - 1, 1).getValues().map(function (x) { return x[0]; }) : [];
      if (existants.indexOf(email) < 0) fe.appendRow([maintenant, cellule_(email), ""]);
    }
  } finally {
    verrou.releaseLock();
  }
  return json_({ ok: true });
}

/* ---------------------------------------------------------------------
   3) Clôture automatique (déclencheur horaire)
   --------------------------------------------------------------------- */
function verifierCloture() {
  if (statut_().etat !== "ferme") return;
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty("ENVOI_TERMINE") === "oui") return;

  var stats = statistiques_(true);

  if (props.getProperty("RAPPORT_ADMIN_ENVOYE") !== "oui") {
    MailApp.sendEmail({
      to: Session.getEffectiveUser().getEmail(),
      name: CONFIG.NOM_EXPEDITEUR,
      subject: "[Sondage clôturé] Rapport complet — " + CONFIG.TITRE,
      htmlBody: htmlResultats_(stats, true),
    });
    props.setProperty("RAPPORT_ADMIN_ENVOYE", "oui");
  }

  var html = htmlResultats_(statistiques_(CONFIG.COMMENTAIRES_POUR_PARTICIPANTS), false);
  var fe = feuille_(ONGLET_EMAILS, ["Horodatage", "E-mail", "Résultats envoyés"]);
  var n = fe.getLastRow() - 1;
  var restants = 0;
  if (n > 0) {
    var lignes = fe.getRange(2, 1, n, 3).getValues();
    for (var i = 0; i < lignes.length; i++) {
      if (lignes[i][2]) continue;
      if (MailApp.getRemainingDailyQuota() < 2) { restants++; continue; } // la suite partira demain
      try {
        MailApp.sendEmail({
          to: String(lignes[i][1]).replace(/^'/, ""),
          name: CONFIG.NOM_EXPEDITEUR,
          subject: "Résultats du sondage — " + CONFIG.TITRE,
          htmlBody: html,
        });
        fe.getRange(i + 2, 3).setValue(new Date());
        if (CONFIG.EFFACER_EMAILS_APRES_ENVOI) fe.getRange(i + 2, 2).setValue("(effacé après envoi)");
      } catch (err) {
        fe.getRange(i + 2, 3).setValue("échec : " + err.message);
      }
    }
  }
  if (restants === 0) props.setProperty("ENVOI_TERMINE", "oui");
}

/* Pour voir à quoi ressemblera l'e-mail : Exécuter > testerEmailResultats
   (il vous est envoyé à vous seul, rien n'est envoyé aux participants) */
function testerEmailResultats() {
  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    name: CONFIG.NOM_EXPEDITEUR,
    subject: "[TEST] Résultats du sondage — " + CONFIG.TITRE,
    htmlBody: htmlResultats_(statistiques_(CONFIG.COMMENTAIRES_POUR_PARTICIPANTS), false),
  });
}

/* Pour relancer un envoi (après avoir changé la date de fermeture, par ex.) */
function reinitialiserEnvois() {
  var props = PropertiesService.getScriptProperties();
  props.deleteProperty("ENVOI_TERMINE");
  props.deleteProperty("RAPPORT_ADMIN_ENVOYE");
}

/* ---------------------------------------------------------------------
   Outils internes
   --------------------------------------------------------------------- */
function statut_() {
  var now = new Date();
  var o = new Date(CONFIG.OUVERTURE), f = new Date(CONFIG.FERMETURE);
  var etat = now < o ? "avant" : now >= f ? "ferme" : "ouvert";
  return { ok: true, etat: etat, ouverture: o.toISOString(), fermeture: f.toISOString() };
}

function statistiques_(avecCommentaires) {
  var fq = feuille_(ONGLET_QUESTIONS, ["Id", "Type", "Question", "Options", "Ordre"]);
  var fr = feuille_(ONGLET_REPONSES, ["Horodatage"]);
  var qs = fq.getLastRow() > 1 ? fq.getRange(2, 1, fq.getLastRow() - 1, 5).getValues() : [];
  qs.sort(function (a, b) { return a[4] - b[4]; });
  var entetes = fr.getRange(1, 1, 1, Math.max(1, fr.getLastColumn())).getValues()[0];
  var lignes = fr.getLastRow() > 1 ? fr.getRange(2, 1, fr.getLastRow() - 1, entetes.length).getValues() : [];

  var res = { titre: CONFIG.TITRE, total: lignes.length, questions: [] };
  qs.forEach(function (q) {
    var id = q[0], type = q[1], col = entetes.indexOf(id);
    var options = [];
    try { options = JSON.parse(q[3] || "[]"); } catch (e) {}
    var valeurs = col < 0 ? [] : lignes.map(function (l) { return String(l[col]).replace(/^'/, ""); }).filter(function (v) { return v !== ""; });
    var item = { id: id, type: type, texte: q[2], repondants: valeurs.length };

    if (type === "texte") {
      item.nbTextes = valeurs.length;
      if (avecCommentaires) item.textes = valeurs;
    } else {
      var comptes = {};
      if (type === "note") options = ["1", "2", "3", "4", "5"];
      options.forEach(function (o) { comptes[o] = 0; });
      var somme = 0;
      valeurs.forEach(function (v) {
        var parts = type === "multiple" ? v.split(" | ") : [v];
        parts.forEach(function (p) { comptes[p] = (comptes[p] || 0) + 1; });
        if (type === "note") somme += Number(v) || 0;
      });
      item.resultats = Object.keys(comptes).map(function (k) {
        return {
          libelle: type === "note" ? k + " ★" : k,
          nombre: comptes[k],
          pct: valeurs.length ? Math.round((comptes[k] / valeurs.length) * 100) : 0,
        };
      });
      if (type === "note" && valeurs.length) item.moyenne = Math.round((somme / valeurs.length) * 10) / 10;
    }
    res.questions.push(item);
  });
  return res;
}

function htmlResultats_(s, admin) {
  var e = function (t) { return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  var h = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;color:#1c2333">';
  h += '<h2 style="margin:0 0 4px">Résultats du sondage</h2>';
  h += '<p style="margin:0 0 6px;color:#5b6477">' + e(s.titre) + "</p>";
  h += "<p><b>" + s.total + "</b> participant" + (s.total > 1 ? "s" : "") + " — sondage clos le " +
    Utilities.formatDate(new Date(CONFIG.FERMETURE), "Europe/Paris", "dd/MM/yyyy 'à' HH'h'mm") + ".</p>";
  s.questions.forEach(function (q, i) {
    h += '<h3 style="font-size:15px;margin:22px 0 8px">' + (i + 1) + ". " + e(q.texte) + "</h3>";
    if (q.type === "texte") {
      if (q.textes && q.textes.length) {
        h += "<ul>" + q.textes.map(function (t) { return '<li style="margin-bottom:6px">' + e(t) + "</li>"; }).join("") + "</ul>";
      } else {
        h += '<p style="color:#5b6477">' + q.nbTextes + " réponse(s) libre(s).</p>";
      }
      return;
    }
    if (q.moyenne != null) h += "<p style=\"margin:0 0 6px\">Moyenne : <b>" + q.moyenne + " / 5</b></p>";
    h += '<table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px">';
    q.resultats.forEach(function (r) {
      var w = Math.max(r.pct, 1);
      h += "<tr>" +
        '<td style="padding:3px 8px 3px 0;width:38%">' + e(r.libelle) + "</td>" +
        '<td style="padding:3px 0"><table cellpadding="0" cellspacing="0" style="width:100%;background:#e7ecff;border-radius:3px"><tr>' +
        '<td style="width:' + w + '%;background:#3b5bdb;height:12px;border-radius:3px"></td><td></td></tr></table></td>' +
        '<td style="padding:3px 0 3px 8px;white-space:nowrap;color:#5b6477;text-align:right">' + r.pct + " % (" + r.nombre + ")</td></tr>";
    });
    h += "</table>";
  });
  if (!admin) h += '<p style="margin-top:28px;font-size:12px;color:#5b6477">Vous recevez ce message car vous avez demandé les résultats en répondant au sondage. Votre adresse a été effacée après cet envoi.</p>';
  return h + "</div>";
}

function memoriserQuestion_(id, type, texte, options, ordre) {
  var fq = feuille_(ONGLET_QUESTIONS, ["Id", "Type", "Question", "Options", "Ordre"]);
  var n = fq.getLastRow() - 1;
  var ids = n > 0 ? fq.getRange(2, 1, n, 1).getValues().map(function (x) { return x[0]; }) : [];
  var opts = JSON.stringify(Array.isArray(options) ? options.slice(0, 30).map(function (o) { return propre_(o, 200); }) : []);
  var valeurs = [[id, type, cellule_(texte), opts, ordre]];
  var i = ids.indexOf(id);
  if (i < 0) fq.appendRow(valeurs[0]);
  else fq.getRange(i + 2, 1, 1, 5).setValues(valeurs);
}

function compterEmails_() {
  var fe = feuille_(ONGLET_EMAILS, ["Horodatage", "E-mail", "Résultats envoyés"]);
  var n = fe.getLastRow() - 1;
  if (n <= 0) return { total: 0, envoyes: 0 };
  var v = fe.getRange(2, 3, n, 1).getValues();
  return { total: n, envoyes: v.filter(function (x) { return x[0] instanceof Date; }).length };
}

// Le tableau Google Sheet des réponses : celui auquel le script est rattaché,
// sinon un tableau "Sondage QR code — réponses" créé automatiquement dans votre Drive.
function classeur_() {
  var actif = SpreadsheetApp.getActiveSpreadsheet();
  if (actif) return actif;
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("ID_CLASSEUR");
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.create("Sondage QR code — réponses");
  props.setProperty("ID_CLASSEUR", ss.getId());
  return ss;
}

function feuille_(nom, entetes) {
  var ss = classeur_();
  var f = ss.getSheetByName(nom);
  if (!f) {
    f = ss.insertSheet(nom);
    f.getRange(1, 1, 1, entetes.length).setValues([entetes]).setFontWeight("bold");
    f.setFrozenRows(1);
  }
  return f;
}

function propre_(v, max) {
  return String(v == null ? "" : v).trim().slice(0, max);
}

// Empêche qu'une réponse commençant par "=" soit interprétée comme une formule
function cellule_(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
