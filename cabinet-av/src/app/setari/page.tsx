'use client';

import { useEffect, useState } from 'react';
import { Settings, User, Shield, Bell, Zap, Key, Sparkles, Bot, Calendar, ScrollText, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface AppSettings {
  id: number;
  hourlyRate: number;
  numeCabinet: string;
  codFiscal: string;
  adresaSediu: string;
}

export default function SetariPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(setSettings)
      .catch(() => toast.error('Nu am putut încărca setările'));
  }, []);

  const updateField = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => {
    setSettings(s => (s ? { ...s, [k]: v } : s));
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hourlyRate: settings.hourlyRate,
          numeCabinet: settings.numeCabinet,
          codFiscal: settings.codFiscal,
          adresaSediu: settings.adresaSediu,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Setări salvate');
    } catch {
      toast.error('Salvarea a eșuat');
    } finally {
      setSaving(false);
    }
  };

  const runDemo = async (label: string, key: string, url: string, init?: RequestInit) => {
    setBusy(key);
    try {
      const res = await fetch(url, { method: 'POST', ...init });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Eroare');

      if (key === 'deadlines') {
        if (data.notified > 0) toast.success(`${label}: ${data.notified} termene notificate pe Telegram`);
        else toast.info(`${label}: niciun termen nou de notificat (${data.checked} verificate)`);
      } else if (key === 'alert') {
        toast.success(`${label}: alertă "${data.alert?.titlu || 'creată'}" trimisă pe Telegram`);
      }
    } catch (e) {
      toast.error(`${label} — eroare: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Setări</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gestionați setările cabinetului, profilul și integrările cu serviciile externe.
        </p>
      </div>

      <Tabs defaultValue="general" orientation="vertical" className="flex flex-col md:flex-row gap-6">
        <TabsList className="h-fit w-full justify-start gap-1 bg-transparent p-0 md:w-64">
          <TabsTrigger value="general" className="justify-start px-4 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-400">
            <Settings className="mr-2 h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger value="profil" className="justify-start px-4 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-400">
            <User className="mr-2 h-4 w-4" /> Profil
          </TabsTrigger>
          <TabsTrigger value="notificari" className="justify-start px-4 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-400">
            <Bell className="mr-2 h-4 w-4" /> Notificări
          </TabsTrigger>
          <TabsTrigger value="integrari" className="justify-start px-4 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-400">
            <Zap className="mr-2 h-4 w-4" /> Integrări API
          </TabsTrigger>
          <TabsTrigger value="demo" className="justify-start px-4 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-400">
            <Sparkles className="mr-2 h-4 w-4" /> Mod Demo
          </TabsTrigger>
          <TabsTrigger value="securitate" className="justify-start px-4 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-400">
            <Shield className="mr-2 h-4 w-4" /> Securitate
          </TabsTrigger>
        </TabsList>

        <div className="flex-1">
          <TabsContent value="general" className="m-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informații Cabinet</CardTitle>
                <CardDescription>Datele oficiale ale cabinetului de avocatură.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nume_cabinet">Nume Cabinet</Label>
                    <Input
                      id="nume_cabinet"
                      value={settings?.numeCabinet ?? ''}
                      onChange={e => updateField('numeCabinet', e.target.value)}
                      disabled={!settings}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cui">Cod Fiscal / CUI</Label>
                    <Input
                      id="cui"
                      value={settings?.codFiscal ?? ''}
                      onChange={e => updateField('codFiscal', e.target.value)}
                      disabled={!settings}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="adresa_sediu">Adresă Sediu</Label>
                    <Input
                      id="adresa_sediu"
                      value={settings?.adresaSediu ?? ''}
                      onChange={e => updateField('adresaSediu', e.target.value)}
                      disabled={!settings}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tarif onorariu</CardTitle>
                <CardDescription>Tariful orar folosit pentru calcul automat al onorariului în modulul Timp și export CSV.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="hourly_rate">Tarif orar (lei / oră)</Label>
                  <div className="relative">
                    <Input
                      id="hourly_rate"
                      type="number"
                      min={0}
                      step={50}
                      value={settings?.hourlyRate ?? ''}
                      onChange={e => updateField('hourlyRate', Number(e.target.value))}
                      disabled={!settings}
                      className="pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">lei/h</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSave} disabled={!settings || saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Se salvează…</> : 'Salvează Modificările'}
            </Button>
          </TabsContent>

          <TabsContent value="demo" className="m-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-indigo-600" />
                  Declanșatoare automate Telegram
                </CardTitle>
                <CardDescription>
                  Notificările sunt trimise la chat-ul setat în <code className="text-xs">TELEGRAM_LAWYER_CHAT_ID</code> prin botul de notificări.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="space-y-1">
                    <Label className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Verifică termenele apropiate
                    </Label>
                    <p className="text-sm text-slate-500">Caută termenele active în următoarele 7 zile și trimite o sinteză pe Telegram.</p>
                  </div>
                  <Button
                    onClick={() => runDemo('Termene', 'deadlines', '/api/notif/check-deadlines')}
                    disabled={busy === 'deadlines'}
                  >
                    {busy === 'deadlines' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rulează'}
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="space-y-1">
                    <Label className="text-base flex items-center gap-2">
                      <ScrollText className="h-4 w-4" />
                      Adaugă alertă legislativă demo
                    </Label>
                    <p className="text-sm text-slate-500">Creează o alertă legislativă plauzibilă și trimite o notificare imediată.</p>
                  </div>
                  <Button
                    onClick={() => runDemo('Alertă', 'alert', '/api/alerts', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })}
                    disabled={busy === 'alert'}
                  >
                    {busy === 'alert' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Trimite'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrari" className="m-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Chei API & Servicii</CardTitle>
                <CardDescription>Configurați conexiunile cu serviciile de inteligență artificială.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-semibold text-slate-900 dark:text-white">Anthropic (Claude)</Label>
                      <p className="text-sm text-slate-500">Folosit pentru redactare de documente și asistent juridic.</p>
                    </div>
                    <Badge className="bg-emerald-500">Conectat</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-slate-400" />
                    <Input type="password" value="sk-ant-api03-xxxxxxxxxxxxxxx" readOnly className="font-mono text-slate-500 bg-slate-50 dark:bg-slate-900" />
                    <Button variant="outline">Editează</Button>
                  </div>
                </div>

                <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-semibold text-slate-900 dark:text-white">Google Gemini</Label>
                      <p className="text-sm text-slate-500">Folosit pentru OCR rapid și extragere de date din poze.</p>
                    </div>
                    <Badge variant="secondary">Neconfigurat</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-slate-400" />
                    <Input type="password" placeholder="Introduceți cheia API Google AI Studio" className="font-mono" />
                    <Button>Conectează</Button>
                  </div>
                </div>

                <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-semibold text-slate-900 dark:text-white">OpenAI (Whisper)</Label>
                      <p className="text-sm text-slate-500">Folosit pentru transcrierea audio a consultațiilor.</p>
                    </div>
                    <Badge variant="secondary">Neconfigurat</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-slate-400" />
                    <Input type="password" placeholder="Introduceți cheia API OpenAI" className="font-mono" />
                    <Button>Conectează</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Canale de comunicare</CardTitle>
                <CardDescription>Conectați Telegram sau WhatsApp pentru preluare mesaje.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <Label className="text-base">Bot Telegram</Label>
                    <p className="text-sm text-slate-500">Sincronizați mesajele clienților în aplicație.</p>
                  </div>
                  <Switch checked={true} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <Label className="text-base">Integrare Email (IMAP)</Label>
                    <p className="text-sm text-slate-500">Sincronizați adresa @justice.md</p>
                  </div>
                  <Switch checked={true} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
