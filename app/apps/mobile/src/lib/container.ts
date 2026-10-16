// Composition root — singleton instances of all chat use cases bound to Supabase adapters.
// Screens import the use cases from here, not from @kc/application directly.
// Mapped to SRS: FR-CHAT-001..013, FR-POST-010, FR-POST-014 AC4, FR-POST-015 AC1, FR-MOD-001, FR-MOD-007, FR-ADMIN-009.
import { Platform } from 'react-native';
import { createAuthSecureStorage } from '../services/authSecureStorage';
import {
  getSupabaseClient,
  SupabaseUserRepository,
  SupabaseChatRepository,
  SupabaseChatRealtime,
  SupabaseReportRepository,
  SupabaseDonationLinksRepository,
  SupabasePostRepository,
  SupabasePostEngagementRepository,
  SupabaseNotificationInboxRepository,
  SupabaseChatV2Realtime,
  SupabaseModerationAdminRepository,
  SupabaseAccountGateRepository,
  SupabaseDeviceRepository,
  SupabaseAdminRoleRepository,
  SupabaseAdminTaskRepository,
  SupabaseOrgHierarchyRepository,
  SupabaseOrgApplicationsRepository,
  SupabaseAdminContentRepository,
  SupabaseTimesheetsRepository,
  SupabaseFinanceLedgerRepository,
  SupabaseCrmContactsRepository,
  SupabaseReportsRepository,
  SupabaseSurveyRepository,
  SupabaseSurveyAdminRepository,
  SupabasePublicResearchRepository,
  type SupabaseAuthStorage,
} from '@kc/infrastructure-supabase';
import {
  CheckAccountGateUseCase,
  ListChatsUseCase,
  OpenOrCreateChatUseCase,
  HideChatFromInboxUseCase,
  SendMessageUseCase,
  MarkChatReadUseCase,
  GetUnreadTotalUseCase,
  GetSupportThreadUseCase,
  SubmitSupportIssueUseCase,
  ReportChatUseCase,
  ReportPostUseCase,
  DeletePostUseCase,
  AdminRemovePostUseCase,
  ListDonationLinksUseCase,
  AddDonationLinkUseCase,
  RemoveDonationLinkUseCase,
  ReportDonationLinkUseCase,
  UpdateDonationLinkUseCase,
  RestoreTargetUseCase,
  DismissReportUseCase,
  ConfirmReportUseCase,
  BanUserUseCase,
  DeleteMessageUseCase,
  LookupAuditUseCase,
  ReportUserUseCase,
  UpdateNotificationPreferencesUseCase,
  GetMyAdminRolesUseCase,
  GrantAdminRoleUseCase,
  RevokeAdminRoleUseCase,
  ListAdminsUseCase,
  GetOrgTreeUseCase,
  SetManagerUseCase,
  ListAdminTasksUseCase,
  GetAdminTaskDetailUseCase,
  CreateAdminTaskUseCase,
  UpdateAdminTaskUseCase,
  SetAdminTaskStatusUseCase,
  AssignAdminTaskUseCase,
  AddAdminTaskCommentUseCase,
  DeleteAdminTaskUseCase,
  ListOrgApplicationsUseCase,
  DecideOrgApplicationUseCase,
  AdminSearchUsersUseCase,
  AdminSearchPostsUseCase,
  AdminSearchAuditUseCase,
  ListTimesheetsUseCase,
  UpsertTimesheetUseCase,
  SubmitTimesheetUseCase,
  ApproveTimesheetUseCase,
  RejectTimesheetUseCase,
  DeleteTimesheetUseCase,
  ListFinanceLedgerUseCase,
  GetFinanceSummaryUseCase,
  UpsertFinanceEntryUseCase,
  DeleteFinanceEntryUseCase,
  ListCrmContactsUseCase,
  UpsertCrmContactUseCase,
  DeleteCrmContactUseCase,
  MarkCrmContactContactedUseCase,
  ListOpenReportsUseCase,
  GetReportCaseDetailUseCase,
  ListActiveSurveysUseCase,
  LoadSurveyBundleUseCase,
  SaveSurveyAnswersUseCase,
  CheckSurveyPromptUseCase,
  SubmitFreeFeedbackUseCase,
  GetAdminSurveyOverviewUseCase,
  GetAdminSurveyResultsUseCase,
  ListUserFeedbackUseCase,
  LoadPublicResearchBundleUseCase,
  SubmitPublicResearchResponseUseCase,
} from '@kc/application';

/**
 * Web localStorage exposes async-compatible sync methods; native routes
 * through SecureStore per TD-101 (BACKLOG P2.14). See
 * `apps/mobile/src/services/authComposition.ts:pickStorage` for the full
 * rationale. The Supabase client is a singleton so this duplicate exists
 * for loader-order independence only.
 */
