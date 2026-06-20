import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  Upload,
  FileDown,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Link,
  Loader2,
  ChevronDown,
  MapPin,
  Database,
  FileSpreadsheet,
  CalendarDays,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useHostel } from '../HostelContext';
import { useTranslation } from '../i18nContext';
import { parseICal, mapEventToGuest, ParsedEvent } from '../utils/icalParser';
import { Guest } from '../types';

// ── Source definitions ──────────────────────────────────────────

type MigrationSource = 'cloudbeds' | 'bananadesk' | 'sirvoy' | 'other';

interface SourceDef {
  key: MigrationSource;
  label: string;
  color: string;
  popular?: boolean;
  fields: string[];
  fieldMap: Record<string, string>;
}

const BUNKDESK_FIELDS = [
  'name',
  'email',
  'phone',
  'checkInDate',
  'checkOutDate',
  'status',
  'totalAmount',
] as const;

const SOURCES: SourceDef[] = [
  {
    key: 'cloudbeds',
    label: 'Cloudbeds',
    color: '#3B82F6',
    popular: true,
    fields: ['Guest Name', 'Check-in', 'Check-out', 'Email', 'Phone', 'Status', 'Total'],
    fieldMap: {
      'Guest Name': 'name',
      'Check-in': 'checkInDate',
      'Check-out': 'checkOutDate',
      Email: 'email',
      Phone: 'phone',
      Status: 'status',
      Total: 'totalAmount',
    },
  },
  {
    key: 'bananadesk',
    label: 'BananaDesk',
    color: '#F59E0B',
    fields: ['guest_name', 'checkin', 'checkout', 'email', 'phone', 'status', 'amount'],
    fieldMap: {
      guest_name: 'name',
      checkin: 'checkInDate',
      checkout: 'checkOutDate',
      email: 'email',
      phone: 'phone',
      status: 'status',
      amount: 'totalAmount',
    },
  },
  {
    key: 'sirvoy',
    label: 'Sirvoy',
    color: '#8B5CF6',
    fields: ['name', 'arrival', 'departure', 'email', 'phone', 'status', 'price'],
    fieldMap: {
      name: 'name',
      arrival: 'checkInDate',
      departure: 'checkOutDate',
      email: 'email',
      phone: 'phone',
      status: 'status',
      price: 'totalAmount',
    },
  },
  {
    key: 'other',
    label: 'Other (CSV)',
    color: '#6B7280',
    fields: [],
    fieldMap: {},
  },
];

const BUNKDESK_FIELD_LABELS: Record<string, string> = {
  name: 'Guest Name',
  email: 'Email',
  phone: 'Phone',
  checkInDate: 'Check-in Date',
  checkOutDate: 'Check-out Date',
  status: 'Status',
  totalAmount: 'Total Amount',
};

// ── Sample CSV data ─────────────────────────────────────────────

function getSampleCSV(source: MigrationSource): string {
  const samples: Record<MigrationSource, string> = {
    cloudbeds:
      'Guest Name,Check-in,Check-out,Email,Phone,Status,Total\nEmma Johnson,2026-07-01,2026-07-04,emma@example.com,+1-555-0101,Confirmed,255\nLiam Chen,2026-07-02,2026-07-05,liam@example.com,+86-138-0001,Confirmed,320\nSofia Martinez,2026-07-03,2026-07-06,sofia@example.com,+34-612-0002,Pending,280',
    bananadesk:
      'guest_name,checkin,checkout,email,phone,status,amount\nEmma Johnson,2026-07-01,2026-07-04,emma@example.com,+1-555-0101,confirmed,255\nLiam Chen,2026-07-02,2026-07-05,liam@example.com,+86-138-0001,confirmed,320\nSofia Martinez,2026-07-03,2026-07-06,sofia@example.com,+34-612-0002,pending,280',
    sirvoy:
      'name,arrival,departure,email,phone,status,price\nEmma Johnson,2026-07-01,2026-07-04,emma@example.com,+1-555-0101,confirmed,255\nLiam Chen,2026-07-02,2026-07-05,liam@example.com,+86-138-0001,confirmed,320\nSofia Martinez,2026-07-03,2026-07-06,sofia@example.com,+34-612-0002,pending,280',
    other:
      'name,checkInDate,checkOutDate,email,phone,status,totalAmount\nEmma Johnson,2026-07-01,2026-07-04,emma@example.com,+1-555-0101,confirmed,255\nLiam Chen,2026-07-02,2026-07-05,liam@example.com,+86-138-0001,confirmed,320\nSofia Martinez,2026-07-03,2026-07-06,sofia@example.com,+34-612-0002,pending,280',
  };
  return samples[source];
}

