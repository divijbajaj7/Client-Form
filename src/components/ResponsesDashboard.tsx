import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  AlertCircle,
  Check,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  LogOut,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import {
  ADMIN_EMAIL,
  db,
  googleSignIn,
  handleFirestoreError,
  initAuth,
  logout,
  OperationType,
} from '../lib/firebase';
import {
  createDedicatedSpreadsheet,
  DriveSpreadsheetFile,
  exportResponsesAsCsv,
  listAppSpreadsheets,
  syncResponsesToSpreadsheet,
} from '../lib/googleSheets';
import {
  ConsultationInquiry,
  Q10_CORRECT_OPTION,
  SpreadsheetSettings,
  SurveyResponseRecord,
} from '../types/survey';

interface ResponsesDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSurvey: () => void;
}

type ActiveTab = 'responses' | 'consultations';

interface ConfirmSyncState {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

export function ResponsesDashboard({
  isOpen,
  onClose,
  onOpenSurvey,
}: ResponsesDashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [responses, setResponses] = useState<SurveyResponseRecord[]>([]);
  const [consultations, setConsultations] = useState<ConsultationInquiry[]>([]);
  const [sheetSettings, setSheetSettings] = useState<SpreadsheetSettings | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('responses');
  const [teamFilter, setTeamFilter] = useState<string>('All');
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponseRecord | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmSyncState | null>(null);

  useEffect(() => {
    const unsub = initAuth((nextUser, nextToken) => {
      setUser(nextUser);
      setAccessToken(nextToken);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const isAuthorizedAdmin =
    Boolean(user?.emailVerified) &&
    user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    if (!isOpen || !authReady || !user || !isAuthorizedAdmin) return;

    const responsesQuery = query(
      collection(db, 'survey_responses'),
      orderBy('createdAt', 'desc')
    );
    const unsubResponses = onSnapshot(
      responsesQuery,
      (snapshot) => {
        const rows: SurveyResponseRecord[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            q1Team: data.q1Team || '',
            q1TeamOther: data.q1TeamOther || '',
            q2Role: data.q2Role || '',
            q3Frequency: data.q3Frequency || '',
            q4Tools: Array.isArray(data.q4Tools) ? data.q4Tools : [],
            q4ToolsOther: data.q4ToolsOther || '',
            q5Accounts: data.q5Accounts || '',
            q6UseCases: Array.isArray(data.q6UseCases) ? data.q6UseCases : [],
            q6UseCasesOther: data.q6UseCasesOther || '',
            q7HelpfulTask: data.q7HelpfulTask || '',
            q8Confidence: typeof data.q8Confidence === 'number' ? data.q8Confidence : 0,
            q9Techniques: Array.isArray(data.q9Techniques) ? data.q9Techniques : [],
            q10MarketShareQuestion: data.q10MarketShareQuestion || '',
            q11OutputChecks: Array.isArray(data.q11OutputChecks) ? data.q11OutputChecks : [],
            q11OutputChecksOther: data.q11OutputChecksOther || '',
            q12Blockers: Array.isArray(data.q12Blockers) ? data.q12Blockers : [],
            q12BlockersOther: data.q12BlockersOther || '',
            q13RepetitiveTask: data.q13RepetitiveTask || '',
            q14WorkshopGoals: Array.isArray(data.q14WorkshopGoals) ? data.q14WorkshopGoals : [],
            q14WorkshopGoalsOther: data.q14WorkshopGoalsOther || '',
            source: data.source || 'landing_modal',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
          };
        });
        setResponses(rows);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'survey_responses');
      }
    );

    const consultQuery = query(
      collection(db, 'consultation_requests'),
      orderBy('createdAt', 'desc')
    );
    const unsubConsult = onSnapshot(
      consultQuery,
      (snapshot) => {
        const items: ConsultationInquiry[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            fullName: data.fullName || '',
            workEmail: data.workEmail || '',
            company: data.company || '',
            teamSize: data.teamSize || '',
            painPoints: data.painPoints || '',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
          };
        });
        setConsultations(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'consultation_requests');
      }
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'spreadsheet'),
      (docSnap) => {
        if (!docSnap.exists()) {
          setSheetSettings(null);
          return;
        }
        const data = docSnap.data();
        setSheetSettings({
          spreadsheetId: data.spreadsheetId,
          spreadsheetTitle: data.spreadsheetTitle,
          spreadsheetUrl: data.spreadsheetUrl,
          syncedCount: data.syncedCount ?? 0,
          updatedBy: data.updatedBy || '',
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/spreadsheet');
      }
    );

    return () => {
      unsubResponses();
      unsubConsult();
      unsubSettings();
    };
  }, [isOpen, authReady, user, isAuthorizedAdmin]);

  const metrics = useMemo(() => {
    if (responses.length === 0) {
      return {
        total: 0,
        avgConfidence: '0.0',
        llmLiteracyRate: '0%',
        topBlocker: 'No submissions yet',
      };
    }

    const totalConfidence = responses.reduce((sum, item) => sum + (item.q8Confidence || 0), 0);
    const groundedCount = responses.filter(
      (item) => item.q10MarketShareQuestion === Q10_CORRECT_OPTION
    ).length;

    const blockerCounts = new Map<string, number>();
    for (const item of responses) {
      for (const blocker of item.q12Blockers) {
        blockerCounts.set(blocker, (blockerCounts.get(blocker) || 0) + 1);
      }
    }
    const sortedBlockers = Array.from(blockerCounts.entries()).sort((a, b) => b[1] - a[1]);

    return {
      total: responses.length,
      avgConfidence: (totalConfidence / responses.length).toFixed(1),
      llmLiteracyRate: `${Math.round((groundedCount / responses.length) * 100)}%`,
      topBlocker: sortedBlockers[0]?.[0] || '—',
    };
  }, [responses]);

  const filteredResponses = useMemo(() => {
    if (teamFilter === 'All') return responses;
    return responses.filter((item) => item.q1Team === teamFilter);
  }, [responses, teamFilter]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
      }
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Unable to complete Google sign-in.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLoadDriveSheets = async () => {
    if (!accessToken) {
      await handleGoogleSignIn();
      return;
    }
    setSyncError(null);
    try {
      const files = await listAppSpreadsheets(accessToken);
      setDriveFiles(files);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Failed to list Drive spreadsheets.');
    }
  };

  const persistSpreadsheetMetadata = async (meta: {
    spreadsheetId: string;
    spreadsheetTitle: string;
    spreadsheetUrl: string;
    syncedCount: number;
  }) => {
    try {
      await setDoc(doc(db, 'settings', 'spreadsheet'), {
        spreadsheetId: meta.spreadsheetId.slice(0, 200),
        spreadsheetTitle: meta.spreadsheetTitle.slice(0, 200),
        spreadsheetUrl: meta.spreadsheetUrl.slice(0, 500),
        syncedCount: meta.syncedCount,
        updatedBy: (user?.email || ADMIN_EMAIL).slice(0, 160),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/spreadsheet');
    }
  };

  const handleCreateDedicatedSheet = async () => {
    if (!accessToken) {
      await handleGoogleSignIn();
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    setSyncMessage(null);
    try {
      const result = await createDedicatedSpreadsheet(
        accessToken,
        'AI at Work: Where Are We Today? — Survey Responses',
        responses
      );
      await persistSpreadsheetMetadata(result);
      setSyncMessage(
        `Created "${result.spreadsheetTitle}" in your Google Drive with ${result.syncedCount} response(s).`
      );
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : 'Failed to create Google Spreadsheet.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const requestSyncExistingSheet = (targetSpreadsheetId: string, targetTitle: string) => {
    if (!accessToken) {
      handleGoogleSignIn();
      return;
    }
    setConfirmDialog({
      title: `Sync ${responses.length} response(s) to Google Sheets?`,
      description: `This will update the contents of "${targetTitle}" in your Google Drive with all ${responses.length} current survey responses.`,
      confirmLabel: 'Sync to Google Sheet',
      onConfirm: async () => {
        setIsSyncing(true);
        setSyncError(null);
        setSyncMessage(null);
        try {
          const result = await syncResponsesToSpreadsheet(
            accessToken,
            targetSpreadsheetId,
            responses
          );
          await persistSpreadsheetMetadata(result);
          setSyncMessage(
            `Synced ${result.syncedCount} response(s) to "${result.spreadsheetTitle}".`
          );
          setDriveFiles([]);
        } catch (error) {
          setSyncError(
            error instanceof Error ? error.message : 'Failed to sync spreadsheet rows.'
          );
        } finally {
          setIsSyncing(false);
        }
      },
    });
  };

  const requestDeleteResponse = (record: SurveyResponseRecord) => {
    setConfirmDialog({
      title: 'Delete survey response?',
      description: `Remove response ${record.id} (${record.q1Team} · ${record.q2Role}) from Firestore? This cannot be undone.`,
      confirmLabel: 'Delete Response',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'survey_responses', record.id));
          if (selectedResponse?.id === record.id) {
            setSelectedResponse(null);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `survey_responses/${record.id}`);
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs p-3 sm:p-6">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-[#0B1120] px-6 py-4 text-white">
          <div>
            <h2 className="font-display text-lg font-semibold">
              Workshop Responses & Google Sheets Sync
            </h2>
            <p className="text-xs text-slate-400">
              Organize submissions in Firestore and synchronize directly to Google Sheets in your Google Drive.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
                <span>{user.email}</span>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close responses workspace"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Auth Gate */}
        {!user || !isAuthorizedAdmin ? (
          <div className="px-6 py-16 text-center max-w-lg mx-auto">
            <FileSpreadsheet className="mx-auto h-10 w-10 text-[#1D4ED8]" aria-hidden="true" />
            <h3 className="mt-4 font-display text-xl font-semibold text-slate-900">
              Sign in to view responses & connect Google Drive
            </h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Survey participants can submit answers without signing in. Sign in with your
              organizer Google account ({ADMIN_EMAIL}) to inspect responses and save them to a
              dedicated Google Spreadsheet.
            </p>

            {user && !isAuthorizedAdmin && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Signed in as {user.email}. Only the authorized organizer account ({ADMIN_EMAIL})
                can read survey responses.
              </div>
            )}

            {authError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {authError}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoggingIn}
                className="gsi-material-button"
              >
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                  </div>
                  <span>{isLoggingIn ? 'Connecting...' : 'Sign in with Google'}</span>
                </div>
              </button>

              {user && (
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Switch Account
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {/* Google Sheets & Drive Sync Control Strip */}
            <div className="bg-slate-50 px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FileSpreadsheet className="h-4 w-4 text-[#1D4ED8] shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {sheetSettings
                      ? `Connected Sheet: ${sheetSettings.spreadsheetTitle}`
                      : 'No Google Spreadsheet linked yet'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {sheetSettings
                    ? `Last synced ${sheetSettings.syncedCount} rows${
                        sheetSettings.updatedAt
                          ? ` on ${sheetSettings.updatedAt.toLocaleString()}`
                          : ''
                      }`
                    : 'Create a dedicated Google Sheet in your Google Drive or connect an existing one.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {!accessToken ? (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="gsi-material-button"
                  >
                    <div className="gsi-material-button-content-wrapper">
                      <span>Authorize Google Drive & Sheets Session</span>
                    </div>
                  </button>
                ) : (
                  <>
                    {sheetSettings ? (
                      <>
                        <a
                          href={sheetSettings.spreadsheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
                        >
                          <span>Open in Google Sheets</span>
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                        <button
                          type="button"
                          disabled={isSyncing}
                          onClick={() =>
                            requestSyncExistingSheet(
                              sheetSettings.spreadsheetId,
                              sheetSettings.spreadsheetTitle
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-60 whitespace-nowrap cursor-pointer"
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                            aria-hidden="true"
                          />
                          <span>{isSyncing ? 'Syncing...' : 'Sync Responses to Sheet'}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={isSyncing}
                        onClick={handleCreateDedicatedSheet}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-60 whitespace-nowrap cursor-pointer"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {isSyncing
                            ? 'Creating Sheet...'
                            : 'Create Dedicated Google Sheet in Drive'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleLoadDriveSheets}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap cursor-pointer"
                    >
                      <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Link Existing Sheet</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => exportResponsesAsCsv(responses)}
                  disabled={responses.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Drive File Picker List */}
            {driveFiles.length > 0 && (
              <div className="bg-blue-50/50 px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-800">
                    Select a spreadsheet from your Google Drive to link and sync:
                  </p>
                  <button
                    type="button"
                    onClick={() => setDriveFiles([])}
                    className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {driveFiles.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => requestSyncExistingSheet(file.id, file.name)}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs hover:border-[#1D4ED8] cursor-pointer"
                    >
                      <span className="truncate font-medium text-slate-800">{file.name}</span>
                      <span className="text-[#1D4ED8] shrink-0">Sync</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(syncMessage || syncError) && (
              <div
                className={`px-6 py-3 text-xs flex items-center gap-2 ${
                  syncError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'
                }`}
              >
                {syncError ? (
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                <span>{syncError || syncMessage}</span>
              </div>
            )}

            {/* Metrics Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 bg-white">
              <div className="px-6 py-4">
                <p className="text-xs text-slate-500">Total Survey Responses</p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                  {metrics.total}
                </p>
              </div>
              <div className="px-6 py-4">
                <p className="text-xs text-slate-500">Mean Prompt Confidence</p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                  {metrics.avgConfidence} / 5.0
                </p>
              </div>
              <div className="px-6 py-4">
                <p className="text-xs text-slate-500">LLM Grounding Literacy (Q10)</p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                  {metrics.llmLiteracyRate}
                </p>
              </div>
              <div className="px-6 py-4">
                <p className="text-xs text-slate-500">Primary Team Blocker</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 truncate">
                  {metrics.topBlocker}
                </p>
              </div>
            </div>

            {/* Tabs & Team Filter */}
            <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('responses')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'responses'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Survey Responses ({responses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('consultations')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === 'consultations'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  B2B Discovery Inquiries ({consultations.length})
                </button>
              </div>

              {activeTab === 'responses' && (
                <div className="flex items-center gap-2">
                  <label htmlFor="team-filter" className="text-xs text-slate-500">
                    Filter team:
                  </label>
                  <select
                    id="team-filter"
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                  >
                    <option value="All">All Teams</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Customer success">Customer success</option>
                    <option value="Leadership">Leadership</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              )}
            </div>

            {/* Table Content */}
            {activeTab === 'responses' ? (
              <div className="overflow-x-auto">
                {filteredResponses.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-600">
                      No survey responses recorded yet. Share the form link or submit a test entry.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSurvey();
                      }}
                      className="mt-4 inline-flex items-center rounded-lg bg-[#0B1120] px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                    >
                      Open Survey Form
                    </button>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                        <th className="py-3 px-4">Submitted</th>
                        <th className="py-3 px-4">Team</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Usage</th>
                        <th className="py-3 px-4">Confidence</th>
                        <th className="py-3 px-4">Q10 Grounding</th>
                        <th className="py-3 px-4">Top Blockers</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {filteredResponses.map((row) => {
                        const accurate = row.q10MarketShareQuestion === Q10_CORRECT_OPTION;
                        return (
                          <tr
                            key={row.id}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap text-slate-500">
                              {row.createdAt
                                ? row.createdAt.toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })
                                : 'Pending'}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                              {row.q1Team === 'Other' && row.q1TeamOther
                                ? `Other: ${row.q1TeamOther}`
                                : row.q1Team}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">{row.q2Role}</td>
                            <td className="py-3 px-4 whitespace-nowrap">{row.q3Frequency}</td>
                            <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                              {row.q8Confidence}/5
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={
                                  accurate
                                    ? 'font-medium text-emerald-700'
                                    : 'font-medium text-amber-700'
                                }
                              >
                                {accurate ? 'Grounded' : 'Needs Clarity'}
                              </span>
                            </td>
                            <td className="py-3 px-4 max-w-xs truncate">
                              {row.q12Blockers.join(' · ')}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                              <button
                                type="button"
                                onClick={() => setSelectedResponse(row)}
                                className="font-medium text-[#1D4ED8] hover:underline cursor-pointer"
                              >
                                Inspect
                              </button>
                              <button
                                type="button"
                                onClick={() => requestDeleteResponse(row)}
                                aria-label={`Delete response ${row.id}`}
                                className="inline-flex items-center text-slate-400 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {consultations.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-slate-500">
                    No B2B consultation inquiries submitted yet.
                  </div>
                ) : (
                  consultations.map((item) => (
                    <div key={item.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.company} — {item.fullName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.workEmail} · Team size: {item.teamSize}
                        </p>
                        <p className="mt-2 text-sm text-slate-700 max-w-3xl">{item.painPoints}</p>
                      </div>
                      <span className="font-mono text-xs tabular-nums text-slate-400 shrink-0">
                        {item.createdAt ? item.createdAt.toLocaleDateString() : ''}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Response Detail Inspector Modal */}
      {selectedResponse && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  {selectedResponse.q1Team} · {selectedResponse.q2Role}
                </h3>
                <p className="font-mono text-xs text-slate-500 tabular-nums mt-0.5">
                  ID: {selectedResponse.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResponse(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-slate-500">3. Frequency</dt>
                <dd className="text-slate-900 mt-0.5">{selectedResponse.q3Frequency}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">4. AI Tools Used</dt>
                <dd className="text-slate-900 mt-0.5">{selectedResponse.q4Tools.join(', ')}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">5. Account Governance</dt>
                <dd className="text-slate-900 mt-0.5">{selectedResponse.q5Accounts}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">6. Work Use Cases</dt>
                <dd className="text-slate-900 mt-0.5">{selectedResponse.q6UseCases.join(', ')}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">
                  7. Task Where AI Helped & Time Saved
                </dt>
                <dd className="text-slate-900 mt-0.5 whitespace-pre-wrap">
                  {selectedResponse.q7HelpfulTask || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">8. Prompt Confidence</dt>
                <dd className="font-mono text-slate-900 mt-0.5 tabular-nums">
                  {selectedResponse.q8Confidence} / 5
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">9. Techniques Used</dt>
                <dd className="text-slate-900 mt-0.5">{selectedResponse.q9Techniques.join(', ')}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">
                  10. Competitor Market Share Question
                </dt>
                <dd className="text-slate-900 mt-0.5">
                  {selectedResponse.q10MarketShareQuestion}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">11. Output Verification</dt>
                <dd className="text-slate-900 mt-0.5">
                  {selectedResponse.q11OutputChecks.join(', ')}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">12. Top Blockers</dt>
                <dd className="text-slate-900 mt-0.5">{selectedResponse.q12Blockers.join(', ')}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">
                  13. Repetitive Task Wish List
                </dt>
                <dd className="text-slate-900 mt-0.5 whitespace-pre-wrap">
                  {selectedResponse.q13RepetitiveTask}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-slate-500">14. Workshop Expectations</dt>
                <dd className="text-slate-900 mt-0.5">
                  {selectedResponse.q14WorkshopGoals.join(', ')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Mandatory Confirmation Dialog for Mutating Workspace/Firestore Operations */}
      {confirmDialog && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/65 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h4 className="font-display text-lg font-semibold text-slate-900">
              {confirmDialog.title}
            </h4>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {confirmDialog.description}
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  await action();
                }}
                className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E40AF] cursor-pointer"
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
