export const TOUR_VERSION = 1;
export interface TourStep {
  id: string;
  target: string;
  title: string;
  body: string;
}
export interface TourDefinition { scope: string; steps: TourStep[] }

const step = (id: string, target: string, title: string, body: string): TourStep =>
  ({ id, target, title, body });
const navigation = step("navigation", '[data-tour="navigation"], [data-tour="mobile-menu"]', "Retrouvez vos outils", "Chaque rubrique est une page du bandeau, en haut. Sur mobile, le bouton menu ouvre les mêmes rubriques. Cette visite présente les commandes sans les activer.");
const account = step("account", '[data-tour="account"]', "Votre compte et la déconnexion", "Ouvrez ce menu pour vérifier le compte utilisé et vous déconnecter, notamment sur un ordinateur partagé.");
const help = step("help", '[data-tour="help"]', "Le guide reste à portée de main", "Vous pouvez relancer la visite de cette page à tout moment avec ce bouton. Pour commencer à utiliser les commandes, terminez ou quittez la visite.");
const clientWelcome = step("welcome", '[data-tour="client-welcome"]', "Bienvenue dans votre espace", "Une visite rapide de cette page. Vous pouvez avancer, revenir en arrière ou la quitter à tout moment.");
const clientNavigation = step("navigation", '[data-tour="navigation"], [data-tour="mobile-menu"]', "Naviguer simplement", "Accueil, comptes, messagerie et aide : chaque besoin a sa page. Sur mobile, les mêmes rubriques sont en bas de l’écran.");
const aiEntry = step("ai-entry", '[data-tour="ai-entry"]', "Ouvrir le pilotage IA", "Ce bouton ouvre les recommandations d’effectifs, le studio de dialogue simulé et la consultation qualité. Chaque écran possède sa propre visite.");

