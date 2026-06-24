'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Edit2, Folder, Mail, Phone, FileText, Mic, MicOff, Clock, CheckCircle2,
  AlertCircle, FileCheck, StickyNote, Lock, Plus, Eye, EyeOff, Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { toast } from 'sonner';
import { OcrSplitView } from '@/components/ocr/ocr-split-view';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScanLine } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { GenerateDocumentModal } from '@/components/editor/generate-document-modal';

type ClientData = Record<string, unknown>;

interface ConsultationResult {
  transcript: string;
  structuredData: {
    nume_client?: string;
    natura_cazului?: string;
    fapte_cheie?: string[];
    documente_necesare?: string[];
    actiuni_agreate?: string[];
    sume_mentionate?: { suma: number; valuta: string; context: string }[];
    termene_critice?: string[];
  } | null;
}

export function ClientProfileClient({ client }: { client: ClientData }) {
  const router = useRouter();

  // Tab sincronizat cu URL-ul, ca butonul "înapoi" din browser să revină pe tab-ul corect.
  // Inițializăm cu 'informatii' (la fel ca SSR) și citim tab-ul din URL după montare,
  // pentru a evita nepotrivirile de hidratare.
  const [activeTab, setActiveTab] = useState('informatii');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', value);
      window.history.replaceState(window.history.state, '', url.toString());
    }
  };

  // La montare și la navigare înapoi/înainte din browser (popstate), preluăm tab-ul din URL
  useEffect(() => {
    const syncFromUrl = () => {
      const tab = new URLSearchParams(window.location.search).get('tab') || 'informatii';
      setActiveTab(tab);
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  // Consultation state
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [consultResult, setConsultResult] = useState<ConsultationResult | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [savingConsult, setSavingConsult] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // OCR sheet
  const [ocrOpen, setOcrOpen] = useState(false);

  // Dialog: editare client
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nume: String(client.nume || ''),
    prenume: String(client.prenume || ''),
    idnp: String(client.idnp || ''),
    telefon: String(client.telefon || ''),
    email: String(client.email || ''),
    adresa: String(client.adresa || ''),
    note: String(client.note || ''),
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Dialog: dosar nou
  const [caseOpen, setCaseOpen] = useState(false);
  const [caseForm, setCaseForm] = useState({
    numar: '', denumire: '', tip: 'civil', instanta: '', judecator: '', descriere: '',
  });
  const [savingCase, setSavingCase] = useState(false);

  // Document nou (modal de generare)
  const [docModalOpen, setDocModalOpen] = useState(false);

  // Notițe: dezvăluire confidențiale + adăugare inline
  const [revealedNotes, setRevealedNotes] = useState<Set<string>>(new Set());
  const [noteFormOpen, setNoteFormOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({ continut: '', confidential: false });
  const [savingNote, setSavingNote] = useState(false);

  // Contracte: adăugare inline
  const [contractFormOpen, setContractFormOpen] = useState(false);
  const [contractForm, setContractForm] = useState({
    tip: 'asistenta_juridica', numar: '', data: '', onorariu: '',
  });
  const [savingContract, setSavingContract] = useState(false);

  // Contracte: editare inline
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [editContractForm, setEditContractForm] = useState({
    tip: 'asistenta_juridica', numar: '', data: '', onorariu: '', status: 'activ',
  });
  const [savingEditContract, setSavingEditContract] = useState(false);

  const handleSaveEdit = async () => {
    if (editForm.nume.trim().length < 2 || editForm.prenume.trim().length < 2) {
      toast.error('Numele și prenumele sunt obligatorii (minim 2 caractere).');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: client.id, ...editForm }),
      });
      if (!res.ok) throw new Error();
      toast.success('Client actualizat');
      setEditOpen(false);
      router.refresh();
    } catch {
      toast.error('Eroare la actualizarea clientului.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveCase = async () => {
    if (!caseForm.numar.trim() || caseForm.denumire.trim().length < 2) {
      toast.error('Numărul și denumirea dosarului sunt obligatorii.');
      return;
    }
    setSavingCase(true);
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, ...caseForm }),
      });
      if (!res.ok) throw new Error();
      const newCase = await res.json();
      toast.success('Dosar creat');
      setCaseOpen(false);
      router.push(`/dosare/${newCase.id}`);
    } catch {
      toast.error('Eroare la crearea dosarului.');
    } finally {
      setSavingCase(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteForm.continut.trim()) {
      toast.error('Conținutul notiței este obligatoriu.');
      return;
    }
    setSavingNote(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, ...noteForm }),
      });
      if (!res.ok) throw new Error();
      toast.success('Notiță adăugată');
      setNoteForm({ continut: '', confidential: false });
      setNoteFormOpen(false);
      router.refresh();
    } catch {
      toast.error('Eroare la salvarea notiței.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveContract = async () => {
    setSavingContract(true);
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          tip: contractForm.tip,
          numar: contractForm.numar,
          data: contractForm.data,
          onorariu: contractForm.onorariu ? Number(contractForm.onorariu) : null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Contract adăugat');
      setContractForm({ tip: 'asistenta_juridica', numar: '', data: '', onorariu: '' });
      setContractFormOpen(false);
      router.refresh();
    } catch {
      toast.error('Eroare la salvarea contractului.');
    } finally {
      setSavingContract(false);
    }
  };

  const startEditContract = (contract: ClientData) => {
    setEditingContractId(String(contract.id));
    setEditContractForm({
      tip: String(contract.tip || 'asistenta_juridica'),
      numar: String(contract.numar || ''),
      data: contract.data ? format(new Date(String(contract.data)), 'yyyy-MM-dd') : '',
      onorariu: contract.onorariu ? String(contract.onorariu) : '',
      status: String(contract.status || 'activ'),
    });
  };

  const handleUpdateContract = async () => {
    if (!editingContractId) return;
    setSavingEditContract(true);
    try {
      const res = await fetch('/api/contracts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingContractId,
          tip: editContractForm.tip,
          numar: editContractForm.numar,
          data: editContractForm.data,
          onorariu: editContractForm.onorariu ? Number(editContractForm.onorariu) : null,
          status: editContractForm.status,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Contract actualizat');
      setEditingContractId(null);
      router.refresh();
    } catch {
      toast.error('Eroare la actualizarea contractului.');
    } finally {
      setSavingEditContract(false);
    }
  };

  const toggleReveal = (id: string) => {
    setRevealedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getInitials = (nume: string, prenume: string) =>
    `${prenume?.charAt(0) || ''}${nume?.charAt(0) || ''}`.toUpperCase();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = handleTranscribe;

      mr.start(1000);
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.error('Nu se poate accesa microfonul.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleTranscribe = async () => {
    setTranscribing(true);
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', blob, 'consultatie.webm');

    try {
      const res = await fetch('/api/ai/transcribe', { method: 'POST', body: formData });
      if (!res.ok) throw new Error();
      const data: ConsultationResult = await res.json();
      setConsultResult(data);
      toast.success('Transcriere completă');
    } catch {
      toast.error('Transcriere eșuată. Verificați cheia OpenAI API.');
    } finally {
      setTranscribing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSaveConsultation = async () => {
    if (!consultResult) return;
    setSavingConsult(true);
    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          transcript: consultResult.transcript,
          structuredData: consultResult.structuredData,
          durata: recordingTime,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Consultație salvată la profil');
      setConsultResult(null);
      router.refresh();
    } catch {
      toast.error('Eroare la salvarea consultației.');
    } finally {
      setSavingConsult(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-5">
          <Avatar className="h-20 w-20 border-2 border-white shadow-md dark:border-slate-900">
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl font-bold text-white">
              {getInitials(String(client.nume || ''), String(client.prenume || ''))}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {String(client.prenume || '')} {String(client.nume || '')}
              </h1>
              <Badge
                className={client.status === 'activ' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}
                variant={client.status === 'activ' ? 'default' : 'secondary'}
              >
                {client.status === 'activ' ? 'Activ' : 'Arhivat'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
              {!!client.idnp && (
                <span><span className="font-semibold text-slate-700 dark:text-slate-300">IDNP:</span> {String(client.idnp)}</span>
              )}
              {!!client.telefon && (
                <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{String(client.telefon)}</div>
              )}
              {!!client.email && (
                <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{String(client.email)}</div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setOcrOpen(true)}>
            <ScanLine className="h-4 w-4" /> OCR
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
            <Edit2 className="h-4 w-4" /> Editează
          </Button>
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => setCaseOpen(true)}>
            <Folder className="h-4 w-4" /> Dosar Nou
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="h-12 w-full justify-start overflow-x-auto rounded-none border-b border-slate-200 bg-transparent p-0 dark:border-slate-800">
          {[
            { value: 'informatii', label: 'Informații' },
            { value: 'dosare', label: `Dosare (${Array.isArray(client.cases) ? client.cases.length : 0})` },
            { value: 'documente', label: `Documente (${Array.isArray(client.documents) ? client.documents.length : 0})` },
            { value: 'consultatii', label: 'Consultații' },
            { value: 'timp', label: 'Timp' },
            { value: 'contracte', label: 'Contracte' },
            { value: 'notite', label: 'Notițe' },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:shadow-none dark:data-[state=active]:border-indigo-500 dark:data-[state=active]:text-indigo-400"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          {/* TAB: Informații */}
          <TabsContent value="informatii" className="mt-0 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Date de contact</CardTitle></CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">Adresă</p>
                  <p className="text-base text-slate-900 dark:text-white">{String(client.adresa || 'Nesetată')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-500">Data înregistrării</p>
                  <p className="text-base text-slate-900 dark:text-white">
                    {client.createdAt ? format(new Date(String(client.createdAt)), 'd MMMM yyyy', { locale: ro }) : '-'}
                  </p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-sm font-medium text-slate-500">Note</p>
                  <p className="text-base text-slate-900 dark:text-white">{String(client.note || 'Nu există note adiționale.')}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Dosare */}
          <TabsContent value="dosare" className="mt-0">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.isArray(client.cases) && (client.cases as ClientData[]).map((c) => (
                <Card
                  key={String(c.id)}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => router.push(`/dosare/${c.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge variant="outline" className="bg-slate-50">{String(c.numar)}</Badge>
                      <Badge variant={c.stare === 'deschis' || c.stare === 'in_curs' ? 'default' : 'secondary'}>
                        {String(c.stare).replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardTitle className="mt-2 text-base leading-tight">{String(c.denumire)}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>Tip:</span>
                      <span className="font-medium text-slate-900 dark:text-white capitalize">{String(c.tip)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Instanță:</span>
                      <span className="font-medium text-slate-900 dark:text-white truncate max-w-[150px]">{String(c.instanta || '-')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!Array.isArray(client.cases) || (client.cases as ClientData[]).length === 0) && (
                <div className="col-span-3 rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <Folder className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm text-slate-500">Niciun dosar. Adăugați primul dosar.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB: Documente */}
          <TabsContent value="documente" className="mt-0 space-y-4">
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setOcrOpen(true)}>
                <ScanLine className="h-4 w-4" /> Scanează (OCR)
              </Button>
              <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => setDocModalOpen(true)}>
                <Sparkles className="h-4 w-4" /> Document nou
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.isArray(client.documents) && (client.documents as ClientData[]).map((doc) => (
                <div
                  key={String(doc.id)}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all dark:border-slate-700 dark:bg-slate-900"
                  onClick={() => router.push(`/documente/${doc.id}`)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                    <FileText className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{String(doc.nume)}</p>
                    <p className="text-xs text-slate-500">{String(doc.tip)} • {doc.createdAt ? format(new Date(String(doc.createdAt)), 'dd MMM', { locale: ro }) : ''}</p>
                  </div>
                </div>
              ))}
              {(!Array.isArray(client.documents) || (client.documents as ClientData[]).length === 0) && (
                <div className="col-span-3 rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <FileText className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm text-slate-500">Niciun document asociat.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB: Consultații */}
          <TabsContent value="consultatii" className="mt-0">
            <div className="space-y-6">
              {/* Recording UI */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mic className="h-4 w-4 text-indigo-600" /> Înregistrare consultație nouă
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    {!recording && !transcribing && !consultResult && (
                      <Button onClick={startRecording} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                        <Mic className="h-4 w-4" /> Pornesc consultația
                      </Button>
                    )}

                    {recording && (
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                          <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Înregistrare activă</p>
                          <p className="text-xs font-mono text-slate-500">{formatTime(recordingTime)}</p>
                        </div>
                        <Button variant="destructive" onClick={stopRecording} className="gap-2">
                          <MicOff className="h-4 w-4" /> Stop & Transcrie
                        </Button>
                      </div>
                    )}

                    {transcribing && (
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                        <p className="text-sm text-slate-600 dark:text-slate-400">Transcriere cu Whisper AI...</p>
                      </div>
                    )}
                  </div>

                  {/* Result */}
                  {consultResult && (
                    <div className="mt-6 space-y-5">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Transcript</p>
                        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {consultResult.transcript}
                        </p>
                      </div>

                      {consultResult.structuredData && (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {consultResult.structuredData.natura_cazului && (
                            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-800 dark:bg-indigo-900/20">
                              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">Natura cazului</p>
                              <p className="mt-1 text-sm font-medium text-indigo-900 dark:text-indigo-200 capitalize">
                                {consultResult.structuredData.natura_cazului}
                              </p>
                            </div>
                          )}

                          {(consultResult.structuredData.fapte_cheie?.length ?? 0) > 0 && (
                            <div className="col-span-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                              <p className="text-xs font-semibold text-slate-500 mb-2">Fapte cheie</p>
                              <ul className="space-y-1">
                                {consultResult.structuredData.fapte_cheie!.map((f, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-800 dark:text-slate-200">
                                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-500 shrink-0" /> {f}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {(consultResult.structuredData.documente_necesare?.length ?? 0) > 0 && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">Documente necesare</p>
                              <ul className="space-y-1">
                                {consultResult.structuredData.documente_necesare!.map((d, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                                    <FileCheck className="mt-0.5 h-3 w-3 shrink-0" /> {d}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {(consultResult.structuredData.actiuni_agreate?.length ?? 0) > 0 && (
                            <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                              <p className="text-xs font-semibold text-slate-500 mb-2">Acțiuni agreate</p>
                              <ul className="space-y-1">
                                {consultResult.structuredData.actiuni_agreate!.map((a, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                                    <AlertCircle className="mt-0.5 h-3 w-3 text-indigo-500 shrink-0" /> {a}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={savingConsult} onClick={handleSaveConsultation}>
                          {savingConsult ? 'Se salvează...' : 'Adaugă consultație la profil'}
                        </Button>
                        <Button variant="outline" onClick={() => setConsultResult(null)}>
                          Înregistrare nouă
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Existing consultations from DB */}
              {Array.isArray(client.consultations) && (client.consultations as ClientData[]).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Consultații anterioare</h3>
                  {(client.consultations as ClientData[]).map((c) => (
                    <Card key={String(c.id)} className="cursor-pointer hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <span className="text-sm font-medium text-slate-900 dark:text-white">
                              {c.createdAt ? format(new Date(String(c.createdAt)), 'd MMMM yyyy, HH:mm', { locale: ro }) : '-'}
                            </span>
                          </div>
                          {!!c.durata && (
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(Number(c.durata) / 60)} min
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                          {String(c.transcript || '').slice(0, 200)}...
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB: Timp */}
          <TabsContent value="timp" className="mt-0">
            <div className="space-y-4">
              {Array.isArray(client.timeEntries) && (client.timeEntries as ClientData[]).length > 0 ? (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Categorie</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Descriere</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Dată</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Durată</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(client.timeEntries as ClientData[]).map((entry) => (
                          <tr key={String(entry.id)} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/30">
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-xs capitalize">{String(entry.categorie)}</Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{String(entry.descriere || '-')}</td>
                            <td className="px-4 py-3 text-sm text-slate-500">
                              {entry.startTime ? format(new Date(String(entry.startTime)), 'dd MMM', { locale: ro }) : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-medium text-slate-900 dark:text-white">
                              {entry.durata ? `${Math.round(Number(entry.durata) / 60)} min` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-4 dark:bg-indigo-900/20 dark:border-indigo-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Total ore lucrate</span>
                      <div className="text-right">
                        <p className="text-xl font-bold text-indigo-900 dark:text-indigo-200">
                          {((client.timeEntries as ClientData[]).reduce((sum, e) => sum + (Number(e.durata) || 0), 0) / 3600).toFixed(1)} h
                        </p>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400">
                          × 800 lei/h = {Math.round((client.timeEntries as ClientData[]).reduce((sum, e) => sum + (Number(e.durata) || 0), 0) / 3600 * 800).toLocaleString()} lei
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <Clock className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm text-slate-500">Nicio înregistrare de timp.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB: Contracte */}
          <TabsContent value="contracte" className="mt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-end">
                <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => setContractFormOpen((v) => !v)}>
                  <Plus className="h-4 w-4" /> Contract nou
                </Button>
              </div>

              {contractFormOpen && (
                <Card className="border-indigo-200 dark:border-indigo-800">
                  <CardContent className="p-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tip contract</Label>
                        <Select value={contractForm.tip} onValueChange={(v) => setContractForm((f) => ({ ...f, tip: v }))}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asistenta_juridica">Asistență juridică</SelectItem>
                            <SelectItem value="reprezentare">Reprezentare</SelectItem>
                            <SelectItem value="consultanta">Consultanță</SelectItem>
                            <SelectItem value="abonament">Abonament</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Număr</Label>
                        <Input value={contractForm.numar} onChange={(e) => setContractForm((f) => ({ ...f, numar: e.target.value }))} placeholder="12/2024" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Data</Label>
                        <Input type="date" value={contractForm.data} onChange={(e) => setContractForm((f) => ({ ...f, data: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Onorariu (lei)</Label>
                        <Input type="number" value={contractForm.onorariu} onChange={(e) => setContractForm((f) => ({ ...f, onorariu: e.target.value }))} placeholder="15000" />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setContractFormOpen(false)}>Anulează</Button>
                      <Button size="sm" disabled={savingContract} onClick={handleSaveContract} className="bg-indigo-600 hover:bg-indigo-700">
                        {savingContract ? 'Se salvează...' : 'Salvează contract'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {Array.isArray(client.contracts) && (client.contracts as ClientData[]).length > 0 ? (
                (client.contracts as ClientData[]).map((contract) => (
                  <Card key={String(contract.id)}>
                    <CardContent className="p-4">
                      {editingContractId === String(contract.id) ? (
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Tip contract</Label>
                              <Select value={editContractForm.tip} onValueChange={(v) => setEditContractForm((f) => ({ ...f, tip: v }))}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="asistenta_juridica">Asistență juridică</SelectItem>
                                  <SelectItem value="reprezentare">Reprezentare</SelectItem>
                                  <SelectItem value="consultanta">Consultanță</SelectItem>
                                  <SelectItem value="abonament">Abonament</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Număr</Label>
                              <Input value={editContractForm.numar} onChange={(e) => setEditContractForm((f) => ({ ...f, numar: e.target.value }))} placeholder="12/2024" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Data</Label>
                              <Input type="date" value={editContractForm.data} onChange={(e) => setEditContractForm((f) => ({ ...f, data: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Onorariu (lei)</Label>
                              <Input type="number" value={editContractForm.onorariu} onChange={(e) => setEditContractForm((f) => ({ ...f, onorariu: e.target.value }))} placeholder="15000" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Status</Label>
                              <Select value={editContractForm.status} onValueChange={(v) => setEditContractForm((f) => ({ ...f, status: v }))}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="activ">Activ</SelectItem>
                                  <SelectItem value="expirat">Expirat</SelectItem>
                                  <SelectItem value="reziliat">Reziliat</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingContractId(null)}>Anulează</Button>
                            <Button size="sm" disabled={savingEditContract} onClick={handleUpdateContract} className="bg-indigo-600 hover:bg-indigo-700">
                              {savingEditContract ? 'Se salvează...' : 'Salvează modificările'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
                              <FileCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                                Contract {String(contract.tip).replace('_', ' ')}
                              </p>
                              <p className="text-xs text-slate-500">
                                {contract.numar ? `Nr. ${contract.numar} • ` : ''}
                                {contract.data ? format(new Date(String(contract.data)), 'd MMM yyyy', { locale: ro }) : '-'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              {!!contract.onorariu && (
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {Number(contract.onorariu).toLocaleString()} lei
                                </p>
                              )}
                              <Badge variant={contract.status === 'activ' ? 'default' : 'secondary'} className={contract.status === 'activ' ? 'bg-emerald-500 text-white' : ''}>
                                {String(contract.status)}
                              </Badge>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => startEditContract(contract)}>
                              <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <FileCheck className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm text-slate-500">Niciun contract. Adăugați primul contract.</p>
                  <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" size="sm" onClick={() => setContractFormOpen(true)}>+ Contract nou</Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB: Notițe */}
          <TabsContent value="notite" className="mt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-end">
                <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700" onClick={() => setNoteFormOpen((v) => !v)}>
                  <Plus className="h-4 w-4" /> Notiță nouă
                </Button>
              </div>

              {noteFormOpen && (
                <Card className="border-indigo-200 dark:border-indigo-800">
                  <CardContent className="p-4 space-y-3">
                    <Textarea
                      value={noteForm.continut}
                      onChange={(e) => setNoteForm((f) => ({ ...f, continut: e.target.value }))}
                      placeholder="Scrieți notița aici..."
                      className="min-h-[90px]"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Switch
                          checked={noteForm.confidential}
                          onCheckedChange={(v) => setNoteForm((f) => ({ ...f, confidential: v }))}
                        />
                        <span className="flex items-center gap-1">
                          <Lock className="h-3.5 w-3.5 text-amber-600" /> Notiță confidențială
                        </span>
                      </label>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setNoteFormOpen(false)}>Anulează</Button>
                        <Button size="sm" disabled={savingNote} onClick={handleSaveNote} className="bg-indigo-600 hover:bg-indigo-700">
                          {savingNote ? 'Se salvează...' : 'Salvează notiță'}
                        </Button>
                      </div>
                    </div>
                    {noteForm.confidential && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Notițele confidențiale rămân ascunse până la apăsarea butonului „Afișează”. (Protecția cu parolă va fi adăugată ulterior.)
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {Array.isArray(client.notes) && (client.notes as ClientData[]).length > 0 ? (
                (client.notes as ClientData[]).map((note) => (
                  <Card key={String(note.id)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40 shrink-0">
                          {note.confidential ? (
                            <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {!!note.confidential && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 border-amber-300 text-amber-700">Confidențial</Badge>
                            )}
                            <span className="text-xs text-slate-400">
                              {note.createdAt ? format(new Date(String(note.createdAt)), 'd MMM yyyy', { locale: ro }) : ''}
                            </span>
                            {!!note.confidential && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto h-6 gap-1 px-2 text-xs text-amber-700 hover:bg-amber-50 dark:text-amber-400"
                                onClick={() => toggleReveal(String(note.id))}
                              >
                                {revealedNotes.has(String(note.id)) ? (
                                  <><EyeOff className="h-3 w-3" /> Ascunde</>
                                ) : (
                                  <><Eye className="h-3 w-3" /> Afișează</>
                                )}
                              </Button>
                            )}
                          </div>
                          {note.confidential && !revealedNotes.has(String(note.id)) ? (
                            <button
                              onClick={() => toggleReveal(String(note.id))}
                              className="flex w-full items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-left text-sm text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400"
                            >
                              <Lock className="h-3.5 w-3.5 shrink-0" />
                              <span className="select-none italic">Notiță confidențială — apăsați pentru a afișa conținutul</span>
                            </button>
                          ) : (
                            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{String(note.continut)}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <StickyNote className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm text-slate-500">Nicio notiță. Adăugați prima notiță.</p>
                  <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" size="sm" onClick={() => setNoteFormOpen(true)}>+ Notiță nouă</Button>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* OCR Sheet */}
      <Sheet open={ocrOpen} onOpenChange={setOcrOpen}>
        <SheetContent side="right" className="w-full sm:max-w-5xl p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <SheetTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-indigo-600" />
              OCR — Digitalizare document client
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden p-6">
            <OcrSplitView clientId={String(client.id)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Dialog: Editare client */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Editează client</DialogTitle>
            <DialogDescription>Actualizați datele clientului.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-nume">Nume <span className="text-red-500">*</span></Label>
                <Input id="edit-nume" value={editForm.nume} onChange={(e) => setEditForm((f) => ({ ...f, nume: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-prenume">Prenume <span className="text-red-500">*</span></Label>
                <Input id="edit-prenume" value={editForm.prenume} onChange={(e) => setEditForm((f) => ({ ...f, prenume: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-idnp">IDNP</Label>
                <Input id="edit-idnp" value={editForm.idnp} onChange={(e) => setEditForm((f) => ({ ...f, idnp: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-telefon">Telefon</Label>
                <Input id="edit-telefon" value={editForm.telefon} onChange={(e) => setEditForm((f) => ({ ...f, telefon: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-adresa">Adresă</Label>
              <Textarea id="edit-adresa" value={editForm.adresa} onChange={(e) => setEditForm((f) => ({ ...f, adresa: e.target.value }))} className="h-16" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-note">Note interne</Label>
              <Textarea id="edit-note" value={editForm.note} onChange={(e) => setEditForm((f) => ({ ...f, note: e.target.value }))} className="h-16" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Anulează</Button>
            <Button disabled={savingEdit} onClick={handleSaveEdit} className="bg-indigo-600 hover:bg-indigo-700">
              {savingEdit ? 'Se salvează...' : 'Salvează modificările'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Dosar nou */}
      <Dialog open={caseOpen} onOpenChange={setCaseOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Dosar nou</DialogTitle>
            <DialogDescription>
              Creați un dosar pentru {String(client.prenume || '')} {String(client.nume || '')}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="case-numar">Număr dosar <span className="text-red-500">*</span></Label>
                <Input id="case-numar" value={caseForm.numar} onChange={(e) => setCaseForm((f) => ({ ...f, numar: e.target.value }))} placeholder="2-345/2024" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="case-tip">Tip</Label>
                <Select value={caseForm.tip} onValueChange={(v) => setCaseForm((f) => ({ ...f, tip: v }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="civil">Civil</SelectItem>
                    <SelectItem value="penal">Penal</SelectItem>
                    <SelectItem value="familial">Familial</SelectItem>
                    <SelectItem value="administrativ">Administrativ</SelectItem>
                    <SelectItem value="comercial">Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="case-denumire">Denumire <span className="text-red-500">*</span></Label>
              <Input id="case-denumire" value={caseForm.denumire} onChange={(e) => setCaseForm((f) => ({ ...f, denumire: e.target.value }))} placeholder="Desfacerea căsătoriei" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="case-instanta">Instanță</Label>
                <Input id="case-instanta" value={caseForm.instanta} onChange={(e) => setCaseForm((f) => ({ ...f, instanta: e.target.value }))} placeholder="Judecătoria Chișinău" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="case-judecator">Judecător</Label>
                <Input id="case-judecator" value={caseForm.judecator} onChange={(e) => setCaseForm((f) => ({ ...f, judecator: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="case-descriere">Descriere</Label>
              <Textarea id="case-descriere" value={caseForm.descriere} onChange={(e) => setCaseForm((f) => ({ ...f, descriere: e.target.value }))} className="h-16" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCaseOpen(false)}>Anulează</Button>
            <Button disabled={savingCase} onClick={handleSaveCase} className="bg-indigo-600 hover:bg-indigo-700">
              {savingCase ? 'Se creează...' : 'Creează dosar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Generare document nou */}
      <GenerateDocumentModal open={docModalOpen} onOpenChange={setDocModalOpen} />
    </div>
  );
}
