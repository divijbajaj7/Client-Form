import { Q10_CORRECT_OPTION, SurveyResponseRecord } from '../types/survey';

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_BASE = 'https://www.googleapis.com/drive/v3/files';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  webViewLink?: string;
  modifiedTime?: string;
}

const SHEET_HEADERS = [
  'Response ID',
  'Submitted At',
  'Source',
  '1. Team',
  '2. Role',
  '3. AI Usage Frequency',
  '4. AI Tools Used',
  '5. Account Governance',
  '6. Work Use Cases',
  '7. Helpful Task & Time Saved',
  '8. Prompt Confidence (1-5)',
  '9. Techniques Used',
  '10. LLM Grounding Question',
  '10b. Grounding Understanding',
  '11. Output Verification',
  '12. Top Blockers (Max 3)',
  '13. Repetitive Task Wish List',
  '14. Workshop Goals',
];

function joinWithOther(items: string[], otherValue: string): string {
  const cleaned = items.map((item) => {
    if (item === 'Other' && otherValue.trim()) {
      return `Other: ${otherValue.trim()}`;
    }
    return item;
  });
  return cleaned.join('; ');
}

function formatTeam(record: SurveyResponseRecord): string {
  if (record.q1Team === 'Other' && record.q1TeamOther.trim()) {
    return `Other: ${record.q1TeamOther.trim()}`;
  }
  return record.q1Team;
}

export function buildSpreadsheetRows(responses: SurveyResponseRecord[]): (string | number)[][] {
  const dataRows = responses.map((row) => [
    row.id,
    row.createdAt ? row.createdAt.toISOString() : '',
    row.source,
    formatTeam(row),
    row.q2Role,
    row.q3Frequency,
    joinWithOther(row.q4Tools, row.q4ToolsOther),
    row.q5Accounts,
    joinWithOther(row.q6UseCases, row.q6UseCasesOther),
    row.q7HelpfulTask || '',
    row.q8Confidence,
    row.q9Techniques.join('; '),
    row.q10MarketShareQuestion,
    row.q10MarketShareQuestion === Q10_CORRECT_OPTION ? 'Accurate (Grounded)' : 'Needs Clarification',
    joinWithOther(row.q11OutputChecks, row.q11OutputChecksOther),
    joinWithOther(row.q12Blockers, row.q12BlockersOther),
    row.q13RepetitiveTask,
    joinWithOther(row.q14WorkshopGoals, row.q14WorkshopGoalsOther),
  ]);

  return [SHEET_HEADERS, ...dataRows];
}

async function fetchJson(url: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Workspace API (${response.status}): ${errorBody}`);
  }
  return response.json();
}

export async function listAppSpreadsheets(
  accessToken: string
): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
  );
  const fields = encodeURIComponent('files(id,name,webViewLink,modifiedTime)');
  const data = await fetchJson(
    `${DRIVE_BASE}?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=20`,
    accessToken
  );
  return data.files || [];
}

async function getFirstSheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<{ sheetId: number; title: string; spreadsheetUrl: string; spreadsheetTitle: string }> {
  const meta = await fetchJson(
    `${SHEETS_BASE}/${spreadsheetId}?fields=spreadsheetUrl,properties.title,sheets(properties(sheetId,title))`,
    accessToken
  );
  const firstSheet = meta.sheets?.[0]?.properties;
  if (!firstSheet) {
    throw new Error('Spreadsheet contains no sheet tabs.');
  }
  return {
    sheetId: firstSheet.sheetId ?? 0,
    title: firstSheet.title ?? 'Responses',
    spreadsheetUrl:
      meta.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    spreadsheetTitle: meta.properties?.title || 'AI at Work Survey Responses',
  };
}

function escapeSheetTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`;
}

export async function createDedicatedSpreadsheet(
  accessToken: string,
  title: string,
  responses: SurveyResponseRecord[]
): Promise<{
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  syncedCount: number;
}> {
  const created = await fetchJson(SHEETS_BASE, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: {
            title: 'Survey Responses',
            gridProperties: { frozenRowCount: 1 },
          },
        },
      ],
    }),
  });

  const spreadsheetId: string = created.spreadsheetId;
  const spreadsheetUrl: string =
    created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  const sheetId: number = created.sheets?.[0]?.properties?.sheetId ?? 0;
  const sheetTitle: string = created.sheets?.[0]?.properties?.title ?? 'Survey Responses';

  const rows = buildSpreadsheetRows(responses);
  const range = `${escapeSheetTitle(sheetTitle)}!A1:R${rows.length}`;

  await fetchJson(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({ values: rows }),
    }
  );

  // Format header row neatly
  await fetchJson(`${SHEETS_BASE}/${spreadsheetId}:batchUpdate`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.043, green: 0.067, blue: 0.125 },
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  bold: true,
                  fontSize: 10,
                },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)',
          },
        },
      ],
    }),
  });

  return {
    spreadsheetId,
    spreadsheetTitle: title,
    spreadsheetUrl,
    syncedCount: responses.length,
  };
}

export async function syncResponsesToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  responses: SurveyResponseRecord[]
): Promise<{
  spreadsheetId: string;
  spreadsheetTitle: string;
  spreadsheetUrl: string;
  syncedCount: number;
}> {
  const meta = await getFirstSheetMetadata(accessToken, spreadsheetId);
  const escapedTab = escapeSheetTitle(meta.title);

  // Clear existing range first so deleted rows never leave stale trailing lines
  await fetchJson(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(`${escapedTab}!A:R`)}:clear`,
    accessToken,
    { method: 'POST', body: JSON.stringify({}) }
  );

  const rows = buildSpreadsheetRows(responses);
  const range = `${escapedTab}!A1:R${rows.length}`;

  await fetchJson(
    `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({ values: rows }),
    }
  );

  return {
    spreadsheetId,
    spreadsheetTitle: meta.spreadsheetTitle,
    spreadsheetUrl: meta.spreadsheetUrl,
    syncedCount: responses.length,
  };
}

export function exportResponsesAsCsv(responses: SurveyResponseRecord[]) {
  const rows = buildSpreadsheetRows(responses);
  const csvContent = rows
    .map((row) =>
      row
        .map((cell) => {
          const text = String(cell ?? '');
          const escaped = text.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    )
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ai-at-work-survey-responses-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