// ── CSV parser ──────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  });
  return { headers, rows };
}

// ── Auto-detect mapping ─────────────────────────────────────────

function autoDetectMapping(
  csvHeaders: string[],
  source: MigrationSource
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const sourceDef = SOURCES.find((s) => s.key === source);

  if (sourceDef && sourceDef.key !== 'other') {
    for (const header of csvHeaders) {
      const normalized = header.toLowerCase().replace(/[_\s-]/g, '');
      for (const [srcField, bunkdeskField] of Object.entries(sourceDef.fieldMap)) {
        const srcNorm = srcField.toLowerCase().replace(/[_\s-]/g, '');
        if (normalized === srcNorm) {
          mapping[header] = bunkdeskField;
          break;
        }
      }
    }
  } else {
    // Fuzzy match for "other"
    const patterns: Record<string, RegExp> = {
      name: /name|guest/i,
      email: /email|mail/i,
      phone: /phone|tel|mobile/i,
      checkInDate: /check.?in|arrival|start/i,
      checkOutDate: /check.?out|departure|end|leave/i,
      status: /status/i,
      totalAmount: /total|amount|price|cost|fee/i,
    };
    for (const header of csvHeaders) {
      for (const [bunkdeskField, regex] of Object.entries(patterns)) {
        if (regex.test(header) && !Object.values(mapping).includes(bunkdeskField)) {
          mapping[header] = bunkdeskField;
          break;
        }
      }
    }
  }

  return mapping;
}

// ── Step indicator ──────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

const STEP_ICONS = [Database, FileSpreadsheet, MapPin, CheckCircle2] as const;

// ── Main component ──────────────────────────────────────────────

