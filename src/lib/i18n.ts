export type Locale = "en" | "ko" | "fr";
const BILINGUAL_DELIMITER = "|||";
const FRENCH_FALLBACK_TRANSLATIONS: Record<string, string> = {
  "Browse vendors": "Parcourir les vendeurs",
  "Sign in": "Se connecter",
  "Quick Menu": "Menu rapide",
  "My page": "Mon espace",
  Home: "Accueil",
  "Vendor registration": "Inscription vendeur",
  "Register as vendor": "S'inscrire comme vendeur",
  Requests: "Demandes",
  "Messages with vendors": "Messages avec les vendeurs",
  "No active chats yet.": "Aucune conversation active.",
  "Request documents": "Documents demandés",
  "Requested quotations": "Devis demandés",
  "Requested EBM": "EBM demandés",
  "Favorite vendors": "Vendeurs favoris",
  "Recently viewed": "Récemment consultés",
  "No favorites yet.": "Aucun favori pour le moment.",
  "No recent views yet.": "Aucune consultation récente.",
  "Sign in / register": "Connexion / inscription",
  "Sign in to save vendors and view history.":
    "Connectez-vous pour enregistrer les vendeurs et voir l'historique.",
  "Please sign in first.": "Veuillez d'abord vous connecter.",
  "Go to Sign in": "Aller à la connexion",
  "Create provider profile": "Créer un profil vendeur",
  "Update profile": "Modifier le profil",
  "Save profile": "Enregistrer le profil",
  "Saving...": "Enregistrement...",
  "Quotation / EBM settings": "Paramètres Devis / EBM",
  "Quotation available": "Devis disponible",
  "EBM available": "EBM disponible",
  "Save billing settings": "Enregistrer les paramètres de facturation",
  "Optional sections (you can fill later)": "Sections optionnelles (à compléter plus tard)",
  "Optional public profile": "Profil public optionnel",
  "Save optional profile": "Enregistrer le profil optionnel",
  "Create service": "Créer un service",
  "Add service": "Ajouter un service",
  "Add price card to a service": "Ajouter un tarif à un service",
  "Add price card": "Ajouter un tarif",
  "Business verification documents": "Documents de vérification de l'entreprise",
  "Start document review": "Démarrer la vérification des documents",
  "Upload document": "Téléverser le document",
  Service: "Service",
  "Request this vendor": "Demander ce vendeur",
  "Request type": "Type de demande",
  "Quotation request": "Demande de devis",
  "Purchase request": "Demande d'achat",
  "EBM request": "Demande EBM",
  "Send quotation request": "Envoyer la demande de devis",
  "Send purchase request": "Envoyer la demande d'achat",
  "Send EBM request": "Envoyer la demande EBM",
  "Payment term": "Condition de paiement",
  "Payment method": "Mode de paiement",
  Amount: "Montant",
  Vendor: "Vendeur",
  Phone: "Téléphone",
  "Not provided": "Non renseigné",
  Bank: "Banque",
  "Account name": "Nom du compte",
  "Account number": "Numéro de compte",
  "Purchase code": "Code d'achat",
  "Enter later": "Saisir plus tard",
  "Enter now": "Saisir maintenant",
  "Request details": "Détails de la demande",
  "Requested / received documents": "Documents demandés / reçus",
  Rename: "Renommer",
  Download: "Télécharger",
  Notifications: "Notifications",
  "No documents yet.": "Aucun document pour le moment.",
  "My requests": "Mes demandes",
  "Open requests": "Demandes ouvertes",
  "No requests yet.": "Aucune demande pour le moment.",
  Status: "Statut",
  Organization: "Organisation",
  "Organization name": "Nom de l'organisation",
  "Organization TIN": "TIN de l'organisation",
  "Organization TIN number": "Numéro TIN de l'organisation",
  Payment: "Paiement",
  "Payment due by": "Paiement à effectuer avant",
  Budget: "Budget",
  "Quotation required": "Devis requis",
  "EBM required": "EBM requis",
  "Submit offer": "Envoyer l'offre",
  "Upload quotation document": "Téléverser le devis",
  "Upload EBM document": "Téléverser le document EBM",
  "Uploading...": "Téléversement...",
  Offers: "Offres",
  "Accept offer": "Accepter l'offre",
  Booking: "Réservation",
  "In Progress": "En cours",
  "Mark completed": "Marquer comme terminé",
  "Submit review": "Envoyer l'avis",
  "Search vendor": "Rechercher un vendeur",
  "All categories": "Toutes les catégories",
  Filters: "Filtres",
  "Apply filters": "Appliquer les filtres",
  "No ratings yet": "Pas encore d'avis",
  reviews: "avis",
  From: "À partir de",
  "No public price card yet": "Aucun tarif public pour le moment",
  Categories: "Catégories",
  "Minimum order": "Commande minimale",
  "Custom order starts from": "Commande sur mesure à partir de",
  "View profile": "Voir le profil",
  "Services and pricing": "Services et tarifs",
  "Recent Reviews": "Avis récents",
  "No reviews yet.": "Aucun avis pour le moment.",
  "Reviewed by": "Avis de",
  "Price transparency": "Transparence des prix",
  Timeliness: "Ponctualité",
  Quality: "Qualité",
  "Chat with vendor": "Discuter avec le vendeur",
  "Messenger-style quick chat": "Chat rapide type messagerie",
  "Minimize chat": "Réduire le chat",
  Minimize: "Réduire",
  "Translating...": "Traduction...",
  "Write a message...": "Écrire un message...",
  "Attach file": "Joindre un fichier",
  Send: "Envoyer",
  Remove: "Supprimer",
  "Save as Quotation": "Enregistrer comme devis",
  "Save as EBM": "Enregistrer comme EBM",
  "(Attachment)": "(Pièce jointe)",
  Original: "Original",
  English: "Anglais",
  Korean: "Coréen",
  Kinyarwanda: "Kinyarwanda"
};

export function normalizeLocale(value: string | null | undefined): Locale {
  if (value === "ko") {
    return "ko";
  }
  if (value === "fr") {
    return "fr";
  }
  return "en";
}

export function tr(locale: Locale, english: string, korean: string, french?: string): string {
  if (locale === "ko") {
    return korean;
  }
  if (locale === "fr") {
    return french ?? FRENCH_FALLBACK_TRANSLATIONS[english] ?? english;
  }
  return english;
}

export function localizeCopy(locale: Locale, value: string | null | undefined): string {
  if (!value) {
    return "";
  }

  const parts = value.split(BILINGUAL_DELIMITER);
  if (parts.length !== 2) {
    return value;
  }

  const [english, korean] = parts.map((item) => item.trim());
  if (locale === "ko") {
    return korean || english;
  }
  return english || korean;
}