function pickStorage(): SupabaseAuthStorage | undefined {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined' || !window.localStorage) return undefined;
    return window.localStorage;
  }
  return createAuthSecureStorage();
}

export const supabase = getSupabaseClient({ storage: pickStorage() });

const userRepo = new SupabaseUserRepository(supabase);
const chatRepo = new SupabaseChatRepository(supabase);
const chatRealtime = new SupabaseChatRealtime(supabase);
const reportRepo = new SupabaseReportRepository(supabase);
const donationLinksRepo = new SupabaseDonationLinksRepository(supabase);
const postRepo = new SupabasePostRepository(supabase);
const postEngagementRepo = new SupabasePostEngagementRepository(supabase);
const notificationInboxRepo = new SupabaseNotificationInboxRepository(supabase);
const chatV2Realtime = new SupabaseChatV2Realtime(supabase);
const moderationAdminRepo = new SupabaseModerationAdminRepository(supabase);
const accountGateRepo = new SupabaseAccountGateRepository(supabase);
const deviceRepo = new SupabaseDeviceRepository(supabase);
const adminRoleRepo = new SupabaseAdminRoleRepository(supabase);
const adminTaskRepo = new SupabaseAdminTaskRepository(supabase);
const orgHierarchyRepo = new SupabaseOrgHierarchyRepository(supabase);
const adminContentRepo = new SupabaseAdminContentRepository(supabase);
const timesheetsRepo = new SupabaseTimesheetsRepository(supabase);
const financeLedgerRepo = new SupabaseFinanceLedgerRepository(supabase);
const crmContactsRepo = new SupabaseCrmContactsRepository(supabase);
const orgApplicationsRepo = new SupabaseOrgApplicationsRepository(supabase);
const reportsRepo = new SupabaseReportsRepository(supabase);
const surveyRepo = new SupabaseSurveyRepository(supabase);
const surveyAdminRepo = new SupabaseSurveyAdminRepository(supabase);
const publicResearchRepo = new SupabasePublicResearchRepository(supabase);

const hideChatFromInbox = new HideChatFromInboxUseCase(chatRepo);
const getMyAdminRoles = new GetMyAdminRolesUseCase(adminRoleRepo);
const listOpenReports = new ListOpenReportsUseCase(reportsRepo);
const getReportCaseDetail = new GetReportCaseDetailUseCase(reportsRepo);