export function MigrationHub() {
  const { t } = useTranslation();
  const { importArrivals } = useHostel();

  // State
  const [step, setStep] = useState<Step>(1);
  const [source, setSource] = useState<MigrationSource | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importResult, setImportResult] = useState<{
    imported: number;
    duplicates: number;
    failed: number;
  } | null>(null);

  // iCal state
  const [icalUrl, setIcalUrl] = useState('');
  const [icalLoading, setIcalLoading] = useState(false);
  const [icalError, setIcalError] = useState('');
  const [icalEvents, setIcalEvents] = useState<ParsedEvent[]>([]);
  const [icalFetched, setIcalFetched] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step labels ─────────────────────────────────────────────
  const stepLabels = [
    t('migration.step1Label'),
    t('migration.step2Label'),
    t('migration.step3Label'),
    t('migration.step4Label'),
  ];

  // ── Source select ───────────────────────────────────────────
  const handleSelectSource = (key: MigrationSource) => {
    setSource(key);
    setStep(2);
    // Reset downstream
    setCsvHeaders([]);
    setCsvRows([]);
    setFieldMapping({});
    setImportResult(null);
  };

  // ── File upload ─────────────────────────────────────────────
  const handleFileSelect = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const { headers, rows } = parseCSV(text);
        setCsvHeaders(headers);
        setCsvRows(rows);
        if (source) {
          const mapping = autoDetectMapping(headers, source);
          setFieldMapping(mapping);
        }
        setStep(3);
      };
      reader.readAsText(file);
    },
    [source]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  // ── Field mapping change ────────────────────────────────────
  const handleMappingChange = (csvField: string, bunkdeskField: string) => {
    setFieldMapping((prev) => ({ ...prev, [csvField]: bunkdeskField }));
  };

  // ── Import CSV ──────────────────────────────────────────────
  const handleImport = () => {
    const guests: Omit<Guest, 'id'>[] = [];
    let duplicates = 0;
    let failed = 0;

    for (const row of csvRows) {
      const record: Record<string, string> = {};
      csvHeaders.forEach((h, i) => {
        record[h] = row[i] || '';
      });

      const mapped: Record<string, string> = {};
      for (const [csvField, bunkdeskField] of Object.entries(fieldMapping) as [string, string][]) {
        if (bunkdeskField && record[csvField] !== undefined) {
          mapped[bunkdeskField] = record[csvField];
        }
      }

      const name = mapped.name?.trim();
      const checkInDate = mapped.checkInDate?.trim();
      const checkOutDate = mapped.checkOutDate?.trim();

      if (!name || !checkInDate || !checkOutDate) {
        failed++;
        continue;
      }

      // Simple duplicate check by name + checkIn
      const isDuplicate = guests.some(
        (g) => g.name === name && g.checkInDate === checkInDate
      );
      if (isDuplicate) {
        duplicates++;
        continue;
      }

      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      const nights = Math.max(
        1,
        Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
      );

      guests.push({
        name,
        country: '',
        countryCode: '',
        checkInDate,
        checkOutDate,
        nights,
        paymentStatus: mapped.status?.toLowerCase() === 'paid' ? 'paid' : 'unpaid',
        totalAmount: mapped.totalAmount ? parseFloat(mapped.totalAmount) || undefined : undefined,
        paidAmount: 0,
        phone: mapped.phone || undefined,
        email: mapped.email || undefined,
        passportScanned: false,
        source: 'manual',
      });
    }

    if (guests.length > 0) {
      importArrivals(guests);
    }

    setImportResult({ imported: guests.length, duplicates, failed });
    setStep(4);
  };

  // ── Download sample CSV ─────────────────────────────────────
  const handleDownloadSample = () => {
    if (!source) return;
    const csv = getSampleCSV(source);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bunkdesk_sample_${source}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── iCal fetch ──────────────────────────────────────────────
  const handleIcalFetch = async () => {
    if (!icalUrl.trim()) return;
    setIcalLoading(true);
    setIcalError('');
    setIcalEvents([]);
    setIcalFetched(false);

    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(icalUrl.trim())}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error('fetch');
      const text = await res.text();
      const parsed = parseICal(text);
      if (parsed.length === 0) {
        setIcalError(t('checkin.noEventsFound'));
      } else {
        setIcalEvents(parsed);
      }
    } catch {
      setIcalError(t('checkin.fetchError'));
    } finally {
      setIcalLoading(false);
      setIcalFetched(true);
    }
  };

  const handleIcalImport = () => {
    const guests = icalEvents.map(mapEventToGuest);
    if (guests.length > 0) {
      importArrivals(guests);
      setImportResult({ imported: guests.length, duplicates: 0, failed: 0 });
      setStep(4);
    }
  };

  // ── Reset ───────────────────────────────────────────────────
  const handleReset = () => {
    setStep(1);
    setSource(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setFieldMapping({});
    setImportResult(null);
    setIcalUrl('');
    setIcalEvents([]);
    setIcalError('');
    setIcalFetched(false);
  };

  // ── Preview rows (first 5) ──────────────────────────────────
  const previewRows = useMemo(() => csvRows.slice(0, 5), [csvRows]);

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-50 rounded-lg">
          <Database className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">
            {t('migration.title')}
          </h2>
          <p className="text-sm text-zinc-500">{t('migration.subtitle')}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3, 4] as Step[]).map((s, i) => {
          const Icon = STEP_ICONS[i];
          const isActive = step === s;
          const isDone = step > s;
          return (
            <React.Fragment key={s}>
              {i > 0 && (
                <div
                  className={`flex-1 h-px ${
                    isDone ? 'bg-emerald-400' : 'bg-zinc-200'
                  }`}
                />
              )}
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    isDone
                      ? 'bg-emerald-500 text-white'
                      : isActive
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-100 text-zinc-400'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : s}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    isActive
                      ? 'text-zinc-900'
                      : isDone
                        ? 'text-emerald-600'
                        : 'text-zinc-400'
                  }`}
                >
                  {stepLabels[i]}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Step 1: Select Source ─────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-zinc-700">
            {t('migration.selectSource')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SOURCES.map((s) => (
              <button
                key={s.key}
                onClick={() => handleSelectSource(s.key)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                  source === s.key
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-zinc-200 bg-white hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.label[0]}
                  </div>
                  <span className="text-sm font-semibold text-zinc-900">
                    {s.label}
                  </span>
                </div>
                {s.popular && (
                  <Badge className="absolute top-2 right-2 text-xs px-1.5 py-0">
                    {t('migration.popular')}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          {/* iCal section */}
          <div className="mt-6 pt-6 border-t border-zinc-100">
            <h3 className="text-sm font-medium text-zinc-700 mb-3">
              {t('migration.icalSection')}
            </h3>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  className="pl-9 h-10 bg-zinc-50 border-zinc-200"
                  placeholder="https://..."
                  value={icalUrl}
                  onChange={(e) => setIcalUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleIcalFetch()}
                />
              </div>
              <Button
                className="h-10 px-4"
                onClick={handleIcalFetch}
                disabled={icalLoading || !icalUrl.trim()}
              >
                {icalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t('checkin.fetch')
                )}
              </Button>
            </div>
            {icalError && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg mt-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {icalError}
              </div>
            )}
            {icalEvents.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-zinc-500 font-medium">
                  {t('migration.icalPreview')}
                </p>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {icalEvents.map((evt, idx) => (
                    <div
                      key={evt.uid || idx}
                      className="p-3 rounded-lg border border-zinc-200 bg-white"
                    >
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {evt.summary}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {evt.dtStart} → {evt.dtEnd}
                      </p>
                    </div>
                  ))}
                </div>
                <Button
                  className="mt-2"
                  onClick={handleIcalImport}
                  disabled={icalEvents.length === 0}
                >
                  {t('migration.confirmIcalImport')} ({icalEvents.length})
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 2: Upload CSV ────────────────────────────────── */}
      {step === 2 && source && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-700">
              {t('migration.uploadCSV')}
            </h3>
            <button
              onClick={handleDownloadSample}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              {t('migration.downloadSample')}
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-zinc-300 hover:border-emerald-400 rounded-xl p-10 text-center cursor-pointer transition-colors bg-zinc-50/50 hover:bg-emerald-50/30"
          >
            <Upload className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
            <p className="text-sm text-zinc-600 font-medium">
              {t('migration.dragDrop')}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              {t('migration.dragDropHint')}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>

          <button
            onClick={() => {
              setStep(1);
              setCsvHeaders([]);
              setCsvRows([]);
            }}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            {t('migration.back')}
          </button>
        </div>
      )}

      {/* ── Step 3: Map & Preview ─────────────────────────────── */}
      {step === 3 && csvHeaders.length > 0 && (
        <div className="space-y-6">
          {/* Preview table */}
          <div>
            <h3 className="text-sm font-medium text-zinc-700 mb-3">
              {t('migration.preview')}{' '}
              <span className="text-zinc-400 font-normal">
                ({csvRows.length} {t('migration.records')})
              </span>
            </h3>
            <div className="overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-50">
                    {csvHeaders.map((h, i) => (
                      <th
                        key={i}
                        className="px-3 py-2 text-left font-medium text-zinc-600 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, ri) => (
                    <tr key={ri} className="border-t border-zinc-100">
                      {csvHeaders.map((_, ci) => (
                        <td
                          key={ci}
                          className="px-3 py-2 text-zinc-700 whitespace-nowrap max-w-[160px] truncate"
                        >
                          {row[ci] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {csvRows.length > 5 && (
              <p className="text-xs text-zinc-400 mt-1">
                {t('migration.showingFirst5')}
              </p>
            )}
          </div>

          {/* Field mapping */}
          <div>
            <h3 className="text-sm font-medium text-zinc-700 mb-3">
              {t('migration.fieldMapping')}
            </h3>
            <div className="space-y-2">
              {csvHeaders.map((header) => (
                <div
                  key={header}
                  className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-100"
                >
                  <span className="text-sm text-zinc-700 font-medium min-w-[140px] truncate">
                    {header}
                  </span>
                  <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0" />
                  <div className="relative flex-1">
                    <select
                      value={fieldMapping[header] || ''}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      className="w-full h-8 rounded-lg border border-zinc-200 bg-white px-2.5 text-sm text-zinc-700 appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300"
                    >
                      <option value="">{t('migration.skipField')}</option>
                      {BUNKDESK_FIELDS.map((f) => (
                        <option key={f} value={f}>
                          {BUNKDESK_FIELD_LABELS[f]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              {t('migration.back')}
            </button>
            <Button onClick={handleImport}>
              {t('migration.importRecords', String(csvRows.length))}
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Result ────────────────────────────────────── */}
      {step === 4 && importResult && (
        <div className="space-y-6">
          {/* Summary card */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-base font-semibold text-zinc-900">
                {t('migration.importComplete')}
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-emerald-50">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-emerald-700">
                  {importResult.imported}
                </p>
                <p className="text-xs text-emerald-600">
                  {t('migration.imported')}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-amber-50">
                <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-amber-700">
                  {importResult.duplicates}
                </p>
                <p className="text-xs text-amber-600">
                  {t('migration.duplicates')}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-50">
                <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-700">
                  {importResult.failed}
                </p>
                <p className="text-xs text-red-600">
                  {t('migration.failed')}
                </p>
              </div>
            </div>
          </div>

          {/* Next steps */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6">
            <h4 className="text-sm font-semibold text-zinc-900 mb-3">
              {t('migration.nextSteps')}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-50">
                <CalendarDays className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-sm text-zinc-700">
                  {t('migration.nextStepArrivals')}
                </span>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-50">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-sm text-zinc-700">
                  {t('migration.nextStepHostelPage')}
                </span>
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={handleReset}>
            {t('migration.migrateAnother')}
          </Button>
        </div>
      )}
    </div>
  );
}