export function tourForPath(path: string): TourDefinition | null {
  const route = path.replace(/\/$/, "");
  const intro = step("welcome", ".cv-page-heading", "Bienvenue dans votre espace", "Prenons quelques instants pour découvrir les zones utiles. Vous pouvez avancer, revenir en arrière ou passer la visite à tout moment.");
  switch (route) {
    case "/advisor": return { scope: "advisor", steps: [intro, navigation,
      step("activity", ".cv-activity", "Votre activité en direct", "Vos conversations en charge, les clients qui attendent dans vos files et la file la plus chargée, mis à jour en direct."),
      step("queues", ".cv-queue-section", "Prendre un contact dans une file", "Les nombres indiquent les clients en attente par compétence. Après la visite, cliquez sur une file pour prendre le prochain contact. Une file vide ne fournit aucune conversation."),
      step("inbox", ".cv-conversation-list", "Ouvrir une conversation attribuée", "Vos contacts pris en charge apparaissent ici. Sélectionnez-en un pour afficher ses messages et son dossier client."),
      step("chat", ".cv-chat-panel .cv-chat-header, .cv-chat-empty h3", "Échanger et traiter la demande", "La conversation s’affiche au centre. Vous pouvez répondre, ouvrir un ticket, escalader ou résoudre selon son état. Une réponse IA peut aussi arriver directement dans cet échange."),
      step("customer", ".cv-customer-column > .cv-card", "Consulter le dossier client", "Les informations du client, ses comptes et ses cartes apparaissent après sélection d’une conversation. Vérifiez le dossier avant toute action bancaire."),
      account, help] };
    case "/advisor/historique": return { scope: "advisor-history", steps: [intro, navigation,
      step("history-list", '[data-tour="history-list"]', "Retrouver une conversation", "Recherchez par client, conseiller ou message. Une conversation en cours s’ouvre sur votre poste ; une conversation terminée se relit ici."),
      step("followup", ".cv-section", "Suivre les tickets", "Les tickets et gestes commerciaux qui continuent après la conversation."),
      account, help] };
    case "/advisor/clients": return { scope: "advisor-clients", steps: [intro, navigation,
      step("onboarding", '[data-tour="onboarding"]', "Ouvrir un nouveau client", "Renseignez l’identité, le profil et le compte à ouvrir. Générez un mot de passe temporaire et remettez-le au client : il pourra se connecter aussitôt."),
      step("frontdesk", "#frontdesk", "Enregistrer un contact", "Pour un client existant, choisissez-le puis orientez sa demande vers la bonne file."),
      account, help] };
    case "/advisor/outils": return { scope: "advisor-tools", steps: [intro, navigation,
      step("knowledge", "#knowledge", "Rechercher une procédure", "Saisissez quelques mots pour retrouver une procédure publiée et consulter les informations utiles à votre réponse."),
      step("incidents", "#incidents", "Vérifier les incidents de service", "Avant de diagnostiquer une difficulté, consultez les incidents nationaux et régionaux."),
      account, help] };
    case "/supervisor": return { scope: "supervisor", steps: [intro, navigation,
      step("kpi", ".cv-stat-grid", "Lire la situation en direct", "Ces indicateurs distinguent les contacts en attente, les échanges en cours et les conversations terminées aujourd’hui. Un tiret signifie qu’aucune mesure n’est disponible."),
      step("charts", '[data-tour="supervision-charts"]', "Trois graphiques en direct", "La charge de chaque file, l’état des contacts du jour et l’évolution de l’attente depuis votre arrivée. Survolez une barre ou la courbe pour lire la valeur."),
      step("workforce", "#workforce", "Demander un avis sur les effectifs", "Cliquez sur « Analyser les effectifs » après la visite pour obtenir une recommandation fondée sur l’activité. Elle ne déplace aucun conseiller automatiquement."),
      step("queues", '[data-tour="supervision-queues"]', "Repérer les files sous tension", "Comparez le nombre de contacts, les temps d’attente et le respect du délai cible pour identifier les files qui ont besoin d’attention."),
      step("alerts", "#alerts", "Suivre les alertes", "Les escalades et les alertes apparaissent ici. Ouvrir une alerte affiche la conversation sur la page Conversations."),
      account, help] };
    case "/supervisor/conversations": return { scope: "supervisor-conversations", steps: [intro, navigation,
      step("conversations", "#conversation", "Retrouver un échange", "Recherchez et filtrez les conversations, puis ouvrez leur détail. Une conversation supprimée par le client garde sa trace ici."),
      account, help] };
    case "/supervisor/suivi": return { scope: "supervisor-followup", steps: [intro, navigation,
      step("followup", ".cv-supervisor .cv-cs-reveal + .cv-cs-reveal", "Tickets et gestes commerciaux", "Changez le statut d’un ticket, ajoutez un commentaire, consultez les gestes commerciaux accordés."),
      account, help] };
    case "/supervisor/clients": return { scope: "supervisor-clients", steps: [intro, navigation,
      step("onboarding", '[data-tour="onboarding"]', "Ouvrir un nouveau client", "Le client repart avec son accès, un compte courant et une carte de débit."),
      step("frontdesk", "#frontdesk", "Enregistrer un contact", "Le contact enregistré s’ouvre ensuite dans la page Conversations."),
      account, help] };
    case "/client": return { scope: "client", steps: [clientWelcome, clientNavigation,
      step("balance", '[data-tour="client-balance"]', "Vos avoirs en un coup d’œil", "Le total de vos comptes en euros. Le détail de chaque compte et de vos opérations se trouve dans « Mes comptes »."),
      step("actions", '[data-tour="client-actions"]', "Les actions les plus utiles", "Écrivez à un conseiller, consultez vos comptes ou téléchargez un relevé en un clic."),
      step("activity", '[data-tour="client-activity"]', "Vos dernières opérations", "Les mouvements les plus récents apparaissent ici. Un paiement refusé est signalé clairement."),
      account, help] };
    case "/client/comptes": return { scope: "client-accounts", steps: [clientWelcome, clientNavigation,
      step("accounts", '[data-tour="client-accounts"]', "Vos comptes et vos cartes", "Chaque compte affiche son solde, son numéro masqué et la carte associée."),
      step("movements", '[data-tour="client-movements"]', "Vos opérations", "Filtrez par compte pour retrouver un paiement, un virement ou un prélèvement."),
      step("statement", '[data-tour="client-statement"]', "Télécharger un relevé", "Choisissez une période pour télécharger vos opérations dans un fichier compatible avec un tableur."),
      account, help] };
    case "/client/messages": return { scope: "client-messages", steps: [clientWelcome, clientNavigation,
      step("new", '[data-tour="client-new"]', "Écrire à un conseiller", "Choisissez le sujet de votre demande. Une seule conversation peut être en cours à la fois : terminez-la ou supprimez-la pour en ouvrir une nouvelle."),
      step("list", '[data-tour="client-conversations"]', "Vos conversations", "Chaque conversation indique votre conseiller et le sujet de la demande. Vous pouvez supprimer une conversation de votre espace ; la banque en conserve la trace."),
      step("chat", '[data-tour="client-chat"]', "Échanger en direct", "Les messages de votre conseiller ou de l’assistant arrivent ici en direct."),
      account, help] };
    case "/client/aide": return { scope: "client-help", steps: [clientWelcome, clientNavigation,
      step("followup", '[data-tour="client-followup"]', "Suivre vos demandes", "Retrouvez les dossiers ouverts par votre conseiller et leur avancement."),
      step("status", '[data-tour="client-status"]', "État de nos services", "Une interruption de service connue peut expliquer une difficulté avec vos opérations."),
      account, help] };
    case "/admin": return { scope: "admin", steps: [intro, navigation,
      step("tabs", '[data-tour="admin-tabs"]', "Naviguer entre les rubriques", "Les onglets donnent accès aux utilisateurs, aux procédures et à l’accueil. Certaines autres rubriques signalent qu’elles ne sont pas encore disponibles."),
      step("users", '[data-tour="admin-users"] .cv-toolbar, #admin-tab-0', "Rechercher et gérer les comptes", "Dans Utilisateurs, filtrez les comptes par rôle ou statut. Vous pouvez consulter un compte, changer son rôle ou le bloquer. Votre propre compte est protégé contre le blocage et le changement de rôle."),
      step("create-user", '[data-tour="admin-create-heading"], #admin-tab-0', "Créer un accès", "Dans Utilisateurs, renseignez l’adresse e-mail, le rôle et un mot de passe temporaire conforme aux règles affichées. Un conseiller a également besoin d’un profil et de compétences configurés."),
      step("procedures", '[data-tour="knowledge"], #admin-tab-1', "Consulter les procédures", "Ouvrez Procédures après la visite pour rechercher et lire les articles publiés. Cette rubrique ne fournit pas encore leur création ou leur modification."),
      step("frontdesk", '[data-tour="frontdesk"], #admin-tab-2', "Accueillir une demande client", "Dans Accueil, choisissez un client dans la liste ou recherchez son nom, puis enregistrez son contact. La liste permet aussi de choisir une conversation par client, message ou statut."),
      aiEntry, account, help] };
    case "/supervisor/twin": return { scope: "supervisor-twin", steps: [intro, navigation,
      step("twin-setup", '[data-tour="twin-setup"]', "Comparer les stratégies", "Choisissez une journée et une graine, puis lancez les trois stratégies. Une même graine permet de comparer les mêmes arrivées de clients."),
      step("twin-results", '[data-tour="twin-results"]', "Lire les résultats ensemble", "Comparez le SLA, les abandons et les temps d’attente. Une amélioration du SLA peut s’accompagner de davantage d’abandons. La table présente les moyennes par stratégie."),
      step("dialogue", '[data-tour="simulation-setup"]', "Simuler un dialogue", "Cette simulation distincte fait discuter un client et le conseiller IA. Elle nécessite les modèles configurés ; le jumeau numérique fonctionne sans clé LLM."),
      account, help] };
    case "/supervisor/ai":
    case "/admin/ai": return { scope: route.slice(1).replace("/", "-"), steps: [intro,
      step("workforce", "#workforce", "Analyser les effectifs réels", "Le bouton d’analyse demande une recommandation à partir des files et capacités actuelles. Lisez les données et les limites affichées avant de décider ; aucune affectation n’est appliquée."),
      step("scenario", '[data-tour="scenario-create"]', "Préparer un scénario nommé", "Si aucun scénario n’existe, ouvrez cette rubrique pour en créer un. Donnez-lui un nom qui décrit votre essai, par exemple « Carte perdue — client calme »."),
      step("setup", '[data-tour="simulation-setup"] .cv-label', "Choisir le scénario", "Sélectionnez votre scénario, puis une stratégie. Ces choix identifient le dialogue ; cet écran ne compare pas les performances de répartition des effectifs."),
      step("objective", '[data-tour="simulation-setup"] textarea', "Donner un objectif au client simulé", "Décrivez sa demande, par exemple « Comprendre un prélèvement inconnu ». En dessous, choisissez le profil du client, sa patience et le maximum de tours."),
      step("launch", '[data-tour="simulation-setup"] button', "Lancer votre dialogue", "Après la visite, lancez l’essai. Chaque combinaison scénario, stratégie et graine doit être unique. Une nouvelle graine est proposée après le lancement. La visite n’active pas ce bouton."),
      step("tracking", '[data-tour="simulation-tracking"]', "Observer le dialogue des agents", "Sélectionnez un run récent pour lire les échanges client simulé–conseiller IA. Le suivi s’actualise pendant l’exécution et s’arrête au résultat final. Une erreur peut signaler un modèle indisponible."),
      step("quality", '[data-tour="quality-lookup"]', "Retrouver une évaluation qualité", "Choisissez une conversation résolue dans la liste. Les notes enregistrées apparaissent ici ; l’absence de résultat signifie qu’aucune évaluation n’est encore disponible, pas une note de zéro."),
      step("return", '[data-tour="ai-return"]', "Revenir à votre espace principal", "Utilisez ce lien pour retrouver la supervision ou l’administration. Les dialogues simulés restent séparés des conversations live."),
      help] };
    case "/advisor/ai": return { scope: "advisor-lab", steps: [
      step("lab", "#ai-lab", "Découvrir le laboratoire local", "Cet espace sert aux essais manuels. Il n’envoie pas automatiquement les réponses au client et ne remplace pas le traitement des conversations de votre poste conseiller."),
      step("health", '[data-tour="lab-health"]', "Vérifier la disponibilité", "Commencez par vérifier le service. Si le laboratoire est désactivé ou inaccessible, sa configuration locale doit être activée avant un essai."),
      step("form", '[data-tour="lab-form"]', "Choisir un essai", "Choisissez une suggestion ou un premier message simulé, puis renseignez la conversation autorisée ou l’objectif. Le résultat s’affichera sous le formulaire."),
      step("return", '[data-tour="ai-return"]', "Retrouver le poste conseiller", "Ce lien vous ramène aux files et aux conversations réelles."), help] };
    default: return null;
  }
}