export const container = {
  // Repos / realtime — exposed for chatStore subscription wiring.
  userRepo,
  chatRepo,
  chatRealtime,
  chatV2Realtime,
  postEngagement: postEngagementRepo,
  notificationInbox: notificationInboxRepo,
  moderationAdminRepo, // exposed for hooks that need adminRepo.isUserAdmin pre-checks
  deviceRepo,
  adminRoleRepo,
  reportsRepo,

  // Admin portal (FR-ADMIN-011..018)
  getMyAdminRoles,
  listOpenReports,
  getReportCaseDetail,
  listAdmins: new ListAdminsUseCase(adminRoleRepo),
  grantAdminRole: new GrantAdminRoleUseCase(adminRoleRepo),
  revokeAdminRole: new RevokeAdminRoleUseCase(adminRoleRepo),
  getOrgTree: new GetOrgTreeUseCase(orgHierarchyRepo),
  setManager: new SetManagerUseCase(orgHierarchyRepo, adminRoleRepo),
  listAdminTasks: new ListAdminTasksUseCase(adminTaskRepo),
  getAdminTaskDetail: new GetAdminTaskDetailUseCase(adminTaskRepo),
  createAdminTask: new CreateAdminTaskUseCase(adminTaskRepo),
  updateAdminTask: new UpdateAdminTaskUseCase(adminTaskRepo),
  setAdminTaskStatus: new SetAdminTaskStatusUseCase(adminTaskRepo),
  assignAdminTask: new AssignAdminTaskUseCase(adminTaskRepo),
  addAdminTaskComment: new AddAdminTaskCommentUseCase(adminTaskRepo),
  deleteAdminTask: new DeleteAdminTaskUseCase(adminTaskRepo),
  adminSearchUsers: new AdminSearchUsersUseCase(adminContentRepo),
  adminSearchPosts: new AdminSearchPostsUseCase(adminContentRepo),
  adminSearchAudit: new AdminSearchAuditUseCase(adminContentRepo),
  // V2-ADMIN-TIME-10
  listTimesheets:   new ListTimesheetsUseCase(timesheetsRepo),
  upsertTimesheet:  new UpsertTimesheetUseCase(timesheetsRepo),
  submitTimesheet:  new SubmitTimesheetUseCase(timesheetsRepo),
  approveTimesheet: new ApproveTimesheetUseCase(timesheetsRepo),
  rejectTimesheet:  new RejectTimesheetUseCase(timesheetsRepo),
  deleteTimesheet:  new DeleteTimesheetUseCase(timesheetsRepo),
  // V2-ADMIN-MONEY-9
  listFinanceLedger:   new ListFinanceLedgerUseCase(financeLedgerRepo),
  getFinanceSummary:   new GetFinanceSummaryUseCase(financeLedgerRepo),
  upsertFinanceEntry:  new UpsertFinanceEntryUseCase(financeLedgerRepo),
  deleteFinanceEntry:  new DeleteFinanceEntryUseCase(financeLedgerRepo),
  // V2-ADMIN-CRM-8
  listCrmContacts: new ListCrmContactsUseCase(crmContactsRepo),
  upsertCrmContact: new UpsertCrmContactUseCase(crmContactsRepo),
  deleteCrmContact: new DeleteCrmContactUseCase(crmContactsRepo),
  markCrmContactContacted: new MarkCrmContactContactedUseCase(crmContactsRepo),
  // V2-ADMIN-ORG-7
  listOrgApplications: new ListOrgApplicationsUseCase(orgApplicationsRepo),
  decideOrgApplication: new DecideOrgApplicationUseCase(orgApplicationsRepo),

  // Notification preferences
  updateNotificationPreferences: new UpdateNotificationPreferencesUseCase(userRepo),

  // Chat use cases
  listChats: new ListChatsUseCase(chatRepo),
  openOrCreateChat: new OpenOrCreateChatUseCase(chatRepo),
  hideChatFromInbox,
  sendMessage: new SendMessageUseCase(chatRepo),
  markChatRead: new MarkChatReadUseCase(chatRepo),
  getUnreadTotal: new GetUnreadTotalUseCase(chatRepo),
  getSupportThread: new GetSupportThreadUseCase(chatRepo),
  submitSupportIssue: new SubmitSupportIssueUseCase(chatRepo),

  // Reports
  reportChat: new ReportChatUseCase(reportRepo),
  reportPost: new ReportPostUseCase(reportRepo),

  // Post moderation
  deletePost: new DeletePostUseCase(postRepo),
  adminRemovePost: new AdminRemovePostUseCase(postRepo),

  // Moderation admin actions (FR-MOD-007 + FR-ADMIN-002..007)
  restoreTarget: new RestoreTargetUseCase(moderationAdminRepo),
  dismissReport: new DismissReportUseCase(moderationAdminRepo),
  confirmReport: new ConfirmReportUseCase(moderationAdminRepo),
  banUser: new BanUserUseCase(moderationAdminRepo),
  deleteMessage: new DeleteMessageUseCase(moderationAdminRepo),
  lookupAudit: new LookupAuditUseCase(moderationAdminRepo),
  reportUser: new ReportUserUseCase(reportRepo),

  // FR-MOD-010 — sign-in + mid-session account gate.
  checkAccountGate: new CheckAccountGateUseCase(accountGateRepo),

  // Donation links
  listDonationLinks: new ListDonationLinksUseCase(donationLinksRepo),
  addDonationLink: new AddDonationLinkUseCase(donationLinksRepo),
  updateDonationLink: new UpdateDonationLinkUseCase(donationLinksRepo),
  removeDonationLink: new RemoveDonationLinkUseCase(donationLinksRepo),
  reportDonationLink: new ReportDonationLinkUseCase(donationLinksRepo),

  // Surveys + free feedback (FR-SETTINGS-015..017)
  surveyRepo,
  listActiveSurveys: new ListActiveSurveysUseCase(surveyRepo),
  loadSurveyBundle: new LoadSurveyBundleUseCase(surveyRepo),
  saveSurveyAnswers: new SaveSurveyAnswersUseCase(surveyRepo),
  checkSurveyPrompt: new CheckSurveyPromptUseCase(surveyRepo),
  submitFreeFeedback: new SubmitFreeFeedbackUseCase(surveyRepo),

  // Admin survey dashboard (FR-ADMIN-021)
  getAdminSurveyOverview: new GetAdminSurveyOverviewUseCase(surveyAdminRepo),
  getAdminSurveyResults: new GetAdminSurveyResultsUseCase(surveyAdminRepo),
  listUserFeedback: new ListUserFeedbackUseCase(surveyAdminRepo),

  // Public research — Survey B (FR-RESEARCH-001..003)
  publicResearchRepo,
  loadPublicResearchBundle: new LoadPublicResearchBundleUseCase(publicResearchRepo),
  submitPublicResearchResponse: new SubmitPublicResearchResponseUseCase(publicResearchRepo),
} as const;
