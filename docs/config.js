/* =====================================================================
   CONFIGURATION DU SONDAGE — c'est le seul fichier à modifier
   pour changer les textes et les questions.
   ===================================================================== */

window.SONDAGE = {
  // Adresse du script Google (étape 2 du guide). Laissez vide pour le
  // "mode démo" : le sondage fonctionne mais rien n'est enregistré.
  scriptUrl: "",

  titre: "Sensibilisation à l'intelligence artificielle",

  accueil: {
    titre: "Bienvenue !",
    texte:
      "Merci d'avoir assisté à cette sensibilisation à l'intelligence artificielle. " +
      "Votre avis compte : ce court questionnaire anonyme (10 questions, environ 2 minutes) " +
      "nous aide à savoir si tout s'est bien passé et à améliorer les prochaines sessions.",
    bouton: "Commencer",
  },

  /* Types de questions possibles :
       "ouinon"   : boutons Oui / Non
       "choix"    : un seul choix parmi "options"
       "multiple" : plusieurs choix possibles parmi "options"
       "note"     : note de 1 à 5 (étoiles)
       "texte"    : réponse libre
     "obligatoire: false" rend une question facultative.
     L'"id" doit rester unique et ne doit plus changer une fois le sondage ouvert. */
  questions: [
    {
      id: "q1",
      type: "ouinon",
      texte: "La sensibilisation sur l'intelligence artificielle vous a-t-elle paru pertinente ?",
    },
    {
      id: "q2",
      type: "ouinon",
      texte: "Le contenu présenté était-il clair et compréhensible ?",
    },
    {
      id: "q3",
      type: "choix",
      texte: "Avant cette conférence, comment évaluiez-vous vos connaissances en IA ?",
      options: ["Aucune", "Débutant", "Intermédiaire", "Avancé"],
    },
    {
      id: "q4",
      type: "ouinon",
      texte: "Avez-vous appris des choses nouvelles ?",
    },
    {
      id: "q5",
      type: "note",
      texte: "Quelle note globale donneriez-vous à cette sensibilisation ?",
    },
    {
      id: "q6",
      type: "choix",
      texte: "Utilisez-vous déjà des outils d'IA (ChatGPT, Claude, Copilot, Gemini…) ?",
      options: ["Jamais", "Parfois", "Régulièrement"],
    },
    {
      id: "q7",
      type: "ouinon",
      texte: "Envisagez-vous d'utiliser davantage l'IA dans votre travail après cette sensibilisation ?",
    },
    {
      id: "q8",
      type: "multiple",
      texte: "Quels sujets aimeriez-vous approfondir ? (plusieurs choix possibles)",
      options: [
        "Usages pratiques au quotidien",
        "Risques et éthique",
        "Protection des données",
        "Fonctionnement technique",
        "Réglementation (AI Act)",
      ],
    },
    {
      id: "q9",
      type: "ouinon",
      texte: "Recommanderiez-vous cette sensibilisation à un collègue ?",
    },
    {
      id: "q10",
      type: "texte",
      texte: "Un commentaire ou une suggestion ? (facultatif)",
      obligatoire: false,
    },
  ],

  email: {
    titre: "Recevoir les résultats",
    texte:
      "Si vous le souhaitez, laissez votre adresse e-mail : vous recevrez automatiquement " +
      "les résultats globaux du sondage à sa clôture.",
    mentionRgpd:
      "Votre adresse sert uniquement à vous envoyer les résultats, une seule fois. " +
      "Elle n'est jamais liée publiquement à vos réponses ni transmise à des tiers, " +
      "et elle est effacée après l'envoi.",
  },

  merci: {
    titre: "Merci pour votre participation !",
    texte: "Vos réponses ont bien été enregistrées.",
    texteAvecEmail:
      "Vos réponses ont bien été enregistrées. Vous recevrez les résultats par e-mail à la clôture du sondage",
  },

  ferme: {
    titre: "Le sondage est fermé",
    texte: "Merci de votre intérêt. Ce sondage n'accepte plus de réponses.",
  },
};
