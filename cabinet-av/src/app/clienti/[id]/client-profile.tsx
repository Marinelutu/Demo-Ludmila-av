'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Edit2, Folder, Mail, Phone, FileText, Mic, MicOff, Clock, CheckCircle2,
  AlertCircle, FileCheck, StickyNote, Lock,
} from 'lucide-react';
import { format } from 'date-fns';
import { ro } from 'date-fns/locale';
import { toast } from 'sonner';
import { OcrSplitView } from '@/components/ocr/ocr-split-view';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScanLine } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('informatii');

  // Consultation state
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [consultResult, setConsultResult] = useState<ConsultationResult | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // OCR sheet
  const [ocrOpen, setOcrOpen] = useState(false);

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
          <Button variant="outline" className="gap-2">
            <Edit2 className="h-4 w-4" /> Editează
          </Button>
          <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Folder className="h-4 w-4" /> Dosar Nou
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
          <TabsContent value="documente" className="mt-0">
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
                        <Button className="bg-indigo-600 hover:bg-indigo-700">
                          Adaugă consultație la profil
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
              {Array.isArray(client.contracts) && (client.contracts as ClientData[]).length > 0 ? (
                (client.contracts as ClientData[]).map((contract) => (
                  <Card key={String(contract.id)}>
                    <CardContent className="p-4">
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
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <FileCheck className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm text-slate-500">Niciun contract. Adăugați primul contract.</p>
                  <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" size="sm">+ Contract nou</Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB: Notițe */}
          <TabsContent value="notite" className="mt-0">
            <div className="space-y-3">
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
                          </div>
                          <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{String(note.continut)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <StickyNote className="mx-auto h-8 w-8 text-slate-400" />
                  <p className="mt-2 text-sm text-slate-500">Nicio notiță. Adăugați prima notiță.</p>
                  <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" size="sm">+ Notiță nouă</Button>
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
    </div>
  );
}