type TourUser = { userId?: string; email?: string; role?: string };
export function tourStorageKey(user: TourUser | null, scope: string): string | null {
  const identity = user?.userId || user?.email;
  if (!identity || !user?.role) return null;
  return `callverse:tour:v${TOUR_VERSION}:${encodeURIComponent(identity)}:${user.role}:${scope}`;
}
type TourStorage = { getItem(key: string): string | null; setItem(key: string, value: string): void };
const seenInMemory = new Set<string>();
export function hasSeenTour(storage: TourStorage | null, key: string): boolean {
  if (seenInMemory.has(key)) return true;
  try { return storage?.getItem(key) === "seen"; } catch { return false; }
}
export function markTourSeen(storage: TourStorage | null, key: string): void {
  seenInMemory.add(key);
  try { storage?.setItem(key, "seen"); } catch { /* Private browsing may block storage. */ }
}

export interface TourRect { x: number; y: number; width: number; height: number }
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(value, Math.max(low, high)));
export function tourLayout(rect: TourRect | null, viewport: { width: number; height: number }, card: { width: number; height: number }) {
  const margin = 12, gap = 18;
  const width = Math.min(card.width, Math.max(1, viewport.width - margin * 2));
  const height = Math.min(card.height, Math.max(1, viewport.height - margin * 2));
  let x = (viewport.width - width) / 2, y = (viewport.height - height) / 2;
  if (rect) {
    x = rect.x + rect.width / 2 - width / 2;
    if (rect.y + rect.height + gap + height <= viewport.height - margin) y = rect.y + rect.height + gap;
    else if (rect.y - gap - height >= margin) y = rect.y - gap - height;
    else if (rect.x + rect.width + gap + width <= viewport.width - margin) { x = rect.x + rect.width + gap; y = rect.y; }
    else if (rect.x - gap - width >= margin) { x = rect.x - gap - width; y = rect.y; }
    else y = viewport.height - height - margin;
  }
  return { x: clamp(x, margin, viewport.width - width - margin), y: clamp(y, margin, viewport.height - height - margin), width };
}
