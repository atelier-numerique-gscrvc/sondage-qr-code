(function () {
  "use strict";
  var C = window.SONDAGE;
  var app = document.getElementById("app");
  var DEMO = !C.scriptUrl;
  var CLE_DEJA = "sondage-repondu:" + (C.scriptUrl || "demo");
  var reponses = {};
  var index = 0;
  var statut = null;

  document.title = C.titre;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function stocker(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function lire(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function dateFr(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("fr-FR", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris",
    });
  }
  function rendre(html) {
    app.innerHTML = (DEMO ? '<div class="bandeau-demo">Mode démo : les réponses ne sont pas enregistrées.</div>' : "") + html;
    window.scrollTo(0, 0);
  }

  /* ---------- Pages ---------- */

  function pageAccueil() {
    rendre(
      '<p class="surtitre">' + esc(C.titre) + "</p>" +
      "<h1>" + esc(C.accueil.titre) + "</h1>" +
      "<p>" + esc(C.accueil.texte) + "</p>" +
      (statut && statut.fermeture ? '<p class="doux">Sondage ouvert jusqu\'au ' + esc(dateFr(statut.fermeture)) + ".</p>" : "") +
      '<div class="actions"><button class="btn" id="go">' + esc(C.accueil.bouton) + "</button></div>"
    );
    document.getElementById("go").onclick = function () { index = 0; pageQuestion(); };
  }

  function obligatoire(q) { return q.obligatoire !== false; }

  function repondu(q) {
    var v = reponses[q.id];
    if (q.type === "multiple") return Array.isArray(v) && v.length > 0;
    if (q.type === "texte") return typeof v === "string" && v.trim() !== "";
    return v !== undefined && v !== null && v !== "";
  }

  function pageQuestion() {
    var q = C.questions[index];
    var n = C.questions.length;
    var corps = "";
    var v = reponses[q.id];

    if (q.type === "ouinon" || q.type === "choix") {
      var opts = q.type === "ouinon" ? ["Oui", "Non"] : q.options;
      corps = '<div class="options ' + (q.type === "ouinon" ? "ouinon" : "") + '">' +
        opts.map(function (o) {
          return '<button class="option' + (v === o ? " choisi" : "") + '" data-v="' + esc(o) + '">' + esc(o) + "</button>";
        }).join("") + "</div>";
    } else if (q.type === "multiple") {
      var sel = Array.isArray(v) ? v : [];
      corps = '<div class="options">' + q.options.map(function (o) {
        var on = sel.indexOf(o) >= 0;
        return '<button class="option' + (on ? " choisi" : "") + '" data-v="' + esc(o) + '" aria-pressed="' + on + '"><span class="case">' + (on ? "✓" : "") + "</span>" + esc(o) + "</button>";
      }).join("") + "</div>";
    } else if (q.type === "note") {
      corps = '<div class="etoiles">' + [1, 2, 3, 4, 5].map(function (i) {
        return '<button data-v="' + i + '" class="' + (v >= i ? "on" : "") + '" aria-label="' + i + ' sur 5">★</button>';
      }).join("") + '</div><div class="legende-note"><span>Pas du tout satisfait</span><span>Très satisfait</span></div>';
    } else if (q.type === "texte") {
      corps = '<textarea id="txt" maxlength="2000" placeholder="Votre réponse…">' + esc(v || "") + "</textarea>";
    }

    var dernier = index === n - 1;
    rendre(
      '<div class="progression"><div style="width:' + Math.round((index / n) * 100) + '%"></div></div>' +
      '<div class="compteur">Question ' + (index + 1) + " sur " + n + "</div>" +
      "<h2>" + esc(q.texte) + "</h2>" + corps +
      '<div class="actions">' +
      (index > 0 ? '<button class="btn secondaire" id="prec">Précédent</button>' : "") +
      '<button class="btn" id="suiv">' + (dernier ? "Terminer" : "Suivant") + "</button></div>"
    );

    var suiv = document.getElementById("suiv");
    function maj() { suiv.disabled = obligatoire(q) && !repondu(q); }
    maj();

    if (q.type === "ouinon" || q.type === "choix") {
      app.querySelectorAll(".option").forEach(function (b) {
        b.onclick = function () {
          reponses[q.id] = b.getAttribute("data-v");
          app.querySelectorAll(".option").forEach(function (x) { x.classList.toggle("choisi", x === b); });
          maj();
          // Passage automatique à la question suivante pour aller vite sur mobile
          setTimeout(suivant, 250);
        };
      });
    } else if (q.type === "multiple") {
      app.querySelectorAll(".option").forEach(function (b) {
        b.onclick = function () {
          var o = b.getAttribute("data-v");
          var s = Array.isArray(reponses[q.id]) ? reponses[q.id].slice() : [];
          var i = s.indexOf(o);
          if (i >= 0) s.splice(i, 1); else s.push(o);
          reponses[q.id] = s;
          var on = i < 0;
          b.classList.toggle("choisi", on);
          b.setAttribute("aria-pressed", on);
          b.querySelector(".case").textContent = on ? "✓" : "";
          maj();
        };
      });
    } else if (q.type === "note") {
      app.querySelectorAll(".etoiles button").forEach(function (b) {
        b.onclick = function () {
          var val = Number(b.getAttribute("data-v"));
          reponses[q.id] = val;
          app.querySelectorAll(".etoiles button").forEach(function (x) { x.classList.toggle("on", Number(x.getAttribute("data-v")) <= val); });
          maj();
        };
      });
    } else if (q.type === "texte") {
      var t = document.getElementById("txt");
      t.oninput = function () { reponses[q.id] = t.value; maj(); };
    }

    var verrou = false;
    function suivant() {
      if (verrou || suiv.disabled) return;
      verrou = true;
      if (dernier) pageEmail(); else { index++; pageQuestion(); }
    }
    suiv.onclick = suivant;
    var prec = document.getElementById("prec");
    if (prec) prec.onclick = function () { index--; pageQuestion(); };
  }

  function pageEmail() {
    rendre(
      '<div class="progression"><div style="width:100%"></div></div>' +
      '<div class="compteur">Dernière étape</div>' +
      "<h2>" + esc(C.email.titre) + "</h2>" +
      "<p>" + esc(C.email.texte) + "</p>" +
      '<input type="email" id="mail" autocomplete="email" inputmode="email" placeholder="votre.adresse@exemple.fr (facultatif)">' +
      '<label class="consentement" id="lblc" hidden><input type="checkbox" id="ok"><span>J\'accepte que mon adresse soit utilisée uniquement pour m\'envoyer les résultats. ' + esc(C.email.mentionRgpd) + "</span></label>" +
      '<p class="erreur" id="err" hidden></p>' +
      '<div class="actions"><button class="btn secondaire" id="prec">Précédent</button><button class="btn" id="env">Envoyer mes réponses</button></div>'
    );
    var mail = document.getElementById("mail");
    var ok = document.getElementById("ok");
    var lblc = document.getElementById("lblc");
    var env = document.getElementById("env");
    var err = document.getElementById("err");
    function maj() {
      var m = mail.value.trim();
      lblc.hidden = !m;
      env.disabled = !!m && (!ok.checked || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m));
    }
    mail.oninput = maj; ok.onchange = maj; maj();
    document.getElementById("prec").onclick = function () { index = C.questions.length - 1; pageQuestion(); };

    env.onclick = function () {
      var m = mail.value.trim();
      env.disabled = true; env.textContent = "Envoi…"; err.hidden = true;
      envoyer(m).then(function () {
        stocker(CLE_DEJA, "1");
        pageMerci(!!m);
      }).catch(function (e) {
        if (e && e.ferme) { pageFerme(); return; }
        err.textContent = "L'envoi a échoué. Vérifiez votre connexion puis réessayez.";
        err.hidden = false; env.disabled = false; env.textContent = "Envoyer mes réponses";
      });
    };
  }

  function pageMerci(avecEmail) {
    var t = avecEmail
      ? C.merci.texteAvecEmail + (statut && statut.fermeture ? " (" + dateFr(statut.fermeture) + ")." : ".")
      : C.merci.texte;
    rendre('<div class="grand-icone">🙏</div><h1 class="centre">' + esc(C.merci.titre) + '</h1><p class="centre">' + esc(t) + "</p>");
  }
  function pageDeja() {
    rendre('<div class="grand-icone">✅</div><h1 class="centre">Vous avez déjà répondu</h1><p class="centre">Merci, votre participation a bien été prise en compte.</p>');
  }
  function pageFerme() {
    rendre('<div class="grand-icone">🔒</div><h1 class="centre">' + esc(C.ferme.titre) + '</h1><p class="centre">' + esc(C.ferme.texte) + "</p>");
  }
  function pagePasOuvert() {
    rendre('<div class="grand-icone">⏳</div><h1 class="centre">Le sondage n\'est pas encore ouvert</h1><p class="centre">Il ouvrira le ' + esc(dateFr(statut.ouverture)) + ".</p>");
  }
  function pageErreur() {
    rendre('<h1>Oups</h1><p>Le sondage est momentanément inaccessible. Réessayez dans un instant.</p><div class="actions"><button class="btn" onclick="location.reload()">Réessayer</button></div>');
  }

  /* ---------- Échanges avec le script Google ---------- */

  function envoyer(email) {
    var payload = {
      action: "repondre",
      reponses: C.questions.map(function (q) {
        var v = reponses[q.id];
        if (Array.isArray(v)) v = v.join(" | ");
        return {
          id: q.id, type: q.type, question: q.texte,
          options: q.type === "ouinon" ? ["Oui", "Non"] : (q.options || []),
          valeur: v == null ? "" : String(v),
        };
      }),
      email: email || "",
    };
    if (DEMO) { console.log("[démo] envoi", payload); return new Promise(function (r) { setTimeout(r, 400); }); }
    // text/plain évite la requête CORS "preflight" que Google ne gère pas
    return fetch(C.scriptUrl, { method: "POST", body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j.ok) return j;
        if (j.erreur === "ferme") throw { ferme: true };
        throw new Error(j.erreur || "erreur");
      });
  }

  function chargerStatut() {
    if (DEMO) {
      var f = new Date(Date.now() + 7 * 864e5).toISOString();
      return Promise.resolve({ ok: true, etat: "ouvert", ouverture: new Date().toISOString(), fermeture: f });
    }
    return fetch(C.scriptUrl + "?action=statut").then(function (r) { return r.json(); });
  }

  chargerStatut().then(function (s) {
    statut = s;
    if (s.etat === "ferme") return pageFerme();
    if (s.etat === "avant") return pagePasOuvert();
    if (lire(CLE_DEJA) && !/[?&]refaire\b/.test(location.search)) return pageDeja();
    pageAccueil();
  }).catch(pageErreur);
})();
